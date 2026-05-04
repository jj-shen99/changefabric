# AI & ML Integration Guide

This document describes the LLM-powered quality analysis and predictive risk model that ship with the Change & Release Dashboard.

## Overview

The platform uses **two complementary AI techniques**:

| Technique | Module | Purpose | Always-on |
|---|---|---|---|
| **Predictive Risk Model (ML)** | `src/lib/ml-risk.ts` | Estimates failure probability for a change request before deployment | ✅ Yes (zero deps) |
| **LLM-Powered Quality Analysis** | `src/lib/llm.ts` | Generates natural-language reviewer feedback on the implementation plan | ⚙️ Opt-in |

Both surfaces are exposed at `POST /api/data/risk-predict`.

---

## 1. Predictive Risk Model (ML)

### Architecture

A **logistic-regression classifier** is computed in-process — no Python, no GPU, no external service. Every coefficient lives in `WEIGHTS` inside `src/lib/ml-risk.ts` so the model is fully auditable.

```
P(failure) = sigmoid( intercept + Σ wᵢ · xᵢ )
```

### Features

| Feature | Type | Source |
|---|---|---|
| `type_emergency`, `type_standard` | one-hot | `cr.type` |
| `priority_severity`, `urgency_severity`, `impact_severity`, `risk_severity` | 0–1 | ServiceNow priority/urgency/impact/risk fields |
| `scope_size` | 0–1 | `cr.scope` |
| `has_impl_plan`, `has_backout_plan`, `has_test_plan`, `has_risk_analysis` | binary | text length ≥ 20 chars |
| `plan_length_score` | log-saturated | combined plan field length |
| `cat_database`, `cat_network`, `cat_security`, `cat_infra` | binary | regex on description + category |

### Output

```ts
{
  riskScore: 73,                  // 0..100 — probability of failure
  riskTier: "high",               // low | medium | high | critical
  successProbability: 0.27,
  contributions: [                // per-feature explainability
    { feature: "Emergency change type", weight: 1.4, value: 1, contribution: 1.4 },
    { feature: "Backout plan present",  weight: -1.1, value: 1, contribution: -1.1 },
    ...
  ],
  topRiskFactors: ["Emergency change type (+1.40)", "Risk classification (+1.20)"],
  topMitigators:  ["Backout plan present (-1.10)", "Test plan present (-0.70)"],
  recommendation: "additional-controls",
  confidence: 0.89,               // 0..1 — based on input completeness
  modelVersion: "v1.0.0"
}
```

### Recommendation Tiers

| Score | Tier | Recommendation |
|---|---|---|
| 0–24 | low | `approve` |
| 25–54 | medium | `review-recommended` |
| 55–74 | high | `additional-controls` |
| 75–100 | critical | `block-pending-review` |

### Calibration

```bash
npx tsx scripts/train-risk-model.ts
```

The script loads all closed CRs, labels them success/failure based on `close_code` and `state`, computes a **Brier score** (lower = better calibration; 0.25 is baseline coin-flip), and prints per-bucket actual failure rates. Use the output to manually tune `WEIGHTS` if your domain drifts.

### Why not TensorFlow / scikit-learn?

- **Deterministic**: Same input → same output, every time. Auditable.
- **Zero deps**: Runs in Edge runtime, in tests, in serverless cold starts.
- **Explainable**: Every coefficient is visible; no "black box".
- **Sufficient**: Logistic regression with good features outperforms a poorly-trained deep model on tabular data of this size.

For heavy-duty modeling, **export the dataset** (Prisma → CSV) and train offline with scikit-learn / XGBoost; transcribe the resulting weights back into `WEIGHTS`.

---

## 2. LLM-Powered Quality Analysis

### Providers

Set `LLM_PROVIDER` to one of:

| Provider | Cost | Network | Notes |
|---|---|---|---|
| `disabled` (default) | free | none | Heuristic-only; deterministic |
| `openai` | paid | api.openai.com | Best quality; uses `response_format=json_object` |
| `anthropic` | paid | api.anthropic.com | Claude; robust JSON extraction even from prose |
| `ollama` | free | localhost | Self-hosted; no API key; great for on-prem / air-gapped |

### Output Schema

```ts
{
  llmUsed: true,
  provider: "openai",
  summary: "Solid plan with structured steps and rollback path.",
  reviewerFeedback: "Plan is well-organized but lacks explicit log-review steps...",
  qualityScore: 78,           // 0..100
  issues: ["No log review steps", "Missing escalation contact"],
  suggestions: ["Add post-deploy log scan", "Document on-call paging procedure"]
}
```

### Robustness

The function **never throws**. If anything fails — disabled, missing key, network error, malformed JSON — it transparently degrades to the heuristic engine and the response includes a `(Note: LLM provider … failed)` annotation. This means:

- Tests don't need network mocks unless you opt-in.
- Production traffic is never blocked by a flaky LLM endpoint.
- Cost ceiling is bounded; one failure does not retry.

### Privacy / Data Handling

The LLM call sends **only** the plan text (truncated to 6000 chars) and a generic system prompt. No CR numbers, customer data, or credentials. To audit, see `buildUserPrompt()` in `src/lib/llm.ts`.

For air-gapped deployments, use **Ollama** with a local model (`llama3.2`, `qwen2.5`, etc.) so no data leaves your network.

---

## API: `POST /api/data/risk-predict`

```bash
curl -X POST http://localhost:3600/api/data/risk-predict \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"number":"CHG0030001","includeLLM":true}'
```

Response:

```json
{
  "number": "CHG0030001",
  "mlRisk": { ... },
  "llmQuality": { ... },
  "modelVersion": "v1.0.0",
  "llmEnabled": true
}
```

`includeLLM` is optional. Without it, only the (cheap, instant) ML prediction is returned.

---

## Testing

- `src/lib/__tests__/ml-risk.test.ts` — 22 tests covering shape, tiers, recommendations, confidence, explainability, determinism, batch helper.
- `src/lib/__tests__/llm.test.ts` — 18 tests covering provider selection, heuristic fallback, OpenAI/Anthropic/Ollama parsing, error fallback, malformed-JSON robustness, score clamping.
- `src/lib/__tests__/database-config.test.ts` — 5 tests covering provider auto-detection.

Run:

```bash
npm test
```

---

## Future Work

- Train coefficients offline with scikit-learn against full historical dataset; commit the `WEIGHTS` block.
- Embed-based plan-similarity search ("show me past CRs that look like this one and how they went").
- Streaming LLM responses for sub-second perceived latency on large plans.
- Multi-model ensemble: run LLM + ML and surface disagreements.
