/**
 * ServiceNow change_request sync logic.
 * Shared by the CLI import script and the /api/sync route.
 */

import { PrismaClient } from "@prisma/client";
import { getSecret } from "@/lib/crypto";

/* ─── Configuration ─── */
const PAGE_SIZE = 100;
// ServiceNow credentials must be set via environment variables
function snowInstance() { return getSecret("SNOW_INSTANCE"); }
function snowUser() { return getSecret("SNOW_USER"); }
function snowPassword() { return getSecret("SNOW_PASSWORD"); }

/** Extract display_value from a ServiceNow reference field (string | { display_value, link } | null) */
function displayVal(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "display_value" in field) {
    return (field as { display_value: string }).display_value || "";
  }
  return "";
}

/* ─── Fetch from ServiceNow ─── */

export interface SyncOptions {
  days?: number;
  instance?: string;
  user?: string;
  password?: string;
  syncedBy?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchChangeRequests(options?: SyncOptions): Promise<Record<string, any>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: Record<string, any>[] = [];
  let offset = 0;

  // Use provided credentials or fall back to defaults
  const instance = options?.instance || snowInstance();
  const user = options?.user || snowUser();
  const password = options?.password || snowPassword();

  // Build date filter if days specified
  let dateFilter = "";
  if (options?.days) {
    const since = new Date();
    since.setDate(since.getDate() - options.days);
    const isoDate = since.toISOString().split("T")[0];
    dateFilter = `&sysparm_query=sys_created_on>=${isoDate}`;
  }

  while (true) {
    const url =
      `${instance}/api/now/table/change_request` +
      `?sysparm_display_value=true` +
      `&sysparm_limit=${PAGE_SIZE}` +
      `&sysparm_offset=${offset}` +
      `&sysparm_orderby=number` +
      dateFilter;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization":
          "Basic " +
          Buffer.from(`${user}:${password}`).toString("base64"),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      // Check if we got HTML back (login page redirect)
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error(`ServiceNow returned HTML instead of JSON. The instance may require SSO authentication or the REST API may not be enabled.`);
      }
      throw new Error(`ServiceNow API ${res.status}: ${text.slice(0, 200)}`);
    }

    // Check content type to ensure we got JSON
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error(`ServiceNow returned HTML instead of JSON. The instance may require SSO authentication or the REST API may not be enabled.`);
      }
      throw new Error(`ServiceNow returned unexpected content type: ${contentType}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await res.json()) as { result: Record<string, any>[] };
    if (!body.result || body.result.length === 0) break;

    all.push(...body.result);
    if (body.result.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/* ─── All change_request column names we persist ─── */
const COLUMNS = [
  "number", "sys_id", "short_description", "description", "category", "state",
  "type", "priority", "risk", "impact", "urgency", "scope", "approval",
  "assigned_to", "assignment_group", "opened_by", "opened_at", "closed_at",
  "closed_by", "close_code", "close_notes", "start_date", "end_date",
  "work_start", "work_end", "expected_start", "implementation_plan",
  "backout_plan", "test_plan", "change_plan", "risk_impact_analysis",
  "justification", "cmdb_ci", "business_service", "service_offering",
  "company", "contact_type", "location", "requested_by", "requested_by_date",
  "parent", "reason", "route_reason", "conflict_status", "conflict_last_run",
  "cab_required", "cab_recommendation", "cab_delegate", "cab_date_time",
  "upon_approval", "upon_reject", "approval_set", "approval_history",
  "escalation", "made_sla", "sla_due", "due_date", "active", "phase",
  "phase_state", "knowledge", "order", "unauthorized", "on_hold",
  "on_hold_reason", "on_hold_task", "production_system",
  "outside_maintenance_schedule", "review_status", "review_date",
  "review_comments", "follow_up", "user_input", "watch_list", "group_list",
  "additional_assignee_list", "work_notes", "work_notes_list", "comments",
  "comments_and_work_notes", "correlation_id", "correlation_display",
  "copied_from", "delivery_plan", "delivery_task", "contract",
  "universal_request", "std_change_producer_version", "chg_model",
  "task_effective_number", "sys_class_name", "sys_created_by", "sys_created_on",
  "sys_updated_by", "sys_updated_on", "sys_domain", "sys_domain_path",
  "sys_mod_count", "sys_tags", "activity_due", "time_worked",
  "reassignment_count", "business_duration", "calendar_duration",
] as const;

/** Convert a raw SN record to a flat { column: string } object ready for Prisma. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRow(rec: Record<string, any>): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of COLUMNS) {
    const raw = rec[col];
    row[col] = displayVal(raw) ?? "";
  }
  return row;
}

/* ─── Upsert into DB ─── */

export interface SyncResult {
  fetched: number;
  upserted: number;
  errors: number;
  errorDetails: string[];
}

export async function syncChangeRequests(
  prisma: PrismaClient,
  options?: SyncOptions,
): Promise<SyncResult> {
  const records = await fetchChangeRequests(options);
  const syncedBy = options?.syncedBy || "";

  const result: SyncResult = {
    fetched: records.length,
    upserted: 0,
    errors: 0,
    errorDetails: [],
  };

  for (const rec of records) {
    try {
      const row = toRow(rec);
      const num = row.number;

      // Map ServiceNow's flat row → the new generic ChangeRequest schema.
      // ServiceNow's `risk` ("low"/"moderate"/"high"/"very high") maps
      // directly; impact/priority are kept as their numeric character.
      const riskLevel = (row.risk || "moderate").toLowerCase().includes("very high")
        ? "very_high"
        : row.risk?.toLowerCase().includes("high")
          ? "high"
          : row.risk?.toLowerCase().includes("low")
            ? "low"
            : "moderate";

      const generic = {
        number: num,
        externalId: row.sys_id || null,
        externalSource: "servicenow",
        workflowKey: "standard",
        title: row.short_description || `Imported from ServiceNow (${num})`,
        description: row.description || "",
        type: (row.type || "standard").toLowerCase(),
        category: row.category || "other",
        priority: (row.priority || "3").toString(),
        riskLevel,
        impactLevel: (row.impact || "3").toString().match(/[1-3]/)?.[0] || "3",
        urgency: (row.urgency || "3").toString().match(/[1-3]/)?.[0] || "3",
        state: row.state || "draft",
        approvalState: row.approval || "not_requested",
        justification: row.justification || "",
        implementationPlan: row.implementation_plan || "",
        backoutPlan: row.backout_plan || "",
        testPlan: row.test_plan || "",
        riskAndImpactAnalysis: row.risk_impact_analysis || "",
        closeCode: row.close_code || "",
        closeNotes: row.close_notes || "",
        plannedStart: row.start_date ? new Date(row.start_date) : null,
        plannedEnd: row.end_date ? new Date(row.end_date) : null,
        requestedBy: row.requested_by || syncedBy || "import@example.com",
        assignedTo: row.assigned_to || null,
        assignmentGroup: row.assignment_group || null,
        configurationItem: row.cmdb_ci || null,
        businessService: row.business_service || null,
        affectedServices: JSON.stringify([]),
        tags: JSON.stringify([]),
        createdBy: syncedBy || row.opened_by || "servicenow",
      };

      await prisma.changeRequest.upsert({
        where: { number: num },
        update: generic,
        create: generic,
      });
      result.upserted++;
    } catch (err) {
      result.errors++;
      const msg = `${rec.number}: ${err instanceof Error ? err.message : String(err)}`;
      result.errorDetails.push(msg);
    }
  }

  return result;
}
