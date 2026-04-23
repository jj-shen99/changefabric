-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SavedAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "analysisType" TEXT NOT NULL,
    "changeRequestId" TEXT,
    "repoUrl" TEXT,
    "analysisDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" REAL,
    "planReadyScore" REAL,
    "mlScore" REAL,
    "codeRiskScore" REAL,
    "analysisData" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChangeRequest" (
    "number" TEXT NOT NULL PRIMARY KEY,
    "sys_id" TEXT NOT NULL,
    "short_description" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT '',
    "risk" TEXT NOT NULL DEFAULT '',
    "impact" TEXT NOT NULL DEFAULT '',
    "urgency" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT '',
    "approval" TEXT NOT NULL DEFAULT '',
    "assigned_to" TEXT NOT NULL DEFAULT '',
    "assignment_group" TEXT NOT NULL DEFAULT '',
    "opened_by" TEXT NOT NULL DEFAULT '',
    "opened_at" TEXT NOT NULL DEFAULT '',
    "closed_at" TEXT NOT NULL DEFAULT '',
    "closed_by" TEXT NOT NULL DEFAULT '',
    "close_code" TEXT NOT NULL DEFAULT '',
    "close_notes" TEXT NOT NULL DEFAULT '',
    "start_date" TEXT NOT NULL DEFAULT '',
    "end_date" TEXT NOT NULL DEFAULT '',
    "work_start" TEXT NOT NULL DEFAULT '',
    "work_end" TEXT NOT NULL DEFAULT '',
    "expected_start" TEXT NOT NULL DEFAULT '',
    "implementation_plan" TEXT NOT NULL DEFAULT '',
    "backout_plan" TEXT NOT NULL DEFAULT '',
    "test_plan" TEXT NOT NULL DEFAULT '',
    "change_plan" TEXT NOT NULL DEFAULT '',
    "risk_impact_analysis" TEXT NOT NULL DEFAULT '',
    "justification" TEXT NOT NULL DEFAULT '',
    "cmdb_ci" TEXT NOT NULL DEFAULT '',
    "business_service" TEXT NOT NULL DEFAULT '',
    "service_offering" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "contact_type" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "requested_by" TEXT NOT NULL DEFAULT '',
    "requested_by_date" TEXT NOT NULL DEFAULT '',
    "parent" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "route_reason" TEXT NOT NULL DEFAULT '',
    "conflict_status" TEXT NOT NULL DEFAULT '',
    "conflict_last_run" TEXT NOT NULL DEFAULT '',
    "cab_required" TEXT NOT NULL DEFAULT '',
    "cab_recommendation" TEXT NOT NULL DEFAULT '',
    "cab_delegate" TEXT NOT NULL DEFAULT '',
    "cab_date_time" TEXT NOT NULL DEFAULT '',
    "upon_approval" TEXT NOT NULL DEFAULT '',
    "upon_reject" TEXT NOT NULL DEFAULT '',
    "approval_set" TEXT NOT NULL DEFAULT '',
    "approval_history" TEXT NOT NULL DEFAULT '',
    "escalation" TEXT NOT NULL DEFAULT '',
    "made_sla" TEXT NOT NULL DEFAULT '',
    "sla_due" TEXT NOT NULL DEFAULT '',
    "due_date" TEXT NOT NULL DEFAULT '',
    "active" TEXT NOT NULL DEFAULT '',
    "phase" TEXT NOT NULL DEFAULT '',
    "phase_state" TEXT NOT NULL DEFAULT '',
    "knowledge" TEXT NOT NULL DEFAULT '',
    "order" TEXT NOT NULL DEFAULT '',
    "unauthorized" TEXT NOT NULL DEFAULT '',
    "on_hold" TEXT NOT NULL DEFAULT '',
    "on_hold_reason" TEXT NOT NULL DEFAULT '',
    "on_hold_task" TEXT NOT NULL DEFAULT '',
    "production_system" TEXT NOT NULL DEFAULT '',
    "outside_maintenance_schedule" TEXT NOT NULL DEFAULT '',
    "review_status" TEXT NOT NULL DEFAULT '',
    "review_date" TEXT NOT NULL DEFAULT '',
    "review_comments" TEXT NOT NULL DEFAULT '',
    "follow_up" TEXT NOT NULL DEFAULT '',
    "user_input" TEXT NOT NULL DEFAULT '',
    "watch_list" TEXT NOT NULL DEFAULT '',
    "group_list" TEXT NOT NULL DEFAULT '',
    "additional_assignee_list" TEXT NOT NULL DEFAULT '',
    "work_notes" TEXT NOT NULL DEFAULT '',
    "work_notes_list" TEXT NOT NULL DEFAULT '',
    "comments" TEXT NOT NULL DEFAULT '',
    "comments_and_work_notes" TEXT NOT NULL DEFAULT '',
    "correlation_id" TEXT NOT NULL DEFAULT '',
    "correlation_display" TEXT NOT NULL DEFAULT '',
    "copied_from" TEXT NOT NULL DEFAULT '',
    "delivery_plan" TEXT NOT NULL DEFAULT '',
    "delivery_task" TEXT NOT NULL DEFAULT '',
    "contract" TEXT NOT NULL DEFAULT '',
    "universal_request" TEXT NOT NULL DEFAULT '',
    "std_change_producer_version" TEXT NOT NULL DEFAULT '',
    "chg_model" TEXT NOT NULL DEFAULT '',
    "task_effective_number" TEXT NOT NULL DEFAULT '',
    "sys_class_name" TEXT NOT NULL DEFAULT '',
    "sys_created_by" TEXT NOT NULL DEFAULT '',
    "sys_created_on" TEXT NOT NULL DEFAULT '',
    "sys_updated_by" TEXT NOT NULL DEFAULT '',
    "sys_updated_on" TEXT NOT NULL DEFAULT '',
    "sys_domain" TEXT NOT NULL DEFAULT '',
    "sys_domain_path" TEXT NOT NULL DEFAULT '',
    "sys_mod_count" TEXT NOT NULL DEFAULT '',
    "sys_tags" TEXT NOT NULL DEFAULT '',
    "activity_due" TEXT NOT NULL DEFAULT '',
    "time_worked" TEXT NOT NULL DEFAULT '',
    "reassignment_count" TEXT NOT NULL DEFAULT '',
    "business_duration" TEXT NOT NULL DEFAULT '',
    "calendar_duration" TEXT NOT NULL DEFAULT '',
    "syncedBy" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_ChangeRequest" ("active", "activity_due", "additional_assignee_list", "approval", "approval_history", "approval_set", "assigned_to", "assignment_group", "backout_plan", "business_duration", "business_service", "cab_date_time", "cab_delegate", "cab_recommendation", "cab_required", "calendar_duration", "category", "change_plan", "chg_model", "close_code", "close_notes", "closed_at", "closed_by", "cmdb_ci", "comments", "comments_and_work_notes", "company", "conflict_last_run", "conflict_status", "contact_type", "contract", "copied_from", "correlation_display", "correlation_id", "delivery_plan", "delivery_task", "description", "due_date", "end_date", "escalation", "expected_start", "follow_up", "group_list", "impact", "implementation_plan", "justification", "knowledge", "location", "made_sla", "number", "on_hold", "on_hold_reason", "on_hold_task", "opened_at", "opened_by", "order", "outside_maintenance_schedule", "parent", "phase", "phase_state", "priority", "production_system", "reason", "reassignment_count", "requested_by", "requested_by_date", "review_comments", "review_date", "review_status", "risk", "risk_impact_analysis", "route_reason", "scope", "service_offering", "short_description", "sla_due", "start_date", "state", "std_change_producer_version", "sys_class_name", "sys_created_by", "sys_created_on", "sys_domain", "sys_domain_path", "sys_id", "sys_mod_count", "sys_tags", "sys_updated_by", "sys_updated_on", "task_effective_number", "test_plan", "time_worked", "type", "unauthorized", "universal_request", "upon_approval", "upon_reject", "urgency", "user_input", "watch_list", "work_end", "work_notes", "work_notes_list", "work_start") SELECT "active", "activity_due", "additional_assignee_list", "approval", "approval_history", "approval_set", "assigned_to", "assignment_group", "backout_plan", "business_duration", "business_service", "cab_date_time", "cab_delegate", "cab_recommendation", "cab_required", "calendar_duration", "category", "change_plan", "chg_model", "close_code", "close_notes", "closed_at", "closed_by", "cmdb_ci", "comments", "comments_and_work_notes", "company", "conflict_last_run", "conflict_status", "contact_type", "contract", "copied_from", "correlation_display", "correlation_id", "delivery_plan", "delivery_task", "description", "due_date", "end_date", "escalation", "expected_start", "follow_up", "group_list", "impact", "implementation_plan", "justification", "knowledge", "location", "made_sla", "number", "on_hold", "on_hold_reason", "on_hold_task", "opened_at", "opened_by", "order", "outside_maintenance_schedule", "parent", "phase", "phase_state", "priority", "production_system", "reason", "reassignment_count", "requested_by", "requested_by_date", "review_comments", "review_date", "review_status", "risk", "risk_impact_analysis", "route_reason", "scope", "service_offering", "short_description", "sla_due", "start_date", "state", "std_change_producer_version", "sys_class_name", "sys_created_by", "sys_created_on", "sys_domain", "sys_domain_path", "sys_id", "sys_mod_count", "sys_tags", "sys_updated_by", "sys_updated_on", "task_effective_number", "test_plan", "time_worked", "type", "unauthorized", "universal_request", "upon_approval", "upon_reject", "urgency", "user_input", "watch_list", "work_end", "work_notes", "work_notes_list", "work_start" FROM "ChangeRequest";
DROP TABLE "ChangeRequest";
ALTER TABLE "new_ChangeRequest" RENAME TO "ChangeRequest";
CREATE UNIQUE INDEX "ChangeRequest_sys_id_key" ON "ChangeRequest"("sys_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_userId_type_key_key" ON "IntegrationSetting"("userId", "type", "key");

-- CreateIndex
CREATE INDEX "SavedAnalysis_changeRequestId_idx" ON "SavedAnalysis"("changeRequestId");

-- CreateIndex
CREATE INDEX "SavedAnalysis_analysisType_idx" ON "SavedAnalysis"("analysisType");

-- CreateIndex
CREATE INDEX "SavedAnalysis_createdBy_idx" ON "SavedAnalysis"("createdBy");
