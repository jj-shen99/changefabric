import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaChangeRequestRepository } from "@/core/adapters/prisma-repository";
import { prisma } from "@/lib/prisma";

interface TaskCR {
  number: string;
  title: string;
  state: string;
  priority: string;
  riskLevel: string;
  requestedBy: string;
  assignedTo: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  pendingApprovalStepId?: string;
  pendingApprovalStepName?: string;
}

interface Task {
  type: "approval" | "assigned" | "requested";
  cr: TaskCR;
  reason: string;
}

/**
 * GET /api/my-tasks
 * Returns CRs that need the current user's attention:
 * - CRs where the user has pending approval decisions
 * - CRs assigned to the user
 * - CRs requested by the user that are in progress
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  const repo = new PrismaChangeRequestRepository(prisma);

  // Get all CRs
  const allCRs = await repo.list();

  // Filter CRs assigned to user (in active states)
  const closedStates = ["closed", "rejected", "canceled"];
  const assignedCRs = allCRs.filter(
    (cr) => cr.assignedTo === userEmail && !closedStates.includes(cr.state.toLowerCase())
  );

  // Filter CRs requested by user that are in progress
  const myRequestedCRs = allCRs.filter(
    (cr) => cr.requestedBy === userEmail && 
            !closedStates.includes(cr.state.toLowerCase()) && 
            cr.state.toLowerCase() !== "draft"
  );

  // Get pending approvals for this user using raw query
  const pendingApprovals = await prisma.$queryRaw<Array<{
    stepId: string;
    stepName: string;
    crNumber: string;
  }>>`
    SELECT 
      a.stepId,
      s.name as stepName,
      s.changeRequestId as crNumber
    FROM Approval a
    JOIN ApprovalStep s ON a.stepId = s.id
    WHERE a.approverEmail = ${userEmail}
    AND a.decision = 'pending'
  `;

  // Build approval CRs with step info
  const approvalCRMap = new Map<string, { stepId: string; stepName: string }>();
  for (const pa of pendingApprovals) {
    if (!approvalCRMap.has(pa.crNumber)) {
      approvalCRMap.set(pa.crNumber, { stepId: pa.stepId, stepName: pa.stepName });
    }
  }

  // Combine and deduplicate
  const allCRNumbers = new Set<string>();
  const tasks: Task[] = [];

  // Add approval tasks first (highest priority)
  // Skip draft CRs - approvers should not see drafts
  for (const [crNumber, stepInfo] of approvalCRMap) {
    const cr = allCRs.find((c) => c.number === crNumber);
    if (cr && !allCRNumbers.has(cr.number) && cr.state !== "draft") {
      allCRNumbers.add(cr.number);
      tasks.push({
        type: "approval",
        cr: {
          number: cr.number,
          title: cr.title,
          state: cr.state,
          priority: cr.priority,
          riskLevel: cr.riskLevel,
          requestedBy: cr.requestedBy,
          assignedTo: cr.assignedTo,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
          pendingApprovalStepId: stepInfo.stepId,
          pendingApprovalStepName: stepInfo.stepName,
        },
        reason: `Pending your approval in "${stepInfo.stepName}"`,
      });
    }
  }

  // Add assigned CRs (skip drafts - assigned users should not see drafts)
  for (const cr of assignedCRs) {
    if (!allCRNumbers.has(cr.number) && cr.state !== "draft") {
      allCRNumbers.add(cr.number);
      tasks.push({
        type: "assigned",
        cr: {
          number: cr.number,
          title: cr.title,
          state: cr.state,
          priority: cr.priority,
          riskLevel: cr.riskLevel,
          requestedBy: cr.requestedBy,
          assignedTo: cr.assignedTo,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
        },
        reason: "Assigned to you",
      });
    }
  }

  // Add requested CRs
  for (const cr of myRequestedCRs) {
    if (!allCRNumbers.has(cr.number)) {
      allCRNumbers.add(cr.number);
      tasks.push({
        type: "requested",
        cr: {
          number: cr.number,
          title: cr.title,
          state: cr.state,
          priority: cr.priority,
          riskLevel: cr.riskLevel,
          requestedBy: cr.requestedBy,
          assignedTo: cr.assignedTo,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
        },
        reason: "You requested this change",
      });
    }
  }

  return NextResponse.json({
    tasks,
    counts: {
      pendingApprovals: approvalCRMap.size,
      assigned: assignedCRs.length,
      requested: myRequestedCRs.length,
      total: tasks.length,
    },
  });
}
