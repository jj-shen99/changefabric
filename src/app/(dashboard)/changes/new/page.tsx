"use client";

/**
 * /changes/new — create a new change request via POST /api/v2/changes.
 * Supports creating from templates or copying from existing CRs.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, FileText, ChevronDown, Copy, Search, UserPlus, X, Users, Shield, AlertTriangle, Zap, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/card";
import {
  CR_TYPES,
  CR_CATEGORIES,
  CR_PRIORITIES,
  CR_RISK_LEVELS,
  CR_IMPACT_LEVELS,
  CR_URGENCY_LEVELS,
} from "@/lib/constants";

interface UserSuggestion {
  id: string;
  name: string;
  email: string;
}

type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  priority: string;
  riskLevel: string;
  impactLevel: string;
  urgency: string;
  assignmentGroup: string | null;
  implementationPlan: string;
  backoutPlan: string;
  testPlan: string;
  riskAndImpactAnalysis: string;
  justification: string;
};

type ExistingCR = {
  number: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priority: string;
  riskLevel: string;
  impactLevel: string;
  urgency: string;
  assignmentGroup: string | null;
  implementationPlan: string;
  backoutPlan: string;
  testPlan: string;
  riskAndImpactAnalysis: string;
  justification: string;
  affectedServices: string[];
};

const defaultForm = {
  title: "",
  description: "",
  type: "standard",
  category: "other",
  priority: "3",
  riskLevel: "moderate",
  impactLevel: "3",
  urgency: "3",
  justification: "",
  implementationPlan: "",
  backoutPlan: "",
  testPlan: "",
  riskAndImpactAnalysis: "",
  plannedStart: "",
  plannedEnd: "",
  assignmentGroup: "",
  assignedTo: "",
  affectedServices: "",
};

export default function NewChangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const copyFrom = searchParams.get("copy");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [form, setForm] = useState(defaultForm);

  // Copy from existing CR state
  const [existingCRs, setExistingCRs] = useState<ExistingCR[]>([]);
  const [existingCRsLoading, setExistingCRsLoading] = useState(true);
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);
  const [copySearch, setCopySearch] = useState("");
  const [selectedCopy, setSelectedCopy] = useState<string>("");

  // Assigned To user autocomplete
  const [assignedToInput, setAssignedToInput] = useState("");
  const [assignedToUser, setAssignedToUser] = useState<UserSuggestion | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const assignedToRef = useRef<HTMLInputElement>(null);

  // Service autocomplete
  interface ServiceSuggestion { id: string; name: string; displayName: string; category: string | null; }
  const [serviceInput, setServiceInput] = useState("");
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([]);
  const [showServiceSuggestions, setShowServiceSuggestions] = useState(false);
  const serviceInputRef = useRef<HTMLInputElement>(null);

  // Assignment Group autocomplete
  interface GroupSuggestion { id: string; name: string; description: string; }
  const [groupInput, setGroupInput] = useState("");
  const [groupSuggestions, setGroupSuggestions] = useState<GroupSuggestion[]>([]);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const groupInputRef = useRef<HTMLInputElement>(null);

  // Load templates
  useEffect(() => {
    setTemplatesLoading(true);
    fetch("/api/v2/templates")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to load templates:", err);
      })
      .finally(() => setTemplatesLoading(false));
  }, []);

  // Load existing CRs for copy feature
  useEffect(() => {
    setExistingCRsLoading(true);
    fetch("/api/v2/changes?limit=100")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.items && Array.isArray(data.items)) {
          setExistingCRs(data.items.map((cr: ExistingCR & { affectedServices?: string | string[] }) => ({
            ...cr,
            affectedServices: Array.isArray(cr.affectedServices) 
              ? cr.affectedServices 
              : typeof cr.affectedServices === "string" 
                ? JSON.parse(cr.affectedServices || "[]") 
                : [],
          })));
        }
      })
      .catch((err) => {
        console.error("Failed to load existing CRs:", err);
      })
      .finally(() => setExistingCRsLoading(false));
  }, []);

  // Apply template from URL param
  useEffect(() => {
    if (templateId && templates.length > 0) {
      const t = templates.find((x) => x.id === templateId);
      if (t) applyTemplate(t);
    }
  }, [templateId, templates]);

  // Apply copy from URL param
  useEffect(() => {
    if (copyFrom && existingCRs.length > 0) {
      const cr = existingCRs.find((x) => x.number === copyFrom);
      if (cr) applyCopy(cr);
    }
  }, [copyFrom, existingCRs]);

  // Search users for Assigned To autocomplete
  // Only show users with implementer or manager roles (who can implement changes)
  useEffect(() => {
    if (assignedToInput.length < 1) {
      setUserSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(assignedToInput)}&role=assignable`);
        if (res.ok) {
          const data = await res.json();
          setUserSuggestions(data.users || []);
          setShowUserSuggestions((data.users || []).length > 0);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [assignedToInput]);

  function selectAssignedTo(user: UserSuggestion) {
    setAssignedToUser(user);
    setAssignedToInput("");
    setUserSuggestions([]);
    setShowUserSuggestions(false);
    setForm((f) => ({ ...f, assignedTo: user.email }));
  }

  function clearAssignedTo() {
    setAssignedToUser(null);
    setForm((f) => ({ ...f, assignedTo: "" }));
  }

  // Service search
  useEffect(() => {
    if (serviceInput.length < 1) {
      setServiceSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v2/services?search=${encodeURIComponent(serviceInput)}`);
        if (res.ok) {
          const data = await res.json();
          setServiceSuggestions(data || []);
          setShowServiceSuggestions((data || []).length > 0);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [serviceInput]);

  function selectService(service: ServiceSuggestion) {
    const currentServices = form.affectedServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!currentServices.includes(service.name)) {
      const newServices = [...currentServices, service.name].join(", ");
      setForm((f) => ({ ...f, affectedServices: newServices }));
    }
    setServiceInput("");
    setServiceSuggestions([]);
    setShowServiceSuggestions(false);
  }

  function removeService(serviceName: string) {
    const currentServices = form.affectedServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== serviceName);
    setForm((f) => ({ ...f, affectedServices: currentServices.join(", ") }));
  }

  // Assignment Group search
  useEffect(() => {
    if (groupInput.length < 1) {
      setGroupSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v2/groups?search=${encodeURIComponent(groupInput)}&type=assignment`);
        if (res.ok) {
          const data = await res.json();
          setGroupSuggestions(data || []);
          setShowGroupSuggestions((data || []).length > 0);
        }
      } catch {
        // Ignore search errors
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [groupInput]);

  function selectGroup(group: GroupSuggestion) {
    setForm((f) => ({ ...f, assignmentGroup: group.name }));
    setGroupInput("");
    setGroupSuggestions([]);
    setShowGroupSuggestions(false);
  }

  function clearGroup() {
    setForm((f) => ({ ...f, assignmentGroup: "" }));
  }

  function applyTemplate(t: Template) {
    setSelectedTemplate(t.id);
    setSelectedCopy("");
    setForm((f) => ({
      ...f,
      type: t.type,
      category: t.category,
      priority: t.priority,
      riskLevel: t.riskLevel,
      impactLevel: t.impactLevel,
      urgency: t.urgency,
      assignmentGroup: t.assignmentGroup || "",
      implementationPlan: t.implementationPlan,
      backoutPlan: t.backoutPlan,
      testPlan: t.testPlan,
      riskAndImpactAnalysis: t.riskAndImpactAnalysis,
      justification: t.justification,
    }));
    setShowTemplateDropdown(false);
  }

  function applyCopy(cr: ExistingCR) {
    setSelectedCopy(cr.number);
    setSelectedTemplate("");
    setForm((f) => ({
      ...f,
      title: `Copy of: ${cr.title}`,
      description: cr.description || "",
      type: cr.type,
      category: cr.category,
      priority: cr.priority,
      riskLevel: cr.riskLevel,
      impactLevel: cr.impactLevel,
      urgency: cr.urgency,
      assignmentGroup: cr.assignmentGroup || "",
      implementationPlan: cr.implementationPlan || "",
      backoutPlan: cr.backoutPlan || "",
      testPlan: cr.testPlan || "",
      riskAndImpactAnalysis: cr.riskAndImpactAnalysis || "",
      justification: cr.justification || "",
      affectedServices: Array.isArray(cr.affectedServices) ? cr.affectedServices.join(", ") : "",
    }));
    setShowCopyDropdown(false);
    setCopySearch("");
  }

  // Filter existing CRs by search
  const filteredCRs = existingCRs.filter((cr) => {
    if (!copySearch) return true;
    const q = copySearch.toLowerCase();
    return cr.number.toLowerCase().includes(q) || cr.title.toLowerCase().includes(q);
  }).slice(0, 20);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Client-side validation for planned dates
    const now = new Date();
    if (form.plannedStart) {
      const plannedStart = new Date(form.plannedStart);
      if (plannedStart <= now) {
        setError("Planned start must be in the future");
        setSubmitting(false);
        return;
      }
    }
    if (form.plannedEnd) {
      const plannedEnd = new Date(form.plannedEnd);
      if (plannedEnd <= now) {
        setError("Planned end must be in the future");
        setSubmitting(false);
        return;
      }
    }
    if (form.plannedStart && form.plannedEnd) {
      const plannedStart = new Date(form.plannedStart);
      const plannedEnd = new Date(form.plannedEnd);
      if (plannedStart >= plannedEnd) {
        setError("Planned start must be earlier than planned end");
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        ...form,
        plannedStart: form.plannedStart ? new Date(form.plannedStart).toISOString() : null,
        plannedEnd: form.plannedEnd ? new Date(form.plannedEnd).toISOString() : null,
        affectedServices: form.affectedServices
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/v2/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.push(`/changes/${data.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="New Change Request"
        actions={
          <Link
            href="/changes"
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        }
      />

      {/* Template & Copy Selectors */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Template Selector */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-indigo-600" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Start from Template</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pre-fill fields with a template</p>
              </div>
            </div>
            <div className="relative mt-3">
              {templatesLoading ? (
                <span className="text-sm text-gray-400">Loading...</span>
              ) : templates.length === 0 ? (
                <span className="text-sm text-gray-400">No templates available</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setShowTemplateDropdown(!showTemplateDropdown); setShowCopyDropdown(false); }}
                    className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <span className="truncate">{selectedTemplate ? templates.find((t) => t.id === selectedTemplate)?.name : "Select template..."}</span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </button>
                  {showTemplateDropdown && (
                    <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="max-h-64 overflow-y-auto p-1">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => applyTemplate(t)}
                            className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t.description || t.category}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Copy from Existing CR */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Copy className="h-5 w-5 text-teal-600" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Copy from Existing</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Clone an existing change request</p>
              </div>
            </div>
            <div className="relative mt-3">
              {existingCRsLoading ? (
                <span className="text-sm text-gray-400">Loading...</span>
              ) : existingCRs.length === 0 ? (
                <span className="text-sm text-gray-400">No existing CRs</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setShowCopyDropdown(!showCopyDropdown); setShowTemplateDropdown(false); }}
                    className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <span className="truncate">{selectedCopy ? `${selectedCopy}: ${existingCRs.find((c) => c.number === selectedCopy)?.title}` : "Select CR to copy..."}</span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  </button>
                  {showCopyDropdown && (
                    <div className="absolute left-0 right-0 z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 p-2 dark:border-gray-700">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search by number or title..."
                            value={copySearch}
                            onChange={(e) => setCopySearch(e.target.value)}
                            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1">
                        {filteredCRs.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500">No matching CRs</div>
                        ) : (
                          filteredCRs.map((cr) => (
                            <button
                              key={cr.number}
                              type="button"
                              onClick={() => applyCopy(cr)}
                              className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                <span className="font-mono text-indigo-600 dark:text-indigo-400">{cr.number}</span>
                                <span className="ml-2">{cr.title}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{cr.type} · {cr.category}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <div className="space-y-4 p-4">
            <Field label="Title (required)">
              <input
                required
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Select label="Type" value={form.type} onChange={(v) => update("type", v)} options={CR_TYPES.map((o) => [o.value, o.label])} />
              <Select label="Category" value={form.category} onChange={(v) => update("category", v)} options={CR_CATEGORIES.map((o) => [o.value, o.label])} />
              <Select label="Priority" value={form.priority} onChange={(v) => update("priority", v)} options={CR_PRIORITIES.map((o) => [o.value, o.label])} />
              <Select label="Risk" value={form.riskLevel} onChange={(v) => update("riskLevel", v)} options={CR_RISK_LEVELS.map((o) => [o.value, o.label])} />
              <Select label="Impact" value={form.impactLevel} onChange={(v) => update("impactLevel", v)} options={CR_IMPACT_LEVELS.map((o) => [o.value, o.label])} />
              <Select label="Urgency" value={form.urgency} onChange={(v) => update("urgency", v)} options={CR_URGENCY_LEVELS.map((o) => [o.value, o.label])} />
            </div>

            {/* Risk-Based Approval Requirements */}
            {form.type !== "pre-approved" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {form.type === "emergency" ? "Emergency Approval" : "Risk-Based Approval Requirements"}
                  </span>
                </div>
                {form.type === "emergency" ? (
                  <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Fast-track approval: Any member of Emergency CAB can approve</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {form.riskLevel === "critical" && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-red-700 dark:text-red-300">
                          <strong>Critical Risk:</strong> Requires CAB + Security Team + VP approval
                        </span>
                      </div>
                    )}
                    {form.riskLevel === "high" && (
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-700 dark:text-orange-300">
                          <strong>High Risk:</strong> Requires CAB + Manager approval
                        </span>
                      </div>
                    )}
                    {form.riskLevel === "moderate" && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="text-yellow-700 dark:text-yellow-300">
                          <strong>Moderate Risk:</strong> Requires Manager approval
                        </span>
                      </div>
                    )}
                    {form.riskLevel === "low" && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-green-700 dark:text-green-300">
                          <strong>Low Risk:</strong> Requires Team Lead approval
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Assignment Group with autocomplete */}
            <div className="relative">
              <Field label="Assignment Group">
                {form.assignmentGroup ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1.5 text-sm text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Users className="h-3.5 w-3.5" />
                      {form.assignmentGroup}
                      <button
                        type="button"
                        onClick={clearGroup}
                        className="ml-1 rounded-full p-0.5 hover:bg-green-200 dark:hover:bg-green-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={groupInputRef}
                      type="text"
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      onFocus={() => groupSuggestions.length > 0 && setShowGroupSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                      placeholder="Type to search assignment groups..."
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                    {showGroupSuggestions && groupSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-48 overflow-auto">
                        {groupSuggestions.map((group) => (
                          <li
                            key={group.id}
                            className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onMouseDown={() => selectGroup(group)}
                          >
                            <div className="font-medium text-sm">{group.name}</div>
                            {group.description && <div className="text-xs text-gray-500">{group.description}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Field>
            </div>

            {/* Assigned To with user autocomplete */}
            <div className="relative">
              <Field label="Assigned To">
                {assignedToUser ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                      <UserPlus className="h-3.5 w-3.5" />
                      {assignedToUser.name}
                      <button
                        type="button"
                        onClick={clearAssignedTo}
                        className="ml-1 rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                    <span className="text-xs text-gray-500">{assignedToUser.email}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={assignedToRef}
                      type="text"
                      value={assignedToInput}
                      onChange={(e) => setAssignedToInput(e.target.value)}
                      onFocus={() => userSuggestions.length > 0 && setShowUserSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowUserSuggestions(false), 200)}
                      placeholder="Type a name to search..."
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                    {showUserSuggestions && userSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        {userSuggestions.map((user) => (
                          <li
                            key={user.id}
                            className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onMouseDown={() => selectAssignedTo(user)}
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Planned start">
                <input 
                  type="datetime-local" 
                  value={form.plannedStart} 
                  onChange={(e) => update("plannedStart", e.target.value)} 
                  min={new Date().toISOString().slice(0, 16)}
                  className="input" 
                />
              </Field>
              <Field label="Planned end">
                <input 
                  type="datetime-local" 
                  value={form.plannedEnd} 
                  onChange={(e) => update("plannedEnd", e.target.value)} 
                  min={form.plannedStart || new Date().toISOString().slice(0, 16)}
                  className="input" 
                />
              </Field>
            </div>
            <Field label="Affected services">
              <div className="space-y-2">
                {/* Selected services as tags */}
                {form.affectedServices && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.affectedServices.split(",").map((s) => s.trim()).filter(Boolean).map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {service}
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Service search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={serviceInputRef}
                    type="text"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onFocus={() => serviceSuggestions.length > 0 && setShowServiceSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowServiceSuggestions(false), 200)}
                    placeholder="Type to search services..."
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  {showServiceSuggestions && serviceSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-48 overflow-auto">
                      {serviceSuggestions.map((service) => (
                        <li
                          key={service.id}
                          className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onMouseDown={() => selectService(service)}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{service.displayName}</div>
                          <div className="text-xs text-gray-500">{service.name}{service.category && ` • ${service.category}`}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-gray-500">Search and select services, or type manually separated by commas</p>
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Plans &amp; Justification</h3>
            <Field label="Justification">
              <textarea rows={2} value={form.justification} onChange={(e) => update("justification", e.target.value)} className="input" />
            </Field>
            <Field label="Implementation plan">
              <textarea rows={4} value={form.implementationPlan} onChange={(e) => update("implementationPlan", e.target.value)} className="input" />
            </Field>
            <Field label="Backout plan">
              <textarea rows={3} value={form.backoutPlan} onChange={(e) => update("backoutPlan", e.target.value)} className="input" />
            </Field>
            <Field label="Test plan">
              <textarea rows={3} value={form.testPlan} onChange={(e) => update("testPlan", e.target.value)} className="input" />
            </Field>
            <Field label="Risk &amp; impact analysis">
              <textarea rows={3} value={form.riskAndImpactAnalysis} onChange={(e) => update("riskAndImpactAnalysis", e.target.value)} className="input" />
            </Field>
          </div>
        </Card>

        {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

        <div className="flex justify-end gap-2">
          <Link href="/changes" className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700">Cancel</Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Creating…" : "Create"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(229 231 235);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        :global(.dark) .input {
          border-color: rgb(55 65 81);
          background: rgb(17 24 39);
          color: rgb(229 231 235);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
}
