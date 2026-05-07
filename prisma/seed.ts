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
  const adminPwd = await bcrypt.hash("admin123!", 12);
  const mgrPwd = await bcrypt.hash("manager123!", 12);

  const users = [
    { email: "admin@example.com", name: "System Admin", role: "admin", pwd: adminPwd },
    { email: "mike@example.com", name: "Mike Torres", role: "manager", pwd: mgrPwd },
    { email: "lisa@example.com", name: "Lisa Wang", role: "manager", pwd: mgrPwd },
    { email: "raj@example.com", name: "Raj Patel", role: "manager", pwd: mgrPwd },
    { email: "security@example.com", name: "Security Team", role: "manager", pwd: mgrPwd },
    { email: "cab@example.com", name: "CAB Chair", role: "manager", pwd: mgrPwd },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { hashedPassword: u.pwd, role: u.role, name: u.name },
      create: { email: u.email, name: u.name, hashedPassword: u.pwd, role: u.role },
    });
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
