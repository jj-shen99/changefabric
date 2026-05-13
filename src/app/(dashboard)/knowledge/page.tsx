"use client";

/**
 * Knowledge page - Documentation for workflows, change types, approval logic, and role permissions
 */

import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  FileText,
  GitBranch,
  Shield,
  Users,
  Zap,
  Lock,
  UserPlus,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { PageHeader } from "@/components/page-header";

export default function KnowledgePage() {
  return (
    <>
      <PageHeader 
        title="Knowledge Base" 
        subtitle="Documentation for workflows, change types, and role permissions"
      />
      <div className="space-y-6 p-4 md:p-6">

        {/* Change Request Workflow State Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-indigo-500" />
              Change Request Workflow
            </CardTitle>
            <CardDescription>Standard workflow state transitions from creation to closure</CardDescription>
          </CardHeader>
          <div className="px-4 pb-6 overflow-x-auto">
            {/* Workflow Flow Diagram */}
            <div className="min-w-[800px]">
              {/* Main Flow */}
              <div className="flex items-center justify-center gap-1">
                {/* Draft */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Draft</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">Editable</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Submitted */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Submitted</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">In-flight</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Awaiting Approval */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-28 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-300 text-center leading-tight">Awaiting<br/>Approval</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">In-flight</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Approved */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950 border-2 border-teal-300 dark:border-teal-700">
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-300">Approved</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">In-flight</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Scheduled */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 border-2 border-indigo-300 dark:border-indigo-700">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">Scheduled</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">In-flight</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* In Progress */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950 border-2 border-purple-300 dark:border-purple-700">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-300 text-center leading-tight">In<br/>Progress</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">No cancel</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Implemented */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950 border-2 border-cyan-300 dark:border-cyan-700">
                    <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">Implemented</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">No cancel</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                
                {/* Closed */}
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-600">
                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">Closed</span>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">Terminal</span>
                </div>
              </div>

              {/* Terminal States Row */}
              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-red-500 fill-red-500" />
                  <div className="flex h-10 w-24 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-700">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-300">Rejected</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-gray-400 fill-gray-400" />
                  <div className="flex h-10 w-24 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Canceled</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-3 w-3 text-rose-500 fill-rose-500" />
                  <div className="flex h-10 w-24 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950 border-2 border-rose-300 dark:border-rose-700">
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">Rolled Back</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Terminal</span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 text-center text-[10px] text-gray-400 dark:text-gray-500">
                Cancel is not available from In Progress state onwards. Rollback is available from In Progress and Implemented states.
              </div>
            </div>
          </div>
        </Card>

        {/* Change Types & Approval Logic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              Change Types & Approval Logic
            </CardTitle>
            <CardDescription>Different change types follow different approval workflows</CardDescription>
          </CardHeader>
          <div className="px-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Standard Change */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1.5">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300">Standard Change</h4>
                    <span className="text-[10px] text-blue-500">Normal workflow</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Full approval required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Scheduled implementation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Risk-based approval tiers</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    <strong>Flow:</strong> Draft → Submit → Approval → Schedule → Implement → Close
                  </p>
                </div>
              </div>

              {/* Emergency Change */}
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-1.5">
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-300">Emergency Change</h4>
                    <span className="text-[10px] text-orange-500">Fast-track workflow</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">Emergency approval (fast-track)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">Immediate implementation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-3 w-3 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">Retrospective approval required</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    <strong>Flow:</strong> Draft → Submit → Emergency Approval → Implement → Retro Approval → Close
                  </p>
                </div>
              </div>

              {/* Pre-approved Change */}
              <div className="rounded-lg border-2 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-300">Pre-approved Change</h4>
                    <span className="text-[10px] text-green-500">Low-risk template</span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">No approval gate needed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">Direct scheduling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">Low-risk only (auto-approved)</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    <strong>Flow:</strong> Draft → Schedule → Implement → Close
                  </p>
                </div>
              </div>
            </div>

            {/* Approval Tiers */}
            <div className="mt-6 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                Risk-Based Approval Tiers
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-800">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400">Critical (80-100)</div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-300">3 Approvers</div>
                  <div className="text-[10px] text-red-500">Tech Lead, Security, CAB</div>
                </div>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3 border border-orange-200 dark:border-orange-800">
                  <div className="text-xs font-bold text-orange-600 dark:text-orange-400">High (60-79)</div>
                  <div className="text-lg font-bold text-orange-700 dark:text-orange-300">2 Approvers</div>
                  <div className="text-[10px] text-orange-500">Tech Lead, Manager</div>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">Medium (40-59)</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300">1 Approver</div>
                  <div className="text-[10px] text-amber-500">Tech Lead</div>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 border border-green-200 dark:border-green-800">
                  <div className="text-xs font-bold text-green-600 dark:text-green-400">Low (0-39)</div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">Auto-Approve</div>
                  <div className="text-[10px] text-green-500">No manual approval</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Role Permissions
            </CardTitle>
            <CardDescription>Access control and capabilities for each role in the system</CardDescription>
          </CardHeader>
          <div className="px-4 pb-6">
            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Admin */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-1.5">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300">Administrator</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Full system access with all permissions enabled.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Manage users & roles</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Manage all changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Approve & implement changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Edit system settings</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>View all data & metrics</span>
                  </div>
                </div>
              </div>

              {/* Manager */}
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1.5">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">Manager</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Change management with approval and scheduling capabilities.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Manage roles</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Manage all changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Approve & implement changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>View all data & metrics</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot manage users</span>
                  </div>
                </div>
              </div>

              {/* Approver */}
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300">Approver</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Dedicated approval role for change request review.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Approve changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>View metrics</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot manage changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot implement changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Limited data access</span>
                  </div>
                </div>
              </div>

              {/* Implementer */}
              <div className="rounded-lg border-2 border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-teal-100 dark:bg-teal-900 p-1.5">
                    <Zap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h4 className="font-semibold text-teal-700 dark:text-teal-300">Implementer</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Technical role for executing approved changes.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Implement changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Complete implementation</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>View metrics</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot approve changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Limited data access</span>
                  </div>
                </div>
              </div>

              {/* Requester */}
              <div className="rounded-lg border-2 border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-1.5">
                    <UserPlus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">Requester</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Basic role for creating and managing own change requests.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Create change requests</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Edit own CRs (draft state)</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>View own metrics</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot approve changes</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <Lock className="h-3 w-3" />
                    <span>Cannot implement changes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                Permissions Matrix
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Permission</th>
                      <th className="px-3 py-2 text-center font-medium text-purple-600 dark:text-purple-400">Admin</th>
                      <th className="px-3 py-2 text-center font-medium text-blue-600 dark:text-blue-400">Manager</th>
                      <th className="px-3 py-2 text-center font-medium text-amber-600 dark:text-amber-400">Approver</th>
                      <th className="px-3 py-2 text-center font-medium text-teal-600 dark:text-teal-400">Implementer</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Requester</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Manage Users</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Manage Roles</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Manage Changes</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Approve Changes</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Implement Changes</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">Edit Settings</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">View All Data</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><Lock className="h-4 w-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">View Metrics</td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                      <td className="px-3 py-2 text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
