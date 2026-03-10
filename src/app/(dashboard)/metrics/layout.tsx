import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metrics & Trends",
  description: "DORA metrics, deployment health trends, and performance insights for release engineering",
};

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
