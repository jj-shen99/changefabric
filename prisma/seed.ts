import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Users ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123!", 12);
  const managerPassword = await bcrypt.hash("manager123!", 12);
  const viewerPassword = await bcrypt.hash("viewer123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      name: "System Admin",
      hashedPassword: adminPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@company.com" },
    update: {},
    create: {
      email: "manager@company.com",
      name: "Mike Torres",
      hashedPassword: managerPassword,
      role: "manager",
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@company.com" },
    update: {},
    create: {
      email: "viewer@company.com",
      name: "Jane Doe",
      hashedPassword: viewerPassword,
      role: "viewer",
    },
  });

  // ── Releases ──────────────────────────────────────────
  await prisma.release.upsert({
    where: { id: "REL-28" },
    update: {},
    create: {
      id: "REL-28",
      name: "Sprint 28 Release",
      version: "4.12.0",
      status: "staging",
      scheduledDate: new Date("2026-03-12T02:00:00Z"),
      overallRisk: 48,
      releaseManager: "Mike Torres",
      notes: "Contains critical payment migration. Extended freeze window planned.",
    },
  });

  await prisma.release.upsert({
    where: { id: "REL-29" },
    update: {},
    create: {
      id: "REL-29",
      name: "Sprint 29 Release",
      version: "4.13.0",
      status: "planning",
      scheduledDate: new Date("2026-03-26T02:00:00Z"),
      overallRisk: 52,
      releaseManager: "Lisa Wang",
      notes: "Database migration requires maintenance window coordination with SRE team.",
    },
  });

  await prisma.release.upsert({
    where: { id: "REL-27" },
    update: {},
    create: {
      id: "REL-27",
      name: "Sprint 27 Release",
      version: "4.11.2",
      status: "completed",
      scheduledDate: new Date("2026-02-26T02:00:00Z"),
      actualDate: new Date("2026-02-26T02:45:00Z"),
      overallRisk: 18,
      releaseManager: "Mike Torres",
    },
  });

  // ── Change Requests ───────────────────────────────────
  const changeData = [
    {
      id: "CR-1042",
      title: "Payment Gateway Migration to Stripe v3",
      description: "Migrate payment processing from legacy gateway to Stripe v3 API with new webhook handlers and retry logic.",
      category: "infrastructure",
      status: "pending_review",
      author: "Sarah Chen",
      team: "Payments",
      createdAt: new Date("2026-03-05T09:00:00Z"),
      scheduledAt: new Date("2026-03-12T02:00:00Z"),
      releaseId: "REL-28",
      jiraTicket: "PAY-1892",
      prUrl: "https://github.com/org/payments/pull/342",
      linesAdded: 2847,
      linesRemoved: 1203,
      filesChanged: 48,
      approvers: JSON.stringify(["Mike Torres", "Lisa Wang"]),
      tags: JSON.stringify(["payment", "migration", "critical-path"]),
      impact: {
        outageRisk: 75, performanceRisk: 45, functionalityRisk: 82,
        securityRisk: 60, dataIntegrityRisk: 70, overallRisk: 72,
        affectedServices: JSON.stringify(["payment-service", "order-service", "billing-service", "notification-service"]),
        affectedUsers: 2400000, estimatedDowntime: "15-30 min",
        rollbackComplexity: "high", blastRadius: "critical",
      },
      validations: [
        { id: "v1", type: "unit_test", name: "Payment Unit Tests", status: "passed", completedAt: new Date("2026-03-05T10:30:00Z"), duration: "4m 12s", coverage: 92 },
        { id: "v2", type: "integration_test", name: "Stripe Integration Tests", status: "passed", completedAt: new Date("2026-03-05T11:15:00Z"), duration: "18m 45s", coverage: 87 },
        { id: "v3", type: "performance_test", name: "Payment Latency Benchmark", status: "failed", completedAt: new Date("2026-03-06T08:00:00Z"), duration: "45m", details: "P99 latency increased from 120ms to 340ms under load", blockers: JSON.stringify(["Latency regression needs investigation"]) },
        { id: "v4", type: "security_scan", name: "OWASP Security Scan", status: "passed", completedAt: new Date("2026-03-06T09:00:00Z"), duration: "22m" },
        { id: "v5", type: "code_review", name: "Senior Engineer Review", status: "passed", completedAt: new Date("2026-03-07T14:00:00Z") },
        { id: "v6", type: "uat", name: "Product Owner Acceptance", status: "pending" },
        { id: "v7", type: "canary_deploy", name: "Canary 5% Traffic", status: "pending" },
        { id: "v8", type: "rollback_test", name: "Rollback Verification", status: "pending" },
      ],
    },
    {
      id: "CR-1043",
      title: "Add Redis Caching for User Profile API",
      description: "Implement Redis caching layer for frequently accessed user profile endpoints to reduce database load.",
      category: "feature",
      status: "approved",
      author: "James Park",
      team: "Platform",
      createdAt: new Date("2026-03-04T14:00:00Z"),
      scheduledAt: new Date("2026-03-10T06:00:00Z"),
      releaseId: "REL-28",
      jiraTicket: "PLAT-567",
      prUrl: "https://github.com/org/platform/pull/189",
      linesAdded: 542, linesRemoved: 23, filesChanged: 12,
      approvers: JSON.stringify(["Rachel Kim"]),
      tags: JSON.stringify(["performance", "caching"]),
      impact: {
        outageRisk: 20, performanceRisk: 15, functionalityRisk: 25,
        securityRisk: 10, dataIntegrityRisk: 35, overallRisk: 22,
        affectedServices: JSON.stringify(["user-service", "api-gateway"]),
        affectedUsers: 800000, estimatedDowntime: "0 min",
        rollbackComplexity: "low", blastRadius: "low",
      },
      validations: [
        { id: "v9", type: "unit_test", name: "Cache Layer Unit Tests", status: "passed", completedAt: new Date("2026-03-04T16:00:00Z"), duration: "2m 30s", coverage: 96 },
        { id: "v10", type: "integration_test", name: "Redis Integration Tests", status: "passed", completedAt: new Date("2026-03-04T17:00:00Z"), duration: "8m 15s", coverage: 91 },
        { id: "v11", type: "performance_test", name: "Cache Hit Rate Benchmark", status: "passed", completedAt: new Date("2026-03-05T10:00:00Z"), duration: "30m", details: "Cache hit rate: 94%, avg response time reduced from 80ms to 12ms" },
        { id: "v12", type: "code_review", name: "Tech Lead Review", status: "passed", completedAt: new Date("2026-03-05T15:00:00Z") },
        { id: "v13", type: "smoke_test", name: "Staging Smoke Test", status: "passed", completedAt: new Date("2026-03-06T09:00:00Z"), duration: "5m" },
      ],
    },
    {
      id: "CR-1044",
      title: "Critical Auth Token Expiry Bugfix",
      description: "Fix race condition causing premature JWT token invalidation during concurrent refresh requests.",
      category: "hotfix",
      status: "deployed",
      author: "Alex Rivera",
      team: "Identity",
      createdAt: new Date("2026-03-07T23:00:00Z"),
      deployedAt: new Date("2026-03-08T01:30:00Z"),
      jiraTicket: "SEC-2201",
      prUrl: "https://github.com/org/auth/pull/98",
      linesAdded: 87, linesRemoved: 34, filesChanged: 5,
      approvers: JSON.stringify(["Alex Rivera", "Security Team"]),
      tags: JSON.stringify(["hotfix", "security", "auth"]),
      impact: {
        outageRisk: 40, performanceRisk: 10, functionalityRisk: 65,
        securityRisk: 55, dataIntegrityRisk: 5, overallRisk: 42,
        affectedServices: JSON.stringify(["auth-service", "api-gateway", "session-service"]),
        affectedUsers: 5000000, estimatedDowntime: "0 min",
        rollbackComplexity: "low", blastRadius: "high",
      },
      validations: [
        { id: "v14", type: "unit_test", name: "Token Refresh Tests", status: "passed", completedAt: new Date("2026-03-08T00:15:00Z"), duration: "1m 45s", coverage: 98 },
        { id: "v15", type: "integration_test", name: "Auth Flow Integration", status: "passed", completedAt: new Date("2026-03-08T00:45:00Z"), duration: "6m 20s", coverage: 94 },
        { id: "v16", type: "regression_test", name: "Auth Regression Suite", status: "passed", completedAt: new Date("2026-03-08T01:00:00Z"), duration: "12m" },
        { id: "v17", type: "security_scan", name: "Token Security Audit", status: "passed", completedAt: new Date("2026-03-08T01:10:00Z"), duration: "8m" },
        { id: "v18", type: "canary_deploy", name: "Canary 10% Traffic", status: "passed", completedAt: new Date("2026-03-08T01:25:00Z"), duration: "15m" },
      ],
    },
    {
      id: "CR-1045",
      title: "Database Schema Migration - Orders Table Partitioning",
      description: "Partition orders table by date range to improve query performance for historical data.",
      category: "database_migration",
      status: "pending_review",
      author: "David Kim",
      team: "Data Engineering",
      createdAt: new Date("2026-03-03T10:00:00Z"),
      scheduledAt: new Date("2026-03-15T03:00:00Z"),
      releaseId: "REL-29",
      jiraTicket: "DATA-445",
      prUrl: "https://github.com/org/migrations/pull/67",
      linesAdded: 345, linesRemoved: 12, filesChanged: 8,
      approvers: JSON.stringify([]),
      tags: JSON.stringify(["database", "migration", "maintenance-window"]),
      impact: {
        outageRisk: 85, performanceRisk: 30, functionalityRisk: 50,
        securityRisk: 15, dataIntegrityRisk: 90, overallRisk: 68,
        affectedServices: JSON.stringify(["order-service", "reporting-service", "analytics-pipeline", "billing-service"]),
        affectedUsers: 3200000, estimatedDowntime: "45-60 min",
        rollbackComplexity: "critical", blastRadius: "critical",
      },
      validations: [
        { id: "v19", type: "unit_test", name: "Migration Script Tests", status: "passed", completedAt: new Date("2026-03-04T12:00:00Z"), duration: "3m", coverage: 100 },
        { id: "v20", type: "integration_test", name: "Schema Compatibility Tests", status: "passed", completedAt: new Date("2026-03-04T14:00:00Z"), duration: "25m", coverage: 85 },
        { id: "v21", type: "performance_test", name: "Query Performance Benchmark", status: "running", startedAt: new Date("2026-03-09T08:00:00Z"), details: "Running against production-sized dataset" },
        { id: "v22", type: "rollback_test", name: "Migration Rollback Test", status: "pending" },
        { id: "v23", type: "uat", name: "DBA Sign-off", status: "pending" },
      ],
    },
    {
      id: "CR-1046",
      title: "Update React to v19 and Dependency Refresh",
      description: "Major frontend dependency update including React 19, Next.js 15, and associated library updates.",
      category: "dependency_update",
      status: "in_progress",
      author: "Emma Wilson",
      team: "Frontend",
      createdAt: new Date("2026-03-01T09:00:00Z"),
      scheduledAt: new Date("2026-03-11T06:00:00Z"),
      releaseId: "REL-28",
      jiraTicket: "FE-923",
      prUrl: "https://github.com/org/frontend/pull/512",
      linesAdded: 1205, linesRemoved: 980, filesChanged: 156,
      approvers: JSON.stringify(["Emma Wilson", "Frontend Lead"]),
      tags: JSON.stringify(["frontend", "dependencies", "react"]),
      impact: {
        outageRisk: 15, performanceRisk: 35, functionalityRisk: 55,
        securityRisk: 20, dataIntegrityRisk: 5, overallRisk: 32,
        affectedServices: JSON.stringify(["web-frontend", "admin-portal", "mobile-bff"]),
        affectedUsers: 1500000, estimatedDowntime: "0 min",
        rollbackComplexity: "medium", blastRadius: "medium",
      },
      validations: [
        { id: "v24", type: "unit_test", name: "Component Unit Tests", status: "passed", completedAt: new Date("2026-03-06T16:00:00Z"), duration: "8m 30s", coverage: 88 },
        { id: "v25", type: "integration_test", name: "E2E Browser Tests", status: "failed", completedAt: new Date("2026-03-07T10:00:00Z"), duration: "35m", details: "3 flaky tests in checkout flow", blockers: JSON.stringify(["Checkout modal animation timing issue"]) },
        { id: "v26", type: "performance_test", name: "Lighthouse Scores", status: "passed", completedAt: new Date("2026-03-07T14:00:00Z"), duration: "15m", details: "Performance: 96, Accessibility: 100, SEO: 98" },
        { id: "v27", type: "regression_test", name: "Visual Regression Tests", status: "running", startedAt: new Date("2026-03-09T07:00:00Z") },
        { id: "v28", type: "code_review", name: "Frontend Lead Review", status: "passed", completedAt: new Date("2026-03-08T11:00:00Z") },
      ],
    },
    {
      id: "CR-1047",
      title: "Enable Feature Flag: Dark Mode",
      description: "Enable dark mode feature flag for 100% of users after successful A/B test.",
      category: "config_change",
      status: "approved",
      author: "Nina Patel",
      team: "Product",
      createdAt: new Date("2026-03-08T10:00:00Z"),
      scheduledAt: new Date("2026-03-10T14:00:00Z"),
      jiraTicket: "PROD-334",
      linesAdded: 3, linesRemoved: 1, filesChanged: 1,
      approvers: JSON.stringify(["Product Manager", "Design Lead"]),
      tags: JSON.stringify(["feature-flag", "ui"]),
      impact: {
        outageRisk: 5, performanceRisk: 8, functionalityRisk: 15,
        securityRisk: 2, dataIntegrityRisk: 0, overallRisk: 7,
        affectedServices: JSON.stringify(["web-frontend", "mobile-app"]),
        affectedUsers: 5000000, estimatedDowntime: "0 min",
        rollbackComplexity: "low", blastRadius: "low",
      },
      validations: [
        { id: "v29", type: "uat", name: "Design Review", status: "passed", completedAt: new Date("2026-03-08T12:00:00Z") },
        { id: "v30", type: "smoke_test", name: "Dark Mode Smoke Test", status: "passed", completedAt: new Date("2026-03-08T13:00:00Z"), duration: "3m" },
        { id: "v31", type: "regression_test", name: "UI Contrast Tests", status: "passed", completedAt: new Date("2026-03-08T14:00:00Z"), duration: "7m" },
      ],
    },
    {
      id: "CR-1048",
      title: "WAF Rule Update - Block SQL Injection Patterns",
      description: "Update web application firewall rules to block newly discovered SQL injection patterns.",
      category: "security_patch",
      status: "deployed",
      author: "Carlos Mendez",
      team: "Security",
      createdAt: new Date("2026-03-08T16:00:00Z"),
      deployedAt: new Date("2026-03-08T18:00:00Z"),
      jiraTicket: "SEC-2205",
      linesAdded: 45, linesRemoved: 8, filesChanged: 3,
      approvers: JSON.stringify(["Security Lead", "CTO"]),
      tags: JSON.stringify(["security", "waf", "urgent"]),
      impact: {
        outageRisk: 30, performanceRisk: 20, functionalityRisk: 25,
        securityRisk: 5, dataIntegrityRisk: 10, overallRisk: 20,
        affectedServices: JSON.stringify(["waf", "api-gateway", "all-backend-services"]),
        affectedUsers: 5000000, estimatedDowntime: "0 min",
        rollbackComplexity: "low", blastRadius: "medium",
      },
      validations: [
        { id: "v32", type: "unit_test", name: "WAF Rule Tests", status: "passed", completedAt: new Date("2026-03-08T17:00:00Z"), duration: "2m", coverage: 100 },
        { id: "v33", type: "integration_test", name: "False Positive Tests", status: "passed", completedAt: new Date("2026-03-08T17:30:00Z"), duration: "10m", coverage: 95 },
        { id: "v34", type: "smoke_test", name: "API Endpoint Smoke Test", status: "passed", completedAt: new Date("2026-03-08T17:45:00Z"), duration: "5m" },
        { id: "v35", type: "security_scan", name: "Penetration Test", status: "passed", completedAt: new Date("2026-03-08T17:55:00Z"), duration: "8m" },
      ],
    },
    {
      id: "CR-1049",
      title: "Notification Service - Add Push Notification Channel",
      description: "Add Firebase Cloud Messaging integration for push notifications alongside existing email and SMS channels.",
      category: "feature",
      status: "in_progress",
      author: "Maria Santos",
      team: "Communications",
      createdAt: new Date("2026-02-28T09:00:00Z"),
      scheduledAt: new Date("2026-03-13T06:00:00Z"),
      releaseId: "REL-29",
      jiraTicket: "COMM-178",
      prUrl: "https://github.com/org/notifications/pull/89",
      linesAdded: 1890, linesRemoved: 120, filesChanged: 32,
      approvers: JSON.stringify(["Tech Lead"]),
      tags: JSON.stringify(["feature", "notifications", "mobile"]),
      impact: {
        outageRisk: 15, performanceRisk: 25, functionalityRisk: 30,
        securityRisk: 20, dataIntegrityRisk: 10, overallRisk: 22,
        affectedServices: JSON.stringify(["notification-service", "mobile-app", "user-preference-service"]),
        affectedUsers: 3000000, estimatedDowntime: "0 min",
        rollbackComplexity: "low", blastRadius: "low",
      },
      validations: [
        { id: "v36", type: "unit_test", name: "FCM Integration Tests", status: "passed", completedAt: new Date("2026-03-06T10:00:00Z"), duration: "3m 15s", coverage: 90 },
        { id: "v37", type: "integration_test", name: "Multi-channel Delivery Tests", status: "passed", completedAt: new Date("2026-03-06T12:00:00Z"), duration: "12m", coverage: 88 },
        { id: "v38", type: "performance_test", name: "Throughput Benchmark", status: "passed", completedAt: new Date("2026-03-07T10:00:00Z"), duration: "20m", details: "10k msgs/sec sustained throughput achieved" },
        { id: "v39", type: "code_review", name: "Senior Review", status: "passed", completedAt: new Date("2026-03-07T16:00:00Z") },
        { id: "v40", type: "uat", name: "Product Acceptance", status: "running", startedAt: new Date("2026-03-09T09:00:00Z") },
      ],
    },
  ];

  for (const cr of changeData) {
    const { impact, validations, ...crData } = cr;

    await prisma.changeRequest.upsert({
      where: { id: cr.id },
      update: {},
      create: crData,
    });

    await prisma.impactAnalysis.upsert({
      where: { changeRequestId: cr.id },
      update: {},
      create: { changeRequestId: cr.id, ...impact },
    });

    for (const v of validations) {
      await prisma.validation.upsert({
        where: { id: v.id },
        update: {},
        create: { changeRequestId: cr.id, ...v, blockers: (v as { blockers?: string }).blockers || "[]" },
      });
    }
  }

  // ── Dashboard Metrics ─────────────────────────────────
  await prisma.dashboardMetric.deleteMany();
  await prisma.dashboardMetric.create({
    data: {
      totalChanges: 147,
      pendingChanges: 23,
      deployedToday: 8,
      failedDeployments: 2,
      avgRiskScore: 38,
      validationPassRate: 94.2,
      avgDeployTime: "12m 34s",
      rollbackRate: 3.4,
      mttr: "28m",
      changeLeadTime: "4.2 days",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
