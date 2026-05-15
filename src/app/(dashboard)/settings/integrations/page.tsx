"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Shield, Key, Bot, Sparkles, Download, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { usePermissions } from "@/hooks";

interface ConnectionStatus {
  connected: boolean;
  message: string;
  lastChecked?: string;
}

export default function IntegrationsPage() {
  const { canEditSettings } = usePermissions();
  
  // ServiceNow Import state
  const [enableCRImport, setEnableCRImport] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  
  // LLM state
  const [llmProvider, setLlmProvider] = useState<"disabled" | "openai" | "anthropic" | "ollama">("disabled");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4.1-mini");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-20250514");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [llmStatus, setLlmStatus] = useState<ConnectionStatus | null>(null);
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmSaving, setLlmSaving] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        // Load LLM settings
        const res = await fetch("/api/settings/integrations");
        if (res.ok) {
          const data = await res.json();
          if (data.llm) {
            setLlmProvider(data.llm.provider || "disabled");
            setOpenaiModel(data.llm.openaiModel || "gpt-4.1-mini");
            setAnthropicModel(data.llm.anthropicModel || "claude-sonnet-4-20250514");
            setOllamaUrl(data.llm.ollamaUrl || "http://localhost:11434");
            setOllamaModel(data.llm.ollamaModel || "llama3.2");
            if (data.llm.hasOpenaiKey) setOpenaiKey("••••••••");
            if (data.llm.hasAnthropicKey) setAnthropicKey("••••••••");
          }
        }
        
        // Load org settings
        const orgRes = await fetch("/api/admin/org-settings");
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setEnableCRImport(orgData.settings?.enableCRImport || false);
        }
      } catch {
        // Ignore load errors
      }
    }
    loadSettings();
  }, []);

  // Toggle CR Import setting
  async function toggleCRImport() {
    setImportSaving(true);
    setImportStatus(null);
    try {
      const res = await fetch("/api/admin/org-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableCRImport: !enableCRImport }),
      });
      if (res.ok) {
        setEnableCRImport(!enableCRImport);
        setImportStatus(!enableCRImport ? "CR Import enabled" : "CR Import disabled");
      } else {
        const data = await res.json();
        setImportStatus(data.error || "Failed to update setting");
      }
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setImportSaving(false);
    }
  }

  // Test LLM connection
  async function testLlmConnection() {
    setLlmTesting(true);
    setLlmStatus(null);
    try {
      const res = await fetch("/api/settings/integrations/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: llmProvider,
          openaiKey: openaiKey === "••••••••" ? undefined : openaiKey,
          openaiModel,
          anthropicKey: anthropicKey === "••••••••" ? undefined : anthropicKey,
          anthropicModel,
          ollamaUrl,
          ollamaModel,
        }),
      });
      const data = await res.json();
      setLlmStatus({
        connected: data.success,
        message: data.message || (data.success ? "LLM connection successful" : "Connection failed"),
        lastChecked: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setLlmStatus({
        connected: false,
        message: err instanceof Error ? err.message : "Connection test failed",
        lastChecked: new Date().toLocaleTimeString(),
      });
    } finally {
      setLlmTesting(false);
    }
  }

  // Save LLM settings
  async function saveLlmSettings() {
    setLlmSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "llm",
          provider: llmProvider,
          openaiKey: openaiKey === "••••••••" ? undefined : openaiKey,
          openaiModel,
          anthropicKey: anthropicKey === "••••••••" ? undefined : anthropicKey,
          anthropicModel,
          ollamaUrl,
          ollamaModel,
        }),
      });
      if (res.ok) {
        setLlmStatus({ connected: true, message: "Settings saved successfully", lastChecked: new Date().toLocaleTimeString() });
      } else {
        const data = await res.json();
        setLlmStatus({ connected: false, message: data.error || "Failed to save settings" });
      }
    } catch (err) {
      setLlmStatus({ connected: false, message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setLlmSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Integrations" subtitle="Configure integrations and AI/LLM provider for analysis" />
      <div className="space-y-6 p-4 md:p-6">

        {/* ServiceNow Import Integration */}
        {canEditSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-600" />
                ServiceNow Import
              </CardTitle>
              <CardDescription>Enable importing change requests from ServiceNow for analysis</CardDescription>
            </CardHeader>
            <div className="space-y-4 px-6 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Enable CR Import
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    When enabled, an &quot;Import from ServiceNow&quot; button will appear on the Changes page
                  </p>
                </div>
                <button
                  onClick={toggleCRImport}
                  disabled={importSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enableCRImport ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
                  } ${importSaving ? "opacity-50" : ""}`}
                >
                  {importSaving && (
                    <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                  )}
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableCRImport ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {importStatus && (
                <div className={`rounded-lg p-3 text-sm ${
                  importStatus.includes("enabled") 
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : importStatus.includes("disabled")
                      ? "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                }`}>
                  {importStatus}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* LLM Provider Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-600" />
              LLM Provider
            </CardTitle>
            <CardDescription>Configure AI/LLM provider for summarization, plan analysis, and risk assessment</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {/* Provider Selection */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as "disabled" | "openai" | "anthropic" | "ollama")}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="disabled">Disabled (use heuristic analysis only)</option>
                <option value="openai">OpenAI (GPT-4.1, GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 4, Claude 3.5)</option>
                <option value="ollama">Ollama (Local models)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Select the LLM provider for AI-powered features. Disable to use deterministic heuristics only.</p>
            </div>

            {/* OpenAI Settings */}
            {llmProvider === "openai" && (
              <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <Sparkles className="h-4 w-4" /> OpenAI Configuration
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showOpenaiKey ? "text" : "password"}
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-12 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="gpt-4.1">GPT-4.1 (latest, most capable)</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini (fast, cost-effective)</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano (fastest, cheapest)</option>
                    <option value="gpt-4o">GPT-4o (previous gen)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (previous gen, fast)</option>
                    <option value="o3">o3 (reasoning model)</option>
                    <option value="o4-mini">o4-mini (reasoning, fast)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Anthropic Settings */}
            {llmProvider === "anthropic" && (
              <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <Sparkles className="h-4 w-4" /> Anthropic Configuration
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showAnthropicKey ? "text" : "password"}
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-12 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                  <select
                    value={anthropicModel}
                    onChange={(e) => setAnthropicModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (latest, recommended)</option>
                    <option value="claude-opus-4-20250514">Claude Opus 4 (most capable)</option>
                    <option value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (extended thinking)</option>
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (previous gen)</option>
                    <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (fast)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Ollama Settings */}
            {llmProvider === "ollama" && (
              <div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                  <Sparkles className="h-4 w-4" /> Ollama Configuration (Local)
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Base URL</label>
                  <input
                    type="url"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">URL of your local Ollama instance</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llama3.2"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">Model name (e.g., llama3.2, mistral, codellama)</p>
                </div>
              </div>
            )}

            {/* Status */}
            {llmStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${llmStatus.connected ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                {llmStatus.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span>{llmStatus.message}</span>
                {llmStatus.lastChecked && <span className="ml-auto text-xs opacity-70">Checked: {llmStatus.lastChecked}</span>}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={testLlmConnection}
                disabled={llmTesting || llmProvider === "disabled"}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
              >
                {llmTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test Connection
              </button>
              <button
                onClick={saveLlmSettings}
                disabled={llmSaving}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {llmSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex gap-3 p-4">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Security Note</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                All credentials are encrypted using AES-256-GCM before storage. For production environments, 
                we recommend using environment variables or a secrets manager instead of storing credentials in the database.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
