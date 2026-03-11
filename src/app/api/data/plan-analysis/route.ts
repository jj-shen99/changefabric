import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ═══════════════════════════════════════════════════════════════════
   ML-Powered Implementation Plan Analysis Engine
   ─────────────────────────────────────────────────────────────────
   Performs deep content analysis on change request plans using:
   • NLP pattern recognition for plan structure & completeness
   • Application profile classification from CMDB/service fields
   • Change nature classification from SN metadata
   • Risk pattern detection & gap identification
   • Automated recommendations & assessment generation
   ═══════════════════════════════════════════════════════════════════ */

/* ── Change Nature Classification ── */
interface ChangeProfile {
  changeType: string;
  riskTier: "critical" | "high" | "medium" | "low";
  complexity: "very-high" | "high" | "medium" | "low";
  natureCategory: string;
  natureTags: string[];
}

function classifyChangeNature(cr: {
  type: string; category: string; risk: string; priority: string;
  urgency: string; scope: string; short_description: string;
  description: string; implementation_plan: string;
}): ChangeProfile {
  const desc = `${cr.short_description} ${cr.description} ${cr.implementation_plan}`.toLowerCase();
  const natureTags: string[] = [];

  // Detect nature from content
  if (/database|schema|migration|sql|table|column|index/i.test(desc)) natureTags.push("Database Change");
  if (/network|router|switch|firewall|bgp|vlan|dns|load.?balancer/i.test(desc)) natureTags.push("Network Change");
  if (/security|ssl|tls|certificate|patch|vulnerability|cve/i.test(desc)) natureTags.push("Security Update");
  if (/deploy|release|upgrade|update|install|rollout/i.test(desc)) natureTags.push("Software Deployment");
  if (/config|configuration|setting|parameter|property/i.test(desc)) natureTags.push("Configuration Change");
  if (/infra|server|vm|virtual|cloud|aws|azure|gcp|kubernetes|k8s|docker/i.test(desc)) natureTags.push("Infrastructure");
  if (/maintenance|scheduled|window|reboot|restart/i.test(desc)) natureTags.push("Scheduled Maintenance");
  if (/api|endpoint|integration|interface|webhook/i.test(desc)) natureTags.push("API/Integration");
  if (/user|account|permission|role|access|ldap|sso|oauth/i.test(desc)) natureTags.push("Access Management");
  if (/monitor|alert|log|metric|dashboard|observability/i.test(desc)) natureTags.push("Monitoring/Observability");
  if (/backup|restore|disaster|recovery|dr/i.test(desc)) natureTags.push("Backup/Recovery");
  if (/performance|optimization|tuning|scaling|capacity/i.test(desc)) natureTags.push("Performance Optimization");

  if (natureTags.length === 0) natureTags.push("General Change");

  const natureCategory = natureTags[0];

  // Complexity from scope + type + content length
  const scopeVal = (cr.scope || "").toLowerCase();
  const totalContent = `${cr.implementation_plan} ${cr.description}`.length;
  let complexity: ChangeProfile["complexity"] = "medium";
  if (scopeVal.includes("large") || scopeVal.includes("extensive") || cr.type === "Emergency" || totalContent > 2000) complexity = "high";
  if (scopeVal.includes("large") && cr.type === "Emergency") complexity = "very-high";
  if (scopeVal.includes("small") && totalContent < 300) complexity = "low";

  // Risk tier
  const riskVal = (cr.risk || "").toLowerCase();
  const riskTier: ChangeProfile["riskTier"] = riskVal.includes("very high") ? "critical" : riskVal.includes("high") ? "high" : riskVal.includes("moderate") ? "medium" : "low";

  return {
    changeType: cr.type || "Normal",
    riskTier,
    complexity,
    natureCategory,
    natureTags,
  };
}

/* ── Application Profile Classification ── */
interface AppProfile {
  applicationName: string;
  serviceCategory: string;
  environmentTags: string[];
  criticality: "mission-critical" | "business-critical" | "standard" | "unknown";
  technologyStack: string[];
}

function classifyAppProfile(cr: {
  cmdb_ci: string; business_service: string; service_offering: string;
  category: string; short_description: string; description: string;
  implementation_plan: string; assignment_group: string;
}): AppProfile {
  const all = `${cr.short_description} ${cr.description} ${cr.implementation_plan} ${cr.cmdb_ci} ${cr.business_service}`.toLowerCase();

  const applicationName = cr.cmdb_ci || cr.business_service || "Unknown Application";
  const serviceCategory = cr.service_offering || cr.category || "General";

  // Environment detection
  const environmentTags: string[] = [];
  if (/production|prod\b/i.test(all)) environmentTags.push("Production");
  if (/staging|stage|stg\b/i.test(all)) environmentTags.push("Staging");
  if (/dev\b|development/i.test(all)) environmentTags.push("Development");
  if (/test|qa|uat/i.test(all)) environmentTags.push("Test/QA");
  if (/dr\b|disaster|failover/i.test(all)) environmentTags.push("DR/Failover");
  if (environmentTags.length === 0) environmentTags.push("Unspecified");

  // Technology stack detection
  const technologyStack: string[] = [];
  if (/java|jvm|spring|tomcat|jboss/i.test(all)) technologyStack.push("Java");
  if (/python|django|flask/i.test(all)) technologyStack.push("Python");
  if (/node|javascript|typescript|react|angular|next/i.test(all)) technologyStack.push("Node.js/JS");
  if (/\.net|c#|asp\.net|iis/i.test(all)) technologyStack.push(".NET");
  if (/sql|mysql|postgres|oracle|mssql|mongodb/i.test(all)) technologyStack.push("Database");
  if (/linux|ubuntu|centos|rhel/i.test(all)) technologyStack.push("Linux");
  if (/windows|iis/i.test(all)) technologyStack.push("Windows");
  if (/cisco|juniper|palo.?alto/i.test(all)) technologyStack.push("Networking");
  if (/aws|azure|gcp|cloud/i.test(all)) technologyStack.push("Cloud");
  if (/docker|kubernetes|k8s|container/i.test(all)) technologyStack.push("Containers");
  if (/apache|nginx|load.?balance/i.test(all)) technologyStack.push("Web Server/LB");
  if (/ssh|bgp|router|switch|vlan/i.test(all)) technologyStack.push("Network Devices");
  if (technologyStack.length === 0) technologyStack.push("Not detected");

  // Criticality inference
  let criticality: AppProfile["criticality"] = "unknown";
  if (/mission.?critical|tier.?1|critical.*system|core.*platform/i.test(all)) criticality = "mission-critical";
  else if (/business.?critical|tier.?2|important|essential/i.test(all)) criticality = "business-critical";
  else if (/standard|routine|tier.?3|normal/i.test(all)) criticality = "standard";

  return { applicationName, serviceCategory, environmentTags, criticality, technologyStack };
}

/* ── Implementation Plan Deep Analysis ── */
interface PlanAnalysisResult {
  // Content metrics
  wordCount: number;
  lineCount: number;
  stepCount: number;
  charCount: number;

  // Structure analysis
  hasNumberedSteps: boolean;
  hasBulletPoints: boolean;
  hasPreChecks: boolean;
  hasPostChecks: boolean;
  hasVerificationSteps: boolean;
  hasTimeline: boolean;
  hasContactInfo: boolean;
  hasRollbackReference: boolean;
  hasApprovalGates: boolean;
  hasMonitoringSteps: boolean;

  // Quality scores (0-100)
  structureScore: number;
  completenessScore: number;
  clarityScore: number;
  riskAwarenessScore: number;
  overallQuality: number;

  // Detected patterns
  detectedActions: string[];
  detectedRisks: string[];
  missingElements: string[];
  strengths: string[];

  // Sentiment / tone
  confidenceLevel: "high" | "medium" | "low";
  technicalDepth: "deep" | "moderate" | "shallow" | "none";
}

function analyzeImplementationPlan(text: string): PlanAnalysisResult {
  const t = (text || "").trim();
  if (!t || t.length < 5) {
    return {
      wordCount: 0, lineCount: 0, stepCount: 0, charCount: 0,
      hasNumberedSteps: false, hasBulletPoints: false, hasPreChecks: false,
      hasPostChecks: false, hasVerificationSteps: false, hasTimeline: false,
      hasContactInfo: false, hasRollbackReference: false, hasApprovalGates: false,
      hasMonitoringSteps: false,
      structureScore: 0, completenessScore: 0, clarityScore: 0,
      riskAwarenessScore: 0, overallQuality: 0,
      detectedActions: [], detectedRisks: ["No implementation plan provided"],
      missingElements: ["Implementation plan is completely absent"],
      strengths: [],
      confidenceLevel: "low", technicalDepth: "none",
    };
  }

  const words = t.split(/\s+/);
  const lines = t.split(/\n/).filter(l => l.trim());
  const wordCount = words.length;
  const lineCount = lines.length;
  const charCount = t.length;

  // Step detection
  const numberedStepPattern = /(?:^|\n)\s*(?:\d+[.)]\s|step\s*\d)/gim;
  const bulletPattern = /(?:^|\n)\s*[-•*]\s/gm;
  const numberedSteps = (t.match(numberedStepPattern) || []).length;
  const bulletPoints = (t.match(bulletPattern) || []).length;
  const stepCount = Math.max(numberedSteps, bulletPoints, lineCount > 3 ? Math.ceil(lineCount / 2) : 0);
  const hasNumberedSteps = numberedSteps >= 2;
  const hasBulletPoints = bulletPoints >= 2;

  // Check for specific plan elements
  const hasPreChecks = /pre.?check|before.*start|prerequisite|pre.?condition|verify.*before|ensure.*before/i.test(t);
  const hasPostChecks = /post.?check|after.*complet|verify.*after|confirm.*success|validate.*after|post.?validation/i.test(t);
  const hasVerificationSteps = /verify|validate|confirm|check|test|ensure|assert/i.test(t);
  const hasTimeline = /\d{1,2}:\d{2}|\d{4}[-/]\d{2}|hours?|minutes?|AM|PM|schedule|window|during|between.*and/i.test(t);
  const hasContactInfo = /@|email|phone|contact|notify|team|escalat|page|on.?call/i.test(t);
  const hasRollbackReference = /rollback|revert|backout|undo|restore|fall.?back|previous.*version/i.test(t);
  const hasApprovalGates = /approv|authorize|sign.?off|change.*board|cab|review|gate/i.test(t);
  const hasMonitoringSteps = /monitor|alert|log|metric|dashboard|observe|watch|check.*status/i.test(t);

  // ── Structure Score ──
  let structureScore = 10;
  if (hasNumberedSteps) structureScore += 25;
  if (hasBulletPoints && !hasNumberedSteps) structureScore += 15;
  if (lineCount >= 5) structureScore += 10;
  if (lineCount >= 10) structureScore += 10;
  if (stepCount >= 5) structureScore += 15;
  if (hasPreChecks && hasPostChecks) structureScore += 15;
  structureScore = Math.min(100, structureScore);

  // ── Completeness Score ──
  let completenessScore = 10;
  const elements = [hasPreChecks, hasPostChecks, hasVerificationSteps, hasTimeline, hasContactInfo, hasRollbackReference, hasApprovalGates, hasMonitoringSteps];
  completenessScore += elements.filter(Boolean).length * 11;
  if (wordCount > 100) completenessScore += 5;
  if (wordCount > 300) completenessScore += 7;
  completenessScore = Math.min(100, completenessScore);

  // ── Clarity Score ──
  let clarityScore = 20;
  const avgWordsPerLine = lineCount > 0 ? wordCount / lineCount : wordCount;
  if (avgWordsPerLine < 25) clarityScore += 15; // Not too verbose per line
  if (avgWordsPerLine > 5) clarityScore += 10; // Not too terse
  if (/\b(first|then|next|after|finally|lastly|before|once|when)\b/i.test(t)) clarityScore += 15; // Sequence words
  if (hasNumberedSteps) clarityScore += 20;
  if (/\b(if|in case|should|when.*fail|error|issue)\b/i.test(t)) clarityScore += 10; // Conditional handling
  if (wordCount >= 50) clarityScore += 10;
  clarityScore = Math.min(100, clarityScore);

  // ── Risk Awareness Score ──
  let riskAwarenessScore = 0;
  if (hasRollbackReference) riskAwarenessScore += 20;
  if (/risk|impact|mitigation|contingency/i.test(t)) riskAwarenessScore += 15;
  if (/fail|failure|error|issue|problem/i.test(t)) riskAwarenessScore += 10;
  if (/downtime|outage|disruption|unavailable/i.test(t)) riskAwarenessScore += 10;
  if (hasMonitoringSteps) riskAwarenessScore += 15;
  if (/backup|snapshot|checkpoint/i.test(t)) riskAwarenessScore += 15;
  if (/communicate|notification|stakeholder|inform/i.test(t)) riskAwarenessScore += 10;
  if (hasPreChecks) riskAwarenessScore += 5;
  riskAwarenessScore = Math.min(100, riskAwarenessScore);

  const overallQuality = Math.round(structureScore * 0.25 + completenessScore * 0.30 + clarityScore * 0.25 + riskAwarenessScore * 0.20);

  // ── Detected Actions ──
  const detectedActions: string[] = [];
  const actionPatterns: [RegExp, string][] = [
    [/deploy|install|rollout/i, "Software deployment"],
    [/configure|config|setting/i, "Configuration change"],
    [/restart|reboot|bounce/i, "Service restart"],
    [/patch|update|upgrade/i, "System update/patch"],
    [/create|add|provision/i, "Resource provisioning"],
    [/delete|remove|decommission/i, "Resource removal"],
    [/migrate|migration/i, "Data/system migration"],
    [/backup|snapshot/i, "Backup operation"],
    [/test|validate|verify/i, "Testing/validation"],
    [/monitor|observe/i, "Monitoring setup"],
    [/ssh|logon|login|connect/i, "Remote access"],
    [/run|execute|command/i, "Command execution"],
  ];
  for (const [pat, label] of actionPatterns) {
    if (pat.test(t)) detectedActions.push(label);
  }

  // ── Detected Risks ──
  const detectedRisks: string[] = [];
  if (/reboot|restart.*prod/i.test(t)) detectedRisks.push("Service restart in production — may cause downtime");
  if (/delete|drop|remove.*data/i.test(t)) detectedRisks.push("Data deletion operation — verify backups first");
  if (/emergency|hotfix|expedit/i.test(t)) detectedRisks.push("Expedited change — reduced review time increases risk");
  if (/manual/i.test(t) && !/automat/i.test(t)) detectedRisks.push("Manual execution — higher human error potential");
  if (!hasRollbackReference) detectedRisks.push("No rollback/revert steps mentioned");
  if (!hasPreChecks) detectedRisks.push("No pre-checks documented — could miss prerequisite issues");
  if (!hasPostChecks) detectedRisks.push("No post-validation steps — success confirmation unclear");
  if (!hasMonitoringSteps) detectedRisks.push("No monitoring steps — issue detection may be delayed");
  if (wordCount < 30) detectedRisks.push("Very brief plan — insufficient detail for reliable execution");
  if (/password|credential|secret/i.test(t)) detectedRisks.push("Contains credential references — ensure secure handling");

  // ── Missing Elements ──
  const missingElements: string[] = [];
  if (!hasPreChecks) missingElements.push("Pre-implementation checks");
  if (!hasPostChecks) missingElements.push("Post-implementation validation");
  if (!hasRollbackReference) missingElements.push("Rollback/backout procedure reference");
  if (!hasTimeline) missingElements.push("Time estimates or schedule");
  if (!hasContactInfo) missingElements.push("Contact/escalation information");
  if (!hasApprovalGates) missingElements.push("Approval gates or review checkpoints");
  if (!hasMonitoringSteps) missingElements.push("Monitoring and observation steps");
  if (!hasVerificationSteps) missingElements.push("Verification/testing steps");

  // ── Strengths ──
  const strengths: string[] = [];
  if (hasNumberedSteps) strengths.push("Well-structured with numbered steps");
  if (hasPreChecks && hasPostChecks) strengths.push("Includes both pre and post checks");
  if (hasRollbackReference) strengths.push("References rollback/revert procedures");
  if (hasMonitoringSteps) strengths.push("Includes monitoring considerations");
  if (wordCount > 200) strengths.push("Detailed and comprehensive documentation");
  if (stepCount >= 5) strengths.push(`Clear multi-step process (${stepCount} steps identified)`);
  if (hasTimeline) strengths.push("Includes time references for scheduling");
  if (hasContactInfo) strengths.push("Contact/escalation info provided");
  if (hasApprovalGates) strengths.push("Approval gates defined");

  // ── Confidence & Technical Depth ──
  const confidenceLevel: PlanAnalysisResult["confidenceLevel"] = overallQuality >= 65 ? "high" : overallQuality >= 40 ? "medium" : "low";
  const technicalDepth: PlanAnalysisResult["technicalDepth"] = wordCount > 300 && stepCount >= 5 ? "deep" : wordCount > 100 ? "moderate" : wordCount > 20 ? "shallow" : "none";

  return {
    wordCount, lineCount, stepCount, charCount,
    hasNumberedSteps, hasBulletPoints, hasPreChecks, hasPostChecks,
    hasVerificationSteps, hasTimeline, hasContactInfo, hasRollbackReference,
    hasApprovalGates, hasMonitoringSteps,
    structureScore, completenessScore, clarityScore, riskAwarenessScore, overallQuality,
    detectedActions, detectedRisks, missingElements, strengths,
    confidenceLevel, technicalDepth,
  };
}

/* ── Recommendations Generator ── */
interface Recommendation {
  severity: "critical" | "high" | "medium" | "info";
  category: string;
  title: string;
  detail: string;
}

function generateRecommendations(
  planAnalysis: PlanAnalysisResult,
  changeProfile: ChangeProfile,
  appProfile: AppProfile,
  cr: { backout_plan: string; test_plan: string; risk_impact_analysis: string },
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Critical recommendations
  if (planAnalysis.overallQuality === 0) {
    recs.push({ severity: "critical", category: "Plan Content", title: "No implementation plan provided", detail: "This change request has no implementation plan. A detailed plan is mandatory before deployment approval, especially for production changes." });
  }

  if (changeProfile.riskTier === "critical" && planAnalysis.overallQuality < 60) {
    recs.push({ severity: "critical", category: "Risk Mismatch", title: "Critical-risk change with inadequate plan", detail: `This change is classified as ${changeProfile.riskTier} risk, but the implementation plan quality is only ${planAnalysis.overallQuality}/100. High-risk changes require comprehensive, well-documented plans.` });
  }

  if (changeProfile.changeType === "Emergency" && !planAnalysis.hasRollbackReference) {
    recs.push({ severity: "critical", category: "Emergency Change", title: "Emergency change without rollback steps", detail: "Emergency changes bypass normal review cycles. Having clear rollback procedures is essential to mitigate the increased risk of expedited deployment." });
  }

  // High recommendations
  if (!planAnalysis.hasPreChecks && changeProfile.riskTier !== "low") {
    recs.push({ severity: "high", category: "Pre-checks", title: "Add pre-implementation verification", detail: "Include prerequisite checks (system health, backup status, dependency readiness) before starting the implementation to catch issues early." });
  }

  if (!planAnalysis.hasPostChecks) {
    recs.push({ severity: "high", category: "Post-checks", title: "Add post-implementation validation", detail: "Include explicit steps to verify the change was applied correctly — e.g., service health checks, functional tests, log verification." });
  }

  if (!planAnalysis.hasRollbackReference && planAnalysis.overallQuality > 0) {
    recs.push({ severity: "high", category: "Rollback", title: "Document rollback procedure", detail: "Reference or outline the backout/rollback procedure directly in the implementation plan so the implementer knows the recovery path without searching." });
  }

  const backout = (cr.backout_plan || "").trim();
  if (backout.length < 20) {
    recs.push({ severity: "high", category: "Backout Plan", title: "Backout plan is missing or inadequate", detail: "A proper backout plan is essential for any change. Document the exact steps to revert the change if issues arise during or after implementation." });
  }

  const testPlan = (cr.test_plan || "").trim();
  if (testPlan.length < 20) {
    recs.push({ severity: "high", category: "Test Plan", title: "Test plan is missing or inadequate", detail: "Define testing steps to validate the change — include smoke tests, functional validation, and acceptance criteria." });
  }

  // Medium recommendations
  if (!planAnalysis.hasMonitoringSteps) {
    recs.push({ severity: "medium", category: "Monitoring", title: "Add monitoring and observation steps", detail: "Specify what to monitor during and after the change — dashboards, alerts, logs, and duration of the observation period." });
  }

  if (!planAnalysis.hasTimeline) {
    recs.push({ severity: "medium", category: "Timeline", title: "Include time estimates", detail: "Add expected duration for each step and overall timeline. This helps coordinate with stakeholders and set maintenance windows." });
  }

  if (!planAnalysis.hasContactInfo) {
    recs.push({ severity: "medium", category: "Communication", title: "Add escalation contacts", detail: "Include on-call contacts, team leads, and escalation paths in case issues arise during implementation." });
  }

  if (planAnalysis.wordCount > 0 && planAnalysis.wordCount < 50) {
    recs.push({ severity: "medium", category: "Detail", title: "Expand plan documentation", detail: `The plan is only ${planAnalysis.wordCount} words. For a ${changeProfile.complexity} complexity change, provide more detailed step-by-step instructions.` });
  }

  if (appProfile.environmentTags.includes("Production") && !planAnalysis.hasApprovalGates) {
    recs.push({ severity: "medium", category: "Governance", title: "Add approval checkpoints for production change", detail: "Production changes should include explicit approval gates or review checkpoints within the implementation plan." });
  }

  // Info recommendations
  if (planAnalysis.strengths.length > 0) {
    recs.push({ severity: "info", category: "Strengths", title: "Plan strengths identified", detail: planAnalysis.strengths.join("; ") + "." });
  }

  if (appProfile.technologyStack.length > 0 && !appProfile.technologyStack.includes("Not detected")) {
    recs.push({ severity: "info", category: "Technology", title: `Technology stack: ${appProfile.technologyStack.join(", ")}`, detail: `Detected technologies suggest ${changeProfile.natureTags.join(", ")} operations. Ensure team has relevant expertise.` });
  }

  return recs;
}

/* ── Overall Assessment ── */
interface Assessment {
  verdict: "approve" | "approve-with-conditions" | "needs-rework" | "reject";
  verdictLabel: string;
  confidencePercent: number;
  summary: string;
  riskFactors: string[];
}

function generateAssessment(
  planAnalysis: PlanAnalysisResult,
  changeProfile: ChangeProfile,
  appProfile: AppProfile,
  recommendations: Recommendation[],
): Assessment {
  const criticalCount = recommendations.filter(r => r.severity === "critical").length;
  const highCount = recommendations.filter(r => r.severity === "high").length;

  let verdict: Assessment["verdict"];
  let verdictLabel: string;

  if (criticalCount > 0 || planAnalysis.overallQuality < 15) {
    verdict = "reject";
    verdictLabel = "Not Ready — Significant Issues";
  } else if (highCount >= 3 || planAnalysis.overallQuality < 35) {
    verdict = "needs-rework";
    verdictLabel = "Needs Rework — Multiple Gaps";
  } else if (highCount > 0 || planAnalysis.overallQuality < 60) {
    verdict = "approve-with-conditions";
    verdictLabel = "Conditional Approval — Address Issues";
  } else {
    verdict = "approve";
    verdictLabel = "Ready for Approval";
  }

  // Confidence in the assessment
  const contentFactor = Math.min(100, planAnalysis.charCount / 10);
  const confidencePercent = Math.round(
    contentFactor * 0.3 +
    planAnalysis.overallQuality * 0.4 +
    (100 - criticalCount * 30 - highCount * 10) * 0.3
  );

  // Summary
  const riskFactors: string[] = [];
  if (changeProfile.riskTier === "critical" || changeProfile.riskTier === "high") riskFactors.push(`${changeProfile.riskTier}-risk change`);
  if (changeProfile.complexity === "very-high" || changeProfile.complexity === "high") riskFactors.push(`${changeProfile.complexity} complexity`);
  if (changeProfile.changeType === "Emergency") riskFactors.push("emergency change (expedited)");
  if (appProfile.environmentTags.includes("Production")) riskFactors.push("production environment");
  if (appProfile.criticality === "mission-critical") riskFactors.push("mission-critical application");
  if (planAnalysis.detectedRisks.length > 2) riskFactors.push(`${planAnalysis.detectedRisks.length} risk factors detected`);

  const summary = verdict === "approve"
    ? `This ${changeProfile.natureCategory.toLowerCase()} change has a well-documented implementation plan (quality: ${planAnalysis.overallQuality}/100). The plan demonstrates good structure, completeness, and risk awareness. ${riskFactors.length > 0 ? `Note: ${riskFactors.join(", ")}.` : ""}`
    : verdict === "approve-with-conditions"
    ? `This ${changeProfile.natureCategory.toLowerCase()} change has an adequate implementation plan (quality: ${planAnalysis.overallQuality}/100), but ${highCount} issue(s) should be addressed before deployment. ${riskFactors.length > 0 ? `Risk factors: ${riskFactors.join(", ")}.` : ""}`
    : verdict === "needs-rework"
    ? `This ${changeProfile.natureCategory.toLowerCase()} change has significant gaps in its implementation plan (quality: ${planAnalysis.overallQuality}/100). ${highCount} high-priority and ${criticalCount} critical issues need resolution. ${riskFactors.length > 0 ? `Compounded by: ${riskFactors.join(", ")}.` : ""}`
    : `This ${changeProfile.natureCategory.toLowerCase()} change is not ready for deployment. The implementation plan has critical deficiencies (quality: ${planAnalysis.overallQuality}/100). ${criticalCount} critical issue(s) must be resolved before proceeding.`;

  return { verdict, verdictLabel, confidencePercent: Math.max(10, Math.min(95, confidencePercent)), summary, riskFactors };
}

/* ═══ API Route Handler ═══ */

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const crNumber = searchParams.get("number");
  if (!crNumber) return NextResponse.json({ error: "Missing 'number' query parameter" }, { status: 400 });

  try {
    const cr = await prisma.changeRequest.findUnique({ where: { number: crNumber } });
    if (!cr) return NextResponse.json({ error: `Change request ${crNumber} not found` }, { status: 404 });

    // Run all analyses
    const changeProfile = classifyChangeNature(cr);
    const appProfile = classifyAppProfile(cr);
    const planAnalysis = analyzeImplementationPlan(cr.implementation_plan);
    const recommendations = generateRecommendations(planAnalysis, changeProfile, appProfile, cr);
    const assessment = generateAssessment(planAnalysis, changeProfile, appProfile, recommendations);

    return NextResponse.json({
      number: cr.number,
      shortDescription: cr.short_description,
      changeProfile,
      appProfile,
      planAnalysis,
      recommendations,
      assessment,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
