#!/usr/bin/env node
/**
 * Insert a new Change Request into ServiceNow for enhancing ADCV3 services
 * on production load balancing servers.
 *
 * Usage: SNOW_INSTANCE=https://your-instance.service-now.com SNOW_USER=user SNOW_PASSWORD=pass node scripts/insert-adcv3-cr.mjs
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
const startDate = new Date(now.getTime() + 3 * 24 * 3600 * 1000); // +3 days
const endDate = new Date(startDate.getTime() + 6 * 3600 * 1000);  // +6 hours

const payload = {
  // ─── Core identification ───
  short_description: "Enhance ADCV3 Services on Production Load Balancing Servers",
  description:
    "This change request covers the enhancement and optimization of Application Delivery Controller v3 (ADCV3) " +
    "services running on production load balancing servers (LB-PROD-01 through LB-PROD-08). The scope includes " +
    "upgrading the ADCV3 firmware from v3.4.2 to v3.6.1, reconfiguring virtual server pools for improved traffic " +
    "distribution, enabling advanced health monitoring with HTTP/2 probes, implementing SSL/TLS 1.3 offloading " +
    "across all front-end virtual IPs, and deploying new iRules for geographic-based routing and rate limiting.\n\n" +
    "Business context: The current ADCV3 configuration is handling peak loads of 45,000 concurrent connections " +
    "but is projected to reach 60,000 by end of Q2 2026. The enhancements will increase capacity headroom to " +
    "85,000 concurrent connections, reduce SSL handshake latency by 40%, and improve failover time from 8s to " +
    "under 2s through enhanced VRRP configuration.\n\n" +
    "Affected infrastructure:\n" +
    "  • LB-PROD-01 through LB-PROD-04 (Primary DC — US-West)\n" +
    "  • LB-PROD-05 through LB-PROD-08 (Secondary DC — US-East)\n" +
    "  • 24 virtual servers across 6 application pools\n" +
    "  • 128 backend nodes (web tier, API tier, microservices tier)\n" +
    "  • DNS GSLB configuration for cross-DC failover\n\n" +
    "Stakeholders: Network Engineering, Application Platform, SRE, Security Operations, NOC.",

  // ─── Classification ───
  type: "Normal",
  category: "Network",
  priority: "2 - High",
  risk: "High",
  impact: "2 - Medium",
  urgency: "2 - Medium",
  scope: "Large",

  // ─── State & Approval ───
  state: "-5",           // New
  approval: "requested",
  phase: "requested",
  phase_state: "open",

  // ─── Assignment ───
  assignment_group: "287ebd7da9fe198100f92cc8d1d2154e", // Network group sys_id
  company: "ACME North America",

  // ─── Scheduling ───
  start_date: iso(startDate),
  end_date: iso(endDate),
  expected_start: iso(startDate),

  // ─── Implementation Plan ───
  implementation_plan:
    "ADCV3 PRODUCTION LOAD BALANCER ENHANCEMENT — IMPLEMENTATION PLAN\n" +
    "================================================================\n\n" +
    "PHASE 1: PRE-IMPLEMENTATION CHECKS (60 min)\n" +
    "--------------------------------------------\n" +
    "1.1  Verify current ADCV3 firmware version on all 8 LB nodes (expect v3.4.2)\n" +
    "1.2  Export full running configuration from each LB (UCS archive backup)\n" +
    "1.3  Capture baseline metrics:\n" +
    "     a. Current active connections per pool (via SNMP polling)\n" +
    "     b. SSL TPS rate (target baseline: ~12,000 TPS)\n" +
    "     c. CPU/memory utilization on each LB node\n" +
    "     d. Current health monitor status for all 128 backend nodes\n" +
    "1.4  Validate that DR failover path is active (ping GSLB VIPs from both DCs)\n" +
    "1.5  Confirm maintenance window with NOC — open bridge call: +1-555-0234\n" +
    "1.6  Notify stakeholders via #network-changes Slack and email distribution list\n" +
    "1.7  Verify rollback UCS archives are stored on NFS share (/backup/lb/pre-change/)\n\n" +
    "PHASE 2: SECONDARY DC UPGRADE — US-East (90 min)\n" +
    "-------------------------------------------------\n" +
    "2.1  Shift all GSLB traffic to Primary DC (US-West) via DNS weight adjustment\n" +
    "     - Set GSLB pool member LB-PROD-05/06/07/08 ratio to 0\n" +
    "     - Wait 5 min for DNS TTL expiration and verify zero active connections\n" +
    "2.2  Upgrade LB-PROD-05 firmware: v3.4.2 → v3.6.1\n" +
    "     a. Upload firmware image via SCP: scp adcv3-3.6.1.iso admin@lb-prod-05:/shared/images/\n" +
    "     b. Install: tmsh install sys software image adcv3-3.6.1.iso volume HD1.2\n" +
    "     c. Activate: tmsh reboot volume HD1.2\n" +
    "     d. Wait for management plane recovery (~4 min)\n" +
    "     e. Verify firmware: tmsh show sys version (expect 3.6.1)\n" +
    "2.3  Repeat step 2.2 for LB-PROD-06, LB-PROD-07, LB-PROD-08 (sequentially)\n" +
    "2.4  Apply new virtual server pool configuration on US-East LBs:\n" +
    "     a. Import pool config: tmsh load sys config merge file /config/adcv3-enhanced-pools.conf\n" +
    "     b. Enable HTTP/2 health monitors on all pools\n" +
    "     c. Configure SSL/TLS 1.3 client profiles on all HTTPS virtual servers\n" +
    "     d. Deploy new iRules: geo_routing_v2, rate_limit_api_v3\n" +
    "2.5  Validate US-East cluster:\n" +
    "     a. Check device trust and sync status (tmsh show cm sync-status)\n" +
    "     b. Run synthetic health checks against each virtual server\n" +
    "     c. Verify SSL handshake with TLS 1.3 (openssl s_client -tls1_3)\n" +
    "     d. Test iRule execution with sample geo-routed requests\n" +
    "2.6  Gradually restore GSLB traffic to US-East (25% → 50% → 100% over 15 min)\n\n" +
    "PHASE 3: PRIMARY DC UPGRADE — US-West (90 min)\n" +
    "-----------------------------------------------\n" +
    "3.1  Shift all GSLB traffic to Secondary DC (US-East, now upgraded)\n" +
    "     - Set GSLB pool member LB-PROD-01/02/03/04 ratio to 0\n" +
    "     - Wait 5 min for DNS TTL expiration\n" +
    "3.2  Upgrade LB-PROD-01 firmware: v3.4.2 → v3.6.1 (same procedure as 2.2)\n" +
    "3.3  Repeat for LB-PROD-02, LB-PROD-03, LB-PROD-04 (sequentially)\n" +
    "3.4  Apply new pool configuration and iRules (same as 2.4)\n" +
    "3.5  Validate US-West cluster (same checks as 2.5)\n" +
    "3.6  Restore balanced GSLB traffic distribution (50/50 US-West/US-East)\n\n" +
    "PHASE 4: ENHANCED VRRP CONFIGURATION (30 min)\n" +
    "----------------------------------------------\n" +
    "4.1  Configure sub-second VRRP failover on all LB pairs:\n" +
    "     - Set advertisement interval to 100ms (from current 1s)\n" +
    "     - Enable preemption with 30s delay\n" +
    "     - Configure BFD (Bidirectional Forwarding Detection) between LB peers\n" +
    "4.2  Test failover by simulating primary node failure:\n" +
    "     a. Disable LB-PROD-01 active interfaces\n" +
    "     b. Measure failover time to LB-PROD-02 (target: < 2s)\n" +
    "     c. Re-enable LB-PROD-01, verify preemption and state sync\n" +
    "4.3  Repeat failover test for US-East pair (LB-PROD-05 → LB-PROD-06)\n\n" +
    "PHASE 5: POST-DEPLOYMENT VERIFICATION (45 min)\n" +
    "-----------------------------------------------\n" +
    "5.1  Run comprehensive health check across all 24 virtual servers\n" +
    "5.2  Verify SSL/TLS 1.3 negotiation on all HTTPS endpoints\n" +
    "5.3  Validate geographic routing via test requests from US, EU, APAC regions\n" +
    "5.4  Confirm rate limiting rules are active: send 1000 req/s burst to API VIP\n" +
    "5.5  Monitor for 30 minutes:\n" +
    "     - Connection count, error rates, latency percentiles (p50, p95, p99)\n" +
    "     - CPU/memory on all 8 LB nodes\n" +
    "     - Backend node health status\n" +
    "5.6  Compare post-change metrics against Phase 1 baselines\n" +
    "5.7  Update CMDB with new firmware versions and configuration hashes\n" +
    "5.8  Send completion notification to all stakeholders\n" +
    "5.9  Close bridge call and update CHG record to Implement state",

  // ─── Backout Plan ───
  backout_plan:
    "ADCV3 ROLLBACK PROCEDURE — ESTIMATED DURATION: 60 MINUTES\n" +
    "==========================================================\n\n" +
    "TRIGGER CRITERIA FOR ROLLBACK:\n" +
    "  • Any LB node fails to boot after firmware upgrade\n" +
    "  • Connection drop rate exceeds 5% post-upgrade\n" +
    "  • SSL handshake failure rate exceeds 1%\n" +
    "  • Failover time exceeds 5s during VRRP testing\n" +
    "  • Any backend pool shows > 10% degraded members\n\n" +
    "STEP 1: IMMEDIATE TRAFFIC SHIFT\n" +
    "  a. Route 100% GSLB traffic to the unaffected DC\n" +
    "  b. If both DCs affected, activate DR bypass VIPs on edge routers\n" +
    "  c. Notify NOC: 'ADCV3 rollback initiated — traffic shifted'\n\n" +
    "STEP 2: FIRMWARE REVERT\n" +
    "  a. Boot affected LB nodes to previous volume (HD1.1 contains v3.4.2):\n" +
    "     tmsh reboot volume HD1.1\n" +
    "  b. Wait for management plane recovery (~4 min per node)\n" +
    "  c. Verify firmware version reverted: tmsh show sys version\n\n" +
    "STEP 3: CONFIGURATION RESTORE\n" +
    "  a. Restore UCS archive from pre-change backup:\n" +
    "     tmsh load sys ucs /backup/lb/pre-change/lb-prod-XX-prechange.ucs\n" +
    "  b. Verify running configuration matches pre-change state\n" +
    "  c. Check device trust and sync status between HA pairs\n\n" +
    "STEP 4: VALIDATION AFTER ROLLBACK\n" +
    "  a. Verify all virtual servers are UP and accepting traffic\n" +
    "  b. Check all 128 backend nodes show healthy status\n" +
    "  c. Run synthetic transactions against each application pool\n" +
    "  d. Confirm GSLB is resolving correctly from all regions\n" +
    "  e. Monitor for 30 minutes for stability\n\n" +
    "STEP 5: RESTORE TRAFFIC\n" +
    "  a. Gradually restore GSLB traffic to rolled-back DC (25% → 50% → 100%)\n" +
    "  b. Verify connection distribution and error rates\n\n" +
    "ESCALATION:\n" +
    "  • L1: Network Engineering on-call — +1-555-0234 (pager)\n" +
    "  • L2: ADCV3 vendor TAC — Case priority P1, contract #ADC-2026-0847\n" +
    "  • L3: VP Infrastructure — escalate if rollback fails after 2 hours\n" +
    "  • War room: Bridge +1-555-0299, Slack #incident-network",

  // ─── Test Plan ───
  test_plan:
    "ADCV3 ENHANCEMENT TEST PLAN\n" +
    "============================\n\n" +
    "1. PRE-UPGRADE VALIDATION (in staging environment — completed)\n" +
    "   ✓ Firmware upgrade v3.4.2 → v3.6.1 on staging LB pair (LB-STG-01/02)\n" +
    "   ✓ Configuration import of enhanced pool definitions\n" +
    "   ✓ iRule deployment and execution validation\n" +
    "   ✓ SSL/TLS 1.3 handshake with all cipher suites\n" +
    "   ✓ VRRP failover with sub-second advertisement interval\n" +
    "   ✓ 72-hour soak test under synthetic 50K concurrent connections\n\n" +
    "2. SMOKE TESTS (run after each DC upgrade)\n" +
    "   - HTTP GET to each virtual server VIP — expect 200 OK within 500ms\n" +
    "   - HTTPS connection with TLS 1.3 enforcement — verify protocol version\n" +
    "   - Health monitor probe status: all pool members green\n" +
    "   - SNMP walk on connection table: verify active session count\n" +
    "   - DNS resolution of GSLB VIPs from 3 geographic regions\n\n" +
    "3. FUNCTIONAL TESTS\n" +
    "   - Geographic routing: requests from EU proxy → EU backend pool\n" +
    "   - Geographic routing: requests from APAC proxy → APAC backend pool\n" +
    "   - Rate limiting: exceed 500 req/s from single source IP → verify 429 response\n" +
    "   - Rate limiting: verify legitimate traffic below threshold passes normally\n" +
    "   - SSL offloading: verify backend receives plaintext HTTP (X-Forwarded-Proto: https)\n" +
    "   - Connection persistence: verify sticky sessions via cookie injection\n" +
    "   - Weighted round-robin: verify traffic distribution matches pool member ratios\n\n" +
    "4. FAILOVER TESTS\n" +
    "   - Simulate active LB failure → measure failover time (target: < 2 seconds)\n" +
    "   - Verify zero packet loss during failover via continuous ping flood\n" +
    "   - Confirm connection table sync between HA peers\n" +
    "   - Test GSLB failover: disable entire DC → verify DNS resolves to other DC\n" +
    "   - Preemption test: recover failed node → verify it reclaims active role\n\n" +
    "5. PERFORMANCE TESTS\n" +
    "   - SSL TPS benchmark: target ≥ 18,000 TPS (current: 12,000)\n" +
    "   - Concurrent connection test: ramp to 70,000 simultaneous connections\n" +
    "   - Throughput test: 10 Gbps sustained for 10 minutes per LB pair\n" +
    "   - Latency measurement: p99 < 5ms for HTTP, p99 < 15ms for HTTPS\n" +
    "   - CPU utilization under load: target < 70% at 60K connections\n\n" +
    "6. SECURITY TESTS\n" +
    "   - Verify TLS 1.0/1.1 connections are rejected\n" +
    "   - Verify weak cipher suites (RC4, DES, 3DES) are disabled\n" +
    "   - Test X-Forwarded-For header injection prevention\n" +
    "   - Verify rate limiting blocks slowloris-style attacks\n" +
    "   - Certificate chain validation on all HTTPS virtual servers\n\n" +
    "7. ACCEPTANCE CRITERIA\n" +
    "   - All smoke tests pass within 5 minutes of each DC upgrade\n" +
    "   - Failover time < 2 seconds (measured 3 consecutive times)\n" +
    "   - Zero connection drops during controlled failover\n" +
    "   - SSL TPS ≥ 18,000 sustained for 5 minutes\n" +
    "   - No security scan findings for TLS configuration\n" +
    "   - Sign-off required from: Network Lead, SRE Lead, Security Ops",

  // ─── Change Plan ───
  change_plan:
    "CHANGE EXECUTION PLAN — ADCV3 PRODUCTION LOAD BALANCER ENHANCEMENT\n" +
    "===================================================================\n\n" +
    "Phase 1 — Preparation (Day -3 to Day -1)\n" +
    "  • Stage firmware images on all LB nodes (/shared/images/)\n" +
    "  • Pre-stage configuration files on NFS share\n" +
    "  • Complete staging environment validation (see test plan)\n" +
    "  • Obtain CAB approval — present risk assessment and rollback plan\n" +
    "  • Schedule maintenance window: Saturday 02:00-08:00 UTC\n" +
    "  • Coordinate with application teams for reduced traffic window\n" +
    "  • Pre-position NOC and on-call engineers\n\n" +
    "Phase 2 — Execution (Day 0, Maintenance Window)\n" +
    "  • 02:00 UTC — Open bridge call, begin Phase 1 pre-checks\n" +
    "  • 03:00 UTC — Begin US-East (Secondary DC) upgrade\n" +
    "  • 04:30 UTC — Complete US-East, begin US-West (Primary DC) upgrade\n" +
    "  • 06:00 UTC — Complete US-West, begin VRRP enhancement\n" +
    "  • 06:30 UTC — Begin post-deployment verification\n" +
    "  • 07:15 UTC — Complete verification, restore normal operations\n" +
    "  • 07:30 UTC — Close bridge, send completion notification\n\n" +
    "Phase 3 — Monitoring (Day 0 to Day +7)\n" +
    "  • Enhanced monitoring for 7 days post-deployment\n" +
    "  • Hourly metric checks for first 24 hours\n" +
    "  • Daily metric review with Network Engineering for days 2-7\n" +
    "  • Weekly capacity review with SRE team\n\n" +
    "Phase 4 — Closure (Day +7 to Day +10)\n" +
    "  • Compile performance comparison report (before/after)\n" +
    "  • Document lessons learned\n" +
    "  • Update network diagrams and CMDB\n" +
    "  • Archive old firmware images and UCS backups\n" +
    "  • Close change record with success metrics",

  // ─── Risk / Impact Analysis ───
  risk_impact_analysis:
    "RISK ASSESSMENT — ADCV3 PRODUCTION LOAD BALANCER ENHANCEMENT\n" +
    "=============================================================\n\n" +
    "Risk 1: Firmware upgrade failure — LB node fails to boot\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: Dual-boot volumes allow instant revert to previous firmware.\n" +
    "  Firmware pre-validated in staging for 72 hours under load.\n\n" +
    "Risk 2: Traffic disruption during GSLB failover\n" +
    "  Probability: Medium | Impact: High | Risk Score: High\n" +
    "  Mitigation: DNS TTL set to 30s pre-change. Rolling upgrade — one DC at a time.\n" +
    "  Secondary DC verified healthy before shifting traffic from primary.\n\n" +
    "Risk 3: SSL/TLS 1.3 compatibility issues with legacy clients\n" +
    "  Probability: Medium | Impact: Medium | Risk Score: Medium\n" +
    "  Mitigation: TLS 1.2 fallback remains enabled on all virtual servers.\n" +
    "  Client compatibility matrix reviewed — 99.2% of clients support TLS 1.3.\n\n" +
    "Risk 4: iRule logic error causing incorrect routing\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: iRules tested with 50+ geographic test cases in staging.\n" +
    "  Staged rollout: enabled on 1 virtual server first, then all.\n\n" +
    "Risk 5: VRRP sub-second failover causing network flapping\n" +
    "  Probability: Low | Impact: Medium | Risk Score: Low\n" +
    "  Mitigation: BFD configured with dampening timers. 30s preemption delay\n" +
    "  prevents rapid back-and-forth failover.\n\n" +
    "Risk 6: Capacity exhaustion during single-DC operation\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: Change scheduled during low-traffic window (Saturday 02:00 UTC).\n" +
    "  Single DC capacity: 50,000 connections (peak during window: ~15,000).\n\n" +
    "IMPACT ANALYSIS\n" +
    "  Affected Users: ~45,000 concurrent (peak hours); ~8,000 during maintenance window\n" +
    "  Affected Services: All web applications, API gateway, microservices mesh\n" +
    "  Estimated Downtime: Zero (rolling upgrade with GSLB traffic management)\n" +
    "  Data Impact: None — load balancers do not store application data\n" +
    "  Compliance: PCI-DSS requirement 4.1 — TLS 1.3 upgrade improves compliance posture",

  // ─── Justification ───
  justification:
    "BUSINESS JUSTIFICATION — ADCV3 PRODUCTION LOAD BALANCER ENHANCEMENT\n" +
    "====================================================================\n\n" +
    "1. Capacity Growth Requirement\n" +
    "   Current peak: 45,000 concurrent connections (85% of rated capacity)\n" +
    "   Projected Q2 2026 peak: 60,000 connections (exceeds current capacity)\n" +
    "   Post-enhancement capacity: 85,000 connections (42% headroom)\n" +
    "   Business value: Avoid $2.4M/year revenue loss from capacity-related outages\n\n" +
    "2. Performance Improvement\n" +
    "   SSL handshake latency: 15ms → 9ms (40% reduction with TLS 1.3)\n" +
    "   SSL TPS: 12,000 → 18,000 (50% improvement)\n" +
    "   Failover time: 8s → <2s (75% improvement)\n" +
    "   Business value: 0.3% conversion rate improvement = $680K/year additional revenue\n\n" +
    "3. Security Enhancement\n" +
    "   Enables TLS 1.3 with modern cipher suites\n" +
    "   Addresses PCI-DSS audit finding #2025-087 (deprecate TLS 1.0/1.1)\n" +
    "   Rate limiting protects against API abuse and DDoS\n" +
    "   Business value: Compliance requirement — non-compliance fine risk: $500K\n\n" +
    "4. Geographic Routing\n" +
    "   Reduces cross-region latency by routing users to nearest DC\n" +
    "   EU data residency compliance for GDPR\n" +
    "   Business value: 15% latency reduction for international users\n\n" +
    "5. Vendor Support\n" +
    "   ADCV3 firmware v3.4.2 reaches end-of-support on 2026-06-30\n" +
    "   v3.6.1 is the latest LTS release with security patches through 2028\n" +
    "   Business value: Continued vendor support and security patch availability",

  // ─── Configuration ───
  cmdb_ci: "Load Balancer - Production",
  business_service: "Application Delivery",
  service_offering: "Network Infrastructure",
  contact_type: "phone",
  location: "US-West Data Center",

  // ─── Flags ───
  cab_required: "true",
  production_system: "true",
  outside_maintenance_schedule: "false",
  unauthorized: "false",
  on_hold: "false",
  knowledge: "false",
  active: "true",
  made_sla: "true",

  // ─── Work notes / comments ───
  work_notes:
    "ADCV3 Enhancement Scope Summary:\n" +
    "- Firmware upgrade: v3.4.2 → v3.6.1 (8 LB nodes, 2 DCs)\n" +
    "- Virtual server pool reconfiguration (24 virtual servers, 6 pools)\n" +
    "- SSL/TLS 1.3 offloading enablement\n" +
    "- HTTP/2 health monitor deployment\n" +
    "- New iRules: geo_routing_v2, rate_limit_api_v3\n" +
    "- VRRP sub-second failover configuration with BFD\n" +
    "- GSLB configuration update for enhanced cross-DC failover\n\n" +
    "Pre-staging completed:\n" +
    "- Firmware images uploaded to all 8 nodes\n" +
    "- Configuration files staged on NFS\n" +
    "- Staging validation: 72-hour soak test PASSED\n\n" +
    "Reviewed by: J. Shen (Network Lead), K. Wong (SRE Lead), L. Martinez (Security Ops)",

  comments:
    "Change submitted for CAB review. Maintenance window requested for Saturday 02:00-08:00 UTC. " +
    "Rolling upgrade approach — one DC at a time — ensures zero downtime. " +
    "All pre-staging and staging validation completed successfully. " +
    "Full test evidence available in staging test report SR-2026-0312.",

  // ─── Additional metadata ───
  reason: "Capacity growth and performance improvement — production load balancing infrastructure",
  route_reason: "Standard network change process",
  upon_approval: "proceed",
  upon_reject: "cancel",
  escalation: "0",
  order: "0",
  user_input: "",
  correlation_id: "ADCV3-ENH-PROD-2026-001",
  correlation_display: "ADCV3 Production Load Balancer Enhancement",
};

async function insertChangeRequest() {
  const url = `${INSTANCE}/api/now/table/change_request`;
  const auth = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

  console.log("─── Inserting Change Request into ServiceNow ───");
  console.log(`Instance: ${INSTANCE}`);
  console.log(`Short Description: ${payload.short_description}`);
  console.log(`Type: ${payload.type} | Priority: ${payload.priority} | Risk: ${payload.risk}`);
  console.log("");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": auth,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (!res.ok) {
      console.error(`✗ ServiceNow API error ${res.status}:`);
      console.error(JSON.stringify(body, null, 2));
      process.exit(1);
    }

    const result = body.result;
    console.log("✓ Change Request created successfully!");
    console.log(`  Number:            ${result.number}`);
    console.log(`  Sys ID:            ${result.sys_id}`);
    console.log(`  State:             ${result.state}`);
    console.log(`  Short Description: ${result.short_description}`);
    console.log(`  Type:              ${result.type}`);
    console.log(`  Priority:          ${result.priority}`);
    console.log(`  Risk:              ${result.risk}`);
    console.log(`  Impact:            ${result.impact}`);
    console.log(`  Category:          ${result.category}`);
    console.log(`  Assignment Group:  ${typeof result.assignment_group === 'object' ? result.assignment_group?.display_value : result.assignment_group}`);
    console.log(`  Start Date:        ${result.start_date}`);
    console.log(`  End Date:          ${result.end_date}`);
    console.log(`  URL: ${INSTANCE}/nav_to.do?uri=change_request.do?sys_id=${result.sys_id}`);
    console.log("");
    console.log("─── Done ───");
  } catch (err) {
    console.error("✗ Failed to connect to ServiceNow:", err.message);
    process.exit(1);
  }
}

insertChangeRequest();
