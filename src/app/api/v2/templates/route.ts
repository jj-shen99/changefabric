/**
 * GET /api/v2/templates — list all active CR templates
 * POST /api/v2/templates — create a new template (admin only)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, badRequest, forbidden, serverError } from "../_helpers";

export async function GET() {
  try {
    // Templates are public read - no auth required for listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates = await (prisma as any).changeRequestTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSession();
    if (ctx instanceof NextResponse) return ctx;
    if (!ctx.isAdmin) {
      return forbidden("Only admins can create templates");
    }

    const body = await req.json();
    if (!body.name) {
      return badRequest("Template name is required");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = await (prisma as any).changeRequestTemplate.create({
      data: {
        name: body.name,
        description: body.description || "",
        category: body.category || "other",
        type: body.type || "standard",
        workflowKey: body.workflowKey || "standard",
        priority: body.priority || "3",
        riskLevel: body.riskLevel || "moderate",
        impactLevel: body.impactLevel || "3",
        urgency: body.urgency || "3",
        assignmentGroup: body.assignmentGroup || null,
        implementationPlan: body.implementationPlan || "",
        backoutPlan: body.backoutPlan || "",
        testPlan: body.testPlan || "",
        riskAndImpactAnalysis: body.riskAndImpactAnalysis || "",
        justification: body.justification || "",
        suggestedApprovalSteps: JSON.stringify(body.suggestedApprovalSteps || []),
        createdBy: ctx.email,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
