#!/usr/bin/env node
/**
 * Insert a new Change Request into ServiceNow for executing a new Update Set.
 * Uses the ServiceNow Table API (POST /api/now/table/change_request).
 *
 * Usage: SNOW_INSTANCE=https://your-instance.service-now.com SNOW_USER=user SNOW_PASSWORD=pass node scripts/insert-updateset-cr.mjs
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
const startDate = new Date(now.getTime() + 2 * 24 * 3600 * 1000); // +2 days
const endDate = new Date(startDate.getTime() + 4 * 3600 * 1000);  // +4 hours

const payload = {
  // ─── Core identification ───
  short_description: "Execute New ServiceNow Update Set — Q1 2026 Platform Enhancements",
  description:
    "This change request covers the execution and promotion of a new ServiceNow Update Set containing " +
    "Q1 2026 platform enhancements. The update set includes modifications to business rules, UI policies, " +
    "client scripts, script includes, ACLs, notifications, catalog items, and workflow activities. " +
    "All changes have been developed and unit-tested in the DEV instance and peer-reviewed by the platform team. " +
    "The update set will be migrated from DEV → TEST → PROD following the standard promotion pipeline. " +
    "Estimated scope: 47 configuration items across 12 application scopes. " +
    "Primary beneficiaries: ITSM, ITOM, and HRSD modules. " +
    "Business driver: Improve incident auto-routing accuracy by 35% and reduce catalog fulfillment time by 20%.",

  // ─── Classification ───
  type: "Normal",
  category: "Software",
  priority: "2 - High",
  risk: "Moderate",
  impact: "2 - Medium",
  urgency: "2 - Medium",
  scope: "Medium",

  // ─── State & Approval ───
  state: "-5",           // New
  approval: "requested",
  phase: "requested",
  phase_state: "open",

  // ─── Assignment ───
  assignment_group: "287ebd7da9fe198100f92cc8d1d2154e",
  company: "ACME North America",

  // ─── Scheduling ───
  start_date: iso(startDate),
  end_date: iso(endDate),
  expected_start: iso(startDate),

  // ─── Implementation Plan ───
  implementation_plan:
    "1. PRE-CHECKS (30 min before window)\n" +
    "   a. Verify current Update Set state in DEV is 'Complete'\n" +
    "   b. Run instance health check — confirm no active batch jobs\n" +
    "   c. Verify no other Update Sets are In Progress on PROD\n" +
    "   d. Notify stakeholders via #platform-changes Slack channel\n" +
    "   e. Confirm CAB approval is documented in CHG record\n\n" +
    "2. BACKUP & SNAPSHOT (15 min)\n" +
    "   a. Create a manual XML backup of affected tables: sys_script, sys_ui_policy, sys_script_client\n" +
    "   b. Record current sys_mod_count for all modified records\n" +
    "   c. Take screenshot of current Update Set list on PROD\n\n" +
    "3. RETRIEVE UPDATE SET ON TEST (30 min)\n" +
    "   a. Navigate to Retrieved Update Sets on TEST instance\n" +
    "   b. Pull update set from DEV using Remote Update Set source\n" +
    "   c. Preview the update set — resolve any conflicts\n" +
    "   d. Commit the update set on TEST\n" +
    "   e. Run automated test suite against TEST instance\n\n" +
    "4. VALIDATE ON TEST (60 min)\n" +
    "   a. Execute smoke tests: incident creation, catalog ordering, workflow triggers\n" +
    "   b. Verify business rules fire correctly on record insert/update\n" +
    "   c. Confirm UI policy conditions render properly in all browsers\n" +
    "   d. Test client script console for JavaScript errors\n" +
    "   e. Validate notification triggers and email templates\n" +
    "   f. Sign off from QA lead (email confirmation required)\n\n" +
    "5. PROMOTE TO PROD (30 min)\n" +
    "   a. Retrieve update set on PROD from TEST\n" +
    "   b. Preview — confirm zero conflicts\n" +
    "   c. Commit update set on PROD\n" +
    "   d. Clear server-side cache (System Diagnostics → Cache Management)\n" +
    "   e. Clear browser cache and verify UI changes\n\n" +
    "6. POST-DEPLOYMENT VERIFICATION (30 min)\n" +
    "   a. Run same smoke test suite against PROD\n" +
    "   b. Monitor System Logs for 15 minutes for exceptions\n" +
    "   c. Verify no performance degradation via Performance Analytics\n" +
    "   d. Confirm all 47 configuration items show correct sys_mod_count increment\n" +
    "   e. Update CHG record to Implement state\n" +
    "   f. Send completion notification to stakeholders",

  // ─── Backout Plan ───
  backout_plan:
    "ROLLBACK PROCEDURE — Estimated Duration: 45 minutes\n\n" +
    "1. IMMEDIATE ROLLBACK (if critical failure within 1 hour)\n" +
    "   a. Navigate to Retrieved Update Sets on PROD\n" +
    "   b. Locate the committed update set\n" +
    "   c. Select 'Back Out' from the update set form\n" +
    "   d. ServiceNow will generate a backout update set automatically\n" +
    "   e. Preview and commit the backout update set\n\n" +
    "2. MANUAL ROLLBACK (if selective revert needed)\n" +
    "   a. Import the XML backup taken in Step 2 of implementation\n" +
    "   b. Use 'Revert to XML' for each affected record\n" +
    "   c. Validate sys_mod_count matches pre-change values\n\n" +
    "3. VERIFICATION AFTER ROLLBACK\n" +
    "   a. Clear all caches (server + browser)\n" +
    "   b. Re-run smoke tests to confirm original behavior restored\n" +
    "   c. Monitor System Logs for 30 minutes\n" +
    "   d. Notify stakeholders of rollback and next steps\n\n" +
    "4. ESCALATION\n" +
    "   a. If backout fails, engage ServiceNow HI support (priority P2)\n" +
    "   b. Contact: platform-team@acme.com, +1-555-0199 (on-call)\n" +
    "   c. Fallback: restore instance from nightly backup (RPO: 24h, RTO: 4h)",

  // ─── Test Plan ───
  test_plan:
    "TEST STRATEGY — Update Set Promotion\n\n" +
    "1. UNIT TESTS (completed in DEV)\n" +
    "   - Business Rule: test_br_incident_autoroute — PASS\n" +
    "   - Business Rule: test_br_catalog_fulfillment — PASS\n" +
    "   - Client Script: test_cs_form_validation — PASS\n" +
    "   - UI Policy: test_uip_mandatory_fields — PASS\n" +
    "   - Script Include: test_si_utility_functions — 12/12 assertions PASS\n\n" +
    "2. INTEGRATION TESTS (on TEST instance after commit)\n" +
    "   - End-to-end incident lifecycle: create → assign → resolve → close\n" +
    "   - Catalog item ordering: request → approval → fulfillment → closure\n" +
    "   - Workflow trigger: event → workflow → task creation → notification\n" +
    "   - CMDB relationship validation after ACL changes\n" +
    "   - SSO/SAML login flow (no regression from ACL updates)\n\n" +
    "3. PERFORMANCE TESTS\n" +
    "   - Page load time: incident_list.do < 3s (current baseline: 2.1s)\n" +
    "   - Business rule execution: < 200ms per transaction\n" +
    "   - Concurrent user simulation: 50 users, < 5% error rate\n\n" +
    "4. REGRESSION TESTS\n" +
    "   - Automated ATF test suite: 87 tests covering ITSM core\n" +
    "   - Manual exploratory testing: 2 hours by QA team\n" +
    "   - Cross-browser validation: Chrome, Firefox, Edge, Safari\n\n" +
    "5. ACCEPTANCE CRITERIA\n" +
    "   - All automated tests pass with 0 failures\n" +
    "   - No P1/P2 defects found during exploratory testing\n" +
    "   - Performance within 10% of baseline\n" +
    "   - Sign-off from QA Lead and Product Owner",

  // ─── Change Plan ───
  change_plan:
    "CHANGE EXECUTION PLAN\n\n" +
    "Phase 1 — Preparation (Day -2 to Day -1)\n" +
    "  • Complete peer review of all update set customizations\n" +
    "  • Obtain CAB approval and document in change record\n" +
    "  • Schedule maintenance window with operations team\n" +
    "  • Pre-stage XML backups and document rollback contacts\n" +
    "  • Send advance notification to all affected teams\n\n" +
    "Phase 2 — Execution (Day 0, Maintenance Window)\n" +
    "  • Follow implementation plan steps 1-6\n" +
    "  • Bridge call open for duration: +1-555-0199\n" +
    "  • Real-time status updates every 15 minutes on Slack\n\n" +
    "Phase 3 — Monitoring (Day 0 to Day +3)\n" +
    "  • Enhanced monitoring for 72 hours post-deployment\n" +
    "  • Daily check-in with module owners (ITSM, ITOM, HRSD)\n" +
    "  • Review System Logs and Performance Analytics daily\n\n" +
    "Phase 4 — Closure (Day +3 to Day +5)\n" +
    "  • Collect feedback from stakeholders\n" +
    "  • Document lessons learned\n" +
    "  • Update CMDB with new configuration baselines\n" +
    "  • Close change record with success metrics",

  // ─── Risk / Impact Analysis ───
  risk_impact_analysis:
    "RISK ASSESSMENT\n\n" +
    "Risk 1: Update set conflict on PROD\n" +
    "  Probability: Low | Impact: High\n" +
    "  Mitigation: Preview step will detect conflicts before commit. " +
    "All customizations scoped to avoid collision with OOB objects.\n\n" +
    "Risk 2: Business rule performance degradation\n" +
    "  Probability: Medium | Impact: Medium\n" +
    "  Mitigation: All business rules tested with performance profiler. " +
    "Execution time < 200ms confirmed in TEST environment.\n\n" +
    "Risk 3: Client-side JavaScript errors in modified forms\n" +
    "  Probability: Low | Impact: Medium\n" +
    "  Mitigation: Cross-browser testing completed. No console errors detected.\n\n" +
    "Risk 4: Notification spam from modified email triggers\n" +
    "  Probability: Low | Impact: Low\n" +
    "  Mitigation: Email notifications tested in TEST with scoped recipients. " +
    "Production email will be validated within first 30 min.\n\n" +
    "IMPACT ANALYSIS\n" +
    "  Affected Users: ~2,500 (ITSM agents, catalog users, HRSD employees)\n" +
    "  Affected Services: Incident Management, Service Catalog, HR Service Delivery\n" +
    "  Estimated Downtime: None (update set commit is non-disruptive)\n" +
    "  Data Impact: No schema changes. Behavioral changes only.\n" +
    "  Compliance: No PII/PHI data handling changes. SOX controls unaffected.",

  // ─── Justification ───
  justification:
    "BUSINESS JUSTIFICATION\n\n" +
    "This update set delivers three key business outcomes:\n\n" +
    "1. Incident Auto-Routing Accuracy (+35%)\n" +
    "   Current state: Manual routing causes avg 12-minute delay per incident.\n" +
    "   Future state: ML-enhanced business rules auto-assign based on CI, category, and historical patterns.\n" +
    "   Business value: $180K/year savings in agent productivity.\n\n" +
    "2. Catalog Fulfillment Time Reduction (-20%)\n" +
    "   Current state: Manual approval workflows with serial processing.\n" +
    "   Future state: Parallel approval with auto-escalation after SLA breach.\n" +
    "   Business value: Improved employee satisfaction (target NPS +15 points).\n\n" +
    "3. HRSD Process Automation\n" +
    "   Current state: 60% of HR requests require manual triaging.\n" +
    "   Future state: Rules-based auto-categorization and assignment.\n" +
    "   Business value: HR team capacity freed for strategic initiatives.\n\n" +
    "Compliance requirement: SOC2 audit finding #2025-041 requires all platform changes " +
    "to be executed via tracked update sets with full audit trail.",

  // ─── Configuration ───
  cmdb_ci: "ServiceNow Production Instance",
  business_service: "IT Service Management",
  service_offering: "Platform Administration",
  contact_type: "email",
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
    "Update set 'Q1_2026_Platform_Enhancements' contains 47 customizations:\n" +
    "- 8 Business Rules (new/modified)\n" +
    "- 6 Client Scripts (new/modified)\n" +
    "- 5 UI Policies (new/modified)\n" +
    "- 4 Script Includes (new)\n" +
    "- 3 ACL Rules (modified)\n" +
    "- 7 Notifications (new/modified)\n" +
    "- 6 Catalog Items/Variables (modified)\n" +
    "- 4 Workflow Activities (modified)\n" +
    "- 2 Scheduled Jobs (new)\n" +
    "- 2 UI Pages (modified)\n\n" +
    "All items have been reviewed by: J. Shen (Platform Lead), M. Chen (QA Lead), R. Patel (Security).",

  comments:
    "Change submitted for CAB review. " +
    "Full documentation and test evidence attached to the related update set record. " +
    "Maintenance window requested for Saturday 06:00-10:00 UTC.",

  // ─── Additional metadata ───
  reason: "Business requirement — Q1 2026 platform enhancement delivery",
  route_reason: "Standard change promotion pipeline",
  upon_approval: "proceed",
  upon_reject: "cancel",
  escalation: "0",
  order: "0",
  user_input: "",
  correlation_id: "UPDATESET-Q1-2026-001",
  correlation_display: "Q1 2026 Platform Enhancements Update Set",
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
    console.log(`  Assigned To:       ${result.assigned_to}`);
    console.log(`  Assignment Group:  ${result.assignment_group}`);
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
