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
  else if (/standard|routine|tier.?3/i.test(all)) criticality = "standard";

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
  hasBackoutDuration: boolean;
  hasLogReview: boolean;
  hasAuditTrail: boolean;
  hasVersionInfo: boolean;
  hasEnvironmentScope: boolean;

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

  // AI-inferred change nature insights
  changeNatureInsights: string[];
  backoutAnalysis: { hasDuration: boolean; hasSteps: boolean; hasTriggerCriteria: boolean; hasEscalation: boolean; estimatedDuration: string | null; gaps: string[] };

  // Sentiment / tone
  confidenceLevel: "high" | "medium" | "low";
  technicalDepth: "deep" | "moderate" | "shallow" | "none";
}

function analyzeImplementationPlan(text: string, otherPlans?: { backout_plan?: string; test_plan?: string; risk_impact_analysis?: string; change_plan?: string }): PlanAnalysisResult {
  const t = (text || "").trim();
  // Combine all plan fields for cross-field checks (rollback, post-validation, etc.)
  const allText = [t, otherPlans?.backout_plan, otherPlans?.test_plan, otherPlans?.risk_impact_analysis, otherPlans?.change_plan].filter(Boolean).join("\n").trim();
  if (!t || t.length < 5) {
    return {
      wordCount: 0, lineCount: 0, stepCount: 0, charCount: 0,
      hasNumberedSteps: false, hasBulletPoints: false, hasPreChecks: false,
      hasPostChecks: false, hasVerificationSteps: false, hasTimeline: false,
      hasContactInfo: false, hasRollbackReference: false, hasApprovalGates: false,
      hasMonitoringSteps: false, hasBackoutDuration: false, hasLogReview: false,
      hasAuditTrail: false, hasVersionInfo: false, hasEnvironmentScope: false,
      structureScore: 0, completenessScore: 0, clarityScore: 0,
      riskAwarenessScore: 0, overallQuality: 0,
      detectedActions: [], detectedRisks: ["No implementation plan provided"],
      missingElements: ["Implementation plan is completely absent"],
      strengths: [],
      changeNatureInsights: [],
      backoutAnalysis: { hasDuration: false, hasSteps: false, hasTriggerCriteria: false, hasEscalation: false, estimatedDuration: null, gaps: ["Backout plan not analyzed — implementation plan is absent"] },
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
  const hasPreChecks = /pre.?check|pre.?implementation|before.*start|prerequisite|pre.?condition|verify.*before|ensure.*before|pre.?flight/i.test(allText);
  const hasPostChecks = /post.?check|after.*complet|verify.*after|confirm.*success|validate.*after|post.?validation|post.?deployment/i.test(allText);
  const hasVerificationSteps = /verify|validate|confirm|check|test|ensure|assert/i.test(allText);
  const hasTimeline = /\d{1,2}:\d{2}|\d{4}[-/]\d{2}|hours?|minutes?|AM|PM|schedule|window|during|between.*and/i.test(t);
  const hasContactInfo = /@|email|phone|contact|notify|team|escalat|page|on.?call/i.test(allText);
  const hasRollbackReference = /rollback|revert|backout|undo|restore|fall.?back|previous.*version|back.?out/i.test(allText);
  const hasApprovalGates = /approv|authorize|sign.?off|change.*board|cab|review|gate/i.test(allText);
  const hasMonitoringSteps = /monitor|alert|log|metric|dashboard|observe|watch|check.*status/i.test(allText);

  // New enhanced detection flags
  const backoutText = (otherPlans?.backout_plan || "").trim();
  const hasBackoutDuration = /\d+\s*(min|hour|hr|minute|sec|second|day)/i.test(backoutText) || /estimated.*duration|duration.*estimat|time.*to.*rollback|rollback.*time|ETA|RTO/i.test(backoutText);
  const hasLogReview = /review.*log|log.*review|check.*log|inspect.*log|examine.*log|system.*log|\blog\b.*analys|error.*log|event.*log|application.*log|var\/log/i.test(allText);
  const hasAuditTrail = /audit.*trail|audit.*log|change.*log|history|evidence|documentation.*trail|record.*change|cmdb.*update|sys_mod_count|tracking/i.test(allText);
  const hasVersionInfo = /v\d+[._]\d+|version\s*\d|from.*v?\d+.*to.*v?\d+|upgrade.*\d|\d+\.\d+\.\d+/i.test(allText);
  const hasEnvironmentScope = /prod(?:uction)?|stag(?:ing)?|dev(?:elopment)?|test|uat|qa|pre-prod|dr\b|failover|primary.*dc|secondary.*dc|us-(?:east|west)|eu-|data.?center/i.test(allText);

  // ── Backout Plan Deep Analysis ──
  const backoutAnalysisSteps = /step|\d+[.)]/i.test(backoutText);
  const backoutTriggerCriteria = /trigger|criteria|if.*fail|when.*to.*rollback|decision|threshold|abort.*if|rollback.*when/i.test(backoutText);
  const backoutEscalation = /escalat|on.?call|vendor|support|war.?room|bridge|l[123]:|tier/i.test(backoutText);
  const durationMatch = backoutText.match(/(\d+)\s*(min(?:ute)?s?|hours?|hrs?)/i);
  const estimatedDuration = durationMatch ? `${durationMatch[1]} ${durationMatch[2]}` : null;
  const backoutGaps: string[] = [];
  if (!hasBackoutDuration) backoutGaps.push("No estimated rollback duration — unable to assess recovery time");
  if (!backoutAnalysisSteps) backoutGaps.push("No numbered/sequential rollback steps");
  if (!backoutTriggerCriteria) backoutGaps.push("No trigger criteria for when to initiate rollback");
  if (!backoutEscalation) backoutGaps.push("No escalation path defined in backout plan");
  if (backoutText.length < 20) backoutGaps.push("Backout plan is missing or too brief");
  const backoutAnalysis = { hasDuration: hasBackoutDuration, hasSteps: backoutAnalysisSteps, hasTriggerCriteria: backoutTriggerCriteria, hasEscalation: backoutEscalation, estimatedDuration, gaps: backoutGaps };

  // ── AI Change Nature Insights ──
  const changeNatureInsights: string[] = [];
  // Version upgrade detection
  const versionUpgradeMatch = allText.match(/(?:from|current)\s*(?:v(?:ersion)?\s*)?([\d.]+)\s*(?:→|->|to|➜)\s*(?:v(?:ersion)?\s*)?([\d.]+)/i);
  if (versionUpgradeMatch) {
    changeNatureInsights.push(`Version upgrade detected: ${versionUpgradeMatch[1]} → ${versionUpgradeMatch[2]}`);
    const [fromMajor] = versionUpgradeMatch[1].split(".").map(Number);
    const [toMajor] = versionUpgradeMatch[2].split(".").map(Number);
    if (toMajor > fromMajor) changeNatureInsights.push(`Major version upgrade (${fromMajor}.x → ${toMajor}.x) — higher risk of breaking changes`);
  }
  // Firmware/runtime detection
  if (/firmware|bios|rom|flash/i.test(allText)) changeNatureInsights.push("Firmware-level change — requires physical/low-level access, higher rollback complexity");
  if (/python|java|node|ruby|php|go|rust|dotnet|\.net|runtime|interpreter|jvm|jdk|jre/i.test(allText)) changeNatureInsights.push("Runtime/language upgrade — dependency compatibility is critical");
  if (/kernel|os|operating.?system|linux|windows.*upgrade/i.test(allText)) changeNatureInsights.push("OS/kernel-level change — reboot likely required, highest impact tier");
  // Infrastructure scope
  const serverCountMatch = allText.match(/(\d+)\s*(?:server|node|host|instance|machine)/i);
  if (serverCountMatch && parseInt(serverCountMatch[1]) > 5) changeNatureInsights.push(`Large-scale change: ${serverCountMatch[1]} servers affected — batch/rolling deployment recommended`);
  // Rolling vs big-bang
  if (/rolling|batch|canary|blue.?green|phased|one.*at.*a.*time|sequential/i.test(allText)) changeNatureInsights.push("Rolling/phased deployment strategy detected — reduces blast radius");
  else if (serverCountMatch && parseInt(serverCountMatch[1]) > 3) changeNatureInsights.push("⚠ No rolling/phased strategy detected for multi-server change — consider batch approach");
  // Data impact
  if (/schema|migration|alter.*table|drop.*table|truncate|data.*transform/i.test(allText)) changeNatureInsights.push("Database schema change detected — data migration risk, ensure backup and tested rollback");
  if (/no.*schema|no.*data.*change|runtime.?only|behavioral.?only|non.?destructive/i.test(allText)) changeNatureInsights.push("Non-destructive change (no data/schema impact) — lower rollback complexity");
  // Security implications
  if (/cve|vulnerabilit|security.*patch|ssl|tls|certificate|encryption/i.test(allText)) changeNatureInsights.push("Security-related change — may have compliance deadline or urgency");
  // Downtime assessment
  if (/zero.*down|no.*downtime|non.?disruptive|rolling/i.test(allText)) changeNatureInsights.push("Zero-downtime approach documented");
  else if (/downtime|outage|unavailable|service.*interrupt/i.test(allText)) changeNatureInsights.push("Potential downtime acknowledged — verify maintenance window is scheduled");
  // Multi-DC / DR
  if (/multi.?dc|cross.?dc|primary.*secondary|active.?passive|failover.*dc|disaster.*recover|gslb/i.test(allText)) changeNatureInsights.push("Multi-datacenter change — cross-DC coordination and GSLB management required");

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
  // Start at max and penalize missing critical/optional elements
  let completenessScore = 100;
  const criticalElements = [hasPreChecks, hasPostChecks, hasVerificationSteps, hasRollbackReference, hasMonitoringSteps];
  const optionalElements = [hasTimeline, hasContactInfo, hasApprovalGates, hasBackoutDuration, hasLogReview, hasAuditTrail];
  completenessScore -= criticalElements.filter(e => !e).length * 15; // -15 per missing critical element
  completenessScore -= optionalElements.filter(e => !e).length * 5;  // -5 per missing optional element
  if (wordCount > 100) completenessScore += 3;
  if (wordCount > 300) completenessScore += 4;
  completenessScore = Math.max(0, Math.min(100, completenessScore));

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
  if (!hasBackoutDuration && backoutText.length >= 20) detectedRisks.push("Backout plan has no estimated rollback duration — recovery time unknown");
  if (!hasBackoutDuration && backoutText.length < 20) detectedRisks.push("Backout plan is missing or inadequate — no rollback time estimate possible");
  if (!hasLogReview) detectedRisks.push("No log review steps — post-change issues may go undetected");
  if (!hasAuditTrail) detectedRisks.push("No audit trail or evidence collection — change traceability gap");

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
  if (!hasBackoutDuration) missingElements.push("Backout/rollback time estimate");
  if (!hasLogReview) missingElements.push("Log review and inspection steps");
  if (!hasAuditTrail) missingElements.push("Audit trail or change evidence collection");
  if (!hasVersionInfo && /upgrade|update|patch|migration/i.test(allText)) missingElements.push("Version numbers (from/to) for upgrade traceability");

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
  if (hasBackoutDuration) strengths.push(`Backout plan includes time estimate${estimatedDuration ? ` (${estimatedDuration})` : ""}`);
  if (hasLogReview) strengths.push("Includes log review/inspection steps");
  if (hasAuditTrail) strengths.push("Audit trail and change evidence documented");
  if (hasVersionInfo) strengths.push("Version information clearly specified");
  if (hasEnvironmentScope) strengths.push("Environment scope clearly defined");
  if (backoutAnalysis.hasTriggerCriteria) strengths.push("Backout trigger criteria defined — clear decision framework");
  if (changeNatureInsights.length > 0) strengths.push(`AI detected ${changeNatureInsights.length} change nature insight(s)`);

  // ── Confidence & Technical Depth ──
  const confidenceLevel: PlanAnalysisResult["confidenceLevel"] = overallQuality >= 65 ? "high" : overallQuality >= 40 ? "medium" : "low";
  const technicalDepth: PlanAnalysisResult["technicalDepth"] = wordCount > 300 && stepCount >= 5 ? "deep" : wordCount > 100 ? "moderate" : wordCount > 20 ? "shallow" : "none";

  return {
    wordCount, lineCount, stepCount, charCount,
    hasNumberedSteps, hasBulletPoints, hasPreChecks, hasPostChecks,
    hasVerificationSteps, hasTimeline, hasContactInfo, hasRollbackReference,
    hasApprovalGates, hasMonitoringSteps, hasBackoutDuration, hasLogReview,
    hasAuditTrail, hasVersionInfo, hasEnvironmentScope,
    structureScore, completenessScore, clarityScore, riskAwarenessScore, overallQuality,
    detectedActions, detectedRisks, missingElements, strengths,
    changeNatureInsights, backoutAnalysis,
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

  if (!planAnalysis.hasBackoutDuration && backout.length >= 20) {
    recs.push({ severity: "high", category: "Backout Duration", title: "Backout plan has no estimated rollback duration", detail: "The backout plan exists but does not specify how long a rollback would take. Without a time estimate, it is impossible to assess recovery time objectives (RTO) or plan maintenance windows for rollback scenarios. Add an explicit duration estimate (e.g., 'Estimated rollback time: 45 minutes')." });
  }

  if (planAnalysis.backoutAnalysis.gaps.length > 0 && backout.length >= 20) {
    if (!planAnalysis.backoutAnalysis.hasTriggerCriteria) {
      recs.push({ severity: "medium", category: "Backout Triggers", title: "Define rollback trigger criteria", detail: "The backout plan does not specify when to initiate a rollback. Define clear trigger criteria (e.g., 'Rollback if error rate exceeds 5% within 10 minutes post-deployment'). This prevents delayed rollback decisions." });
    }
    if (!planAnalysis.backoutAnalysis.hasEscalation) {
      recs.push({ severity: "medium", category: "Backout Escalation", title: "Add escalation path to backout plan", detail: "No escalation contacts defined in the backout plan. Include on-call, vendor support, and management escalation paths for when rollback encounters issues." });
    }
  }

  const testPlan = (cr.test_plan || "").trim();
  if (testPlan.length < 20) {
    recs.push({ severity: "high", category: "Test Plan", title: "Test plan is missing or inadequate", detail: "Define testing steps to validate the change — include smoke tests, functional validation, and acceptance criteria." });
  }

  if (!planAnalysis.hasLogReview) {
    recs.push({ severity: "medium", category: "Log Review", title: "Add post-change log review steps", detail: "No log review or inspection steps found in any plan field. After implementation, reviewing system logs, application logs, and error logs is critical to detect silent failures or unexpected behavior. Add explicit log inspection steps (e.g., 'Review /var/log/app/*.log for errors for 15 minutes post-change')." });
  }

  if (!planAnalysis.hasAuditTrail) {
    recs.push({ severity: "medium", category: "Audit Trail", title: "Document change evidence and audit trail", detail: "No mention of audit trail, evidence collection, or CMDB updates. For compliance and traceability, document what changed (before/after), update CMDB records, and retain evidence for audit purposes." });
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

  // AI Change Nature Insights
  if (planAnalysis.changeNatureInsights.length > 0) {
    recs.push({ severity: "info", category: "AI Insights", title: `AI detected ${planAnalysis.changeNatureInsights.length} change nature insight(s)`, detail: planAnalysis.changeNatureInsights.join("; ") + "." });
  }

  if (planAnalysis.backoutAnalysis.estimatedDuration) {
    recs.push({ severity: "info", category: "Backout Info", title: `Estimated rollback duration: ${planAnalysis.backoutAnalysis.estimatedDuration}`, detail: `The backout plan includes a time estimate of ${planAnalysis.backoutAnalysis.estimatedDuration}. Verify this aligns with your RTO requirements and maintenance window.` });
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
    const newCR = await prisma.changeRequest.findUnique({ where: { number: crNumber } });
    if (!newCR) return NextResponse.json({ error: `Change request ${crNumber} not found` }, { status: 404 });

    // Adapter: map the re-architected CR shape onto the legacy SN-shaped
    // fields the local helpers were written against. Keeps this analyzer
    // working without rewriting it.
    const cr = {
      number: newCR.number,
      type: newCR.type,
      priority: newCR.priority,
      urgency: newCR.urgency,
      scope: "",
      risk: newCR.riskLevel,
      impact: newCR.impactLevel,
      category: newCR.category,
      short_description: newCR.title,
      description: newCR.description,
      implementation_plan: newCR.implementationPlan,
      backout_plan: newCR.backoutPlan,
      test_plan: newCR.testPlan,
      risk_impact_analysis: newCR.riskAndImpactAnalysis,
      change_plan: "",
      assignment_group: newCR.assignmentGroup ?? "",
      cmdb_ci: newCR.configurationItem ?? "",
      business_service: newCR.businessService ?? "",
      service_offering: "",
    };

    // Run all analyses
    const changeProfile = classifyChangeNature(cr);
    const appProfile = classifyAppProfile(cr);
    const planAnalysis = analyzeImplementationPlan(cr.implementation_plan, {
      backout_plan: cr.backout_plan,
      test_plan: cr.test_plan,
      risk_impact_analysis: cr.risk_impact_analysis,
      change_plan: cr.change_plan,
    });
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
