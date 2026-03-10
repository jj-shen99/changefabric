"use client";

import useSWR, { mutate as globalMutate } from "swr";
import type { ChangeRequest, Release, DashboardMetrics } from "@/lib/types";

interface DashboardData {
  changeRequests: ChangeRequest[];
  releases: Release[];
  dashboardMetrics: DashboardMetrics | null;
  riskTrendData: { date: string; avgRisk: number; deployments: number }[];
  validationTrendData: { date: string; passRate: number; totalTests: number }[];
  deploymentFrequencyData: { date: string; successful: number; failed: number; rolledBack: number }[];
  impactByCategory: { category: string; avgRisk: number; count: number }[];
}

interface UseDataReturn extends DashboardData {
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const emptyData: DashboardData = {
  changeRequests: [],
  releases: [],
  dashboardMetrics: null,
  riskTrendData: [],
  validationTrendData: [],
  deploymentFrequencyData: [],
  impactByCategory: [],
};

async function fetcher(url: string): Promise<DashboardData> {
  const res = await fetch(url);
  if (res.status === 401) {
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.status}`);
  }
  return res.json();
}

export function useData(): UseDataReturn {
  const { data, error, isLoading } = useSWR<DashboardData>("/api/data", fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // auto-refresh every 30s
    dedupingInterval: 5000,
  });

  const refetch = async () => {
    await globalMutate("/api/data");
  };

  return {
    ...(data || emptyData),
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  };
}
