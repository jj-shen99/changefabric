import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - List saved analyses (filtered by user, admin sees all)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // filter by analysis type
    const crId = searchParams.get("crId"); // filter by change request
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (type) where.analysisType = type;
    if (crId) where.changeRequestId = crId;
    
    // Non-admin users can only see their own analyses
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      where.createdBy = session.user.email;
    }

    const analyses = await prisma.savedAnalysis.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        analysisType: true,
        changeRequestId: true,
        repoUrl: true,
        analysisDate: true,
        overallScore: true,
        planReadyScore: true,
        mlScore: true,
        codeRiskScore: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Error loading analyses:", error);
    return NextResponse.json({ error: "Failed to load analyses" }, { status: 500 });
  }
}

// POST - Save a new analysis
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      analysisType,
      changeRequestId,
      repoUrl,
      overallScore,
      planReadyScore,
      mlScore,
      codeRiskScore,
      analysisData,
    } = body;

    if (!name || !analysisType) {
      return NextResponse.json({ error: "Name and analysis type are required" }, { status: 400 });
    }

    const analysis = await prisma.savedAnalysis.create({
      data: {
        name,
        description: description || null,
        analysisType,
        changeRequestId: changeRequestId || null,
        repoUrl: repoUrl || null,
        overallScore: overallScore ?? null,
        planReadyScore: planReadyScore ?? null,
        mlScore: mlScore ?? null,
        codeRiskScore: codeRiskScore ?? null,
        analysisData: typeof analysisData === "string" ? analysisData : JSON.stringify(analysisData),
        createdBy: session.user.email || "unknown",
      },
    });

    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    console.error("Error saving analysis:", error);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}

// DELETE - Delete a saved analysis
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Analysis ID is required" }, { status: 400 });
    }

    // Check ownership or admin role
    const existing = await prisma.savedAnalysis.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (existing.createdBy !== session.user.email && session.user.role !== "admin") {
      return NextResponse.json({ error: "Not authorized to delete this analysis" }, { status: 403 });
    }

    await prisma.savedAnalysis.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting analysis:", error);
    return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
  }
}
