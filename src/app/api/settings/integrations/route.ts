import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/crypto";

const prisma = new PrismaClient();

// GET - Load saved integration settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get settings from database
    const settings = await prisma.integrationSetting.findMany();
    
    const result: Record<string, Record<string, string | boolean>> = {};
    
    for (const setting of settings) {
      if (!result[setting.type]) result[setting.type] = {};
      
      // Don't return actual passwords, just indicate if they exist
      if (setting.key === "password") {
        result[setting.type].hasPassword = !!setting.value;
      } else {
        // Decrypt non-password values
        try {
          result[setting.type][setting.key] = setting.encrypted ? decrypt(setting.value) : setting.value;
        } catch {
          result[setting.type][setting.key] = setting.value;
        }
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    // If table doesn't exist yet, return empty
    console.error("Error loading integration settings:", error);
    return NextResponse.json({});
  }
}

// POST - Save integration settings
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins and managers can modify settings
  if (session.user.role !== "admin" && session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden - Admin or Manager role required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, ...settings } = body;

    if (!type || !["snow", "git"].includes(type)) {
      return NextResponse.json({ error: "Invalid integration type" }, { status: 400 });
    }

    // Save each setting
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined) continue; // Skip undefined values (masked passwords)
      
      const strValue = String(value);
      const shouldEncrypt = key === "password" || key === "instance";
      const encryptedValue = shouldEncrypt ? encrypt(strValue) : strValue;

      await prisma.integrationSetting.upsert({
        where: {
          type_key: { type, key },
        },
        update: {
          value: encryptedValue,
          encrypted: shouldEncrypt,
          updatedAt: new Date(),
        },
        create: {
          type,
          key,
          value: encryptedValue,
          encrypted: shouldEncrypt,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving integration settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
