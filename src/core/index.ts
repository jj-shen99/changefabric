/**
 * Public entry-point for the change-management core.
 *
 * Consumers (HTTP routes, server actions, scripts) should depend on these
 * exports — not on internal modules — to keep coupling to the framework
 * minimal.
 */

export * from "./schema";
export * from "./audit";
export * from "./workflow/state-machine";
export * from "./workflow/definitions";
export * from "./workflow/runtime";
export * from "./approval/engine";
export * from "./impact/analyzer";
export * from "./ml/risk";
export * from "./analytics";
export * from "./services/change-request-service";

import { prisma } from "@/lib/prisma";
import {
  PrismaAuditWriter,
  PrismaChangeRequestRepository,
} from "./adapters/prisma-repository";
import { ChangeRequestService } from "./services/change-request-service";
import { BUILTIN_WORKFLOWS } from "./workflow/definitions";
import { buildStandardRuntime } from "./workflow/runtime";

let _service: ChangeRequestService | null = null;

/**
 * Lazily build the singleton ChangeRequestService bound to Prisma + the
 * built-in workflow definitions. API routes call this on each request.
 */
export function getChangeRequestService(): ChangeRequestService {
  if (_service) return _service;
  const repo = new PrismaChangeRequestRepository(prisma);
  const audit = new PrismaAuditWriter(prisma);
  const runtime = buildStandardRuntime({
    loadApprovalSteps: (n) => repo.listApprovalSteps(n),
  });
  const wfMap = Object.fromEntries(BUILTIN_WORKFLOWS.map((w) => [w.key, w]));
  _service = new ChangeRequestService(repo, wfMap, runtime, audit);
  return _service;
}
