import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Get a single saved analysis by ID
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analysis = await prisma.savedAnalysis.findUnique({
      where: { id: params.id },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    
    // Non-admin users can only view their own analyses
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && analysis.createdBy !== session.user.email) {
      return NextResponse.json({ error: "Not authorized to view this analysis" }, { status: 403 });
    }

    // Parse the JSON data
    let parsedData = null;
    try {
      parsedData = JSON.parse(analysis.analysisData);
    } catch {
      parsedData = analysis.analysisData;
    }

    return NextResponse.json({
      ...analysis,
      analysisData: parsedData,
    });
  } catch (error) {
    console.error("Error loading analysis:", error);
    return NextResponse.json({ error: "Failed to load analysis" }, { status: 500 });
  }
}
