import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validations",
  description: "Track test results, approvals, and deployment gates across all change requests",
};

export default function ValidationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
