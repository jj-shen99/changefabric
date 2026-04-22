"use client";

import { useState, useEffect } from "react";
import { Database, GitBranch, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Shield, Key } from "lucide-react";
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
  const [gitUser, setGitUser] = useState("");
  const [gitPassword, setGitPassword] = useState("");
  const [showGitPassword, setShowGitPassword] = useState(false);
  const [gitStatus, setGitStatus] = useState<ConnectionStatus | null>(null);
  const [gitTesting, setGitTesting] = useState(false);
  const [gitSaving, setGitSaving] = useState(false);

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
            setGitUser(data.git.user || "");
            if (data.git.hasPassword) setGitPassword("••••••••");
          }
        }
      } catch {
        // Ignore load errors
      }
    }
    loadSettings();
  }, []);

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
