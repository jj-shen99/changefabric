import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impact Analysis",
  description: "Comprehensive risk assessment across outage, performance, functionality, security, and data integrity",
};

export default function ImpactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
