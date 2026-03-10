"use client";

import useSWR from "swr";

interface RiskFactor {
  codeChurn: string;
  serviceSpread: string;
  testCoverage: string;
  rollbackComplexity: string;
}

export interface ReleaseRiskRadar {
  releaseId: string;
  releaseName: string;
  version: string;
  status: string;
  overallRisk: number;
  changeCount: number;
  totalCodeChurn: number;
  totalFilesChanged: number;
  servicesImpacted: number;
  servicesList: string[];
  avgTestCoverage: number;
  validationPassRate: number;
  scheduledDate: string;
  riskFactors: RiskFactor;
}

export interface BlastRadiusItem {
  service: string;
  changeCount: number;
  avgRisk: number;
  changes: string[];
  releases: string[];
}

export interface ConfidenceScore {
  releaseId: string;
  releaseName: string;
  version: string;
  status: string;
  confidence: number;
  recommendation: "continue" | "pause" | "rollback";
  breakdown: {
    testPassRate: number;
    testCoverage: number;
    riskScore: number;
    failedTests: number;
    hasBlockers: boolean;
    rollbackComplexity: string;
  };
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
}

export interface TeamFailure {
  team: string;
  total: number;
  deployed: number;
  failed: number;
  rolledBack: number;
  avgRisk: number;
  failureRate: number;
}

export interface ServiceRisk {
  service: string;
  avgRiskExposure: number;
  changeCount: number;
}

export interface TeamVelocity {
  team: string;
  totalChanges: number;
  deployed: number;
  avgRisk: number;
  deployRate: number;
}

export interface ApprovalEfficiency {
  id: string;
  title: string;
  team: string;
  approverCount: number;
  leadTimeHours: number;
  category: string;
}

export interface AnalyticsData {
  releaseRiskRadar: ReleaseRiskRadar[];
  blastRadius: BlastRadiusItem[];
  confidenceScores: ConfidenceScore[];
  failureAnalysis: {
    totalChanges: number;
    deployed: number;
    failed: number;
    rolledBack: number;
    changeFailureRate: number;
    failureByTeam: TeamFailure[];
    serviceRiskRanking: ServiceRisk[];
  };
  velocity: {
    teamVelocity: TeamVelocity[];
    categoryBreakdown: { category: string; count: number }[];
    approvalEfficiency: ApprovalEfficiency[];
  };
  rollbackIntelligence: {
    rollbackCount: number;
    rollbackRate: number;
    rollbackData: { id: string; title: string; team: string; category: string; risk: number; rollbackComplexity: string; services: string[] }[];
    rollbackByService: { service: string; count: number }[];
  };
}

const emptyData: AnalyticsData = {
  releaseRiskRadar: [],
  blastRadius: [],
  confidenceScores: [],
  failureAnalysis: { totalChanges: 0, deployed: 0, failed: 0, rolledBack: 0, changeFailureRate: 0, failureByTeam: [], serviceRiskRanking: [] },
  velocity: { teamVelocity: [], categoryBreakdown: [], approvalEfficiency: [] },
  rollbackIntelligence: { rollbackCount: 0, rollbackRate: 0, rollbackData: [], rollbackByService: [] },
};

async function fetcher(url: string): Promise<AnalyticsData> {
  const res = await fetch(url);
  if (res.status === 401) throw new Error("Session expired. Please sign in again.");
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
  return res.json();
}

export function useAnalytics() {
  const { data, error, isLoading } = useSWR<AnalyticsData>("/api/data/analytics", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000,
    dedupingInterval: 10000,
  });

  return {
    ...(data || emptyData),
    loading: isLoading,
    error: error ? error.message : null,
  };
}
