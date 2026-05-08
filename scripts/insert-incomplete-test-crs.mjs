#!/usr/bin/env node
/**
 * Insert multiple Change Requests into ServiceNow, each with a specific
 * type of incompleteness for testing plan analysis and risk scoring.
 *
 * Usage: SNOW_INSTANCE=https://your-instance.service-now.com SNOW_USER=user SNOW_PASSWORD=pass node scripts/insert-incomplete-test-crs.mjs
 *
 * CRs created:
 *   1. Missing backout plan entirely
 *   2. Missing test plan entirely
 *   3. Empty implementation plan (just a sentence)
 *   4. No pre-checks or post-checks in implementation plan
 *   5. Missing risk/impact analysis
 *   6. No rollback/backout references in implementation plan
 *   7. Missing timeline and contact info
 *   8. Extremely short plans across the board (minimal effort)
 *   9. Good implementation plan but missing monitoring/verification steps
 *  10. High-risk change with inadequate justification
 */

// ServiceNow credentials from environment variables
const INSTANCE = process.env.SNOW_INSTANCE;
const USER = process.env.SNOW_USER;
const PASS = process.env.SNOW_PASSWORD;

if (!INSTANCE || !USER || !PASS) {
  console.error("Error: SNOW_INSTANCE, SNOW_USER, and SNOW_PASSWORD environment variables are required");
  process.exit(1);
}

const now = new Date();
const iso = (d) => d.toISOString().replace("T", " ").slice(0, 19);
const future = (days) => new Date(now.getTime() + days * 24 * 3600 * 1000);

const changeRequests = [
  // ─── CR 1: Missing backout plan entirely ───
  {
    short_description: "Migrate Oracle 19c to PostgreSQL 16 — Customer Billing Database",
    description:
      "Full database migration of the customer billing system from Oracle 19c to PostgreSQL 16. " +
      "Involves 847 tables, 12 million rows of billing data, 340 stored procedures, and 92 scheduled jobs. " +
      "Application tier changes required for JDBC driver swap and query syntax migration.",
    type: "Normal",
    category: "Software",
    priority: "1 - Critical",
    risk: "High",
    impact: "1 - High",
    urgency: "1 - High",
    state: "-5",
    approval: "requested",
    start_date: iso(future(3)),
    end_date: iso(future(4)),
    implementation_plan:
      "DATABASE MIGRATION — ORACLE TO POSTGRESQL\n" +
      "==========================================\n\n" +
      "PRE-IMPLEMENTATION CHECKS:\n" +
      "1. Verify Oracle database backup completed: RMAN full backup within last 4 hours\n" +
      "2. Confirm PostgreSQL 16 cluster is provisioned and accessible\n" +
      "3. Validate network connectivity between app tier and new PG cluster\n" +
      "4. Run ora2pg compatibility report — confirm 0 blocking issues\n" +
      "5. Notify DBA on-call: +1-555-0199\n\n" +
      "PHASE 1: SCHEMA MIGRATION (60 min)\n" +
      "1. Execute ora2pg schema export: ora2pg -t TABLE -o schema.sql\n" +
      "2. Apply schema to PostgreSQL: psql -f schema.sql billing_db\n" +
      "3. Create indexes: psql -f indexes.sql billing_db\n" +
      "4. Migrate stored procedures (340 total) using pgloader\n\n" +
      "PHASE 2: DATA MIGRATION (120 min)\n" +
      "1. Stop billing application writes: set read-only mode\n" +
      "2. Run pgloader for full data copy: pgloader oracle://... postgresql://...\n" +
      "3. Validate row counts per table (847 tables)\n" +
      "4. Run checksum validation on top 50 tables by size\n\n" +
      "PHASE 3: APPLICATION CUTOVER (30 min)\n" +
      "1. Update JDBC connection strings in app config\n" +
      "2. Restart billing-api and billing-worker services\n" +
      "3. Run smoke tests: billing CRUD, invoice generation, payment processing\n\n" +
      "POST-DEPLOYMENT VERIFICATION:\n" +
      "1. Run full regression test suite against PostgreSQL\n" +
      "2. Verify scheduled jobs are running (cron migration from Oracle scheduler)\n" +
      "3. Monitor error rates in Datadog for 60 minutes\n" +
      "4. Compare query performance (p50, p95) against Oracle baseline\n" +
      "5. Confirm audit log writes are flowing to new PG audit tables",
    backout_plan: "",  // ← INTENTIONALLY EMPTY — no backout plan
    test_plan:
      "1. Schema validation: compare Oracle vs PostgreSQL schema diff\n" +
      "2. Data integrity: row count + checksum per table\n" +
      "3. Stored procedure tests: execute all 340 procedures with test data\n" +
      "4. Application regression: 1,200 automated test cases\n" +
      "5. Performance: compare query plans for top 100 queries\n" +
      "6. Failover test: simulate PG primary failure, verify replica promotion",
    change_plan:
      "Phase 1: Preparation (Day -7 to -1) — schema export, pgloader dry-run, app code changes\n" +
      "Phase 2: Execution (Day 0) — maintenance window Saturday 22:00-06:00 UTC\n" +
      "Phase 3: Monitoring (Day 0 to +3) — enhanced monitoring, DBA on-call\n" +
      "Phase 4: Closure (Day +5) — decommission Oracle read replicas",
    risk_impact_analysis:
      "Risk 1: Data loss during migration — Mitigation: Full Oracle RMAN backup + point-in-time recovery\n" +
      "Risk 2: Stored procedure incompatibility — Mitigation: ora2pg + manual review of 340 procedures\n" +
      "Risk 3: Performance regression — Mitigation: Query plan comparison, index tuning\n" +
      "Impact: 15,000 billing users affected during maintenance window",
    justification: "Oracle license renewal costs $1.2M/year. PostgreSQL reduces to $0. Migration saves $1.2M annually.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 2: Missing test plan entirely ───
  {
    short_description: "Deploy Kubernetes 1.31 Cluster Upgrade — Production EKS",
    description:
      "Upgrade production EKS cluster from Kubernetes 1.29 to 1.31. Covers control plane upgrade, " +
      "node group rolling update (96 nodes across 3 AZs), and add-on compatibility updates (CoreDNS, " +
      "kube-proxy, VPC CNI, EBS CSI driver).",
    type: "Normal",
    category: "Software",
    priority: "2 - High",
    risk: "High",
    impact: "2 - Medium",
    urgency: "2 - Medium",
    state: "-5",
    approval: "requested",
    start_date: iso(future(5)),
    end_date: iso(future(5.5)),
    implementation_plan:
      "K8S 1.31 UPGRADE IMPLEMENTATION PLAN\n" +
      "=====================================\n\n" +
      "PRE-CHECKS:\n" +
      "1. Run kubectl version — confirm current version 1.29.4\n" +
      "2. Check deprecated API usage: kubent (kube-no-trouble) scan\n" +
      "3. Verify all workloads are healthy: kubectl get pods -A | grep -v Running\n" +
      "4. Backup etcd snapshot: eksctl utils export-kubeconfig\n" +
      "5. Contact: Platform team Slack #k8s-upgrades, bridge +1-555-0212\n\n" +
      "PHASE 1: CONTROL PLANE (15 min)\n" +
      "1. aws eks update-cluster-version --name prod-cluster --kubernetes-version 1.31\n" +
      "2. Wait for update status ACTIVE (~10 min)\n" +
      "3. Verify: kubectl version --short\n\n" +
      "PHASE 2: ADD-ONS (20 min)\n" +
      "1. Update CoreDNS to v1.11.3\n" +
      "2. Update kube-proxy to v1.31.x\n" +
      "3. Update VPC CNI to latest compatible version\n" +
      "4. Update EBS CSI driver\n\n" +
      "PHASE 3: NODE GROUPS (90 min)\n" +
      "1. Update managed node group AMI to AL2023 with K8s 1.31\n" +
      "2. Rolling update: 1 node at a time with PDB respect\n" +
      "3. Monitor pod rescheduling after each node rotation\n\n" +
      "POST-CHECKS:\n" +
      "1. All pods Running/Completed\n" +
      "2. All nodes Ready, version 1.31\n" +
      "3. Ingress controllers functional\n" +
      "4. Cluster autoscaler operational\n" +
      "5. Monitor for 30 min",
    backout_plan:
      "ROLLBACK:\n" +
      "1. Control plane: AWS does not support K8s version downgrade — forward-fix only\n" +
      "2. Node groups: Revert AMI to previous version, perform rolling replacement\n" +
      "3. Add-ons: Revert to previous versions via Helm/EKS add-on management\n" +
      "4. If critical workload failure: scale down affected deployments, redirect traffic\n" +
      "5. Escalation: AWS support case (Business support SLA < 1hr)\n" +
      "Estimated rollback time: 60 min for node groups, add-ons immediate",
    test_plan: "",  // ← INTENTIONALLY EMPTY — no test plan
    change_plan:
      "Day -3: Run kubent scan, update manifests for deprecated APIs\n" +
      "Day -2: Upgrade staging cluster, validate workloads\n" +
      "Day -1: Final checklist review, CAB approval\n" +
      "Day 0: Execute upgrade during maintenance window (02:00-06:00 UTC)\n" +
      "Day +1 to +3: Enhanced monitoring",
    risk_impact_analysis:
      "Risk: API deprecations breaking workloads — Mitigation: kubent scan + staging validation\n" +
      "Risk: Node rotation causing pod disruption — Mitigation: PDBs on all critical workloads\n" +
      "Risk: Add-on incompatibility — Mitigation: EKS managed add-ons auto-resolve compatibility\n" +
      "Impact: 200+ microservices, all teams affected during node rotation window",
    justification: "K8s 1.29 EOL in Feb 2026. Must upgrade to maintain security patch coverage and EKS support.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 3: Extremely short / empty implementation plan ───
  {
    short_description: "Upgrade Redis Cluster from 7.0 to 7.4 — Production Cache Layer",
    description:
      "Upgrade all production Redis instances from 7.0.15 to 7.4.2 for performance improvements " +
      "and security patches. Affects 6 Redis clusters serving caching, session management, and pub/sub.",
    type: "Normal",
    category: "Software",
    priority: "3 - Moderate",
    risk: "Moderate",
    impact: "2 - Medium",
    urgency: "3 - Low",
    state: "-5",
    approval: "requested",
    start_date: iso(future(7)),
    end_date: iso(future(7.25)),
    implementation_plan: "Upgrade Redis on all servers. Restart services after.",  // ← INTENTIONALLY MINIMAL
    backout_plan: "Downgrade Redis if something breaks.",  // ← INTENTIONALLY MINIMAL
    test_plan: "Test cache operations after upgrade.",  // ← INTENTIONALLY MINIMAL
    change_plan: "Do the upgrade during maintenance window.",
    risk_impact_analysis: "Low risk. Redis upgrades are usually smooth.",
    justification: "Security patches and performance improvements.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 4: No pre-checks or post-checks in implementation plan ───
  {
    short_description: "Deploy New Payment Gateway Integration — Stripe v2024.12",
    description:
      "Replace legacy PayPal Pro integration with Stripe v2024.12 for all payment processing. " +
      "Affects checkout flow, subscription billing, refund processing, and PCI DSS compliance scope. " +
      "12 microservices require API endpoint updates.",
    type: "Normal",
    category: "Software",
    priority: "2 - High",
    risk: "High",
    impact: "1 - High",
    urgency: "2 - Medium",
    state: "-5",
    approval: "requested",
    start_date: iso(future(4)),
    end_date: iso(future(4.5)),
    implementation_plan:
      "PAYMENT GATEWAY MIGRATION\n" +
      "=========================\n\n" +            // ← NO PRE-CHECKS SECTION
      "STEP 1: Deploy payment-service v4.2.0 with Stripe SDK\n" +
      "  kubectl set image deployment/payment-service payment=payment:4.2.0\n" +
      "  Wait for rollout: kubectl rollout status deployment/payment-service\n\n" +
      "STEP 2: Update checkout-service to use new payment endpoints\n" +
      "  kubectl set image deployment/checkout-service checkout=checkout:3.8.0\n\n" +
      "STEP 3: Update subscription-billing-service\n" +
      "  kubectl set image deployment/subscription-billing billing=billing:2.5.0\n\n" +
      "STEP 4: Update refund-processor-service\n" +
      "  kubectl set image deployment/refund-processor refund=refund:1.9.0\n\n" +
      "STEP 5: Switch DNS for payment webhook endpoint\n" +
      "  Update Route53 CNAME: webhooks.payments.example.com → stripe-webhooks-prod.example.com\n\n" +
      "STEP 6: Enable Stripe webhooks in production Stripe dashboard\n" +
      "  Activate endpoints for: payment_intent.succeeded, charge.refunded, invoice.paid\n\n" +
      "STEP 7: Disable PayPal Pro webhooks in PayPal dashboard\n" +
      "  Deactivate IPN listener for legacy endpoints\n\n" +
      "STEP 8: Run a $1.00 test transaction through checkout flow\n",  // ← NO POST-CHECKS, NO MONITORING
    backout_plan:
      "ROLLBACK PROCEDURE — 30 min estimated\n" +
      "1. Revert all service deployments to previous versions:\n" +
      "   kubectl rollout undo deployment/payment-service\n" +
      "   kubectl rollout undo deployment/checkout-service\n" +
      "   kubectl rollout undo deployment/subscription-billing\n" +
      "   kubectl rollout undo deployment/refund-processor\n" +
      "2. Revert DNS: webhooks.payments.example.com → paypal-webhooks-prod.example.com\n" +
      "3. Re-enable PayPal Pro webhooks\n" +
      "4. Disable Stripe production webhooks\n" +
      "5. Verify payments flowing through PayPal again",
    test_plan:
      "1. Unit tests: 2,400 test cases for payment-service\n" +
      "2. Integration tests: end-to-end payment flow with Stripe test mode\n" +
      "3. Subscription billing cycle simulation (create, charge, cancel)\n" +
      "4. Refund processing: full and partial refunds\n" +
      "5. Webhook delivery: verify all event types processed correctly\n" +
      "6. PCI DSS compliance scan: Qualys ASV scan against new endpoints\n" +
      "7. Load test: 500 concurrent transactions",
    change_plan:
      "Week -2: Complete Stripe integration in staging, PCI audit\n" +
      "Week -1: Parallel-run with PayPal (shadow mode), team training\n" +
      "Day 0: Full cutover during low-traffic window (03:00-05:00 UTC)\n" +
      "Day +1 to +7: Enhanced monitoring, PayPal Pro kept as fallback\n" +
      "Day +14: Decommission PayPal Pro integration if stable",
    risk_impact_analysis:
      "Risk 1: Payment processing failure during cutover — Impact: Revenue loss ~$50K/hour\n" +
      "  Mitigation: Parallel-run validation + instant rollback capability\n" +
      "Risk 2: Webhook delivery failure — Impact: Missing payment confirmations\n" +
      "  Mitigation: Stripe webhook retry (up to 72h) + manual reconciliation process\n" +
      "Risk 3: PCI DSS scope change — Impact: Compliance violation\n" +
      "  Mitigation: Pre-cutover ASV scan + QSA consultation\n" +
      "Affected users: All customers (~85,000 active)",
    justification:
      "PayPal Pro fees: 2.9% + $0.30 per transaction. Stripe: 2.7% + $0.05. " +
      "At $4.2M monthly volume, saves $126K/year. Also: better developer experience, " +
      "subscription billing built-in, and modern webhook infrastructure.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 5: Missing risk/impact analysis ───
  {
    short_description: "Rotate TLS Certificates — All Production Load Balancers",
    description:
      "Annual TLS certificate rotation for all production-facing load balancers. " +
      "Covers 14 ALBs, 6 NLBs, and 3 CloudFront distributions. Certificates issued by DigiCert " +
      "with new 2048-bit RSA keys. Affects all HTTPS traffic to production services.",
    type: "Standard",
    category: "Network",
    priority: "2 - High",
    risk: "Moderate",
    impact: "1 - High",
    urgency: "2 - Medium",
    state: "-5",
    approval: "requested",
    start_date: iso(future(2)),
    end_date: iso(future(2.25)),
    implementation_plan:
      "TLS CERTIFICATE ROTATION — ALL PRODUCTION LBs\n" +
      "===============================================\n\n" +
      "PRE-CHECKS:\n" +
      "1. Verify new certificates are uploaded to ACM (14 ALBs + 6 NLBs)\n" +
      "2. Verify CloudFront custom SSL certificates are staged in IAM\n" +
      "3. Confirm certificate chain: leaf → intermediate → root (DigiCert Global G2)\n" +
      "4. Test certificate with openssl s_client -connect test-lb:443\n" +
      "5. Contact: NetOps on-call +1-555-0301\n\n" +
      "PHASE 1: ALB ROTATION (30 min)\n" +
      "1. For each ALB listener on port 443:\n" +
      "   aws elbv2 modify-listener --listener-arn <arn> --certificates CertificateArn=<new>\n" +
      "2. Verify: curl -vI https://<service> — check certificate expiry and issuer\n" +
      "3. Repeat for all 14 ALBs\n\n" +
      "PHASE 2: NLB ROTATION (20 min)\n" +
      "1. Update TLS listeners on all 6 NLBs\n" +
      "2. Verify certificate chain and OCSP stapling\n\n" +
      "PHASE 3: CLOUDFRONT (20 min)\n" +
      "1. Update 3 CloudFront distributions with new IAM certificate\n" +
      "2. Wait for distribution deployment (~15 min)\n" +
      "3. Verify: curl -vI https://cdn.example.com\n\n" +
      "POST-CHECKS:\n" +
      "1. SSL Labs scan on all public endpoints (target: A+ rating)\n" +
      "2. Verify HSTS headers still present\n" +
      "3. Check certificate monitoring in Datadog — expiry > 365 days\n" +
      "4. Confirm no mixed-content warnings in browser console\n" +
      "5. Monitor error rates for 30 minutes",
    backout_plan:
      "ROLLBACK — IMMEDIATE\n" +
      "1. ALBs: Revert listener to previous certificate ARN\n" +
      "   aws elbv2 modify-listener --listener-arn <arn> --certificates CertificateArn=<old>\n" +
      "2. NLBs: Same procedure as ALBs\n" +
      "3. CloudFront: Update distribution with previous IAM certificate\n" +
      "   (Note: CloudFront propagation takes ~15 min)\n" +
      "4. Old certificates remain valid until original expiry (30 days)\n" +
      "Estimated rollback time: 15 min for LBs, 30 min for CloudFront",
    test_plan:
      "1. Certificate chain validation: openssl verify -CAfile chain.pem cert.pem\n" +
      "2. TLS handshake test: openssl s_client across all endpoints\n" +
      "3. Browser compatibility: Chrome, Firefox, Safari, Edge (current + last 2 versions)\n" +
      "4. Mobile clients: iOS Safari, Android Chrome\n" +
      "5. API client test: curl, httpx, requests libraries\n" +
      "6. OCSP stapling: openssl s_client -status\n" +
      "7. SSL Labs full scan (target: A+)",
    change_plan:
      "Day -5: Generate CSRs, submit to DigiCert, receive certificates\n" +
      "Day -3: Upload to ACM and IAM, validate chain\n" +
      "Day -1: Test rotation on staging LBs\n" +
      "Day 0: Production rotation (10:00-12:00 UTC, business hours for monitoring)\n" +
      "Day +1: SSL Labs rescans, compliance documentation update",
    risk_impact_analysis: "",  // ← INTENTIONALLY EMPTY — no risk analysis
    justification:
      "Current certificates expire in 30 days. Failure to rotate will cause HTTPS failures " +
      "across all production services affecting 120,000 daily active users. " +
      "PCI DSS requirement 4.1: Use strong cryptography for transmission of cardholder data.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 6: No rollback references in implementation plan ───
  {
    short_description: "Migrate Logging Pipeline — Elasticsearch to OpenSearch 2.17",
    description:
      "Migrate centralized logging from self-managed Elasticsearch 7.17 to AWS OpenSearch 2.17. " +
      "All 200+ microservices ship logs via Fluentd. Affects log search, alerting, dashboards, " +
      "and compliance audit trail. 2TB daily log ingestion.",
    type: "Normal",
    category: "Software",
    priority: "3 - Moderate",
    risk: "Moderate",
    impact: "2 - Medium",
    urgency: "3 - Low",
    state: "-5",
    approval: "requested",
    start_date: iso(future(10)),
    end_date: iso(future(11)),
    implementation_plan:
      "LOGGING MIGRATION — ES TO OPENSEARCH\n" +
      "=====================================\n\n" +        // ← NO ROLLBACK REFERENCE ANYWHERE
      "STEP 1: Configure Fluentd dual-write\n" +
      "  Update fluentd.conf to send logs to both ES and OpenSearch\n" +
      "  Deploy updated Fluentd DaemonSet across all K8s nodes\n\n" +
      "STEP 2: Backfill historical data\n" +
      "  Use reindex API to copy last 30 days from ES to OpenSearch\n" +
      "  elasticdump --input=http://es-cluster:9200 --output=https://opensearch:443\n\n" +
      "STEP 3: Migrate Kibana dashboards\n" +
      "  Export saved objects from Kibana, import to OpenSearch Dashboards\n" +
      "  Verify all 47 dashboards render correctly\n\n" +
      "STEP 4: Update alerting rules\n" +
      "  Migrate 85 ElastAlert rules to OpenSearch alerting plugin\n" +
      "  Verify alert routing (PagerDuty, Slack, email)\n\n" +
      "STEP 5: Switch application log queries\n" +
      "  Update 12 services that query ES directly to point to OpenSearch\n\n" +
      "STEP 6: Decommission dual-write\n" +
      "  Remove ES output from Fluentd config\n" +
      "  Shut down ES cluster after 7-day parallel run\n\n" +
      "TIMELINE:\n" +
      "  Day 0: Enable dual-write, start backfill\n" +
      "  Day 1-2: Backfill completes, migrate dashboards\n" +
      "  Day 3: Migrate alerting rules\n" +
      "  Day 4: Switch application queries\n" +
      "  Day 5-11: Parallel run monitoring\n" +
      "  Day 12: Decommission ES",
    backout_plan:
      "ROLLBACK:\n" +
      "1. Revert Fluentd config to ES-only output\n" +
      "2. Revert application query endpoints to ES\n" +
      "3. Revert alerting rules to ElastAlert\n" +
      "4. ES cluster remains available throughout migration as fallback\n" +
      "Estimated rollback time: 30 min (config revert + DaemonSet rollout)",
    test_plan:
      "1. Log ingestion: verify all 200+ services shipping to OpenSearch\n" +
      "2. Search accuracy: compare query results ES vs OpenSearch for 100 sample queries\n" +
      "3. Dashboard validation: visual comparison of all 47 dashboards\n" +
      "4. Alert testing: trigger 5 test alerts, verify routing\n" +
      "5. Performance: query latency p95 within 20% of ES baseline\n" +
      "6. Retention: verify 90-day retention policy applied correctly",
    change_plan:
      "Week 1: Provision OpenSearch domain, configure networking\n" +
      "Week 2: Enable dual-write, start backfill\n" +
      "Week 3: Migrate dashboards and alerting\n" +
      "Week 4: Switch application queries, begin parallel run\n" +
      "Week 5: Decommission ES if stable",
    risk_impact_analysis:
      "Risk 1: Log loss during migration — Mitigation: Dual-write ensures no gap\n" +
      "Risk 2: Dashboard incompatibility — Mitigation: Export/import + manual verification\n" +
      "Risk 3: Query syntax differences — Mitigation: OpenSearch supports ES 7.x query DSL\n" +
      "Risk 4: Alert routing failure — Mitigation: Test all 85 rules in staging\n" +
      "Impact: All teams use centralized logging. Degradation affects incident response.",
    justification:
      "Elasticsearch license changed to SSPL. OpenSearch is Apache 2.0 licensed. " +
      "AWS OpenSearch Service reduces operational overhead. Saves ~$8K/month in self-managed infra costs.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 7: Missing timeline and contact info ───
  {
    short_description: "Enable mTLS Between All Production Microservices",
    description:
      "Enforce mutual TLS (mTLS) for all service-to-service communication in the production " +
      "Kubernetes cluster. Deploying Istio service mesh with auto-injected Envoy sidecars. " +
      "Affects 200+ microservices across 12 namespaces.",
    type: "Normal",
    category: "Network",
    priority: "2 - High",
    risk: "High",
    impact: "2 - Medium",
    urgency: "2 - Medium",
    state: "-5",
    approval: "requested",
    start_date: iso(future(6)),
    end_date: iso(future(7)),
    implementation_plan:
      "MTLS ROLLOUT — ISTIO SERVICE MESH\n" +         // ← NO TIMELINE, NO CONTACT INFO
      "==================================\n\n" +
      "PRE-CHECKS:\n" +
      "1. Verify Istio control plane is healthy: istioctl verify-install\n" +
      "2. Confirm sidecar injection is enabled for all namespaces\n" +
      "3. Review PeerAuthentication policies in staging\n\n" +
      "STEP 1: Deploy Istio in PERMISSIVE mode\n" +
      "  kubectl apply -f istio-system/peer-auth-permissive.yaml\n" +
      "  This allows both plaintext and mTLS — no disruption\n\n" +
      "STEP 2: Monitor mTLS adoption\n" +
      "  Use Kiali dashboard to verify mesh connectivity\n" +
      "  Check: istioctl x describe pod <pod> — expect 'MUTUAL_TLS'\n\n" +
      "STEP 3: Fix non-mesh services\n" +
      "  Identify services not yet injected with sidecar\n" +
      "  Add label: kubectl label namespace <ns> istio-injection=enabled\n" +
      "  Restart deployments to trigger sidecar injection\n\n" +
      "STEP 4: Switch to STRICT mTLS\n" +
      "  kubectl apply -f istio-system/peer-auth-strict.yaml\n" +
      "  This enforces mTLS for ALL service communication\n\n" +
      "POST-CHECKS:\n" +
      "1. Verify all services communicating successfully\n" +
      "2. Check for connection refused errors in service logs\n" +
      "3. Validate external ingress still works (gateway config)\n" +
      "4. Run integration tests across all critical paths",
    backout_plan:
      "IMMEDIATE ROLLBACK:\n" +
      "1. Switch back to PERMISSIVE mode:\n" +
      "   kubectl apply -f istio-system/peer-auth-permissive.yaml\n" +
      "2. If Istio control plane is the issue:\n" +
      "   kubectl delete PeerAuthentication --all -n istio-system\n" +
      "3. Emergency: Remove sidecar injection labels and restart pods\n" +
      "   kubectl label namespace <ns> istio-injection-\n" +
      "   kubectl rollout restart deployment -n <ns>\n" +
      "4. Estimated rollback: 5 min for PERMISSIVE switch, 30 min for full sidecar removal",
    test_plan:
      "1. Service connectivity matrix: verify all service-to-service paths\n" +
      "2. mTLS verification: tcpdump on pod network — confirm encrypted traffic\n" +
      "3. Certificate rotation: verify Citadel auto-rotates certs\n" +
      "4. Performance: measure latency overhead from Envoy proxies (<5ms target)\n" +
      "5. External access: verify ingress gateway handles external→mesh traffic\n" +
      "6. Canary test: deploy test service with STRICT policy, verify behavior",
    change_plan: "Roll out Istio mTLS in production cluster.",  // ← MINIMAL — no phases or dates
    risk_impact_analysis:
      "Risk 1: Service-to-service communication failure after STRICT mode\n" +
      "  Probability: Medium | Impact: High\n" +
      "  Mitigation: Gradual rollout PERMISSIVE→STRICT with monitoring\n\n" +
      "Risk 2: Performance degradation from Envoy sidecar overhead\n" +
      "  Probability: Low | Impact: Medium\n" +
      "  Mitigation: Staging benchmark showed <3ms added latency\n\n" +
      "Risk 3: External integrations breaking (webhooks, third-party callbacks)\n" +
      "  Probability: Medium | Impact: Medium\n" +
      "  Mitigation: Ingress gateway exemptions for external traffic",
    justification:
      "SOC 2 Type II audit finding: unencrypted service-to-service traffic. " +
      "Requirement: encrypt all internal communications by Q2 2026. " +
      "Also improves zero-trust posture and enables fine-grained authorization policies.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 8: Extremely short plans across the board (minimal effort) ───
  {
    short_description: "Update Node.js from 20 to 22 LTS on API Servers",
    description: "Upgrade Node.js on all API servers.",
    type: "Normal",
    category: "Software",
    priority: "3 - Moderate",
    risk: "Moderate",
    impact: "2 - Medium",
    urgency: "3 - Low",
    state: "-5",
    approval: "requested",
    start_date: iso(future(8)),
    end_date: iso(future(8.25)),
    implementation_plan: "Install Node.js 22 LTS and restart servers.",  // ← ONE LINE
    backout_plan: "Revert to Node.js 20.",  // ← ONE LINE
    test_plan: "Run tests.",  // ← ONE LINE
    change_plan: "Do upgrade.",  // ← ONE LINE
    risk_impact_analysis: "Low risk.",  // ← ONE LINE
    justification: "Need latest version.",  // ← ONE LINE
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 9: Good plan but missing monitoring/verification steps ───
  {
    short_description: "Deploy API Rate Limiting — Production API Gateway",
    description:
      "Implement request rate limiting on the production API gateway (Kong) to prevent abuse " +
      "and ensure fair usage. Configuration: 1000 req/min per API key, 100 req/min for " +
      "unauthenticated requests, burst allowance of 50. Affects all 45 public API endpoints.",
    type: "Normal",
    category: "Software",
    priority: "2 - High",
    risk: "Moderate",
    impact: "2 - Medium",
    urgency: "2 - Medium",
    state: "-5",
    approval: "requested",
    start_date: iso(future(3)),
    end_date: iso(future(3.25)),
    implementation_plan:
      "API RATE LIMITING DEPLOYMENT\n" +
      "============================\n\n" +
      "PRE-CHECKS:\n" +
      "1. Verify Kong Admin API is accessible: curl http://kong-admin:8001/status\n" +
      "2. Backup current Kong configuration: kong config db_export > backup.yml\n" +
      "3. Review current traffic patterns in Grafana to set appropriate limits\n" +
      "4. Confirm Redis cluster (rate limit counter store) is healthy\n" +
      "5. Contact: API Platform team +1-555-0488\n\n" +
      "STEP 1: Deploy rate-limiting plugin globally\n" +
      "  curl -X POST http://kong-admin:8001/plugins \\\n" +
      "    --data 'name=rate-limiting' \\\n" +
      "    --data 'config.minute=1000' \\\n" +
      "    --data 'config.policy=redis' \\\n" +
      "    --data 'config.redis_host=redis-ratelimit.prod'\n\n" +
      "STEP 2: Configure per-consumer overrides for premium API keys\n" +
      "  Apply 5000 req/min for enterprise tier consumers\n" +
      "  Apply 2000 req/min for business tier consumers\n\n" +
      "STEP 3: Configure unauthenticated rate limit\n" +
      "  Apply 100 req/min for requests without API key\n" +
      "  Apply burst allowance of 50 using sliding window\n\n" +
      "STEP 4: Deploy custom 429 response template\n" +
      "  Update Kong error template with retry-after header and documentation link\n\n" +
      "STEP 5: Enable rate limit headers in responses\n" +
      "  X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset\n",
      // ← NO POST-CHECKS, NO MONITORING SECTION, NO VERIFICATION
    backout_plan:
      "ROLLBACK — IMMEDIATE (< 2 min):\n" +
      "1. Remove rate-limiting plugin:\n" +
      "   curl -X DELETE http://kong-admin:8001/plugins/<plugin-id>\n" +
      "2. Or restore from backup:\n" +
      "   kong config db_import backup.yml\n" +
      "3. Verify: send test requests, confirm no 429 responses\n" +
      "4. Notify API consumers that rate limiting is temporarily disabled\n" +
      "Rollback duration: 1 min for plugin removal, 5 min for full config restore",
    test_plan:
      "1. Functional: send 1001 requests in 1 min — verify 429 on request #1001\n" +
      "2. Burst: send 50 rapid requests — verify burst allowance works\n" +
      "3. Consumer tiers: test enterprise (5000/min) and business (2000/min) limits\n" +
      "4. Unauthenticated: test 100/min limit without API key\n" +
      "5. Response headers: verify X-RateLimit-* headers present\n" +
      "6. Redis failover: simulate Redis failure — verify graceful degradation\n" +
      "7. Performance: verify <2ms added latency from rate limiting plugin",
    change_plan:
      "Day -3: Configure and test in staging\n" +
      "Day -2: Notify API consumers via email and developer portal\n" +
      "Day -1: CAB approval, final review\n" +
      "Day 0: Deploy at 10:00 UTC (business hours for immediate monitoring)\n" +
      "Day +1 to +5: Monitor for false positives, adjust limits if needed",
    risk_impact_analysis:
      "Risk 1: Legitimate users hitting rate limits\n" +
      "  Probability: Medium | Impact: Medium\n" +
      "  Mitigation: 1000/min is 3x current p99 usage. Monitor and adjust.\n\n" +
      "Risk 2: Redis failure causing rate limit service outage\n" +
      "  Probability: Low | Impact: High\n" +
      "  Mitigation: Kong rate-limiting plugin has local fallback policy.\n\n" +
      "Risk 3: API consumers not aware of new limits\n" +
      "  Probability: Medium | Impact: Low\n" +
      "  Mitigation: 2-week advance notice + developer portal documentation.\n\n" +
      "Affected: All API consumers (~2,500 active API keys, ~45M requests/day)",
    justification:
      "Three DDoS incidents in past quarter caused 4 hours total downtime. Rate limiting " +
      "prevents abuse, ensures fair usage, and reduces infrastructure costs by blocking " +
      "abusive traffic. Required for SOC 2 control: API security.",
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },

  // ─── CR 10: High-risk change with inadequate justification ───
  {
    short_description: "Drop and Recreate Production User Authentication Tables",
    description:
      "Restructure the user authentication database schema by dropping and recreating the " +
      "users, sessions, and auth_tokens tables with new column layout. Affects 450,000 user accounts. " +
      "Requires full data migration with password hash re-encoding from bcrypt to Argon2id.",
    type: "Emergency",
    category: "Software",
    priority: "1 - Critical",
    risk: "High",
    impact: "1 - High",
    urgency: "1 - High",
    state: "-5",
    approval: "requested",
    start_date: iso(future(1)),
    end_date: iso(future(1.5)),
    implementation_plan:
      "AUTH TABLE RESTRUCTURE\n" +
      "======================\n\n" +
      "PRE-CHECKS:\n" +
      "1. Full database backup: pg_dump -Fc auth_db > auth_backup.dump\n" +
      "2. Verify backup integrity: pg_restore --list auth_backup.dump\n" +
      "3. Confirm maintenance page is ready to deploy\n" +
      "4. Bridge call: +1-555-0777\n\n" +
      "STEP 1: Enable maintenance mode — redirect all users to maintenance page\n" +
      "STEP 2: Wait for active sessions to drain (5 min)\n" +
      "STEP 3: Export user data to migration staging table\n" +
      "  INSERT INTO users_migration SELECT * FROM users;\n" +
      "STEP 4: Drop existing tables\n" +
      "  DROP TABLE auth_tokens CASCADE;\n" +
      "  DROP TABLE sessions CASCADE;\n" +
      "  DROP TABLE users CASCADE;\n" +
      "STEP 5: Create new schema\n" +
      "  psql -f new_auth_schema.sql auth_db\n" +
      "STEP 6: Migrate data with hash re-encoding\n" +
      "  python3 scripts/migrate_auth.py --source users_migration --target users\n" +
      "  (Re-encodes 450K password hashes from bcrypt to Argon2id)\n" +
      "STEP 7: Recreate indexes and constraints\n" +
      "STEP 8: Restart auth-service\n" +
      "STEP 9: Disable maintenance mode\n\n" +
      "POST-CHECKS:\n" +
      "1. Test login with 5 known test accounts\n" +
      "2. Test registration flow\n" +
      "3. Test password reset flow\n" +
      "4. Check session creation and validation\n" +
      "5. Monitor auth-service error rate for 30 min",
    backout_plan:
      "EMERGENCY ROLLBACK:\n" +
      "1. Re-enable maintenance mode\n" +
      "2. Drop new tables: DROP TABLE users, sessions, auth_tokens CASCADE;\n" +
      "3. Restore from backup: pg_restore -d auth_db auth_backup.dump\n" +
      "4. Restart auth-service\n" +
      "5. Disable maintenance mode\n" +
      "6. Verify login functionality\n" +
      "Estimated rollback time: 45 min (restore 450K users from backup)\n" +
      "Risk: Any users who registered AFTER migration but BEFORE rollback will be lost",
    test_plan:
      "1. Backup/restore test: full dump and restore on staging\n" +
      "2. Migration script test: process all 450K accounts on staging copy\n" +
      "3. Hash compatibility: verify Argon2id hashes validate correctly\n" +
      "4. API compatibility: all auth endpoints return expected responses\n" +
      "5. Session migration: verify active sessions are handled\n" +
      "6. Performance: new schema query plans match or beat old schema",
    change_plan:
      "Emergency window requested for Saturday 02:00-06:00 UTC\n" +
      "Maintenance mode: 02:00 UTC\n" +
      "Migration: 02:15-04:30 UTC\n" +
      "Validation: 04:30-05:30 UTC\n" +
      "Maintenance mode off: 05:30 UTC\n" +
      "Monitoring: 05:30-08:00 UTC",
    risk_impact_analysis:
      "Risk 1: Data loss — dropping production tables is destructive\n" +
      "  Probability: Low | Impact: Critical\n" +
      "  Mitigation: Full pg_dump backup + staging validation\n\n" +
      "Risk 2: Hash migration failure — 450K accounts inaccessible\n" +
      "  Probability: Low | Impact: Critical\n" +
      "  Mitigation: Migration script tested on full staging copy\n\n" +
      "Risk 3: Extended downtime beyond maintenance window\n" +
      "  Probability: Medium | Impact: High\n" +
      "  Mitigation: Parallel migration approach, fallback to restore\n\n" +
      "Risk 4: New user registrations lost during rollback\n" +
      "  Probability: Medium | Impact: Medium\n" +
      "  Mitigation: Maintenance mode prevents new registrations\n\n" +
      "Impact: ALL users (450,000) locked out during maintenance. Estimated 2-4 hour window.",
    justification: "We want to use Argon2id instead of bcrypt.",  // ← INADEQUATE for a critical/high-risk change
    assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  },
];

async function insertChangeRequest(cr, index) {
  const url = `${INSTANCE}/api/now/table/change_request`;
  const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

  console.log(`\n[${ index + 1}/${changeRequests.length}] Inserting: ${cr.short_description}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(cr),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error(`  ✗ API error ${res.status}: ${JSON.stringify(body.error || body, null, 2)}`);
      return null;
    }

    const r = body.result;
    console.log(`  ✓ Created: ${r.number} (sys_id: ${r.sys_id})`);
    console.log(`    State: ${r.state} | Risk: ${r.risk} | Priority: ${r.priority}`);
    return r;
  } catch (err) {
    console.error(`  ✗ Connection error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Insert Incomplete Test Change Requests into ServiceNow");
  console.log(`  Instance: ${INSTANCE}`);
  console.log(`  Total CRs: ${changeRequests.length}`);
  console.log("═══════════════════════════════════════════════════════");

  const incompleteness = [
    "Missing backout plan entirely",
    "Missing test plan entirely",
    "Extremely short/minimal implementation plan",
    "No pre-checks or post-checks in implementation plan",
    "Missing risk/impact analysis",
    "No rollback references in implementation plan",
    "Missing timeline and contact info in implementation plan",
    "Extremely short plans across the board (minimal effort)",
    "Good implementation plan but missing monitoring/verification steps",
    "High-risk change with inadequate justification",
  ];

  let success = 0;
  let failed = 0;

  for (let i = 0; i < changeRequests.length; i++) {
    console.log(`\n  Incompleteness type: ${incompleteness[i]}`);
    const result = await insertChangeRequest(changeRequests[i], i);
    if (result) success++;
    else failed++;
  }

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(`  Results: ${success} created, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\nRun 'npm run import:snow' to sync these into the local database.");
}

main();
