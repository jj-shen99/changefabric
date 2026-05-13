"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, Shield, Plug, ChevronRight, Save, Loader2, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";

const TABS = [
  { id: "general", label: "General" },
  { id: "approval", label: "Approval Policies" },
  { id: "integrations", label: "Integrations" },
] as const;

type TabId = typeof TABS[number]["id"];

interface SettingItem {
  key: string;
  label: string;
  value: string;
  type: "number" | "toggle" | "select" | "text";
  options?: string[];
}

interface SettingSection {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: SettingItem[];
}

// Approval policy defines what approval steps are auto-created based on risk score
interface ApprovalPolicy {
  id: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  minScore: number;
  maxScore: number;
  requiredApprovals: number;
  approverGroups: string[];  // e.g., ["Tech Lead", "Security Lead", "CAB"]
  autoApprove: boolean;
}

// Risk-Based Approval Tiers - applies to Standard CRs only
// All Standard CRs require at least one approval regardless of risk score
const defaultApprovalPolicies: ApprovalPolicy[] = [
  { id: "critical", riskLevel: "critical", minScore: 80, maxScore: 100, requiredApprovals: 3, approverGroups: ["Tech Lead", "Security Lead", "CAB"], autoApprove: false },
  { id: "high", riskLevel: "high", minScore: 60, maxScore: 79, requiredApprovals: 2, approverGroups: ["Tech Lead", "Manager"], autoApprove: false },
  { id: "medium", riskLevel: "medium", minScore: 0, maxScore: 59, requiredApprovals: 1, approverGroups: ["Tech Lead"], autoApprove: false },
];

const defaultSettings: SettingSection[] = [
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure alert thresholds and notification channels",
    items: [
      { key: "risk_alert_threshold", label: "Risk Score Alert Threshold", value: "60", type: "number" },
      { key: "failed_validation_alerts", label: "Failed Validation Alerts", value: "Enabled", type: "toggle", options: ["Enabled", "Disabled"] },
      { key: "deployment_notifications", label: "Deployment Notifications", value: "Slack + Email", type: "select", options: ["Slack + Email", "Slack Only", "Email Only", "Disabled"] },
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

// Local storage key for general settings
const SETTINGS_KEY = "dashboard_settings";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<SettingSection[]>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Approval policies state
  const [policies, setPolicies] = useState<ApprovalPolicy[]>(defaultApprovalPolicies);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesHasChanges, setPoliciesHasChanges] = useState(false);
  const [policiesSaving, setPoliciesSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, string>;
        setSettings(prev => prev.map(section => ({
          ...section,
          items: section.items.map(item => ({
            ...item,
            value: parsed[item.key] ?? item.value,
          })),
        })));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Load approval policies from API
  const loadPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const res = await fetch("/api/settings?category=approval");
      if (res.ok) {
        const data = await res.json();
        if (data.settings?.approval_policies) {
          const parsed = JSON.parse(data.settings.approval_policies);
          setPolicies(parsed);
        }
      }
    } catch {
      // Use defaults on error
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  function updateSetting(key: string, value: string) {
    setSettings(prev => prev.map(section => ({
      ...section,
      items: section.items.map(item => 
        item.key === key ? { ...item, value } : item
      ),
    })));
    setHasChanges(true);
  }

  function saveSettings() {
    setSaving(true);
    const flat: Record<string, string> = {};
    settings.forEach(section => {
      section.items.forEach(item => {
        flat[item.key] = item.value;
      });
    });
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(flat));
    setTimeout(() => {
      setSaving(false);
      setHasChanges(false);
      toast.success("Settings saved successfully");
    }, 300);
  }

  function updatePolicy(id: string, field: keyof ApprovalPolicy, value: unknown) {
    setPolicies(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
    setPoliciesHasChanges(true);
  }

  function updatePolicyGroups(id: string, groupsStr: string) {
    const groups = groupsStr.split(",").map(g => g.trim()).filter(Boolean);
    updatePolicy(id, "approverGroups", groups);
  }

  async function savePolicies() {
    setPoliciesSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "approval_policies",
          value: JSON.stringify(policies),
          category: "approval",
        }),
      });
      if (res.ok) {
        setPoliciesHasChanges(false);
        toast.success("Approval policies saved successfully");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save policies");
      }
    } catch {
      toast.error("Failed to save policies");
    } finally {
      setPoliciesSaving(false);
    }
  }

  function renderInput(item: SettingItem) {
    if (item.type === "toggle" && item.options) {
      return (
        <button
          onClick={() => updateSetting(item.key, item.value === item.options![0] ? item.options![1] : item.options![0])}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            item.value === item.options[0] ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              item.value === item.options[0] ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      );
    }

    if (item.type === "select" && item.options) {
      return (
        <select
          value={item.value}
          onChange={(e) => updateSetting(item.key, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          {item.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (item.type === "number") {
      return (
        <input
          type="number"
          value={item.value}
          onChange={(e) => updateSetting(item.key, e.target.value)}
          className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 text-right dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        />
      );
    }

    return (
      <input
        type="text"
        value={item.value}
        onChange={(e) => updateSetting(item.key, e.target.value)}
        className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      />
    );
  }

  const riskLevelColors: Record<string, string> = {
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure dashboard policies, alert thresholds, and approval requirements" />
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
            {hasChanges && (
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? <>Saving...</> : <><Save className="h-4 w-4" /> Save Changes</>}
                </button>
              </div>
            )}

            {settings.map((section) => (
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
                      key={item.key}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                      {renderInput(item)}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Approval Policies Tab */}
        {activeTab === "approval" && (
          <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">How Approval Policies Work</p>
                <p className="mt-1 text-blue-700 dark:text-blue-400">
                  When a CR transitions to &quot;Awaiting Approval&quot;, the system automatically creates approval steps based on the CR&apos;s computed risk score. 
                  Configure which approver groups are required for each risk level below.
                </p>
              </div>
            </div>

            {policiesHasChanges && (
              <div className="flex justify-end">
                <button
                  onClick={savePolicies}
                  disabled={policiesSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {policiesSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Policies</>}
                </button>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  Risk-Based Approval Requirements
                </CardTitle>
                <CardDescription>
                  Define required approvals for each risk level. Approver groups will be created as sequential approval steps.
                </CardDescription>
              </CardHeader>

              {policiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${riskLevelColors[policy.riskLevel]}`}>
                            {policy.riskLevel.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Risk Score: {policy.minScore} - {policy.maxScore}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={policy.autoApprove}
                            onChange={(e) => updatePolicy(policy.id, "autoApprove", e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-600 dark:text-gray-400">Auto-approve</span>
                        </label>
                      </div>

                      {!policy.autoApprove && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Required Approvals</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={policy.requiredApprovals}
                              onChange={(e) => updatePolicy(policy.id, "requiredApprovals", parseInt(e.target.value) || 1)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Approver Groups (comma-separated)</label>
                            <input
                              type="text"
                              value={policy.approverGroups.join(", ")}
                              onChange={(e) => updatePolicyGroups(policy.id, e.target.value)}
                              placeholder="e.g., Tech Lead, Security, CAB"
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                            />
                          </div>
                        </div>
                      )}

                      {policy.autoApprove && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          CRs in this risk range will be automatically approved (no manual approval required).
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
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
