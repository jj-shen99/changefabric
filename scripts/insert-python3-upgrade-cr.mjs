#!/usr/bin/env node
/**
 * Insert a new Change Request into ServiceNow for Python3 version upgrade
 * on production servers.
 *
 * Usage: SNOW_INSTANCE=https://your-instance.service-now.com SNOW_USER=user SNOW_PASSWORD=pass node scripts/insert-python3-upgrade-cr.mjs
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
const startDate = new Date(now.getTime() + 4 * 24 * 3600 * 1000); // +4 days
const endDate = new Date(startDate.getTime() + 8 * 3600 * 1000);  // +8 hours

const payload = {
  // ─── Core identification ───
  short_description: "Python 3.11 → 3.13 Upgrade on Production Application Servers",
  description:
    "This change request covers the upgrade of Python runtime from version 3.11.7 to 3.13.2 across all " +
    "production application servers. The upgrade is required to address end-of-security-support for Python 3.11 " +
    "(October 2027), leverage performance improvements in Python 3.13 (up to 25% faster execution via the new " +
    "JIT compiler and optimized GIL handling), and resolve CVE-2025-41723 and CVE-2025-39841 affecting the " +
    "ssl and urllib3 modules in Python 3.11.\n\n" +
    "Scope of change:\n" +
    "  • 36 production application servers across 3 tiers:\n" +
    "    - Web tier: APP-WEB-01 through APP-WEB-12 (Django/FastAPI frontends)\n" +
    "    - API tier: APP-API-01 through APP-API-12 (Flask/FastAPI microservices)\n" +
    "    - Worker tier: APP-WRK-01 through APP-WRK-12 (Celery workers, scheduled tasks)\n" +
    "  • 14 production applications with Python dependencies\n" +
    "  • 847 Python packages across all applications (pip freeze inventory)\n" +
    "  • 3 virtual environments per server (app, celery, tooling)\n\n" +
    "Key changes in Python 3.13 affecting our stack:\n" +
    "  - Experimental JIT compiler (PEP 744) — disabled by default, will evaluate post-upgrade\n" +
    "  - Free-threaded mode (PEP 703) — not enabled, requires opt-in\n" +
    "  - Improved error messages with color and fine-grained tracebacks\n" +
    "  - Deprecation of asyncio.get_event_loop() without running loop\n" +
    "  - typing module improvements (PEP 702 deprecation warnings)\n" +
    "  - ssl module updates addressing known CVEs\n\n" +
    "Stakeholders: Platform Engineering, Application Development (all squads), SRE, InfoSec, QA.",

  // ─── Classification ───
  type: "Normal",
  category: "Software",
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
    "PYTHON 3.13 PRODUCTION UPGRADE — IMPLEMENTATION PLAN\n" +
    "=====================================================\n\n" +
    "PHASE 1: PRE-IMPLEMENTATION CHECKS (45 min)\n" +
    "--------------------------------------------\n" +
    "1.1  Verify current Python version on all 36 servers:\n" +
    "     ansible all -i prod_inventory -m command -a 'python3 --version'\n" +
    "     Expected output: Python 3.11.7\n" +
    "1.2  Capture installed package inventory per server:\n" +
    "     ansible all -i prod_inventory -m command -a 'pip freeze > /tmp/pip-freeze-pre-upgrade.txt'\n" +
    "1.3  Run pre-flight dependency compatibility check:\n" +
    "     python3 scripts/check_py313_compat.py --inventory prod_packages.json\n" +
    "     Verify 0 blocking incompatibilities (all resolved in staging)\n" +
    "1.4  Validate backup of current Python installation:\n" +
    "     ls -la /opt/python-backups/3.11.7/ on each server\n" +
    "1.5  Confirm application health baselines:\n" +
    "     - Response time p95 < 200ms (web tier)\n" +
    "     - Celery queue depth < 500 (worker tier)\n" +
    "     - Error rate < 0.1% across all services\n" +
    "1.6  Notify stakeholders via #platform-upgrades Slack channel\n" +
    "1.7  Open bridge call: +1-555-0345\n\n" +
    "PHASE 2: WORKER TIER UPGRADE (90 min) — APP-WRK-01 through APP-WRK-12\n" +
    "-----------------------------------------------------------------------\n" +
    "2.1  Drain Celery workers gracefully:\n" +
    "     ansible workers -m command -a 'celery -A app control shutdown --timeout=120'\n" +
    "     Wait for in-flight tasks to complete (max 5 min)\n" +
    "2.2  Upgrade Python on first batch (APP-WRK-01 to APP-WRK-04):\n" +
    "     ansible batch1_workers -m command -a 'sudo /opt/scripts/upgrade-python.sh 3.13.2'\n" +
    "     Script performs:\n" +
    "     a. Install Python 3.13.2 from pre-built .deb package (compiled with --enable-optimizations)\n" +
    "     b. Update alternatives: update-alternatives --install /usr/bin/python3 python3 /usr/local/bin/python3.13 2\n" +
    "     c. Rebuild virtual environments:\n" +
    "        python3.13 -m venv /opt/app/venv --clear\n" +
    "        /opt/app/venv/bin/pip install -r /opt/app/requirements.txt --no-cache-dir\n" +
    "     d. Verify: /opt/app/venv/bin/python --version → Python 3.13.2\n" +
    "2.3  Restart Celery workers on batch 1:\n" +
    "     systemctl restart celery-worker@{app,celery,scheduled}\n" +
    "2.4  Validate batch 1:\n" +
    "     - Submit 10 test tasks to each queue type\n" +
    "     - Verify task completion within expected SLA\n" +
    "     - Check /var/log/celery/*.log for Python deprecation warnings or errors\n" +
    "2.5  If batch 1 healthy, repeat 2.2-2.4 for batch 2 (APP-WRK-05 to APP-WRK-08)\n" +
    "2.6  Repeat for batch 3 (APP-WRK-09 to APP-WRK-12)\n" +
    "2.7  Verify all worker queues processing normally — queue depth returning to baseline\n\n" +
    "PHASE 3: API TIER UPGRADE (90 min) — APP-API-01 through APP-API-12\n" +
    "-------------------------------------------------------------------\n" +
    "3.1  Remove batch 1 API servers from load balancer pool:\n" +
    "     curl -X POST http://lb-admin/api/pool/api-prod/members/disable -d 'members=APP-API-01,02,03,04'\n" +
    "3.2  Wait for connection draining (60s timeout)\n" +
    "3.3  Upgrade Python on batch 1 (same script as 2.2)\n" +
    "3.4  Restart API services:\n" +
    "     systemctl restart gunicorn@api uvicorn@fastapi\n" +
    "3.5  Run smoke tests against batch 1 servers directly (bypass LB):\n" +
    "     python3 scripts/smoke_test.py --targets APP-API-01,02,03,04 --suite api_critical\n" +
    "3.6  Re-enable batch 1 in load balancer, monitor for 5 min\n" +
    "3.7  Repeat 3.1-3.6 for batch 2 (APP-API-05 to APP-API-08)\n" +
    "3.8  Repeat for batch 3 (APP-API-09 to APP-API-12)\n" +
    "3.9  Validate full API tier: all 12 servers in LB pool, health checks green\n\n" +
    "PHASE 4: WEB TIER UPGRADE (90 min) — APP-WEB-01 through APP-WEB-12\n" +
    "-------------------------------------------------------------------\n" +
    "4.1  Same rolling batch approach as Phase 3:\n" +
    "     - Remove batch from CDN/LB origin pool\n" +
    "     - Upgrade Python, rebuild venvs\n" +
    "     - Restart Django/FastAPI via gunicorn/uvicorn\n" +
    "     - Smoke test, re-enable, monitor\n" +
    "4.2  Additional web tier checks:\n" +
    "     - Static asset serving (collectstatic output intact)\n" +
    "     - Template rendering (spot-check 5 key pages)\n" +
    "     - Session handling (login/logout cycle)\n" +
    "     - WebSocket connections (if applicable)\n" +
    "4.3  Full web tier validated: all 12 servers serving traffic\n\n" +
    "PHASE 5: POST-DEPLOYMENT VERIFICATION (60 min)\n" +
    "-----------------------------------------------\n" +
    "5.1  Run full integration test suite against production:\n" +
    "     pytest tests/integration/ --env=prod --timeout=300\n" +
    "5.2  Verify Python version across all 36 servers:\n" +
    "     ansible all -i prod_inventory -m command -a 'python3 --version'\n" +
    "     Expected: Python 3.13.2 (100% of servers)\n" +
    "5.3  Compare performance metrics against Phase 1 baselines:\n" +
    "     - Response time p95 (target: ≤ baseline or improved)\n" +
    "     - CPU utilization (target: ≤ baseline, expect ~10% reduction)\n" +
    "     - Memory usage (target: ≤ baseline)\n" +
    "     - Celery task throughput (target: ≥ baseline)\n" +
    "5.4  Review application logs for Python 3.13-specific warnings:\n" +
    "     grep -r 'DeprecationWarning\\|SyntaxWarning\\|RuntimeWarning' /var/log/app/*.log\n" +
    "5.5  Verify pip freeze output matches expected package versions\n" +
    "5.6  Monitor Datadog dashboards for 30 min — error rate, latency, throughput\n" +
    "5.7  Update CMDB records with new Python version\n" +
    "5.8  Send completion notification to stakeholders\n" +
    "5.9  Close bridge call, update CHG record",

  // ─── Backout Plan ───
  backout_plan:
    "PYTHON 3.13 ROLLBACK PROCEDURE — ESTIMATED DURATION: 90 MINUTES\n" +
    "================================================================\n\n" +
    "TRIGGER CRITERIA FOR ROLLBACK:\n" +
    "  • Application error rate exceeds 1% after tier upgrade\n" +
    "  • Any critical dependency fails to import under Python 3.13\n" +
    "  • Response time p95 degrades by more than 50% from baseline\n" +
    "  • Celery workers fail to process tasks after restart\n" +
    "  • More than 2 servers in any batch fail the upgrade script\n\n" +
    "STEP 1: STOP THE UPGRADE\n" +
    "  a. Do NOT proceed to next batch/tier\n" +
    "  b. If mid-batch, complete current server then halt\n" +
    "  c. Announce on bridge: 'Python upgrade rollback initiated'\n\n" +
    "STEP 2: REVERT AFFECTED SERVERS\n" +
    "  a. Run rollback script on each affected server:\n" +
    "     ansible affected_hosts -m command -a 'sudo /opt/scripts/rollback-python.sh 3.11.7'\n" +
    "  b. Rollback script performs:\n" +
    "     - Switch alternatives back: update-alternatives --set python3 /usr/local/bin/python3.11\n" +
    "     - Restore virtual environments from backup:\n" +
    "       cp -a /opt/python-backups/3.11.7/venv-app /opt/app/venv\n" +
    "       cp -a /opt/python-backups/3.11.7/venv-celery /opt/celery/venv\n" +
    "     - Verify: python3 --version → Python 3.11.7\n" +
    "  c. Restart application services:\n" +
    "     systemctl restart gunicorn@* uvicorn@* celery-worker@*\n\n" +
    "STEP 3: RE-ENABLE IN LOAD BALANCER\n" +
    "  a. Add reverted servers back to LB pool (if removed)\n" +
    "  b. Verify health checks are green\n" +
    "  c. Confirm traffic is flowing to reverted servers\n\n" +
    "STEP 4: VALIDATE ROLLBACK\n" +
    "  a. Run smoke tests against all reverted servers\n" +
    "  b. Verify Celery workers are processing tasks\n" +
    "  c. Check application logs — no import errors or stack traces\n" +
    "  d. Compare error rate and latency against pre-change baseline\n" +
    "  e. Monitor for 30 minutes for stability\n\n" +
    "STEP 5: POST-ROLLBACK ACTIONS\n" +
    "  a. Notify stakeholders of rollback and root cause\n" +
    "  b. File incident ticket for the failure\n" +
    "  c. Schedule root cause analysis within 48 hours\n" +
    "  d. Update CHG record with rollback details\n\n" +
    "ESCALATION:\n" +
    "  • L1: Platform Engineering on-call — +1-555-0345 (pager)\n" +
    "  • L2: Application squad leads — Slack #squad-leads-oncall\n" +
    "  • L3: VP Engineering — escalate if rollback fails or data integrity at risk\n" +
    "  • Python upstream: bugs.python.org for confirmed interpreter bugs",

  // ─── Test Plan ───
  test_plan:
    "PYTHON 3.13 UPGRADE TEST PLAN\n" +
    "==============================\n\n" +
    "1. COMPATIBILITY TESTING (completed in staging)\n" +
    "   ✓ pip install for all 847 packages against Python 3.13.2 — 100% success\n" +
    "   ✓ Resolved 3 package incompatibilities pre-staging:\n" +
    "     - numpy 1.24.3 → 1.26.4 (C extension rebuild required)\n" +
    "     - cryptography 41.0.1 → 42.0.5 (Rust toolchain update)\n" +
    "     - celery 5.3.1 → 5.4.0 (asyncio.get_event_loop() deprecation fix)\n" +
    "   ✓ All 14 applications pass import checks under Python 3.13\n" +
    "   ✓ Django 5.0 compatibility confirmed (officially supports 3.13)\n" +
    "   ✓ FastAPI 0.111+ compatibility confirmed\n" +
    "   ✓ Flask 3.1+ compatibility confirmed\n\n" +
    "2. UNIT TEST SUITES\n" +
    "   ✓ Total: 12,847 unit tests across 14 applications\n" +
    "   ✓ Pass rate: 12,841/12,847 (99.95%)\n" +
    "   ✓ 6 failures — all due to DeprecationWarning changes (non-blocking, tests updated)\n" +
    "   ✓ No new test failures compared to Python 3.11 baseline\n\n" +
    "3. INTEGRATION TESTS\n" +
    "   - End-to-end API workflow: user registration → authentication → CRUD operations\n" +
    "   - Database operations: ORM queries, migrations, connection pooling (SQLAlchemy 2.0)\n" +
    "   - Message queue: Celery task submission → execution → result retrieval\n" +
    "   - Cache operations: Redis get/set/invalidation patterns\n" +
    "   - External API calls: HTTP client behavior (httpx, requests)\n" +
    "   - File I/O: CSV/JSON/Parquet processing pipelines\n" +
    "   - WebSocket: real-time notification delivery\n\n" +
    "4. PERFORMANCE TESTS (staging results)\n" +
    "   - HTTP request throughput: 8,200 req/s (vs 7,800 on 3.11) — 5.1% improvement\n" +
    "   - Response time p50: 12ms (vs 14ms) — 14.3% improvement\n" +
    "   - Response time p95: 45ms (vs 52ms) — 13.5% improvement\n" +
    "   - Memory per worker: 142MB (vs 156MB) — 9% reduction\n" +
    "   - Celery task throughput: 340 tasks/s (vs 310) — 9.7% improvement\n" +
    "   - Cold start time: 2.1s (vs 2.8s) — 25% improvement\n\n" +
    "5. SECURITY TESTS\n" +
    "   - SSL/TLS module: verified CVE-2025-41723 and CVE-2025-39841 are patched\n" +
    "   - Bandit static analysis: 0 high-severity findings\n" +
    "   - Safety check (pip-audit): 0 known vulnerabilities in dependency tree\n" +
    "   - OWASP ZAP scan: no new findings compared to 3.11 baseline\n\n" +
    "6. SOAK TEST (completed in staging)\n" +
    "   - 72-hour continuous load test at 2x production traffic\n" +
    "   - No memory leaks detected (RSS stable within ±3%)\n" +
    "   - No file descriptor leaks\n" +
    "   - GC pause times within acceptable range (< 50ms p99)\n\n" +
    "7. ACCEPTANCE CRITERIA\n" +
    "   - All unit tests pass (100%)\n" +
    "   - All integration tests pass\n" +
    "   - Performance ≥ Python 3.11 baseline (no regression)\n" +
    "   - Zero high/critical security vulnerabilities\n" +
    "   - Error rate < 0.1% for 30 min post-upgrade per tier\n" +
    "   - Sign-off: Platform Lead, QA Lead, Security Ops, SRE Lead",

  // ─── Change Plan ───
  change_plan:
    "CHANGE EXECUTION PLAN — PYTHON 3.13 PRODUCTION UPGRADE\n" +
    "=======================================================\n\n" +
    "Phase 1 — Preparation (Day -5 to Day -1)\n" +
    "  • Build Python 3.13.2 .deb packages with --enable-optimizations\n" +
    "  • Pre-stage packages on all 36 servers via Ansible\n" +
    "  • Update requirements.txt for all 14 applications (3 package bumps)\n" +
    "  • Complete staging validation and soak test (72 hours)\n" +
    "  • Backup current Python 3.11.7 installations and venvs\n" +
    "  • Obtain CAB approval — present compatibility matrix and rollback plan\n" +
    "  • Schedule maintenance window: Sunday 00:00-08:00 UTC\n" +
    "  • Brief application squad leads on expected behavior changes\n\n" +
    "Phase 2 — Execution (Day 0, Maintenance Window)\n" +
    "  • 00:00 UTC — Open bridge, begin pre-implementation checks\n" +
    "  • 00:45 UTC — Begin Worker tier upgrade (3 batches × 30 min)\n" +
    "  • 02:15 UTC — Worker tier complete, begin API tier upgrade\n" +
    "  • 03:45 UTC — API tier complete, begin Web tier upgrade\n" +
    "  • 05:15 UTC — Web tier complete, begin post-deployment verification\n" +
    "  • 06:15 UTC — Verification complete, monitoring phase begins\n" +
    "  • 07:00 UTC — Close bridge if stable, send notification\n\n" +
    "Phase 3 — Enhanced Monitoring (Day 0 to Day +5)\n" +
    "  • Continuous Datadog monitoring with Python-specific dashboards\n" +
    "  • Daily metric review with Platform Engineering for 5 days\n" +
    "  • Application squad check-ins at Day +1 and Day +3\n" +
    "  • Performance comparison report generated at Day +2\n\n" +
    "Phase 4 — Closure (Day +5 to Day +7)\n" +
    "  • Compile before/after performance report\n" +
    "  • Remove Python 3.11.7 backup files (after 7-day retention)\n" +
    "  • Update runbooks and deployment scripts for Python 3.13\n" +
    "  • Document lessons learned\n" +
    "  • Update CMDB and configuration baseline\n" +
    "  • Close change record with success metrics",

  // ─── Risk / Impact Analysis ───
  risk_impact_analysis:
    "RISK ASSESSMENT — PYTHON 3.13 PRODUCTION UPGRADE\n" +
    "=================================================\n\n" +
    "Risk 1: Package incompatibility not caught in staging\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: All 847 packages tested in staging with production data clone.\n" +
    "  72-hour soak test completed. Only 3 packages required updates (already done).\n\n" +
    "Risk 2: C extension modules fail to load (numpy, pandas, cryptography)\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: Pre-built wheels compiled against Python 3.13 ABI.\n" +
    "  Binary compatibility verified in staging. Fallback: pip install --force-reinstall.\n\n" +
    "Risk 3: asyncio deprecation breaking Celery/FastAPI event loops\n" +
    "  Probability: Medium | Impact: Medium | Risk Score: Medium\n" +
    "  Mitigation: Celery upgraded to 5.4.0 which handles new asyncio behavior.\n" +
    "  FastAPI/uvicorn already compatible. All async code paths tested.\n\n" +
    "Risk 4: Memory behavior changes causing OOM on workers\n" +
    "  Probability: Low | Impact: Medium | Risk Score: Low\n" +
    "  Mitigation: Staging soak test showed 9% memory reduction.\n" +
    "  Worker memory limits unchanged (512MB per process). Monitoring in place.\n\n" +
    "Risk 5: Rolling upgrade causes mixed-version cluster issues\n" +
    "  Probability: Low | Impact: Low | Risk Score: Low\n" +
    "  Mitigation: Tier-by-tier upgrade with validation gates. No cross-version\n" +
    "  dependencies (each server is self-contained). LB health checks will route\n" +
    "  traffic only to healthy servers.\n\n" +
    "Risk 6: Unexpected Python 3.13 interpreter bugs in production workload\n" +
    "  Probability: Low | Impact: High | Risk Score: Medium\n" +
    "  Mitigation: Python 3.13.2 is the second maintenance release (bug fixes since 3.13.0).\n" +
    "  72-hour soak test at 2x production load revealed no interpreter issues.\n" +
    "  Rollback to 3.11.7 available within 15 min per batch.\n\n" +
    "IMPACT ANALYSIS\n" +
    "  Affected Users: All application users (~120,000 DAU)\n" +
    "  Affected Services: 14 production applications across web, API, and worker tiers\n" +
    "  Estimated Downtime: Zero (rolling upgrade with LB traffic management)\n" +
    "  Data Impact: None — Python upgrade is runtime-only, no schema or data changes\n" +
    "  Compliance: Addresses InfoSec finding #2026-012 (CVE remediation requirement)",

  // ─── Justification ───
  justification:
    "BUSINESS JUSTIFICATION — PYTHON 3.13 PRODUCTION UPGRADE\n" +
    "========================================================\n\n" +
    "1. Security — CVE Remediation (Critical)\n" +
    "   CVE-2025-41723: ssl module certificate verification bypass (CVSS 8.1)\n" +
    "   CVE-2025-39841: urllib3 SSRF via crafted URL parsing (CVSS 7.5)\n" +
    "   InfoSec finding #2026-012 requires remediation within 30 days.\n" +
    "   Business value: Avoid potential data breach (estimated cost: $4.5M avg)\n\n" +
    "2. Performance Improvement\n" +
    "   Staging benchmarks show measurable improvements:\n" +
    "   - Request throughput: +5.1% (saves ~$18K/year in compute costs)\n" +
    "   - Response time p95: -13.5% (improves user experience)\n" +
    "   - Memory per worker: -9% (enables higher density, saves 4 servers)\n" +
    "   - Cold start: -25% (faster auto-scaling during traffic spikes)\n" +
    "   Business value: $72K/year infrastructure savings + improved UX metrics\n\n" +
    "3. Vendor Support Lifecycle\n" +
    "   Python 3.11 security support ends October 2027.\n" +
    "   Upgrading now avoids rush migration under deadline pressure.\n" +
    "   Python 3.13 LTS support through October 2029.\n" +
    "   Business value: 2+ years of security patch coverage\n\n" +
    "4. Developer Productivity\n" +
    "   Python 3.13 features used by development teams:\n" +
    "   - Improved error messages reduce debugging time by est. 15%\n" +
    "   - Better typing support reduces type-related bugs\n" +
    "   - New stdlib improvements (tomllib, pathlib enhancements)\n" +
    "   Business value: Est. 8% developer productivity improvement\n\n" +
    "5. Ecosystem Compatibility\n" +
    "   Major frameworks are dropping Python 3.11 support:\n" +
    "   - Django 5.2 (LTS) requires Python 3.12+\n" +
    "   - FastAPI 0.115+ recommends Python 3.12+\n" +
    "   - NumPy 2.1 will require Python 3.12+\n" +
    "   Business value: Continued access to latest framework security patches",

  // ─── Configuration ───
  cmdb_ci: "Application Servers - Production",
  business_service: "Application Platform",
  service_offering: "Platform Engineering",
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
    "Python 3.13.2 Upgrade Scope:\n" +
    "- 36 production servers (3 tiers × 12 servers)\n" +
    "- 14 applications with Python runtime dependency\n" +
    "- 847 pip packages (3 required version bumps)\n" +
    "- 3 virtual environments per server\n\n" +
    "Pre-work completed:\n" +
    "- Python 3.13.2 .deb packages built and staged on all servers\n" +
    "- Package compatibility verified (847/847 packages install cleanly)\n" +
    "- 3 dependency updates: numpy 1.26.4, cryptography 42.0.5, celery 5.4.0\n" +
    "- Staging validation: 12,841/12,847 unit tests pass (6 updated for DeprecationWarning)\n" +
    "- 72-hour soak test at 2x load: PASSED (no leaks, stable performance)\n" +
    "- CVE remediation verified: ssl and urllib3 modules patched\n\n" +
    "Reviewed by: J. Shen (Platform Lead), A. Kumar (QA Lead), T. Jackson (Security Ops), M. Lee (SRE Lead)",

  comments:
    "Change submitted for CAB review. Maintenance window requested for Sunday 00:00-08:00 UTC. " +
    "Rolling upgrade approach ensures zero downtime — one tier at a time, batch-by-batch with " +
    "validation gates. All staging validation including 72-hour soak test completed successfully. " +
    "CVE remediation is time-critical per InfoSec finding #2026-012.",

  // ─── Additional metadata ───
  reason: "Security CVE remediation and runtime upgrade — production application servers",
  route_reason: "Standard infrastructure change process",
  upon_approval: "proceed",
  upon_reject: "cancel",
  escalation: "0",
  order: "0",
  user_input: "",
  correlation_id: "PY313-UPGRADE-PROD-2026-001",
  correlation_display: "Python 3.13 Production Server Upgrade",
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
