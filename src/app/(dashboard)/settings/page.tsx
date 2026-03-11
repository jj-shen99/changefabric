"use client";

import { Bell, Shield, Users, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure dashboard policies, alert thresholds, and validation requirements" />

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
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="rounded bg-white border border-gray-200 px-3 py-1 text-sm text-gray-600">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
