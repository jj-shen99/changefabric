export type RiskLevel = "critical" | "high" | "medium" | "low";

// Legacy type aliases kept for backward compatibility with existing pages
export type ChangeStatus = string;
export type ChangeCategory = string;
export type ValidationType = string;
export type ValidationStatus = string;

export interface ImpactAnalysis {
  outageRisk: number;
  performanceRisk: number;
  functionalityRisk: number;
  securityRisk: number;
  dataIntegrityRisk: number;
  overallRisk: number;
  affectedServices: string[];
  affectedUsers: number;
  estimatedDowntime: string;
  rollbackComplexity: RiskLevel;
  blastRadius: RiskLevel;
}

export interface Validation {
  id: string;
  type: string;
  name: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  coverage?: number;
  details?: string;
  blockers?: string[];
  changeId?: string;
  changeTitle?: string;
  team?: string;
  releaseId?: string | null;
}

export interface ChangeRequest {
  number: string;
  sys_id: string;
  short_description: string;
  description: string;
  category: string;
  state: string;
  type: string;
  priority: string;
  risk: string;
  sn_impact: string;
  urgency: string;
  scope: string;
  approval: string;
  assigned_to: string;
  assignment_group: string;
  opened_by: string;
  opened_at: string;
  closed_at: string;
  closed_by: string;
  close_code: string;
  close_notes: string;
  start_date: string;
  end_date: string;
  work_start: string;
  work_end: string;
  expected_start: string;
  implementation_plan: string;
  backout_plan: string;
  test_plan: string;
  change_plan: string;
  risk_impact_analysis: string;
  justification: string;
  // CamelCase aliases (used by native CR system)
  implementationPlan?: string;
  backoutPlan?: string;
  testPlan?: string;
  riskAndImpactAnalysis?: string;
  cmdb_ci: string;
  business_service: string;
  service_offering: string;
  company: string;
  contact_type: string;
  location: string;
  requested_by: string;
  requested_by_date: string;
  parent: string;
  reason: string;
  validations: Validation[];
  // Legacy backward-compat fields mapped from SN fields in API response
  id: string;
  title: string;
  status: string;
  author: string;
  team: string;
  createdAt: string;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  approvers: string[];
  tags: string[];
  impact: ImpactAnalysis;
  jiraTicket?: string;
  prUrl?: string;
  releaseId?: string;
  scheduledAt?: string;
  deployedAt?: string;
  [key: string]: unknown;
}

export interface Release {
  id: string;
  name: string;
  version: string;
  status: "planning" | "staging" | "canary" | "rolling_out" | "completed" | "rolled_back";
  scheduledDate: string;
  actualDate?: string;
  changeRequests: string[];
  overallRisk: number;
  releaseManager: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalChanges: number;
  pendingChanges: number;
  deployedToday: number;
  failedDeployments: number;
  avgRiskScore: number;
  validationPassRate: number;
  avgDeployTime: string;
  rollbackRate: number;
  mttr: string;
  changeLeadTime: string;
}
