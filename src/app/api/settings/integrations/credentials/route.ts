import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// GET - Load saved credentials for current user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!type || !["snow", "git"].includes(type)) {
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  try {
    const userEmail = session.user.email || "";
    const settings = await prisma.integrationSetting.findMany({
      where: { userId: userEmail, type },
    });

    const result: Record<string, string> = {};

    for (const setting of settings) {
      try {
        result[setting.key] = setting.encrypted ? decrypt(setting.value) : setting.value;
      } catch {
        result[setting.key] = setting.value;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error loading credentials:", error);
    return NextResponse.json({});
  }
}
