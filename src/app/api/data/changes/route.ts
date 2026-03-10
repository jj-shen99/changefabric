import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_PERMISSIONS } from "@/lib/auth-types";
import type { UserRole } from "@/lib/auth-types";

function getPermissions(session: { user: { role?: string } }) {
  const role = (session.user.role || "viewer") as UserRole;
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
}

// POST /api/data/changes — Create a new change request
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      id, title, description, category, status, author, team,
      scheduledAt, releaseId, jiraTicket, prUrl,
      linesAdded, linesRemoved, filesChanged, approvers, tags,
      impact,
    } = body;

    if (!id || !title || !description || !category || !author || !team) {
      return NextResponse.json(
        { error: "Missing required fields: id, title, description, category, author, team" },
        { status: 400 }
      );
    }

    const existing = await prisma.changeRequest.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json({ error: "Change request with this ID already exists" }, { status: 409 });
    }

    const cr = await prisma.changeRequest.create({
      data: {
        id,
        title,
        description,
        category,
        status: status || "draft",
        author,
        team,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        releaseId: releaseId || null,
        jiraTicket: jiraTicket || null,
        prUrl: prUrl || null,
        linesAdded: linesAdded || 0,
        linesRemoved: linesRemoved || 0,
        filesChanged: filesChanged || 0,
        approvers: JSON.stringify(approvers || []),
        tags: JSON.stringify(tags || []),
      },
    });

    if (impact) {
      await prisma.impactAnalysis.create({
        data: {
          changeRequestId: cr.id,
          outageRisk: impact.outageRisk || 0,
          performanceRisk: impact.performanceRisk || 0,
          functionalityRisk: impact.functionalityRisk || 0,
          securityRisk: impact.securityRisk || 0,
          dataIntegrityRisk: impact.dataIntegrityRisk || 0,
          overallRisk: impact.overallRisk || 0,
          affectedServices: JSON.stringify(impact.affectedServices || []),
          affectedUsers: impact.affectedUsers || 0,
          estimatedDowntime: impact.estimatedDowntime || "0 min",
          rollbackComplexity: impact.rollbackComplexity || "low",
          blastRadius: impact.blastRadius || "low",
        },
      });
    }

    return NextResponse.json({ message: "Change request created", id: cr.id }, { status: 201 });
  } catch (err) {
    console.error("Create change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/data/changes — Update an existing change request
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Change request ID is required" }, { status: 400 });
    }

    const existing = await prisma.changeRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.author !== undefined) data.author = updates.author;
    if (updates.team !== undefined) data.team = updates.team;
    if (updates.scheduledAt !== undefined) data.scheduledAt = updates.scheduledAt ? new Date(updates.scheduledAt) : null;
    if (updates.deployedAt !== undefined) data.deployedAt = updates.deployedAt ? new Date(updates.deployedAt) : null;
    if (updates.releaseId !== undefined) data.releaseId = updates.releaseId || null;
    if (updates.jiraTicket !== undefined) data.jiraTicket = updates.jiraTicket || null;
    if (updates.prUrl !== undefined) data.prUrl = updates.prUrl || null;
    if (updates.linesAdded !== undefined) data.linesAdded = updates.linesAdded;
    if (updates.linesRemoved !== undefined) data.linesRemoved = updates.linesRemoved;
    if (updates.filesChanged !== undefined) data.filesChanged = updates.filesChanged;
    if (updates.approvers !== undefined) data.approvers = JSON.stringify(updates.approvers);
    if (updates.tags !== undefined) data.tags = JSON.stringify(updates.tags);

    await prisma.changeRequest.update({ where: { id }, data });

    if (updates.impact) {
      const impactData = {
        outageRisk: updates.impact.outageRisk,
        performanceRisk: updates.impact.performanceRisk,
        functionalityRisk: updates.impact.functionalityRisk,
        securityRisk: updates.impact.securityRisk,
        dataIntegrityRisk: updates.impact.dataIntegrityRisk,
        overallRisk: updates.impact.overallRisk,
        affectedServices: JSON.stringify(updates.impact.affectedServices || []),
        affectedUsers: updates.impact.affectedUsers,
        estimatedDowntime: updates.impact.estimatedDowntime,
        rollbackComplexity: updates.impact.rollbackComplexity,
        blastRadius: updates.impact.blastRadius,
      };

      await prisma.impactAnalysis.upsert({
        where: { changeRequestId: id },
        update: impactData,
        create: { changeRequestId: id, ...impactData },
      });
    }

    return NextResponse.json({ message: "Change request updated" });
  } catch (err) {
    console.error("Update change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/data/changes — Delete a change request
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perms = getPermissions(session as { user: { role?: string } });
  if (!perms.canManageChanges) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Change request ID is required" }, { status: 400 });
    }

    const existing = await prisma.changeRequest.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Change request not found" }, { status: 404 });
    }

    await prisma.changeRequest.delete({ where: { id } });

    return NextResponse.json({ message: "Change request deleted" });
  } catch (err) {
    console.error("Delete change request error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
