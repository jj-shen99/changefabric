import { NextResponse } from "next/server";
import { 
  getStatesForType, 
  getAvailableTransitionsForType,
  BUILTIN_WORKFLOWS,
} from "@/core/workflow/definitions";

/**
 * GET /api/v2/workflows/states?type=standard
 * Returns available states for a CR type
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crType = searchParams.get("type") || "standard";
  const currentState = searchParams.get("currentState");
  const role = searchParams.get("role") || "manager";

  const states = getStatesForType(crType);
  
  let transitions: { event: string; to: string; label: string }[] = [];
  if (currentState) {
    transitions = getAvailableTransitionsForType(crType, currentState, role);
  }

  // Get workflow info
  const workflows = BUILTIN_WORKFLOWS.map((w) => ({
    key: w.key,
    name: w.name,
    description: w.description,
  }));

  return NextResponse.json({
    type: crType,
    states,
    transitions,
    workflows,
  });
}
