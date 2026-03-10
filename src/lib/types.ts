export type RiskLevel = "critical" | "high" | "medium" | "low";
export type ChangeStatus = "draft" | "pending_review" | "approved" | "in_progress" | "deployed" | "rolled_back" | "failed";
export type ValidationType = "unit_test" | "integration_test" | "performance_test" | "security_scan" | "code_review" | "uat" | "smoke_test" | "regression_test" | "canary_deploy" | "rollback_test";
export type ValidationStatus = "passed" | "failed" | "running" | "pending" | "skipped";
export type ChangeCategory = "feature" | "bugfix" | "hotfix" | "infrastructure" | "security_patch" | "database_migration" | "config_change" | "dependency_update";

export interface ImpactAnalysis {
  outageRisk: number;        // 0-100
  performanceRisk: number;   // 0-100
  functionalityRisk: number; // 0-100
  securityRisk: number;      // 0-100
  dataIntegrityRisk: number; // 0-100
  overallRisk: number;       // 0-100
  affectedServices: string[];
  affectedUsers: number;
  estimatedDowntime: string;
  rollbackComplexity: RiskLevel;
  blastRadius: RiskLevel;
}

export interface Validation {
  id: string;
  type: ValidationType;
  name: string;
  status: ValidationStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  coverage?: number;
  details?: string;
  blockers?: string[];
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  category: ChangeCategory;
  status: ChangeStatus;
  author: string;
  team: string;
  createdAt: string;
  scheduledAt?: string;
  deployedAt?: string;
  impact: ImpactAnalysis;
  validations: Validation[];
  releaseId?: string;
  jiraTicket?: string;
  prUrl?: string;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  approvers: string[];
  tags: string[];
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
