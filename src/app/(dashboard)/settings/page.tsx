"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Shield, Users, Plug, ChevronRight, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

const TABS = [
  { id: "general", label: "General" },
  { id: "integrations", label: "Integrations" },
] as const;

type TabId = typeof TABS[number]["id"];

const settingSections = [
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure alert thresholds and notification channels",
    items: [
      { label: "Risk Score Alert Threshold", value: "60", type: "number" },
      { label: "Failed Validation Alerts", value: "Enabled", type: "toggle" },
      { label: "Deployment Notifications", value: "Slack + Email", type: "select" },
    ],
  },
  {
    icon: Shield,
    title: "Approval Policies",
    description: "Define required approvals by risk level",
    items: [
      { label: "Critical Risk (80+)", value: "3 approvals + Security Lead", type: "text" },
      { label: "High Risk (60-79)", value: "2 approvals + Tech Lead", type: "text" },
      { label: "Medium Risk (40-59)", value: "1 approval", type: "text" },
      { label: "Low Risk (0-39)", value: "Auto-approve if all validations pass", type: "text" },
    ],
  },
  {
    icon: Database,
    title: "Validation Gates",
    description: "Required validations before deployment by change category",
    items: [
      { label: "Infrastructure Changes", value: "Unit, Integration, Perf, Security, Rollback", type: "text" },
      { label: "Database Migrations", value: "Unit, Integration, Perf, Rollback, DBA Sign-off", type: "text" },
      { label: "Feature Changes", value: "Unit, Integration, Code Review, UAT", type: "text" },
      { label: "Config Changes", value: "Smoke Test, UAT", type: "text" },
    ],
  },
  {
    icon: Users,
    title: "Team Configuration",
    description: "Manage teams and their deployment permissions",
    items: [
      { label: "Payments Team", value: "Full pipeline required", type: "text" },
      { label: "Frontend Team", value: "Standard pipeline", type: "text" },
      { label: "Security Team", value: "Fast-track for security patches", type: "text" },
      { label: "Platform Team", value: "Standard pipeline", type: "text" },
    ],
  },
];

const integrationLinks = [
  {
    icon: Plug,
    title: "LLM Provider",
    description: "Configure AI/LLM for summarization, plan analysis, and risk assessment",
    href: "/settings/integrations",
  },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure dashboard policies, alert thresholds, and validation requirements" />
      <div className="space-y-6 p-4 md:p-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            {settingSections.map((section) => (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-gray-500" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                      <span className="rounded bg-white border border-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure external service connections for data synchronization and AI-powered features.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {integrationLinks.map((integration) => (
                <Link
                  key={integration.title}
                  href={integration.href}
                  className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-600"
                >
                  <div className="rounded-lg bg-indigo-50 p-2.5 dark:bg-indigo-950">
                    <integration.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{integration.title}</h3>
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{integration.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
