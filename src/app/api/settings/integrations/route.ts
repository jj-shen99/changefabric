import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/crypto";

const prisma = new PrismaClient();

// GET - Load saved integration settings for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get settings for current user
    const userEmail = session.user.email || "";
    const settings = await prisma.integrationSetting.findMany({
      where: { userId: userEmail },
    });
    
    const result: Record<string, Record<string, string | boolean>> = {};
    
    for (const setting of settings) {
      if (!result[setting.type]) result[setting.type] = {};
      
      // Don't return actual passwords/keys, just indicate if they exist
      if (setting.key === "password") {
        result[setting.type].hasPassword = !!setting.value;
      } else if (setting.key === "openaiKey") {
        result[setting.type].hasOpenaiKey = !!setting.value;
      } else if (setting.key === "anthropicKey") {
        result[setting.type].hasAnthropicKey = !!setting.value;
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

// POST - Save integration settings for current user
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, ...settings } = body;

    if (!type || !["snow", "git", "llm"].includes(type)) {
      return NextResponse.json({ error: "Invalid integration type" }, { status: 400 });
    }

    const userEmail = session.user.email || "";

    // Save each setting for current user
    for (const [key, value] of Object.entries(settings)) {
      if (value === undefined) continue; // Skip undefined values (masked passwords)
      
      const strValue = String(value);
      const shouldEncrypt = key === "password" || key === "instance" || key === "openaiKey" || key === "anthropicKey";
      const encryptedValue = shouldEncrypt ? encrypt(strValue) : strValue;

      await prisma.integrationSetting.upsert({
        where: {
          userId_type_key: { userId: userEmail, type, key },
        },
        update: {
          value: encryptedValue,
          encrypted: shouldEncrypt,
          updatedAt: new Date(),
        },
        create: {
          userId: userEmail,
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
