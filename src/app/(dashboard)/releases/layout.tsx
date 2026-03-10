import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Releases",
  description: "Release timeline, bundled changes, and deployment readiness tracking",
};

export default function ReleasesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
