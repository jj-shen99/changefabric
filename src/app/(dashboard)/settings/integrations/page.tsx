"use client";

import { useState, useEffect } from "react";
import { Database, GitBranch, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Shield, Key, Bot, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

interface ConnectionStatus {
  connected: boolean;
  message: string;
  lastChecked?: string;
}

export default function IntegrationsPage() {
  // ServiceNow state
  const [snowInstance, setSnowInstance] = useState("");
  const [snowUser, setSnowUser] = useState("");
  const [snowPassword, setSnowPassword] = useState("");
  const [showSnowPassword, setShowSnowPassword] = useState(false);
  const [snowStatus, setSnowStatus] = useState<ConnectionStatus | null>(null);
  const [snowTesting, setSnowTesting] = useState(false);
  const [snowSaving, setSnowSaving] = useState(false);

  // Git state
  const [gitRepo, setGitRepo] = useState("");
  const [gitUser, setGitUser] = useState("");
  const [gitPassword, setGitPassword] = useState("");
  const [showGitPassword, setShowGitPassword] = useState(false);
  const [gitStatus, setGitStatus] = useState<ConnectionStatus | null>(null);
  const [gitTesting, setGitTesting] = useState(false);
  const [gitSaving, setGitSaving] = useState(false);

  // LLM state
  const [llmProvider, setLlmProvider] = useState<"disabled" | "openai" | "anthropic" | "ollama">("disabled");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-3-5-sonnet-20241022");
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
        const res = await fetch("/api/settings/integrations");
        if (res.ok) {
          const data = await res.json();
          if (data.snow) {
            setSnowInstance(data.snow.instance || "");
            setSnowUser(data.snow.user || "");
            // Password is masked on load
            if (data.snow.hasPassword) setSnowPassword("••••••••");
          }
          if (data.git) {
            setGitRepo(data.git.instance || "");
            setGitUser(data.git.user || "");
            if (data.git.hasPassword) setGitPassword("••••••••");
          }
          if (data.llm) {
            setLlmProvider(data.llm.provider || "disabled");
            setOpenaiModel(data.llm.openaiModel || "gpt-4o-mini");
            setAnthropicModel(data.llm.anthropicModel || "claude-3-5-sonnet-20241022");
            setOllamaUrl(data.llm.ollamaUrl || "http://localhost:11434");
            setOllamaModel(data.llm.ollamaModel || "llama3.2");
            if (data.llm.hasOpenaiKey) setOpenaiKey("••••••••");
            if (data.llm.hasAnthropicKey) setAnthropicKey("••••••••");
          }
        }
      } catch {
        // Ignore load errors
      }
    }
    loadSettings();
  }, []);

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

  // Test ServiceNow connection
  async function testSnowConnection() {
    setSnowTesting(true);
    setSnowStatus(null);
    try {
      const res = await fetch("/api/settings/integrations/test-snow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance: snowInstance, user: snowUser, password: snowPassword }),
      });
      const data = await res.json();
      setSnowStatus({
        connected: data.success,
        message: data.message || (data.success ? "Connected successfully" : "Connection failed"),
        lastChecked: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setSnowStatus({
        connected: false,
        message: err instanceof Error ? err.message : "Connection test failed",
        lastChecked: new Date().toLocaleTimeString(),
      });
    } finally {
      setSnowTesting(false);
    }
  }

  // Save ServiceNow settings
  async function saveSnowSettings() {
    setSnowSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "snow",
          instance: snowInstance,
          user: snowUser,
          password: snowPassword === "••••••••" ? undefined : snowPassword,
        }),
      });
      if (res.ok) {
        setSnowStatus({ connected: true, message: "Settings saved successfully", lastChecked: new Date().toLocaleTimeString() });
      } else {
        const data = await res.json();
        setSnowStatus({ connected: false, message: data.error || "Failed to save settings" });
      }
    } catch (err) {
      setSnowStatus({ connected: false, message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSnowSaving(false);
    }
  }

  // Test Git connection
  async function testGitConnection() {
    setGitTesting(true);
    setGitStatus(null);
    try {
      const res = await fetch("/api/settings/integrations/test-git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: gitUser, password: gitPassword }),
      });
      const data = await res.json();
      setGitStatus({
        connected: data.success,
        message: data.message || (data.success ? "Connected successfully" : "Connection failed"),
        lastChecked: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      setGitStatus({
        connected: false,
        message: err instanceof Error ? err.message : "Connection test failed",
        lastChecked: new Date().toLocaleTimeString(),
      });
    } finally {
      setGitTesting(false);
    }
  }

  // Save Git settings
  async function saveGitSettings() {
    setGitSaving(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "git",
          instance: gitRepo,
          user: gitUser,
          password: gitPassword === "••••••••" ? undefined : gitPassword,
        }),
      });
      if (res.ok) {
        setGitStatus({ connected: true, message: "Settings saved successfully", lastChecked: new Date().toLocaleTimeString() });
      } else {
        const data = await res.json();
        setGitStatus({ connected: false, message: data.error || "Failed to save settings" });
      }
    } catch (err) {
      setGitStatus({ connected: false, message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setGitSaving(false);
    }
  }


  return (
    <>
      <PageHeader title="Integrations" subtitle="Configure connections to ServiceNow and Git repositories for data synchronization" />
      <div className="space-y-6 p-4 md:p-6">

        {/* ServiceNow Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-teal-600" />
              ServiceNow Instance
            </CardTitle>
            <CardDescription>Connect to a ServiceNow instance to sync change requests and related data</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {/* Instance URL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Instance URL</label>
              <input
                type="url"
                value={snowInstance}
                onChange={(e) => setSnowInstance(e.target.value)}
                placeholder="https://your-instance.service-now.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">The full URL of your ServiceNow instance (e.g., https://dev12345.service-now.com)</p>
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={snowUser}
                  onChange={(e) => setSnowUser(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showSnowPassword ? "text" : "password"}
                  value={snowPassword}
                  onChange={(e) => setSnowPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-12 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowSnowPassword(!showSnowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSnowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Credentials are encrypted before storage</p>
            </div>

            {/* Status */}
            {snowStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${snowStatus.connected ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                {snowStatus.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span>{snowStatus.message}</span>
                {snowStatus.lastChecked && <span className="ml-auto text-xs opacity-70">Checked: {snowStatus.lastChecked}</span>}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={testSnowConnection}
                disabled={snowTesting || !snowInstance || !snowUser}
                className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900"
              >
                {snowTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test Connection
              </button>
              <button
                onClick={saveSnowSettings}
                disabled={snowSaving || !snowInstance || !snowUser}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {snowSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </Card>

        {/* Git Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              Git Repository Authentication
            </CardTitle>
            <CardDescription>Configure credentials for accessing private Git repositories (GitHub Enterprise, Gitea, etc.)</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {/* Repository URL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Repository URL</label>
              <input
                type="url"
                value={gitRepo}
                onChange={(e) => setGitRepo(e.target.value)}
                placeholder="https://code.devsnc.com/dev/your-repo"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">The Git repository URL (e.g., GitHub Enterprise, Gitea, etc.)</p>
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={gitUser}
                  onChange={(e) => setGitUser(e.target.value)}
                  placeholder="your-username"
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Your Git username or email address</p>
            </div>

            {/* Password / Token */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password / Personal Access Token</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showGitPassword ? "text" : "password"}
                  value={gitPassword}
                  onChange={(e) => setGitPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-12 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowGitPassword(!showGitPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showGitPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">For GitHub Enterprise, use a Personal Access Token with repo scope. Credentials are encrypted before storage.</p>
            </div>

            {/* Status */}
            {gitStatus && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${gitStatus.connected ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                {gitStatus.connected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <span>{gitStatus.message}</span>
                {gitStatus.lastChecked && <span className="ml-auto text-xs opacity-70">Checked: {gitStatus.lastChecked}</span>}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={testGitConnection}
                disabled={gitTesting || !gitUser}
                className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
              >
                {gitTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test Connection
              </button>
              <button
                onClick={saveGitSettings}
                disabled={gitSaving || !gitUser}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {gitSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Settings
              </button>
            </div>
          </div>
        </Card>

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
                <option value="openai">OpenAI (GPT-4, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5)</option>
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
                    <option value="gpt-4o-mini">GPT-4o Mini (fast, cost-effective)</option>
                    <option value="gpt-4o">GPT-4o (most capable)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (legacy)</option>
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
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (recommended)</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus (most capable)</option>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku (fast)</option>
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
