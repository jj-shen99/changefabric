import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Requests",
  description: "Track and manage all software change requests with filtering by status, category, and risk level",
};

export default function ChangesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
