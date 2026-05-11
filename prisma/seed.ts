/**
 * Seed for the re-architected change-management schema.
 *
 * Inserts:
 *   - Users (admin + 2 managers + a few approvers)
 *   - Built-in workflow definitions (standard / emergency / pre-approved)
 *   - 3 sample releases
 *   - 5 sample change requests in different lifecycle states, including
 *     multi-person approval steps to demonstrate the new approval engine
 *   - A handful of comments + audit events
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDecipheriv, createHash } from "crypto";
import "dotenv/config";

import {
  BUILTIN_WORKFLOWS,
  analyzeImpact,
  predictRisk,
  type ChangeRequest as CoreCR,
} from "../src/core";

// Decrypt DATABASE_URL if encrypted (mirrors src/lib/crypto.ts logic)
if (process.env.DATABASE_URL?.startsWith("enc:")) {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
  const key = createHash("sha256").update(raw).digest();
  const packed = Buffer.from(process.env.DATABASE_URL.slice(4), "base64");
  const iv = packed.subarray(0, 16);
  const authTag = packed.subarray(16, 32);
  const ciphertext = packed.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  process.env.DATABASE_URL = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding re-architected change-management database…");

  // ── Users ──────────────────────────────────────────────────────
  // Helper to hash password based on email prefix (e.g., test10@example.com -> test10)
  async function hashEmailPrefix(email: string): Promise<string> {
    const prefix = email.split("@")[0];
    return bcrypt.hash(prefix, 12);
  }

  const adminPwd = await bcrypt.hash("admin123!", 12);
  const mgrPwd = await bcrypt.hash("manager123!", 12);

  // Pre-hash passwords for new role users
  const approverPwds = {
    "approver1@example.com": await hashEmailPrefix("approver1@example.com"),
    "approver2@example.com": await hashEmailPrefix("approver2@example.com"),
    "approver3@example.com": await hashEmailPrefix("approver3@example.com"),
    "cab-approver@example.com": await hashEmailPrefix("cab-approver@example.com"),
    "security-approver@example.com": await hashEmailPrefix("security-approver@example.com"),
  };
  const implementerPwds = {
    "implementer1@example.com": await hashEmailPrefix("implementer1@example.com"),
    "implementer2@example.com": await hashEmailPrefix("implementer2@example.com"),
    "devops1@example.com": await hashEmailPrefix("devops1@example.com"),
    "devops2@example.com": await hashEmailPrefix("devops2@example.com"),
    "sre1@example.com": await hashEmailPrefix("sre1@example.com"),
  };
  const requesterPwds = {
    "requester1@example.com": await hashEmailPrefix("requester1@example.com"),
    "requester2@example.com": await hashEmailPrefix("requester2@example.com"),
    "developer1@example.com": await hashEmailPrefix("developer1@example.com"),
    "developer2@example.com": await hashEmailPrefix("developer2@example.com"),
    "developer3@example.com": await hashEmailPrefix("developer3@example.com"),
    "pm1@example.com": await hashEmailPrefix("pm1@example.com"),
  };

  // ── Roles (System Roles) ─────────────────────────────────────
  console.log("Seeding roles…");
  const roles = [
    {
      name: "admin",
      displayName: "Administrator",
      description: "Full system access - can manage users, roles, settings, and all data",
      canManageUsers: true,
      canManageRoles: true,
      canManageChanges: true,
      canApproveChanges: true,
      canImplementChanges: true,
      canManageReleases: true,
      canEditSettings: true,
      canViewMetrics: true,
      canViewAllData: true,
      isSystem: true,
    },
    {
      name: "change_manager",
      displayName: "Change Manager",
      description: "Manage change requests, releases, and approve changes",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: true,
      canApproveChanges: true,
      canImplementChanges: true,
      canManageReleases: true,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: true,
      isSystem: true,
    },
    {
      name: "approver",
      displayName: "Approver",
      description: "Review and approve/reject change requests",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: true,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
      isSystem: true,
    },
    {
      name: "implementer",
      displayName: "Implementer",
      description: "Execute approved changes and update implementation status",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: false,
      canImplementChanges: true,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
      isSystem: true,
    },
    {
      name: "requester",
      displayName: "Requester",
      description: "Create and submit change requests",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: true,
      canApproveChanges: false,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: false,
      canViewAllData: false,
      isSystem: true,
    },
    {
      name: "viewer",
      displayName: "Viewer",
      description: "Read-only access to view change requests and metrics",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: false,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
      isSystem: true,
    },
    {
      name: "cab_member",
      displayName: "CAB Member",
      description: "Change Advisory Board member - approve high-risk changes",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: true,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: true,
      isSystem: true,
    },
    {
      name: "security_reviewer",
      displayName: "Security Reviewer",
      description: "Review and approve security-related changes",
      canManageUsers: false,
      canManageRoles: false,
      canManageChanges: false,
      canApproveChanges: true,
      canImplementChanges: false,
      canManageReleases: false,
      canEditSettings: false,
      canViewMetrics: true,
      canViewAllData: false,
      isSystem: true,
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { ...r },
      create: { ...r },
    });
    roleMap[r.name] = role.id;
  }

  // ── Users ──────────────────────────────────────────────────────
  console.log("Seeding users…");
  const users = [
    // Admins
    { email: "admin@example.com", name: "System Admin", roles: ["admin"], pwd: adminPwd },
    { email: "ops-admin@example.com", name: "Operations Admin", roles: ["admin"], pwd: adminPwd },
    
    // Engineering Managers (for normal/standard CRs)
    { email: "mike@example.com", name: "Mike Torres", roles: ["change_manager"], pwd: mgrPwd },
    { email: "lisa@example.com", name: "Lisa Wang", roles: ["change_manager"], pwd: mgrPwd },
    { email: "raj@example.com", name: "Raj Patel", roles: ["change_manager", "approver"], pwd: mgrPwd },
    { email: "sarah@example.com", name: "Sarah Chen", roles: ["change_manager"], pwd: mgrPwd },
    { email: "james@example.com", name: "James Wilson", roles: ["change_manager", "implementer"], pwd: mgrPwd },
    
    // Security Team (for security-related CRs)
    { email: "security@example.com", name: "Security Team", roles: ["security_reviewer"], pwd: mgrPwd },
    { email: "security-lead@example.com", name: "Alex Security Lead", roles: ["security_reviewer", "approver"], pwd: mgrPwd },
    
    // CAB Members (Change Advisory Board)
    { email: "cab@example.com", name: "CAB Chair", roles: ["cab_member", "approver"], pwd: mgrPwd },
    { email: "cab-member1@example.com", name: "CAB Member - Infrastructure", roles: ["cab_member"], pwd: mgrPwd },
    { email: "cab-member2@example.com", name: "CAB Member - Applications", roles: ["cab_member"], pwd: mgrPwd },
    
    // Emergency Approvers (on-call managers)
    { email: "oncall-primary@example.com", name: "On-Call Primary", roles: ["change_manager", "approver"], pwd: mgrPwd },
    { email: "oncall-secondary@example.com", name: "On-Call Secondary", roles: ["change_manager", "approver"], pwd: mgrPwd },
    
    // Database Team
    { email: "dba-lead@example.com", name: "DBA Lead", roles: ["change_manager", "approver"], pwd: mgrPwd },
    
    // Infrastructure Team
    { email: "infra-lead@example.com", name: "Infrastructure Lead", roles: ["change_manager", "implementer"], pwd: mgrPwd },

    // ── Approvers (dedicated approval role) ──
    { email: "approver1@example.com", name: "Alice Approver", roles: ["approver"], pwd: approverPwds["approver1@example.com"] },
    { email: "approver2@example.com", name: "Bob Approver", roles: ["approver"], pwd: approverPwds["approver2@example.com"] },
    { email: "approver3@example.com", name: "Carol Approver", roles: ["approver"], pwd: approverPwds["approver3@example.com"] },
    { email: "cab-approver@example.com", name: "CAB Approver", roles: ["cab_member", "approver"], pwd: approverPwds["cab-approver@example.com"] },
    { email: "security-approver@example.com", name: "Security Approver", roles: ["security_reviewer", "approver"], pwd: approverPwds["security-approver@example.com"] },

    // ── Implementers (execute approved changes) ──
    { email: "implementer1@example.com", name: "Ian Implementer", roles: ["implementer"], pwd: implementerPwds["implementer1@example.com"] },
    { email: "implementer2@example.com", name: "Ivy Implementer", roles: ["implementer"], pwd: implementerPwds["implementer2@example.com"] },
    { email: "devops1@example.com", name: "DevOps Engineer 1", roles: ["implementer", "requester"], pwd: implementerPwds["devops1@example.com"] },
    { email: "devops2@example.com", name: "DevOps Engineer 2", roles: ["implementer", "requester"], pwd: implementerPwds["devops2@example.com"] },
    { email: "sre1@example.com", name: "SRE Engineer", roles: ["implementer", "approver"], pwd: implementerPwds["sre1@example.com"] },

    // ── Requesters (create and submit CRs) ──
    { email: "requester1@example.com", name: "Rachel Requester", roles: ["requester"], pwd: requesterPwds["requester1@example.com"] },
    { email: "requester2@example.com", name: "Ryan Requester", roles: ["requester"], pwd: requesterPwds["requester2@example.com"] },
    { email: "developer1@example.com", name: "Dev One", roles: ["requester"], pwd: requesterPwds["developer1@example.com"] },
    { email: "developer2@example.com", name: "Dev Two", roles: ["requester"], pwd: requesterPwds["developer2@example.com"] },
    { email: "developer3@example.com", name: "Dev Three", roles: ["requester", "viewer"], pwd: requesterPwds["developer3@example.com"] },
    { email: "pm1@example.com", name: "Product Manager", roles: ["requester", "viewer"], pwd: requesterPwds["pm1@example.com"] },
  ];

  for (const u of users) {
    // Create or update user (without the old 'role' field)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { hashedPassword: u.pwd, name: u.name },
      create: { email: u.email, name: u.name, hashedPassword: u.pwd },
    });

    // Assign roles to user
    for (const roleName of u.roles) {
      const roleId = roleMap[roleName];
      if (roleId) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId } },
          update: {},
          create: { userId: user.id, roleId, assignedBy: "system" },
        });
      }
    }
  }

  // ── Groups ─────────────────────────────────────────────────────
  console.log("Seeding groups…");

  const groups = [
    { name: "Engineering", description: "Engineering team for technical reviews", type: "approver" },
    { name: "Security", description: "Security team for security assessments", type: "approver" },
    { name: "CAB", description: "Change Advisory Board", type: "approver" },
    { name: "On-Call", description: "On-call team for emergency approvals", type: "approver" },
    { name: "Admin", description: "System administrators", type: "both" },
    { name: "Infrastructure", description: "Infrastructure team", type: "both" },
    { name: "Database", description: "Database administration team", type: "both" },
    { name: "DevOps", description: "DevOps and SRE team", type: "assignment" },
    { name: "Platform", description: "Platform engineering team", type: "assignment" },
    { name: "QA", description: "Quality assurance team", type: "assignment" },
  ];

  for (const g of groups) {
    await prisma.group.upsert({
      where: { name: g.name },
      update: { description: g.description, type: g.type },
      create: { name: g.name, description: g.description, type: g.type, createdBy: "admin@example.com" },
    });
  }

  // ── CR Type Default Approvers ─────────────────────────────────
  console.log("Seeding CR type default approvers…");
  
  const crTypeApprovers = [
    // Standard (pre-approved) CRs - minimal approval needed
    { crType: "standard", approverEmail: "mike@example.com", stepName: "Tech Review", ordering: 1, approverGroup: "Engineering" },
    
    // Normal CRs - full approval cycle
    { crType: "normal", approverEmail: "lisa@example.com", stepName: "Tech Review", ordering: 1, approverGroup: "Engineering" },
    { crType: "normal", approverEmail: "raj@example.com", stepName: "Tech Review", ordering: 1, approverGroup: "Engineering" },
    { crType: "normal", approverEmail: "security@example.com", stepName: "Security Review", ordering: 2, approverGroup: "Security" },
    { crType: "normal", approverEmail: "cab@example.com", stepName: "CAB Approval", ordering: 3, approverGroup: "CAB" },
    { crType: "normal", approverEmail: "cab-member1@example.com", stepName: "CAB Approval", ordering: 3, approverGroup: "CAB" },
    
    // Emergency CRs - expedited approval (on-call managers)
    { crType: "emergency", approverEmail: "oncall-primary@example.com", stepName: "Emergency Approval", ordering: 1, approverGroup: "On-Call" },
    { crType: "emergency", approverEmail: "oncall-secondary@example.com", stepName: "Emergency Approval", ordering: 1, approverGroup: "On-Call" },
    { crType: "emergency", approverEmail: "admin@example.com", stepName: "Retro Approval", ordering: 2, approverGroup: "Admin" },
  ];

  for (const a of crTypeApprovers) {
    const id = crypto.randomUUID();
    try {
      await prisma.$executeRaw`
        INSERT OR IGNORE INTO CRTypeApprover (id, crType, approverEmail, approverGroup, stepName, ordering, isActive, createdBy, createdAt, updatedAt)
        VALUES (${id}, ${a.crType}, ${a.approverEmail}, ${a.approverGroup}, ${a.stepName}, ${a.ordering}, 1, 'admin@example.com', datetime('now'), datetime('now'))
      `;
    } catch {
      // Ignore duplicates
    }
  }

  // ── Workflow Definitions ───────────────────────────────────────
  for (const wf of BUILTIN_WORKFLOWS) {
    await prisma.workflowDefinition.upsert({
      where: { key: wf.key },
      update: {
        name: wf.name,
        description: wf.description ?? "",
        version: wf.version,
        definition: JSON.stringify(wf),
        isDefault: wf.key === "standard",
      },
      create: {
        key: wf.key,
        name: wf.name,
        description: wf.description ?? "",
        version: wf.version,
        definition: JSON.stringify(wf),
        isDefault: wf.key === "standard",
      },
    });
  }

  // ── Releases ───────────────────────────────────────────────────
  const releases = [
    {
      id: "REL-28",
      name: "Sprint 28 Release",
      version: "4.12.0",
      status: "staging",
      scheduledDate: new Date("2026-03-12T02:00:00Z"),
      overallRisk: 48,
      releaseManager: "Mike Torres",
    },
    {
      id: "REL-29",
      name: "Sprint 29 Release",
      version: "4.13.0",
      status: "planning",
      scheduledDate: new Date("2026-03-26T02:00:00Z"),
      overallRisk: 52,
      releaseManager: "Lisa Wang",
    },
    {
      id: "REL-27",
      name: "Sprint 27 Release",
      version: "4.11.2",
      status: "completed",
      scheduledDate: new Date("2026-02-26T02:00:00Z"),
      actualDate: new Date("2026-02-26T02:45:00Z"),
      overallRisk: 18,
      releaseManager: "Mike Torres",
    },
  ];
  for (const r of releases) {
    await prisma.release.upsert({ where: { id: r.id }, update: r, create: r });
  }

  // ── Sample Change Requests ─────────────────────────────────────
  type SeedCR = {
    number: string;
    title: string;
    description: string;
    type: "standard" | "normal" | "emergency";
    category: string;
    priority: "1" | "2" | "3" | "4";
    riskLevel: "low" | "moderate" | "high" | "very_high";
    impactLevel: "1" | "2" | "3";
    state: string;
    workflowKey: string;
    requestedBy: string;
    assignedTo?: string;
    assignmentGroup?: string;
    businessService?: string;
    affectedServices: string[];
    plannedStart?: Date;
    plannedEnd?: Date;
    implementationPlan: string;
    backoutPlan: string;
    testPlan: string;
    riskAndImpactAnalysis: string;
    justification: string;
    releaseId?: string;
    approvalSteps?: Array<{
      name: string;
      ordering: number;
      policy: "all" | "any" | `quorum:${number}`;
      approvers: Array<{ email: string; group?: string }>;
      decisions?: Array<{ email: string; decision: "approved" | "rejected"; comment?: string }>;
      status?: "pending" | "approved" | "rejected";
    }>;
    approvalState?: "not_requested" | "pending" | "approved" | "rejected";
  };

  const NOW = Date.now();
  const DAY = 86400000;
  const HOUR = 3600000;
  const MIN = 60000;

  const sample: SeedCR[] = [
    // ── In-flight changes ─────────────────────────────────────────
    {
      number: "CHG0000001",
      title: "Payment Gateway Migration to Stripe v3",
      description:
        "Migrate payment processing from legacy gateway to Stripe v3 API with new webhook handlers, retry logic, and observability.",
      type: "normal",
      category: "infrastructure",
      priority: "1",
      riskLevel: "high",
      impactLevel: "1",
      state: "awaiting_approval",
      approvalState: "pending",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignedTo: "mike@example.com",
      assignmentGroup: "Payments",
      businessService: "checkout",
      affectedServices: ["payment-service", "order-service", "billing-service", "notification-service"],
      plannedStart: new Date(NOW + 4 * DAY),
      plannedEnd: new Date(NOW + 4 * DAY + 90 * MIN),
      implementationPlan:
        "1. Deploy v3 SDK to staging.\n2. Run shadow traffic for 24h.\n3. Cut over 5% canary, monitor.\n4. Ramp to 100% over 60min.\n5. Deprecate v1 webhooks after 7d.",
      backoutPlan:
        "Toggle feature flag stripe.v3.enabled=false, revert webhook URL to legacy gateway, redeploy previous service version (rollback ETA <10 min).",
      testPlan:
        "Unit + integration tests for payment intent flow; canary with synthetic tx; load test 2x peak.",
      riskAndImpactAnalysis:
        "High blast radius (payments). Mitigated by canary + feature flag. Worst case: degraded payment success rate <5 min before rollback.",
      justification: "End-of-life of v1 SDK; security and reliability improvements; consolidates webhook handling.",
      releaseId: "REL-28",
      approvalSteps: [
        {
          name: "Tech Review",
          ordering: 1,
          policy: "all",
          approvers: [
            { email: "lisa@example.com", group: "Engineering" },
            { email: "raj@example.com", group: "Engineering" },
          ],
          decisions: [{ email: "lisa@example.com", decision: "approved", comment: "LGTM" }],
        },
        {
          name: "Security Sign-off",
          ordering: 2,
          policy: "any",
          approvers: [{ email: "security@example.com", group: "Security" }],
        },
        {
          name: "CAB",
          ordering: 3,
          policy: "quorum:1",
          approvers: [
            { email: "cab@example.com", group: "CAB" },
            { email: "admin@example.com", group: "CAB" },
          ],
        },
      ],
    },
    {
      number: "CHG0000002",
      title: "Add Redis Caching for User Profile API",
      description: "Add a Redis cache in front of the user-profile endpoint to reduce DB load by ~70%.",
      type: "standard",
      category: "feature",
      priority: "3",
      riskLevel: "low",
      impactLevel: "3",
      state: "scheduled",
      approvalState: "approved",
      workflowKey: "standard_preapproved",
      requestedBy: "raj@example.com",
      assignmentGroup: "Platform",
      affectedServices: ["user-service", "api-gateway"],
      plannedStart: new Date(NOW + 2 * DAY),
      plannedEnd: new Date(NOW + 2 * DAY + 30 * MIN),
      implementationPlan: "Deploy cache module, enable feature flag, monitor hit ratio for 24h.",
      backoutPlan: "Disable cache feature flag; service falls back to DB transparently.",
      testPlan: "Existing unit + integration suite. Cache hit ratio benchmark.",
      riskAndImpactAnalysis: "Low risk; pre-approved standard change.",
      justification: "Reduce p95 latency on /me endpoint.",
      releaseId: "REL-28",
    },
    {
      number: "CHG0000003",
      title: "Critical Auth Token Expiry Hotfix",
      description: "Race condition in token refresh causes premature 401s. Hotfix.",
      type: "emergency",
      category: "hotfix",
      priority: "1",
      riskLevel: "moderate",
      impactLevel: "1",
      state: "implemented",
      approvalState: "pending",
      workflowKey: "emergency",
      requestedBy: "lisa@example.com",
      assignmentGroup: "Identity",
      affectedServices: ["auth-service", "api-gateway", "session-service"],
      implementationPlan: "Deploy hotfix branch v4.11.3; canary 10% then full rollout.",
      backoutPlan: "Revert to v4.11.2 (last known good).",
      testPlan: "Token refresh regression suite + 24h soak.",
      riskAndImpactAnalysis: "Customer-impacting; emergency timeline approved verbally by on-call manager.",
      justification: "Active P1 incident.",
      approvalSteps: [
        {
          name: "Retro Approval",
          ordering: 1,
          policy: "any",
          approvers: [
            { email: "admin@example.com" },
            { email: "cab@example.com" },
          ],
        },
      ],
    },
    // ── Draft changes (various readiness) ─────────────────────────
    {
      number: "CHG0000004",
      title: "Database Schema Migration — Orders Table Partitioning",
      description: "Partition orders table by month to improve query performance. This change will restructure the orders table to use range partitioning based on the created_at timestamp, enabling faster queries for recent orders while maintaining access to historical data.",
      type: "normal",
      category: "database",
      priority: "2",
      riskLevel: "very_high",
      impactLevel: "1",
      state: "draft",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignmentGroup: "Data Engineering",
      affectedServices: ["order-service", "reporting-service", "analytics-pipeline", "billing-service"],
      plannedStart: new Date(NOW + 9 * DAY),
      plannedEnd: new Date(NOW + 9 * DAY + HOUR),
      implementationPlan: `1. Pre-migration preparation (Day -7):
   - Create full database backup and verify restore capability
   - Set up gh-ost on staging environment
   - Notify all dependent teams (order-service, reporting, analytics, billing)

2. Staging validation (Day -5 to -3):
   - Clone production data to staging (anonymized)
   - Execute partition migration using gh-ost with --test-on-replica
   - Run full regression test suite against partitioned table
   - Benchmark query performance: expect 60-80% improvement on date-range queries

3. Production migration (Day 0, 02:00-03:00 UTC maintenance window):
   - Enable read-only mode on order-service (circuit breaker)
   - Execute gh-ost migration: ALTER TABLE orders PARTITION BY RANGE (YEAR(created_at)*100 + MONTH(created_at))
   - Create partitions for last 24 months + future 3 months
   - Verify row counts match pre-migration
   - Re-enable write traffic with 5% canary

4. Post-migration validation:
   - Monitor query latency dashboards for 24 hours
   - Verify analytics pipeline processes new partition structure
   - Confirm billing reconciliation reports accurate`,
      backoutPlan: `1. Immediate rollback (if issues within 30 minutes):
   - Execute gh-ost reverse-cutover to restore original table
   - Verify application connectivity restored
   - Notify stakeholders of rollback

2. Extended rollback (if issues after cutover completed):
   - Restore from pre-migration backup (RTO: 45 minutes)
   - Point order-service to restored database
   - Re-sync any transactions from WAL logs
   - Schedule post-mortem and re-planning session

3. Partial rollback:
   - If only specific partitions affected, can drop and recreate individual partitions
   - Use pt-online-schema-change for targeted fixes`,
      testPlan: `1. Unit tests:
   - Partition boundary edge cases (month transitions, leap years)
   - Query plan verification for partition pruning
   - Index usage on partitioned columns

2. Integration tests:
   - order-service CRUD operations across partition boundaries
   - Reporting queries spanning multiple partitions
   - Analytics ETL pipeline with partitioned source

3. Performance tests:
   - Baseline: current query latency p50/p95/p99
   - Target: 60% reduction in p95 for date-range queries
   - Load test: 2x peak traffic for 1 hour
   - Verify no degradation for non-date queries

4. Chaos tests:
   - Simulate partition unavailability
   - Test failover to replica with partitions`,
      riskAndImpactAnalysis: `Risk Level: VERY HIGH

Primary Risks:
1. Data loss during migration (Likelihood: Low, Impact: Critical)
   - Mitigation: Full backup before migration, gh-ost atomic cutover
   
2. Extended downtime beyond maintenance window (Likelihood: Medium, Impact: High)
   - Mitigation: Rehearsed on staging 3x, documented rollback procedure
   
3. Application compatibility issues (Likelihood: Medium, Impact: High)
   - Mitigation: All dependent services tested against partitioned schema

4. Query performance regression for non-partitioned queries (Likelihood: Low, Impact: Medium)
   - Mitigation: Query plan analysis, index review

Blast Radius: 4 services directly affected, potential impact on checkout flow
Recovery Time Objective: 30 minutes for rollback, 45 minutes for restore
Recovery Point Objective: Zero data loss (synchronous replication)`,
      justification: `Business Need:
- Query latency on orders table exceeds SLO (p95 > 500ms) for orders older than 12 months
- Current table size: 2.3TB with 890M rows, growing 15% monthly
- Customer complaints about slow order history loading

Expected Benefits:
- 60-80% reduction in query latency for date-range queries
- Improved maintenance operations (can archive old partitions)
- Better resource utilization (partition pruning reduces I/O)

Alternatives Considered:
1. Add more read replicas - rejected (doesn't solve root cause, increases cost)
2. Archive old orders to cold storage - rejected (breaks reporting requirements)
3. Vertical scaling - rejected (approaching hardware limits)`,
      releaseId: "REL-29",
    },
    {
      number: "CHG0000006",
      title: "Upgrade Kubernetes Cluster to v1.29",
      description: "Rolling upgrade of production k8s cluster from 1.27 to 1.29. This upgrade includes critical security patches, improved pod scheduling, and deprecation fixes required before 1.27 EOL.",
      type: "normal",
      category: "infrastructure",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      state: "draft",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignmentGroup: "Infrastructure",
      affectedServices: ["all-services"],
      plannedStart: new Date(NOW + 14 * DAY),
      plannedEnd: new Date(NOW + 14 * DAY + 4 * HOUR),
      implementationPlan: `1. Pre-upgrade preparation (Week -1):
   - Review 1.29 release notes and breaking changes
   - Update all Helm charts for 1.29 compatibility
   - Verify PodDisruptionBudgets on all critical workloads
   - Test upgrade on staging cluster

2. Control plane upgrade (Day 0, 02:00 UTC):
   - Upgrade control plane components (API server, controller-manager, scheduler)
   - Verify API server health and etcd cluster status
   - Run conformance tests against new control plane

3. Node pool upgrade (Day 0, 03:00-06:00 UTC):
   - Cordon and drain nodes in batches of 3
   - Upgrade node OS and kubelet to 1.29
   - Uncordon and verify pod scheduling
   - Repeat for all node pools (web, worker, gpu)

4. Post-upgrade validation:
   - Run full smoke test suite
   - Verify all deployments healthy
   - Check Prometheus metrics for anomalies
   - Monitor for 24 hours before declaring success`,
      backoutPlan: `1. Node rollback (if issues during node upgrade):
   - Cordon affected nodes
   - Restore from node pool snapshot
   - Reschedule pods to healthy nodes

2. Control plane rollback (requires cloud provider support):
   - Open support ticket for control plane downgrade
   - ETA: 2-4 hours depending on provider response
   - May require etcd restore from backup

3. Workload rollback:
   - Revert Helm charts to 1.27-compatible versions
   - Redeploy affected workloads`,
      testPlan: `1. Staging cluster upgrade (complete before production):
   - Full upgrade rehearsal on staging
   - Run all integration tests
   - Performance baseline comparison

2. Production validation:
   - API server health checks
   - etcd cluster health
   - All system pods running
   - Ingress controller functional
   - DNS resolution working
   - Persistent volumes accessible

3. Application smoke tests:
   - Critical path tests for all services
   - Cross-service communication verification`,
      riskAndImpactAnalysis: `Risk Level: HIGH

Primary Risks:
1. Pod disruption during node drain (Likelihood: High, Impact: Medium)
   - Mitigation: PDBs configured, rolling update strategy

2. API incompatibility with deprecated features (Likelihood: Medium, Impact: High)
   - Mitigation: Deprecation warnings reviewed, charts updated

3. Extended upgrade time (Likelihood: Low, Impact: Medium)
   - Mitigation: Rehearsed on staging, documented procedures

Blast Radius: All services potentially affected during node drains
Maintenance Window: 4 hours (02:00-06:00 UTC)`,
      justification: `- Kubernetes 1.27 EOL in 60 days
- Security patches in 1.29 address 3 CVEs
- Required for new GPU node pool features
- Improved scheduler performance for large clusters`,
    },
    {
      number: "CHG0000007",
      title: "Add MFA Enforcement for Admin Users",
      description: "Require TOTP or WebAuthn for all admin-role users. This security enhancement adds a second factor of authentication for privileged accounts to meet SOC2 compliance requirements.",
      type: "normal",
      category: "security",
      priority: "1",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "draft",
      workflowKey: "standard",
      requestedBy: "security@example.com",
      assignmentGroup: "Security",
      affectedServices: ["auth-service", "admin-portal"],
      plannedStart: new Date(NOW + 5 * DAY),
      plannedEnd: new Date(NOW + 5 * DAY + 2 * HOUR),
      implementationPlan: `1. Deploy MFA infrastructure (Day 0):
   - Deploy TOTP verification service
   - Configure WebAuthn relying party
   - Set up backup codes generation

2. Enable opt-in MFA (Day 0-7):
   - Enable MFA enrollment for all admin users
   - Send enrollment invitation emails
   - Provide setup documentation and support

3. Grace period (Day 7-14):
   - Daily reminder emails to unenrolled admins
   - Slack notifications in admin channels
   - 1:1 outreach to remaining users

4. Enforcement (Day 14):
   - Enable mandatory MFA for admin role
   - Block login without MFA configured
   - Monitor for lockout issues`,
      backoutPlan: `1. Disable enforcement flag in auth-service config
2. Users can still use MFA optionally
3. Emergency bypass: support team can generate one-time codes
4. Full rollback: disable MFA module entirely if critical issues`,
      testPlan: `1. TOTP flow testing:
   - Enrollment with authenticator apps (Google, Authy, 1Password)
   - Login with valid/invalid codes
   - Code expiration handling

2. WebAuthn testing:
   - Security key registration (YubiKey, Touch ID)
   - Cross-browser compatibility
   - Fallback to TOTP

3. Recovery testing:
   - Backup code usage
   - Account recovery flow
   - Support-assisted reset`,
      riskAndImpactAnalysis: `Risk Level: MODERATE

Primary Risks:
1. Admin lockout if MFA setup fails (Likelihood: Medium, Impact: High)
   - Mitigation: Backup codes, support bypass, grace period

2. Reduced admin productivity during enrollment (Likelihood: High, Impact: Low)
   - Mitigation: Clear documentation, support availability

3. WebAuthn browser compatibility issues (Likelihood: Low, Impact: Medium)
   - Mitigation: TOTP fallback always available

Affected Users: 47 admin accounts
Compliance Deadline: SOC2 audit in 45 days`,
      justification: `SOC2 Compliance Requirement:
- Control CC6.1 requires MFA for privileged access
- Audit finding from last assessment
- Deadline: 45 days before next audit

Security Benefits:
- Prevents credential stuffing attacks
- Mitigates phishing risk for admin accounts
- Industry best practice for privileged access`,
    },
    {
      number: "CHG0000008",
      title: "Migrate Logging to OpenTelemetry",
      description: "Replace custom logging SDK with OpenTelemetry for unified observability. This standardization enables correlation between logs, traces, and metrics across all services.",
      type: "standard",
      category: "infrastructure",
      priority: "3",
      riskLevel: "low",
      impactLevel: "3",
      state: "submitted",
      workflowKey: "standard",
      requestedBy: "raj@example.com",
      assignmentGroup: "Platform",
      affectedServices: ["all-services"],
      plannedStart: new Date(NOW + 7 * DAY),
      plannedEnd: new Date(NOW + 7 * DAY + 2 * HOUR),
      implementationPlan: `1. Add OpenTelemetry SDK to services:
   - Install @opentelemetry/sdk-node package
   - Configure OTLP exporter to collector
   - Set up resource attributes (service name, version, environment)

2. Dual-write logging (Week 1-2):
   - Log to both legacy system and OTel collector
   - Verify log correlation IDs match traces
   - Compare log volumes between systems

3. Validation in Grafana (Week 2):
   - Create unified dashboards
   - Test log-to-trace correlation
   - Verify alerting rules work with new format

4. Deprecate legacy SDK (Week 3):
   - Remove legacy logging calls
   - Update documentation
   - Archive old dashboards`,
      backoutPlan: `1. Revert to legacy SDK by removing OTel initialization
2. No data loss - legacy system continues receiving logs during dual-write
3. Dashboards and alerts remain functional on legacy system`,
      testPlan: `1. Log correlation tests:
   - Verify trace_id appears in logs
   - Test span context propagation
   - Validate structured log format

2. Performance tests:
   - Measure logging overhead (target: <5% CPU increase)
   - Verify no memory leaks in SDK
   - Load test with 10x normal log volume

3. Integration tests:
   - Logs appear in Grafana Loki
   - Correlation with Tempo traces works
   - Alert rules trigger correctly`,
      riskAndImpactAnalysis: `Risk Level: LOW

Primary Risks:
1. Logging overhead increase (Likelihood: Low, Impact: Low)
   - Mitigation: Benchmarked SDK, sampling available

2. Missing logs during migration (Likelihood: Low, Impact: Medium)
   - Mitigation: Dual-write ensures no gaps

Blast Radius: Observability only, no customer impact
Rollback Time: Immediate (config change)`,
      justification: `Standardization Benefits:
- Unified observability across 47 services
- Correlation between logs, traces, and metrics
- Reduced vendor lock-in
- Industry standard (CNCF graduated project)

Current Pain Points:
- No log-trace correlation
- Different log formats per service
- Multiple logging libraries to maintain`,
    },
    // ── Closed/completed changes ──────────────────────────────────
    {
      number: "CHG0000005",
      title: "Enable Dark Mode Feature Flag",
      description: "Roll out dark mode to 100% after successful A/B.",
      type: "standard",
      category: "config",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      state: "closed",
      approvalState: "approved",
      workflowKey: "standard_preapproved",
      requestedBy: "raj@example.com",
      assignmentGroup: "Product",
      affectedServices: ["web-frontend"],
      plannedStart: new Date(NOW - 5 * DAY),
      plannedEnd: new Date(NOW - 5 * DAY + 5 * MIN),
      implementationPlan: "Flip feature flag in LaunchDarkly.",
      backoutPlan: "Flip the flag back.",
      testPlan: "Visual regression suite.",
      riskAndImpactAnalysis: "Trivial.",
      justification: "Successful A/B for 30 days.",
    },
    {
      number: "CHG0000009",
      title: "SSL Certificate Renewal — api.example.com",
      description: "Renew expiring SSL certificate for main API domain.",
      type: "standard",
      category: "security",
      priority: "2",
      riskLevel: "low",
      impactLevel: "1",
      state: "closed",
      approvalState: "approved",
      workflowKey: "standard_preapproved",
      requestedBy: "mike@example.com",
      assignmentGroup: "Infrastructure",
      affectedServices: ["api-gateway"],
      plannedStart: new Date(NOW - 3 * DAY),
      plannedEnd: new Date(NOW - 3 * DAY + 15 * MIN),
      implementationPlan: "1. Generate CSR.\n2. Submit to CA.\n3. Install cert.\n4. Verify.",
      backoutPlan: "Restore previous cert from backup.",
      testPlan: "SSL Labs scan; curl verification.",
      riskAndImpactAnalysis: "Brief TLS handshake failures if misconfigured.",
      justification: "Certificate expires in 7 days.",
    },
    {
      number: "CHG0000010",
      title: "Deprecate Legacy Search API v1",
      description: "Remove /api/v1/search endpoint after 6-month deprecation period.",
      type: "normal",
      category: "application",
      priority: "3",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "closed",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "lisa@example.com",
      assignmentGroup: "Backend",
      affectedServices: ["search-service", "api-gateway"],
      plannedStart: new Date(NOW - 10 * DAY),
      plannedEnd: new Date(NOW - 10 * DAY + 30 * MIN),
      implementationPlan: "1. Return 410 Gone.\n2. Monitor for stragglers.\n3. Remove code after 30d.",
      backoutPlan: "Re-enable endpoint via feature flag.",
      testPlan: "Integration tests for v2 migration.",
      riskAndImpactAnalysis: "Some legacy clients may break; communicated via email.",
      justification: "v2 API is stable; v1 maintenance burden.",
    },
    // ── More in-progress changes ──────────────────────────────────
    {
      number: "CHG0000011",
      title: "Add Rate Limiting to Public API",
      description: "Implement token bucket rate limiting on /api/public/* endpoints.",
      type: "normal",
      category: "security",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "in_progress",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "security@example.com",
      assignedTo: "raj@example.com",
      assignmentGroup: "Platform",
      affectedServices: ["api-gateway", "rate-limiter"],
      plannedStart: new Date(NOW - 1 * DAY),
      plannedEnd: new Date(NOW + 1 * DAY),
      implementationPlan: "1. Deploy rate limiter sidecar.\n2. Configure limits.\n3. Enable shadow mode.\n4. Enforce.",
      backoutPlan: "Disable rate limiter sidecar.",
      testPlan: "Load test with synthetic traffic.",
      riskAndImpactAnalysis: "Legitimate high-volume users may be throttled. Mitigated by allowlist.",
      justification: "Prevent abuse and ensure fair usage.",
    },
    {
      number: "CHG0000012",
      title: "Database Connection Pool Tuning",
      description: "Increase max connections and optimize pool settings for peak load.",
      type: "standard",
      category: "database",
      priority: "3",
      riskLevel: "low",
      impactLevel: "2",
      state: "approved",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignmentGroup: "Database",
      affectedServices: ["order-service", "user-service", "inventory-service"],
      plannedStart: new Date(NOW + 1 * DAY),
      plannedEnd: new Date(NOW + 1 * DAY + 30 * MIN),
      implementationPlan: "1. Update pool config.\n2. Rolling restart services.\n3. Monitor connection metrics.",
      backoutPlan: "Revert config and restart.",
      testPlan: "Connection pool metrics under load.",
      riskAndImpactAnalysis: "Brief connection drops during restart.",
      justification: "Connection exhaustion during peak hours.",
    },
    {
      number: "CHG0000013",
      title: "Implement GraphQL Federation",
      description: "Federate existing GraphQL schemas across microservices.",
      type: "normal",
      category: "infrastructure",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      state: "assessing",
      workflowKey: "standard",
      requestedBy: "lisa@example.com",
      assignmentGroup: "Backend",
      affectedServices: ["graphql-gateway", "user-service", "order-service", "product-service"],
      plannedStart: new Date(NOW + 21 * DAY),
      plannedEnd: new Date(NOW + 21 * DAY + 4 * HOUR),
      implementationPlan: "1. Add federation directives.\n2. Deploy router.\n3. Migrate clients.\n4. Deprecate monolith.",
      backoutPlan: "Route traffic back to monolith gateway.",
      testPlan: "Schema stitching tests; query latency benchmarks.",
      riskAndImpactAnalysis: "Complex migration; phased rollout required.",
      justification: "Enable independent service deployments.",
    },
    {
      number: "CHG0000014",
      title: "Upgrade Node.js to v20 LTS",
      description: "Upgrade all Node.js services from v18 to v20 LTS.",
      type: "standard",
      category: "application",
      priority: "3",
      riskLevel: "moderate",
      impactLevel: "3",
      state: "reviewing",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "raj@example.com",
      assignmentGroup: "Backend",
      affectedServices: ["api-gateway", "auth-service", "notification-service"],
      plannedStart: new Date(NOW - 2 * DAY),
      plannedEnd: new Date(NOW - 2 * DAY + 2 * HOUR),
      implementationPlan: "1. Update base images.\n2. Run CI.\n3. Deploy to staging.\n4. Production rollout.",
      backoutPlan: "Revert to v18 images.",
      testPlan: "Full regression suite; performance benchmarks.",
      riskAndImpactAnalysis: "Breaking changes in native modules. Mitigated by staging validation.",
      justification: "v18 EOL approaching; performance improvements in v20.",
    },
    {
      number: "CHG0000015",
      title: "Add Prometheus Metrics to Payment Service",
      description: "Instrument payment service with custom Prometheus metrics.",
      type: "standard",
      category: "feature",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      state: "scheduled",
      approvalState: "approved",
      workflowKey: "standard_preapproved",
      requestedBy: "mike@example.com",
      assignmentGroup: "Payments",
      affectedServices: ["payment-service"],
      plannedStart: new Date(NOW + 3 * DAY),
      plannedEnd: new Date(NOW + 3 * DAY + HOUR),
      implementationPlan: "1. Add prom-client.\n2. Define metrics.\n3. Expose /metrics.\n4. Configure scraping.",
      backoutPlan: "Remove metrics endpoint.",
      testPlan: "Verify metrics in Grafana.",
      riskAndImpactAnalysis: "Minimal; metrics endpoint is low overhead.",
      justification: "Improve observability for payment flows.",
    },
    // ── Rejected/canceled changes ─────────────────────────────────
    {
      number: "CHG0000016",
      title: "Replace PostgreSQL with CockroachDB",
      description: "Migrate primary database to CockroachDB for global distribution.",
      type: "normal",
      category: "database",
      priority: "1",
      riskLevel: "very_high",
      impactLevel: "1",
      state: "rejected",
      approvalState: "rejected",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignmentGroup: "Data Engineering",
      affectedServices: ["all-services"],
      implementationPlan: "Full database migration with dual-write period.",
      backoutPlan: "Revert to PostgreSQL.",
      testPlan: "Extensive compatibility testing.",
      riskAndImpactAnalysis: "Extremely high risk; requires significant testing.",
      justification: "Global latency requirements.",
    },
    {
      number: "CHG0000017",
      title: "Sunset Mobile App v2",
      description: "Force upgrade users from v2 to v3 mobile app.",
      type: "normal",
      category: "application",
      priority: "3",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "canceled",
      workflowKey: "standard",
      requestedBy: "lisa@example.com",
      assignmentGroup: "Mobile",
      affectedServices: ["mobile-api", "push-service"],
      implementationPlan: "1. Show upgrade banner.\n2. Block API access after 30d.",
      backoutPlan: "Re-enable v2 API access.",
      testPlan: "Upgrade flow testing.",
      riskAndImpactAnalysis: "User churn risk.",
      justification: "Reduce maintenance burden.",
    },
    // ── More variety ──────────────────────────────────────────────
    {
      number: "CHG0000018",
      title: "Configure CDN Caching for Static Assets",
      description: "Enable CloudFront caching for /static/* with 1-year TTL.",
      type: "standard",
      category: "infrastructure",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      state: "closed",
      approvalState: "approved",
      workflowKey: "standard_preapproved",
      requestedBy: "raj@example.com",
      assignmentGroup: "Infrastructure",
      affectedServices: ["web-frontend", "cdn"],
      plannedStart: new Date(NOW - 7 * DAY),
      plannedEnd: new Date(NOW - 7 * DAY + 20 * MIN),
      implementationPlan: "Update CloudFront behavior; invalidate cache.",
      backoutPlan: "Revert behavior to pass-through.",
      testPlan: "Cache-Control header verification.",
      riskAndImpactAnalysis: "Stale assets if cache not invalidated on deploy.",
      justification: "Reduce origin load and improve TTFB.",
    },
    {
      number: "CHG0000019",
      title: "Enable Automatic Failover for Redis Cluster",
      description: "Configure Redis Sentinel for automatic primary failover.",
      type: "normal",
      category: "infrastructure",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "awaiting_approval",
      approvalState: "pending",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignmentGroup: "Infrastructure",
      affectedServices: ["cache-service", "session-service"],
      plannedStart: new Date(NOW + 5 * DAY),
      plannedEnd: new Date(NOW + 5 * DAY + 2 * HOUR),
      implementationPlan: "1. Deploy Sentinel.\n2. Configure clients.\n3. Test failover.\n4. Enable.",
      backoutPlan: "Disable Sentinel; manual failover.",
      testPlan: "Chaos engineering: kill primary, verify failover.",
      riskAndImpactAnalysis: "Brief connection drops during failover.",
      justification: "Reduce MTTR for Redis outages.",
      approvalSteps: [
        {
          name: "Tech Review",
          ordering: 1,
          policy: "all",
          approvers: [
            { email: "raj@example.com", group: "Engineering" },
          ],
        },
        {
          name: "CAB",
          ordering: 2,
          policy: "any",
          approvers: [
            { email: "cab@example.com", group: "CAB" },
          ],
        },
      ],
    },
    {
      number: "CHG0000020",
      title: "Implement Circuit Breaker for External APIs",
      description: "Add Resilience4j circuit breaker to all external API calls.",
      type: "standard",
      category: "application",
      priority: "3",
      riskLevel: "low",
      impactLevel: "2",
      state: "draft",
      workflowKey: "standard",
      requestedBy: "lisa@example.com",
      assignmentGroup: "Backend",
      affectedServices: ["payment-service", "shipping-service", "notification-service"],
      implementationPlan: "1. Add library.\n2. Configure thresholds.\n3. Add fallbacks.\n4. Monitor.",
      backoutPlan: "Disable circuit breaker; direct calls.",
      testPlan: "Fault injection testing.",
      riskAndImpactAnalysis: "Improved resilience; minimal risk.",
      justification: "Prevent cascade failures from external dependencies.",
    },
    // ── HIGH READINESS SCORE CHANGES (exemplary documentation) ─────
    {
      number: "CHG0000021",
      title: "Kubernetes Cluster Upgrade to v1.29",
      description: "Upgrade production Kubernetes cluster from v1.27 to v1.29 LTS with zero-downtime rolling update strategy. This upgrade includes security patches, performance improvements, and new features for workload management.",
      type: "normal",
      category: "infrastructure",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "2",
      state: "approved",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "raj@example.com",
      assignedTo: "raj@example.com",
      assignmentGroup: "Infrastructure",
      businessService: "platform",
      affectedServices: ["k8s-control-plane", "k8s-worker-nodes", "ingress-controller", "cert-manager"],
      plannedStart: new Date(NOW + 7 * DAY),
      plannedEnd: new Date(NOW + 7 * DAY + 4 * HOUR),
      implementationPlan: `1. Pre-upgrade Preparation (T-7 days):
   - Review Kubernetes v1.29 release notes and breaking changes
   - Audit all deployed workloads for deprecated API versions
   - Update Helm charts to use supported API versions
   - Create cluster snapshot and etcd backup
   - Notify all application teams of maintenance window

2. Staging Environment Upgrade (T-5 days):
   - Upgrade staging cluster control plane to v1.29
   - Upgrade staging worker nodes using rolling update
   - Run full integration test suite against staging
   - Verify all workloads healthy for 48 hours
   - Document any issues and mitigations

3. Production Control Plane Upgrade (T-0):
   - Enable maintenance mode for non-critical workloads
   - Upgrade control plane components (api-server, controller-manager, scheduler)
   - Verify control plane health via kubectl and monitoring
   - Run smoke tests against critical services

4. Production Worker Node Upgrade (T+1h):
   - Cordon and drain worker nodes one at a time
   - Upgrade kubelet and container runtime
   - Uncordon and verify node ready status
   - Monitor pod scheduling and resource utilization
   - Repeat for all worker nodes (rolling, max 1 unavailable)

5. Post-upgrade Validation (T+3h):
   - Verify all deployments, statefulsets, and daemonsets healthy
   - Run end-to-end test suite
   - Verify ingress and certificate management
   - Confirm monitoring and logging operational
   - Update runbooks with new cluster version`,
      backoutPlan: `1. Immediate Rollback (< 30 minutes into upgrade):
   - Restore control plane from etcd snapshot
   - Revert worker node images to v1.27
   - Verify cluster stability

2. Partial Rollback (worker nodes upgraded):
   - Control plane supports n-2 worker versions
   - Drain and rollback affected worker nodes
   - Keep control plane at v1.29 if stable

3. Full Rollback (if critical issues):
   - Restore full cluster from backup
   - Redeploy workloads from GitOps repository
   - Estimated recovery time: 45 minutes

4. Communication:
   - Notify stakeholders via Slack #platform-alerts
   - Update status page
   - Create incident ticket for post-mortem`,
      testPlan: `1. Pre-upgrade Tests:
   - API deprecation scanner (kubent) - verify no deprecated APIs
   - Node readiness checks across all availability zones
   - etcd health and backup verification
   - Certificate expiration check (> 30 days remaining)

2. Staging Validation:
   - Full integration test suite (Jest + Playwright)
   - Load test at 2x production traffic
   - Chaos engineering: node failure, network partition
   - Security scan with Trivy and Falco

3. Production Smoke Tests:
   - kubectl get nodes - all Ready
   - kubectl get pods -A - no CrashLoopBackOff
   - Ingress health checks (HTTP 200 on /healthz)
   - Prometheus metrics collection verified
   - Grafana dashboards loading correctly

4. Post-upgrade Validation:
   - End-to-end user journey tests
   - API latency within SLO (p99 < 200ms)
   - Error rate < 0.1%
   - Resource utilization within bounds`,
      riskAndImpactAnalysis: `Risk Assessment:
- Severity: Medium (infrastructure change affecting all workloads)
- Likelihood: Low (well-tested upgrade path, staging validated)
- Blast Radius: High (all services run on this cluster)

Mitigations:
1. Rolling update strategy ensures no downtime
2. Staging environment validates upgrade path
3. Comprehensive monitoring detects issues early
4. Automated rollback procedures tested quarterly
5. Maintenance window during low-traffic period (2 AM - 6 AM UTC)

Impact Analysis:
- Expected downtime: 0 minutes (rolling update)
- Potential degradation: Brief pod rescheduling (< 30 seconds per node)
- Affected users: None (transparent to end users)
- Dependent systems: All services (mitigated by rolling update)`,
      justification: `Business Justification:
1. Security: v1.27 reaches end-of-support in 60 days; v1.29 includes critical CVE patches
2. Compliance: SOC2 requires running supported software versions
3. Features: v1.29 includes improved pod scheduling and resource management
4. Cost: New features enable better bin-packing, estimated 15% cost reduction
5. Reliability: Bug fixes for known issues affecting our workloads`,
    },
    {
      number: "CHG0000022",
      title: "Implement Distributed Tracing with OpenTelemetry",
      description: "Deploy OpenTelemetry collectors and instrument all microservices for distributed tracing. This enables end-to-end request visibility, performance bottleneck identification, and improved debugging capabilities.",
      type: "standard",
      category: "feature",
      priority: "3",
      riskLevel: "low",
      impactLevel: "3",
      state: "scheduled",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignedTo: "mike@example.com",
      assignmentGroup: "Platform",
      businessService: "observability",
      affectedServices: ["otel-collector", "api-gateway", "user-service", "order-service", "payment-service"],
      plannedStart: new Date(NOW + 3 * DAY),
      plannedEnd: new Date(NOW + 3 * DAY + 2 * HOUR),
      implementationPlan: `1. Infrastructure Setup (Week 1):
   - Deploy OpenTelemetry Collector as DaemonSet
   - Configure Jaeger backend for trace storage
   - Set up Grafana Tempo for long-term retention
   - Create Kubernetes ConfigMaps for collector configuration
   - Verify collector health and connectivity

2. SDK Integration (Week 2):
   - Add OpenTelemetry SDK to each service (Node.js: @opentelemetry/sdk-node)
   - Configure automatic instrumentation for HTTP, gRPC, and database calls
   - Add custom spans for business-critical operations
   - Implement context propagation via W3C Trace Context headers
   - Set sampling rate to 10% for production (100% for errors)

3. Service-by-Service Rollout:
   - Day 1: api-gateway (entry point, validates propagation)
   - Day 2: user-service, auth-service
   - Day 3: order-service, inventory-service
   - Day 4: payment-service, notification-service
   - Day 5: Background workers and async processors

4. Validation and Tuning:
   - Verify end-to-end traces in Jaeger UI
   - Tune sampling rates based on volume
   - Set up trace-based alerts for latency anomalies
   - Create runbook for trace-based debugging

5. Documentation and Training:
   - Update developer onboarding guide
   - Create trace analysis playbook
   - Conduct team training session`,
      backoutPlan: `1. Per-Service Rollback:
   - Remove OTEL_* environment variables from deployment
   - Redeploy service without tracing SDK
   - Service continues to function without tracing

2. Collector Rollback:
   - Scale collector DaemonSet to 0 replicas
   - Services gracefully handle missing collector (no-op exporter)
   - No impact to application functionality

3. Full Rollback:
   - Revert all service deployments to pre-tracing versions
   - Remove collector infrastructure
   - Estimated time: 15 minutes per service

Note: Tracing is additive and non-blocking. Failure modes result in missing traces, not service failures.`,
      testPlan: `1. Unit Tests:
   - Verify span creation for HTTP handlers
   - Test context propagation across async boundaries
   - Validate custom attribute injection
   - Test sampling decision logic

2. Integration Tests:
   - End-to-end trace verification across 3+ services
   - Verify trace ID consistency in logs
   - Test error span creation and status codes
   - Validate baggage propagation

3. Performance Tests:
   - Measure latency overhead (target: < 1ms p99)
   - Memory usage impact (target: < 50MB per service)
   - CPU overhead (target: < 2%)
   - Collector throughput test (10k spans/second)

4. Chaos Tests:
   - Collector unavailable: verify graceful degradation
   - Network partition: verify no data loss with buffering
   - High cardinality: verify memory bounds

5. Acceptance Criteria:
   - [ ] Traces visible in Jaeger within 5 seconds
   - [ ] Service maps accurately reflect dependencies
   - [ ] Latency histograms match Prometheus metrics
   - [ ] Error traces include stack traces`,
      riskAndImpactAnalysis: `Risk Assessment:
- Severity: Low (additive feature, non-blocking)
- Likelihood: Very Low (well-tested SDK, gradual rollout)
- Blast Radius: Low (failure results in missing traces only)

Technical Risks:
1. Performance overhead - Mitigated by sampling and async export
2. Storage costs - Mitigated by retention policies and sampling
3. Cardinality explosion - Mitigated by attribute allow-lists

Operational Risks:
1. Learning curve - Mitigated by training and documentation
2. Alert fatigue - Mitigated by tuned thresholds

Impact Analysis:
- User impact: None (transparent instrumentation)
- Performance impact: < 1ms latency increase
- Storage impact: ~500GB/month at 10% sampling`,
      justification: `Business Value:
1. MTTR Reduction: Distributed tracing reduces debugging time by 60% based on industry benchmarks
2. Performance Optimization: Identify bottlenecks across service boundaries
3. SLO Monitoring: Trace-based SLIs provide accurate latency measurements
4. Incident Response: Faster root cause analysis during outages
5. Developer Productivity: Self-service debugging without log correlation

Cost-Benefit:
- Implementation cost: 2 engineer-weeks
- Infrastructure cost: $500/month (Jaeger + storage)
- Expected savings: 4 hours/week in debugging time = $2000/month`,
    },
    {
      number: "CHG0000023",
      title: "Zero-Downtime PostgreSQL Major Version Upgrade (14 to 16)",
      description: "Upgrade production PostgreSQL cluster from version 14 to version 16 using logical replication for zero-downtime migration. Includes performance optimizations and security enhancements.",
      type: "normal",
      category: "database",
      priority: "2",
      riskLevel: "high",
      impactLevel: "1",
      state: "awaiting_approval",
      approvalState: "pending",
      workflowKey: "standard",
      requestedBy: "mike@example.com",
      assignedTo: "mike@example.com",
      assignmentGroup: "Data Engineering",
      businessService: "database",
      affectedServices: ["postgresql-primary", "postgresql-replicas", "order-service", "user-service", "inventory-service"],
      plannedStart: new Date(NOW + 14 * DAY),
      plannedEnd: new Date(NOW + 14 * DAY + 6 * HOUR),
      implementationPlan: `1. Pre-Migration Preparation (T-14 days):
   - Provision new PostgreSQL 16 cluster in parallel
   - Configure logical replication from PG14 to PG16
   - Verify all extensions compatible with PG16
   - Update connection pooler (PgBouncer) configuration
   - Create comprehensive backup of PG14 cluster

2. Logical Replication Setup (T-7 days):
   - Enable logical replication on PG14 (wal_level = logical)
   - Create publication for all tables
   - Create subscription on PG16 cluster
   - Verify initial data sync completes successfully
   - Monitor replication lag (target: < 100ms)

3. Application Preparation (T-3 days):
   - Update connection strings in Kubernetes secrets (not activated)
   - Prepare feature flags for database cutover
   - Test application against PG16 in staging
   - Verify query plans and performance benchmarks
   - Brief on-call team on cutover procedure

4. Cutover Execution (T-0):
   - Enable read-only mode on application (feature flag)
   - Wait for replication lag to reach 0
   - Promote PG16 as new primary
   - Update DNS/connection strings to point to PG16
   - Disable read-only mode
   - Verify application connectivity and functionality

5. Post-Migration Validation:
   - Run ANALYZE on all tables for fresh statistics
   - Verify query performance matches baseline
   - Monitor error rates and latency for 24 hours
   - Keep PG14 cluster available for 7 days (rollback option)
   - Decommission PG14 after validation period`,
      backoutPlan: `1. Immediate Rollback (during cutover):
   - Re-enable PG14 as primary
   - Update DNS/connection strings to PG14
   - Disable read-only mode
   - Estimated time: 5 minutes

2. Post-Cutover Rollback (< 24 hours):
   - Set up reverse logical replication (PG16 → PG14)
   - Wait for sync to complete
   - Execute cutover procedure in reverse
   - Estimated time: 30 minutes

3. Extended Rollback (> 24 hours):
   - Restore PG14 from backup
   - Replay WAL logs to point-in-time
   - May result in data loss for period after cutover
   - Estimated time: 2-4 hours

4. Rollback Decision Criteria:
   - Error rate > 1% for > 5 minutes
   - Latency p99 > 500ms for > 5 minutes
   - Any data integrity issues detected
   - Replication lag > 1 second sustained`,
      testPlan: `1. Pre-Migration Testing:
   - pg_upgrade --check dry run
   - Extension compatibility verification
   - Query plan comparison (pg_stat_statements)
   - Connection pooler compatibility test

2. Staging Environment:
   - Full migration rehearsal with production-like data
   - Load test at 150% production traffic
   - Measure cutover time (target: < 30 seconds)
   - Test rollback procedure

3. Data Integrity Verification:
   - Row count comparison across all tables
   - Checksum verification for critical tables
   - Foreign key constraint validation
   - Sequence value verification

4. Performance Benchmarks:
   - Top 100 queries by execution time
   - Index usage statistics
   - Buffer cache hit ratio (target: > 99%)
   - Connection handling under load

5. Application Testing:
   - Full regression test suite
   - Transaction isolation verification
   - Prepared statement compatibility
   - ORM query generation validation`,
      riskAndImpactAnalysis: `Risk Assessment:
- Severity: High (primary database, all services affected)
- Likelihood: Low (proven migration path, staging validated)
- Blast Radius: Critical (database serves all applications)

Technical Risks:
1. Replication lag during high write load
   - Mitigation: Schedule during low-traffic window
   - Mitigation: Pre-warm PG16 with batch operations

2. Query plan regression
   - Mitigation: Analyze all tables post-migration
   - Mitigation: Pin critical query plans if needed

3. Extension incompatibility
   - Mitigation: Test all extensions in staging
   - Mitigation: Have extension upgrade scripts ready

4. Connection handling differences
   - Mitigation: Update PgBouncer configuration
   - Mitigation: Test connection limits

Operational Risks:
1. Cutover timing
   - Mitigation: Automated cutover script
   - Mitigation: Clear go/no-go criteria

2. Rollback complexity
   - Mitigation: Keep PG14 running for 7 days
   - Mitigation: Tested rollback procedure

Impact Analysis:
- Expected downtime: 0 (logical replication)
- Read-only period: < 30 seconds during cutover
- Performance impact: Expected 10-15% improvement`,
      justification: `Business Justification:
1. Security: PG14 EOL in 12 months; PG16 includes security enhancements
2. Performance: PG16 offers 20% improvement in OLTP workloads
3. Features: Improved JSON support, better parallel query execution
4. Compliance: Maintain supported software per security policy
5. Cost: Better query optimization reduces compute requirements

Technical Debt:
- Addresses 3 known PG14 bugs affecting our workload
- Enables use of new partitioning features
- Improves vacuum performance for large tables`,
      approvalSteps: [
        {
          name: "DBA Review",
          ordering: 1,
          policy: "all",
          approvers: [
            { email: "mike@example.com", group: "Data Engineering" },
            { email: "raj@example.com", group: "Data Engineering" },
          ],
          decisions: [
            { email: "mike@example.com", decision: "approved", comment: "Migration plan reviewed and approved" },
          ],
        },
        {
          name: "Security Review",
          ordering: 2,
          policy: "any",
          approvers: [{ email: "security@example.com", group: "Security" }],
        },
        {
          name: "CAB Approval",
          ordering: 3,
          policy: "quorum:1",
          approvers: [
            { email: "cab@example.com", group: "CAB" },
            { email: "admin@example.com", group: "CAB" },
          ],
        },
      ],
    },
    {
      number: "CHG0000024",
      title: "Deploy Automated Canary Analysis Pipeline",
      description: "Implement automated canary deployment analysis using Kayenta and Spinnaker. Enables data-driven deployment decisions based on statistical comparison of canary vs baseline metrics.",
      type: "standard",
      category: "feature",
      priority: "3",
      riskLevel: "low",
      impactLevel: "3",
      state: "in_progress",
      approvalState: "approved",
      workflowKey: "standard",
      requestedBy: "lisa@example.com",
      assignedTo: "lisa@example.com",
      assignmentGroup: "DevOps",
      businessService: "deployment-platform",
      affectedServices: ["spinnaker", "kayenta", "prometheus", "deployment-pipeline"],
      plannedStart: new Date(NOW - 2 * DAY),
      plannedEnd: new Date(NOW + 1 * DAY),
      implementationPlan: `1. Infrastructure Setup:
   - Deploy Kayenta service in Kubernetes
   - Configure Prometheus as metrics source
   - Set up Kayenta storage (S3 for analysis results)
   - Integrate with existing Spinnaker installation

2. Metric Configuration:
   - Define canary metrics (latency, error rate, CPU, memory)
   - Configure metric groups (critical, important, informational)
   - Set scoring thresholds (marginal: 50, pass: 75)
   - Create metric templates for common service types

3. Pipeline Integration:
   - Add canary analysis stage to deployment pipelines
   - Configure baseline vs canary comparison window (30 min)
   - Set up automatic rollback on canary failure
   - Add manual judgment gate for marginal scores

4. Validation and Rollout:
   - Test with non-critical service deployment
   - Validate scoring accuracy against known-bad deployments
   - Roll out to all production pipelines
   - Create dashboard for canary analysis history

5. Documentation:
   - Canary configuration guide for service owners
   - Metric selection best practices
   - Troubleshooting guide for failed canaries`,
      backoutPlan: `1. Pipeline Rollback:
   - Remove canary analysis stage from pipelines
   - Revert to manual deployment approval
   - No impact to deployed services

2. Infrastructure Rollback:
   - Scale Kayenta to 0 replicas
   - Pipelines skip analysis stage gracefully
   - Estimated time: 5 minutes

Note: Canary analysis is advisory. Rollback simply removes the analysis gate; deployments continue with manual approval.`,
      testPlan: `1. Unit Tests:
   - Metric query generation
   - Score calculation logic
   - Threshold evaluation

2. Integration Tests:
   - Prometheus connectivity
   - Spinnaker stage execution
   - S3 result storage

3. End-to-End Tests:
   - Deploy known-good version: expect pass
   - Deploy known-bad version: expect fail
   - Deploy marginal version: expect manual judgment

4. Performance Tests:
   - Analysis completion time (target: < 5 min)
   - Concurrent analysis capacity (target: 10)

5. Acceptance Criteria:
   - [ ] Canary analysis completes within SLA
   - [ ] Failed canaries trigger automatic rollback
   - [ ] Results visible in Spinnaker UI
   - [ ] Historical analysis accessible`,
      riskAndImpactAnalysis: `Risk Assessment:
- Severity: Low (deployment tooling, not production services)
- Likelihood: Very Low (well-tested integration)
- Blast Radius: Low (affects deployment process only)

Risks:
1. False positives blocking good deployments
   - Mitigation: Tuned thresholds, manual override available

2. False negatives allowing bad deployments
   - Mitigation: Conservative initial thresholds, iterative tuning

3. Analysis delays slowing deployments
   - Mitigation: Parallel analysis, timeout configuration

Impact:
- Deployment time increase: +35 minutes (analysis window)
- Developer experience: Improved confidence in deployments
- Incident reduction: Expected 30% fewer deployment-related incidents`,
      justification: `Business Value:
1. Reliability: Automated detection of deployment regressions
2. Speed: Faster rollback on detected issues (< 5 min vs 30 min manual)
3. Confidence: Data-driven deployment decisions
4. Learning: Historical analysis informs future improvements

ROI Analysis:
- Implementation: 3 engineer-weeks
- Operational cost: $200/month (Kayenta infrastructure)
- Expected savings: 2 incidents/month prevented = $10,000/month`,
    },
  ];

  for (const s of sample) {
    // Build a draft CR matching the core schema so we can run analyze() + predictRisk()
    const coreCR: CoreCR = {
      number: s.number,
      externalId: null,
      externalSource: null,
      workflowKey: s.workflowKey,
      title: s.title,
      description: s.description,
      type: s.type,
      category: s.category,
      priority: s.priority,
      riskLevel: s.riskLevel,
      impactLevel: s.impactLevel,
      urgency: "3",
      state: s.state,
      approvalState: s.approvalState ?? "not_requested",
      justification: s.justification,
      implementationPlan: s.implementationPlan,
      backoutPlan: s.backoutPlan,
      testPlan: s.testPlan,
      riskAndImpactAnalysis: s.riskAndImpactAnalysis,
      closeCode: s.state === "closed" ? "successful" : "",
      closeNotes: "",
      plannedStart: s.plannedStart?.toISOString() ?? null,
      plannedEnd: s.plannedEnd?.toISOString() ?? null,
      actualStart: null,
      actualEnd: null,
      requestedBy: s.requestedBy,
      assignedTo: s.assignedTo ?? null,
      assignmentGroup: s.assignmentGroup ?? null,
      configurationItem: null,
      businessService: s.businessService ?? null,
      affectedServices: s.affectedServices,
      tags: [],
      computedRiskScore: 0,
      computedImpactScore: 0,
      mlRiskScore: null,
      mlConfidence: null,
      mlExplanation: null,
      releaseId: s.releaseId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: s.requestedBy,
      closedAt: s.state === "closed" ? new Date(NOW - 4 * 86400000).toISOString() : null,
      closedBy: s.state === "closed" ? s.requestedBy : null,
    };
    const impact = analyzeImpact(coreCR);
    const ml = predictRisk(coreCR);

    const crData = {
      workflowKey: coreCR.workflowKey,
      title: coreCR.title,
      description: coreCR.description,
      type: coreCR.type,
      category: coreCR.category,
      priority: coreCR.priority,
      riskLevel: coreCR.riskLevel,
      impactLevel: coreCR.impactLevel,
      urgency: coreCR.urgency,
      state: coreCR.state,
      approvalState: coreCR.approvalState,
      justification: coreCR.justification,
      implementationPlan: coreCR.implementationPlan,
      backoutPlan: coreCR.backoutPlan,
      testPlan: coreCR.testPlan,
      riskAndImpactAnalysis: coreCR.riskAndImpactAnalysis,
      closeCode: coreCR.closeCode,
      closeNotes: coreCR.closeNotes,
      plannedStart: coreCR.plannedStart ? new Date(coreCR.plannedStart) : null,
      plannedEnd: coreCR.plannedEnd ? new Date(coreCR.plannedEnd) : null,
      requestedBy: coreCR.requestedBy,
      assignedTo: coreCR.assignedTo,
      assignmentGroup: coreCR.assignmentGroup,
      businessService: coreCR.businessService,
      affectedServices: JSON.stringify(coreCR.affectedServices),
      tags: JSON.stringify(coreCR.tags),
      computedRiskScore: impact.overallRisk,
      computedImpactScore: (impact.functionalityRisk + impact.dataIntegrityRisk) / 2,
      mlRiskScore: ml.score,
      mlConfidence: ml.confidence,
      mlExplanation: ml.explanation,
      releaseId: coreCR.releaseId,
      createdBy: coreCR.createdBy,
      closedAt: coreCR.closedAt ? new Date(coreCR.closedAt) : null,
      closedBy: coreCR.closedBy,
    };

    await prisma.changeRequest.upsert({
      where: { number: s.number },
      update: crData,
      create: { number: coreCR.number, ...crData },
    });

    // Approval steps + decisions
    if (s.approvalSteps) {
      for (const step of s.approvalSteps) {
        const created = await prisma.approvalStep.create({
          data: {
            changeRequestId: s.number,
            name: step.name,
            ordering: step.ordering,
            policy: step.policy,
            status: "pending",
            startedAt: new Date(),
            approvals: {
              create: step.approvers.map((a) => ({
                changeRequestId: s.number,
                approverEmail: a.email,
                approverGroup: a.group ?? null,
              })),
            },
          },
          include: { approvals: true },
        });
        // Apply pre-existing decisions
        for (const d of step.decisions ?? []) {
          const ap = created.approvals.find((x) => x.approverEmail === d.email);
          if (ap) {
            await prisma.approval.update({
              where: { id: ap.id },
              data: {
                decision: d.decision,
                comment: d.comment ?? null,
                decidedAt: new Date(),
              },
            });
          }
        }
      }
    }

    // A starter comment + audit event per CR
    await prisma.comment.create({
      data: {
        changeRequestId: s.number,
        authorEmail: s.requestedBy,
        body: `Initial request created — see implementation plan for details.`,
        visibility: "public",
      },
    });
    await prisma.auditEvent.create({
      data: {
        changeRequestId: s.number,
        actor: s.requestedBy,
        action: "cr.create",
        payload: JSON.stringify({ workflow: s.workflowKey, seeded: true }),
      },
    });
  }

  // ── Change Request Templates ────────────────────────────────────
  // Organized by workflow type: Standard, Pre-approved, Emergency
  const templates = [
    // ═══════════════════════════════════════════════════════════════
    // DETAILED STANDARD WORKFLOW TEMPLATES (comprehensive plans)
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Database Schema Migration",
      description: "Production database schema changes including table alterations, index modifications, and data migrations with zero-downtime strategy",
      category: "database",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Data Engineering",
      implementationPlan: `## Pre-Migration Preparation (T-7 days)
1. Create and review migration scripts in version control
2. Generate full database backup and verify restore capability
3. Clone production data to staging environment (anonymized)
4. Notify all dependent service teams via email and Slack

## Staging Validation (T-5 to T-2 days)
1. Execute migration on staging using gh-ost or pt-online-schema-change
2. Run full regression test suite against migrated schema
3. Benchmark query performance (target: no degradation >10%)
4. Validate data integrity with checksums and row counts
5. Test rollback procedure on staging

## Production Migration (T-0, Maintenance Window 02:00-04:00 UTC)
1. Enable read-only mode on affected services (circuit breaker)
2. Create point-in-time backup immediately before migration
3. Execute migration with real-time progress monitoring
4. Verify row counts and data integrity checksums
5. Run smoke tests against critical queries
6. Re-enable write traffic with 5% canary

## Post-Migration Validation (T+1 to T+7 days)
1. Monitor query latency dashboards for 24 hours
2. Verify all dependent services functioning correctly
3. Run daily data integrity checks for one week
4. Archive pre-migration backup after 30 days`,
      backoutPlan: `## Immediate Rollback (within 30 minutes of migration start)
1. Execute gh-ost reverse-cutover to restore original table
2. Verify application connectivity restored
3. Run data integrity validation
4. Notify stakeholders of rollback via Slack #incidents

## Extended Rollback (after migration completed)
1. Restore from point-in-time backup (RTO: 45 minutes)
2. Replay WAL logs to recover transactions since backup
3. Point application services to restored database
4. Verify data consistency across all tables

## Partial Rollback (specific issues only)
1. If only specific columns affected, use ALTER TABLE to revert
2. If indexes causing issues, drop and recreate original indexes
3. Document partial rollback for post-mortem`,
      testPlan: `## Unit Tests
- Migration script syntax validation
- Rollback script verification
- Data transformation logic tests

## Integration Tests
- CRUD operations on affected tables
- Foreign key constraint validation
- Trigger and stored procedure functionality

## Performance Tests
- Query execution plans before/after comparison
- Index usage verification
- Load test with 2x peak traffic for 1 hour

## Data Integrity Tests
- Row count validation (before vs after)
- Checksum comparison on critical columns
- Referential integrity verification
- NULL constraint validation`,
      riskAndImpactAnalysis: `## Risk Assessment: HIGH

### Primary Risks
1. **Data Loss** (Likelihood: Low, Impact: Critical)
   - Mitigation: Point-in-time backup, gh-ost atomic cutover, WAL archiving
   
2. **Extended Downtime** (Likelihood: Medium, Impact: High)
   - Mitigation: Rehearsed on staging 3x, documented rollback, maintenance window
   
3. **Application Compatibility** (Likelihood: Medium, Impact: High)
   - Mitigation: All dependent services tested against new schema

4. **Performance Degradation** (Likelihood: Low, Impact: Medium)
   - Mitigation: Query plan analysis, index optimization, load testing

### Blast Radius
- Directly affected: [List services]
- Indirectly affected: [List downstream services]

### Recovery Objectives
- RTO (Recovery Time Objective): 30 minutes for rollback, 45 minutes for restore
- RPO (Recovery Point Objective): Zero data loss (synchronous replication)`,
      justification: `[Describe the business need for this migration]`,
    },
    {
      name: "Microservice Deployment",
      description: "Deploy new or updated microservice to production with canary rollout, health checks, and automated rollback",
      category: "application",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "2",
      urgency: "2",
      assignmentGroup: "Backend",
      implementationPlan: `## Pre-Deployment Checklist
1. Code review approved and merged to main branch
2. All CI/CD pipeline stages passed (lint, test, build, security scan)
3. Docker image tagged and pushed to container registry
4. Helm chart values updated for production
5. Feature flags configured for gradual rollout

## Staging Deployment (T-2 days)
1. Deploy to staging environment
2. Run full integration test suite
3. Execute performance benchmarks
4. Verify logging and metrics collection
5. Test alerting rules trigger correctly

## Production Canary (T-0)
1. Deploy to canary pod (5% traffic)
2. Monitor error rates, latency p50/p95/p99
3. Verify business metrics (conversion, throughput)
4. Hold for 30 minutes minimum

## Gradual Rollout
1. Increase to 25% traffic, monitor 15 minutes
2. Increase to 50% traffic, monitor 15 minutes
3. Increase to 100% traffic
4. Remove old deployment pods

## Post-Deployment
1. Verify all health checks passing
2. Confirm metrics in Grafana dashboards
3. Update runbook with any new operational procedures
4. Close deployment ticket`,
      backoutPlan: `## Automated Rollback (triggered by alerts)
1. Argo Rollouts automatically reverts on error rate >1%
2. Previous ReplicaSet scaled up
3. New ReplicaSet scaled to zero
4. Alert sent to #deployments channel

## Manual Rollback
1. Run: kubectl rollout undo deployment/<service-name>
2. Verify pods running previous version
3. Confirm error rates returning to baseline
4. Investigate root cause before retry

## Feature Flag Rollback
1. Disable feature flag in LaunchDarkly
2. New code path disabled, old behavior restored
3. No deployment changes required`,
      testPlan: `## Automated Tests (CI/CD)
- Unit tests: >80% coverage required
- Integration tests: API contract validation
- E2E tests: Critical user journeys
- Security scan: No critical/high vulnerabilities

## Manual Verification
- Smoke test critical endpoints
- Verify logging format and content
- Check distributed tracing spans
- Validate Prometheus metrics exposed

## Performance Validation
- Response time within SLO (p99 < 500ms)
- No memory leaks (monitor over 24h)
- CPU utilization within expected range`,
      riskAndImpactAnalysis: `## Risk Assessment: MODERATE

### Primary Risks
1. **Service Degradation** (Likelihood: Medium, Impact: Medium)
   - Mitigation: Canary deployment, automated rollback
   
2. **Integration Failures** (Likelihood: Low, Impact: High)
   - Mitigation: Contract testing, staging validation

3. **Resource Exhaustion** (Likelihood: Low, Impact: Medium)
   - Mitigation: Resource limits, HPA configured

### Affected Services
- Direct: [Service name]
- Upstream: [API consumers]
- Downstream: [Dependencies]`,
      justification: `[Describe the feature or fix being deployed]`,
    },
    {
      name: "Kubernetes Cluster Upgrade",
      description: "Upgrade production Kubernetes cluster with zero-downtime rolling update strategy",
      category: "infrastructure",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      urgency: "2",
      assignmentGroup: "Infrastructure",
      implementationPlan: `## Pre-Upgrade Preparation (T-14 days)
1. Review Kubernetes release notes and breaking changes
2. Audit all workloads for deprecated API versions
3. Update Helm charts to use supported API versions
4. Verify PodDisruptionBudgets on all critical workloads
5. Create cluster snapshot and etcd backup
6. Notify all application teams of maintenance window

## Staging Upgrade (T-7 days)
1. Upgrade staging cluster control plane
2. Upgrade staging worker nodes using rolling update
3. Run full integration test suite
4. Verify all workloads healthy for 48 hours
5. Document any issues and mitigations

## Production Control Plane (T-0, 02:00 UTC)
1. Create etcd snapshot backup
2. Upgrade control plane components (api-server, controller-manager, scheduler)
3. Verify control plane health via kubectl and monitoring
4. Run smoke tests against critical services

## Production Worker Nodes (T-0, 03:00-06:00 UTC)
1. Cordon and drain worker nodes one at a time
2. Upgrade kubelet and container runtime
3. Uncordon and verify node ready status
4. Monitor pod scheduling and resource utilization
5. Repeat for all worker nodes (max 1 unavailable)

## Post-Upgrade Validation
1. Verify all deployments, statefulsets, daemonsets healthy
2. Run end-to-end test suite
3. Verify ingress and certificate management
4. Confirm monitoring and logging operational
5. Update runbooks with new cluster version`,
      backoutPlan: `## Immediate Rollback (< 30 minutes)
1. Restore control plane from etcd snapshot
2. Revert worker node images to previous version
3. Verify cluster stability

## Partial Rollback (worker nodes upgraded)
1. Control plane supports n-2 worker versions
2. Drain and rollback affected worker nodes
3. Keep control plane at new version if stable

## Full Rollback (critical issues)
1. Restore full cluster from backup
2. Redeploy workloads from GitOps repository
3. Estimated recovery time: 45 minutes

## Communication
1. Notify stakeholders via Slack #platform-alerts
2. Update status page
3. Create incident ticket for post-mortem`,
      testPlan: `## Pre-Upgrade Validation
- API deprecation warnings resolved
- All Helm charts compatible with new version
- PDBs configured for critical workloads

## Control Plane Tests
- kubectl cluster-info returns healthy
- API server responding to requests
- etcd cluster healthy (3/3 members)

## Worker Node Tests
- All nodes in Ready state
- Pods scheduling correctly
- Resource requests/limits honored

## Application Tests
- Critical path smoke tests
- Cross-service communication
- Ingress routing functional
- Persistent volumes accessible`,
      riskAndImpactAnalysis: `## Risk Assessment: HIGH

### Primary Risks
1. **Pod Disruption** (Likelihood: High, Impact: Medium)
   - Mitigation: PDBs configured, rolling update strategy
   
2. **API Incompatibility** (Likelihood: Medium, Impact: High)
   - Mitigation: Deprecation warnings reviewed, charts updated

3. **Extended Upgrade Time** (Likelihood: Low, Impact: Medium)
   - Mitigation: Rehearsed on staging, documented procedures

### Blast Radius
- All services potentially affected during node drains
- Maintenance window: 4 hours (02:00-06:00 UTC)`,
      justification: `[Version EOL date, security patches, or required features]`,
    },
    {
      name: "Load Balancer Configuration",
      description: "Modify load balancer rules, SSL certificates, or traffic routing with validation",
      category: "network",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Network",
      implementationPlan: `## Pre-Change Preparation
1. Document current load balancer configuration
2. Create configuration backup/snapshot
3. Prepare new configuration in staging
4. Test SSL certificates validity and chain
5. Notify NOC and on-call teams

## Staging Validation
1. Apply configuration to staging load balancer
2. Test all routing rules with curl/httpie
3. Verify SSL handshake and certificate chain
4. Load test to verify backend health checks
5. Test failover scenarios

## Production Implementation
1. Apply configuration during low-traffic window
2. Verify health checks passing for all backends
3. Test critical endpoints from multiple regions
4. Monitor error rates and latency
5. Verify SSL Labs score (target: A+)

## Post-Change Validation
1. Monitor traffic distribution for 1 hour
2. Verify no increase in 5xx errors
3. Confirm CDN cache behavior if applicable
4. Update documentation with new configuration`,
      backoutPlan: `## Immediate Rollback
1. Restore previous configuration from backup
2. Verify health checks passing
3. Test critical endpoints
4. Notify stakeholders of rollback

## SSL Certificate Rollback
1. Re-install previous certificate
2. Verify certificate chain valid
3. Clear CDN cache if needed`,
      testPlan: `## Connectivity Tests
- curl all endpoints from multiple regions
- Verify correct backend routing
- Test health check endpoints

## SSL Tests
- SSL Labs scan (target: A+)
- Certificate chain validation
- HSTS header verification

## Performance Tests
- Load test with expected traffic
- Verify connection pooling
- Test failover to backup backends`,
      riskAndImpactAnalysis: `## Risk Assessment: MODERATE

### Primary Risks
1. **Traffic Blackhole** (Likelihood: Low, Impact: Critical)
   - Mitigation: Staging validation, gradual rollout
   
2. **SSL Errors** (Likelihood: Low, Impact: High)
   - Mitigation: Certificate chain validation, SSL Labs scan

### Affected Services
- All services behind load balancer
- External API consumers`,
      justification: `[Describe the routing change or SSL update needed]`,
    },
    // ═══════════════════════════════════════════════════════════════
    // STANDARD WORKFLOW TEMPLATES (require full approval cycle)
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Database Migration",
      description: "Schema changes, table alterations, or data migrations",
      category: "database",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Data Engineering",
      implementationPlan: "1. Create migration script\n2. Test on staging with production data clone\n3. Schedule maintenance window\n4. Execute migration with monitoring\n5. Verify data integrity\n6. Update application code if needed",
      backoutPlan: "1. Execute rollback script\n2. Restore from pre-migration backup if needed\n3. Verify data integrity after rollback",
      testPlan: "1. Unit tests for migration scripts\n2. Integration tests on staging\n3. Data integrity validation queries\n4. Performance benchmarks before/after",
      riskAndImpactAnalysis: "Database changes affect all dependent services. Mitigated by: staging validation, maintenance window, backup before migration.",
      justification: "[Describe why this migration is needed]",
    },
    {
      name: "Security Patch",
      description: "Apply security updates or vulnerability fixes",
      category: "security",
      type: "normal",
      workflowKey: "standard",
      priority: "1",
      riskLevel: "moderate",
      impactLevel: "2",
      urgency: "1",
      assignmentGroup: "Security",
      implementationPlan: "1. Apply patch to staging\n2. Run security scan\n3. Execute regression tests\n4. Deploy to production with canary\n5. Full rollout",
      backoutPlan: "Revert to previous version; assess vulnerability exposure window",
      testPlan: "1. Security scan (SAST/DAST)\n2. Penetration testing if applicable\n3. Regression test suite",
      riskAndImpactAnalysis: "Security patches are critical. Risk of not patching outweighs deployment risk.",
      justification: "[CVE number or security advisory reference]",
    },
    {
      name: "Infrastructure Upgrade",
      description: "Upgrade infrastructure components (K8s, databases, etc.)",
      category: "infrastructure",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      urgency: "2",
      assignmentGroup: "Infrastructure",
      implementationPlan: "1. Upgrade staging environment\n2. Run full test suite\n3. Schedule maintenance window\n4. Rolling upgrade in production\n5. Validate all services",
      backoutPlan: "Rollback to previous version; may require support ticket for control plane",
      testPlan: "1. Staging validation\n2. Smoke tests on all critical paths\n3. Performance benchmarks",
      riskAndImpactAnalysis: "Infrastructure changes affect all workloads. Mitigated by: staging first, rolling upgrade, PDBs.",
      justification: "[Version EOL, security patches, or performance improvements]",
    },
    {
      name: "API Deprecation",
      description: "Deprecate and remove legacy API endpoints",
      category: "application",
      type: "normal",
      workflowKey: "standard",
      priority: "3",
      riskLevel: "moderate",
      impactLevel: "2",
      urgency: "3",
      assignmentGroup: "Backend",
      implementationPlan: "1. Add deprecation warnings\n2. Communicate to API consumers\n3. Monitor usage metrics\n4. Return 410 Gone after grace period\n5. Remove code after confirmation",
      backoutPlan: "Re-enable endpoint via feature flag",
      testPlan: "1. Integration tests for replacement API\n2. Monitor for 4xx errors from deprecated endpoint",
      riskAndImpactAnalysis: "Some clients may not have migrated. Mitigated by: long deprecation period, direct communication.",
      justification: "[Replacement API version and migration guide link]",
    },
    {
      name: "Major Feature Release",
      description: "Deploy significant new functionality to production",
      category: "feature",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      urgency: "2",
      assignmentGroup: "Backend",
      implementationPlan: "1. Complete feature development and code review\n2. Deploy to staging environment\n3. Execute full QA test cycle\n4. Performance and load testing\n5. Canary deployment (5%)\n6. Monitor metrics for 24h\n7. Gradual rollout to 100%",
      backoutPlan: "1. Disable feature flag\n2. Revert deployment if needed\n3. Communicate to stakeholders",
      testPlan: "1. Unit and integration tests\n2. E2E test suite\n3. Performance benchmarks\n4. Security review\n5. Accessibility testing",
      riskAndImpactAnalysis: "New features may introduce bugs or performance issues. Mitigated by: feature flags, canary deployment, comprehensive testing.",
      justification: "[Product requirement or business case]",
    },
    {
      name: "Third-Party Integration",
      description: "Integrate with external service or API",
      category: "infrastructure",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "moderate",
      impactLevel: "2",
      urgency: "3",
      assignmentGroup: "Backend",
      implementationPlan: "1. Review third-party API documentation\n2. Implement integration with error handling\n3. Add circuit breaker and retry logic\n4. Test with sandbox/staging environment\n5. Configure production credentials\n6. Deploy with monitoring",
      backoutPlan: "1. Disable integration via feature flag\n2. Fall back to previous behavior or manual process",
      testPlan: "1. Unit tests with mocked responses\n2. Integration tests with sandbox\n3. Error scenario testing\n4. Rate limit and timeout testing",
      riskAndImpactAnalysis: "External dependencies introduce latency and availability risks. Mitigated by: circuit breakers, timeouts, fallback behavior.",
      justification: "[Business requirement for integration]",
    },
    {
      name: "Data Center Migration",
      description: "Migrate services between data centers or cloud regions",
      category: "infrastructure",
      type: "normal",
      workflowKey: "standard",
      priority: "1",
      riskLevel: "very_high",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Infrastructure",
      implementationPlan: "1. Provision target infrastructure\n2. Replicate data to target region\n3. Test failover procedures\n4. Schedule maintenance window\n5. Execute DNS cutover\n6. Verify all services operational\n7. Decommission source infrastructure",
      backoutPlan: "1. Revert DNS to source region\n2. Ensure data consistency\n3. Investigate and reschedule",
      testPlan: "1. Infrastructure validation\n2. Data replication verification\n3. Failover drill\n4. Performance comparison\n5. DR testing",
      riskAndImpactAnalysis: "Data center migrations are high-risk. Mitigated by: extensive testing, maintenance window, rollback plan, data replication validation.",
      justification: "[Cost optimization, compliance, or disaster recovery requirements]",
    },
    {
      name: "Network Configuration Change",
      description: "Modify firewall rules, VPN, or network routing",
      category: "network",
      type: "normal",
      workflowKey: "standard",
      priority: "2",
      riskLevel: "high",
      impactLevel: "2",
      urgency: "2",
      assignmentGroup: "Network",
      implementationPlan: "1. Document current configuration\n2. Plan changes with network diagram\n3. Apply changes in staging/dev\n4. Test connectivity\n5. Schedule maintenance window\n6. Apply to production\n7. Verify all services",
      backoutPlan: "1. Revert to documented previous configuration\n2. Verify connectivity restored",
      testPlan: "1. Connectivity tests\n2. Security scan\n3. Performance baseline comparison\n4. Application smoke tests",
      riskAndImpactAnalysis: "Network changes can cause widespread outages. Mitigated by: staging testing, maintenance window, documented rollback.",
      justification: "[Security requirement, new service, or optimization]",
    },
    // ═══════════════════════════════════════════════════════════════
    // PRE-APPROVED WORKFLOW TEMPLATES (low-risk, skip approval)
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Feature Flag Rollout",
      description: "Enable or modify feature flags for gradual rollout",
      category: "config",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "Product",
      implementationPlan: "1. Update feature flag configuration\n2. Enable for internal users first\n3. Gradual rollout: 5% → 25% → 50% → 100%\n4. Monitor metrics at each stage",
      backoutPlan: "Disable feature flag immediately; changes revert automatically",
      testPlan: "1. Verify flag behavior in staging\n2. Monitor error rates during rollout\n3. A/B metrics comparison",
      riskAndImpactAnalysis: "Low risk due to instant rollback capability via feature flag.",
      justification: "[Describe the feature being rolled out]",
    },
    {
      name: "SSL Certificate Renewal",
      description: "Renew expiring SSL/TLS certificates",
      category: "security",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "2",
      riskLevel: "low",
      impactLevel: "1",
      urgency: "2",
      assignmentGroup: "Infrastructure",
      implementationPlan: "1. Generate CSR\n2. Submit to CA\n3. Install new certificate\n4. Verify with SSL Labs",
      backoutPlan: "Restore previous certificate from backup",
      testPlan: "SSL Labs scan; curl verification; browser testing",
      riskAndImpactAnalysis: "Brief TLS handshake failures possible if misconfigured. Low risk with proper validation.",
      justification: "Certificate expires on [DATE]",
    },
    {
      name: "Observability Enhancement",
      description: "Add or improve logging, metrics, or tracing",
      category: "feature",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "Platform",
      implementationPlan: "1. Add instrumentation\n2. Configure collection\n3. Create dashboards\n4. Set up alerts",
      backoutPlan: "Remove instrumentation; no impact on core functionality",
      testPlan: "Verify metrics/logs appear in observability platform",
      riskAndImpactAnalysis: "Minimal risk; observability code is isolated from business logic.",
      justification: "[Describe observability gap being addressed]",
    },
    {
      name: "Documentation Update",
      description: "Update technical documentation, runbooks, or wikis",
      category: "config",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "Platform",
      implementationPlan: "1. Draft documentation changes\n2. Review with team\n3. Publish to documentation platform\n4. Notify stakeholders",
      backoutPlan: "Revert to previous documentation version",
      testPlan: "1. Technical accuracy review\n2. Link validation\n3. Formatting check",
      riskAndImpactAnalysis: "No production impact; documentation only.",
      justification: "[Describe what documentation is being updated]",
    },
    {
      name: "Dependency Update (Minor)",
      description: "Update minor/patch versions of dependencies",
      category: "application",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "Backend",
      implementationPlan: "1. Update dependency versions\n2. Run full test suite\n3. Deploy to staging\n4. Verify functionality\n5. Deploy to production",
      backoutPlan: "Revert dependency versions and redeploy",
      testPlan: "1. Unit tests\n2. Integration tests\n3. E2E smoke tests",
      riskAndImpactAnalysis: "Minor version updates should be backward compatible. Low risk with test coverage.",
      justification: "[Security patches, bug fixes, or performance improvements]",
    },
    {
      name: "Scheduled Maintenance",
      description: "Routine maintenance tasks (restarts, cleanups, etc.)",
      category: "infrastructure",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "4",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "SRE",
      implementationPlan: "1. Schedule maintenance window\n2. Notify stakeholders\n3. Execute maintenance tasks\n4. Verify system health\n5. Close maintenance window",
      backoutPlan: "Stop maintenance; restore from backup if needed",
      testPlan: "1. Health checks\n2. Smoke tests\n3. Monitoring verification",
      riskAndImpactAnalysis: "Routine maintenance with minimal risk. Scheduled during low-traffic period.",
      justification: "[Describe maintenance tasks]",
    },
    {
      name: "Configuration Tuning",
      description: "Adjust application or infrastructure configuration",
      category: "config",
      type: "standard",
      workflowKey: "standard_preapproved",
      priority: "3",
      riskLevel: "low",
      impactLevel: "3",
      urgency: "3",
      assignmentGroup: "Platform",
      implementationPlan: "1. Document current configuration\n2. Apply changes to staging\n3. Validate behavior\n4. Apply to production\n5. Monitor metrics",
      backoutPlan: "Revert to previous configuration values",
      testPlan: "1. Functional testing\n2. Performance comparison\n3. Error rate monitoring",
      riskAndImpactAnalysis: "Configuration changes are easily reversible. Low risk with proper validation.",
      justification: "[Performance optimization or operational improvement]",
    },
    // ═══════════════════════════════════════════════════════════════
    // EMERGENCY WORKFLOW TEMPLATES (immediate action, retro approval)
    // ═══════════════════════════════════════════════════════════════
    {
      name: "Emergency Hotfix",
      description: "Critical production issue requiring immediate fix",
      category: "hotfix",
      type: "emergency",
      workflowKey: "emergency",
      priority: "1",
      riskLevel: "high",
      impactLevel: "1",
      urgency: "1",
      assignmentGroup: "SRE",
      implementationPlan: "1. Deploy hotfix immediately\n2. Monitor for resolution\n3. Communicate status to stakeholders",
      backoutPlan: "Revert to last known good version",
      testPlan: "Smoke tests; full regression after incident",
      riskAndImpactAnalysis: "Emergency change to resolve active incident. Post-implementation review required.",
      justification: "[Incident ticket number and brief description]",
    },
    {
      name: "Security Incident Response",
      description: "Immediate action to address security breach or vulnerability",
      category: "security",
      type: "emergency",
      workflowKey: "emergency",
      priority: "1",
      riskLevel: "very_high",
      impactLevel: "1",
      urgency: "1",
      assignmentGroup: "Security",
      implementationPlan: "1. Contain the threat\n2. Apply emergency patches\n3. Rotate compromised credentials\n4. Block malicious IPs/users\n5. Preserve evidence for forensics",
      backoutPlan: "Assess impact; may not be reversible depending on action taken",
      testPlan: "1. Verify threat contained\n2. Security scan\n3. Penetration test if applicable",
      riskAndImpactAnalysis: "Security incidents require immediate action. Risk of inaction exceeds risk of emergency change.",
      justification: "[Security incident ticket and severity]",
    },
    {
      name: "Emergency Rollback",
      description: "Immediate rollback of problematic deployment",
      category: "application",
      type: "emergency",
      workflowKey: "emergency",
      priority: "1",
      riskLevel: "moderate",
      impactLevel: "1",
      urgency: "1",
      assignmentGroup: "SRE",
      implementationPlan: "1. Identify last known good version\n2. Execute rollback\n3. Verify service restored\n4. Communicate to stakeholders",
      backoutPlan: "Re-deploy if rollback causes issues (unlikely)",
      testPlan: "1. Health checks\n2. Smoke tests\n3. Error rate monitoring",
      riskAndImpactAnalysis: "Rollback to restore service. Lower risk than continuing with broken deployment.",
      justification: "[Incident ticket and deployment that caused issue]",
    },
    {
      name: "Emergency Scaling",
      description: "Immediate infrastructure scaling for traffic surge",
      category: "infrastructure",
      type: "emergency",
      workflowKey: "emergency",
      priority: "1",
      riskLevel: "low",
      impactLevel: "2",
      urgency: "1",
      assignmentGroup: "Infrastructure",
      implementationPlan: "1. Increase replica count / instance size\n2. Verify new capacity online\n3. Monitor load distribution\n4. Communicate to stakeholders",
      backoutPlan: "Scale back down after traffic normalizes",
      testPlan: "1. Capacity verification\n2. Load balancer health checks\n3. Response time monitoring",
      riskAndImpactAnalysis: "Scaling up is low risk. Necessary to maintain service availability.",
      justification: "[Traffic spike or capacity alert]",
    },
  ];

  for (const t of templates) {
    await prisma.changeRequestTemplate.upsert({
      where: { name: t.name },
      update: t,
      create: {
        ...t,
        createdBy: "admin@example.com",
      },
    });
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
