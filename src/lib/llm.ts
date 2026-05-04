/**
 * LLM-Powered Quality Analysis
 * ─────────────────────────────────────────────────────────────
 * Provides LLM-backed enrichment of plan analysis:
 *   • Summarizes plan content
 *   • Detects ambiguity / hallucinations / under-specification
 *   • Generates natural-language reviewer feedback
 *
 * Supports multiple providers (OpenAI, Anthropic, Ollama) so the
 * application works on-prem with local models OR with hosted APIs.
 *
 * Set LLM_PROVIDER=disabled (default) to keep the system fully
 * deterministic and avoid network calls.
 */

export type LLMProvider = "openai" | "anthropic" | "ollama" | "disabled";

export interface LLMQualityRequest {
  /** The change-request short description / title. */
  title: string;
  /** Combined plan text (implementation + backout + test). */
  planText: string;
  /** Optional risk tier from upstream classification. */
  riskTier?: "critical" | "high" | "medium" | "low";
}

export interface LLMQualityResult {
  /** True when an actual LLM call succeeded (vs heuristic fallback). */
  llmUsed: boolean;
  /** Provider that produced the result, or "heuristic" when fallback. */
  provider: LLMProvider | "heuristic";
  /** One-sentence executive summary of the plan. */
  summary: string;
  /** Free-form reviewer-style feedback (markdown allowed). */
  reviewerFeedback: string;
  /** 0..100 — LLM-assessed quality. */
  qualityScore: number;
  /** Flagged issues (clarity, ambiguity, missing info). */
  issues: string[];
  /** Concrete improvement suggestions. */
  suggestions: string[];
}

/* ── Provider selection ─────────────────────────────────────── */

export function getLLMProvider(): LLMProvider {
  const p = (process.env.LLM_PROVIDER || "disabled").toLowerCase();
  if (p === "openai" || p === "anthropic" || p === "ollama") return p;
  return "disabled";
}

export function isLLMEnabled(): boolean {
  return getLLMProvider() !== "disabled";
}

/* ── Prompt construction ────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a senior release-management reviewer for enterprise change requests.
You evaluate implementation plans for clarity, completeness, and risk awareness.
Always respond with valid JSON matching the requested schema. Be terse and technical.`;

function buildUserPrompt(req: LLMQualityRequest): string {
  return `Review this change-request plan and respond as JSON with keys:
{
  "summary": string (one sentence),
  "qualityScore": number (0-100),
  "issues": string[] (problems found, max 6),
  "suggestions": string[] (concrete improvements, max 6),
  "reviewerFeedback": string (2-4 sentences, markdown allowed)
}

Title: ${req.title || "(none)"}
Risk Tier: ${req.riskTier || "unknown"}

Plan content:
"""
${(req.planText || "(empty plan)").slice(0, 6000)}
"""`;
}

/* ── Provider implementations ───────────────────────────────── */

interface RawLLMOutput {
  summary?: string;
  qualityScore?: number;
  issues?: string[];
  suggestions?: string[];
  reviewerFeedback?: string;
}

async function callOpenAI(req: LLMQualityRequest): Promise<RawLLMOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req) },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

async function callAnthropic(req: LLMQualityRequest): Promise<RawLLMOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(req) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const json = await res.json();
  const text = json?.content?.[0]?.text || "{}";
  // Claude may wrap JSON in prose — extract the JSON object.
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : "{}");
}

async function callOllama(req: LLMQualityRequest): Promise<RawLLMOutput> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const json = await res.json();
  const content = json?.message?.content || "{}";
  return JSON.parse(content);
}

/* ── Heuristic fallback ─────────────────────────────────────── */

export function heuristicQuality(req: LLMQualityRequest): LLMQualityResult {
  const text = (req.planText || "").trim();
  const wc = text ? text.split(/\s+/).length : 0;
  const hasSteps = /\d+[.)]\s/.test(text) || /(^|\n)\s*[-•*]\s/.test(text);
  const hasRollback = /rollback|revert|backout/i.test(text);
  const hasVerify = /verify|validate|check/i.test(text);

  let score = 30;
  if (wc > 50) score += 15;
  if (wc > 200) score += 15;
  if (hasSteps) score += 15;
  if (hasRollback) score += 15;
  if (hasVerify) score += 10;
  score = Math.max(0, Math.min(100, score));

  const issues: string[] = [];
  const suggestions: string[] = [];
  if (wc < 30) {
    issues.push("Plan is very brief and may lack actionable detail.");
    suggestions.push("Expand the plan to at least 100 words with explicit steps.");
  }
  if (!hasSteps) {
    issues.push("No numbered or bulleted steps detected.");
    suggestions.push("Use numbered steps (1., 2., 3.) so the implementer can follow precisely.");
  }
  if (!hasRollback) {
    issues.push("No rollback or backout reference.");
    suggestions.push("Reference the backout procedure inline so it is visible during execution.");
  }
  if (!hasVerify) {
    issues.push("No verification / validation steps.");
    suggestions.push("Add post-change validation steps (smoke tests, log review, dashboard checks).");
  }

  const summary = wc === 0
    ? "No plan content provided."
    : `${wc}-word plan${hasSteps ? " with structured steps" : ""}${hasRollback ? "; rollback referenced" : ""}.`;

  const reviewerFeedback = issues.length === 0
    ? "Plan demonstrates good structure and risk awareness. Proceed with normal review."
    : `Plan has ${issues.length} gap(s): ${issues.slice(0, 3).join("; ")}. Address before approval.`;

  return {
    llmUsed: false,
    provider: "heuristic",
    summary,
    reviewerFeedback,
    qualityScore: score,
    issues,
    suggestions,
  };
}

/* ── Public entry point ─────────────────────────────────────── */

/**
 * Analyze plan quality with the configured LLM provider, falling
 * back to deterministic heuristics if the call fails or LLM is
 * disabled. Always returns a result — never throws.
 */
export async function analyzeQualityWithLLM(req: LLMQualityRequest): Promise<LLMQualityResult> {
  const provider = getLLMProvider();
  if (provider === "disabled") return heuristicQuality(req);

  try {
    let raw: RawLLMOutput;
    if (provider === "openai") raw = await callOpenAI(req);
    else if (provider === "anthropic") raw = await callAnthropic(req);
    else raw = await callOllama(req);

    const score = typeof raw.qualityScore === "number"
      ? Math.max(0, Math.min(100, Math.round(raw.qualityScore)))
      : heuristicQuality(req).qualityScore;

    return {
      llmUsed: true,
      provider,
      summary: raw.summary?.toString().slice(0, 500) || heuristicQuality(req).summary,
      reviewerFeedback: raw.reviewerFeedback?.toString().slice(0, 2000)
        || "(LLM did not return reviewer feedback.)",
      qualityScore: score,
      issues: Array.isArray(raw.issues) ? raw.issues.slice(0, 10).map(String) : [],
      suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.slice(0, 10).map(String) : [],
    };
  } catch (err) {
    // Network / parsing / auth error → degrade gracefully.
    const fb = heuristicQuality(req);
    return {
      ...fb,
      reviewerFeedback: `${fb.reviewerFeedback}\n\n(Note: LLM provider "${provider}" failed: ${(err as Error).message}. Result is heuristic.)`,
    };
  }
}
