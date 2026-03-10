import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure dashboard policies, alert thresholds, and validation requirements",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
