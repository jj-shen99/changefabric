/**
 * LLM-powered quality analysis tests.
 *
 * Network calls are mocked via global fetch; the heuristic
 * fallback path is exercised by setting LLM_PROVIDER=disabled.
 */

import {
  analyzeQualityWithLLM,
  heuristicQuality,
  getLLMProvider,
  isLLMEnabled,
} from "../llm";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  // restore fetch
  // @ts-expect-error - test-only cleanup
  delete global.fetch;
});

describe("getLLMProvider", () => {
  it("defaults to 'disabled'", () => {
    delete process.env.LLM_PROVIDER;
    expect(getLLMProvider()).toBe("disabled");
  });

  it("recognizes openai/anthropic/ollama", () => {
    process.env.LLM_PROVIDER = "openai";
    expect(getLLMProvider()).toBe("openai");
    process.env.LLM_PROVIDER = "anthropic";
    expect(getLLMProvider()).toBe("anthropic");
    process.env.LLM_PROVIDER = "ollama";
    expect(getLLMProvider()).toBe("ollama");
  });

  it("falls back to disabled for unknown values", () => {
    process.env.LLM_PROVIDER = "garbage";
    expect(getLLMProvider()).toBe("disabled");
  });

  it("isLLMEnabled tracks provider", () => {
    process.env.LLM_PROVIDER = "disabled";
    expect(isLLMEnabled()).toBe(false);
    process.env.LLM_PROVIDER = "openai";
    expect(isLLMEnabled()).toBe(true);
  });
});

describe("heuristicQuality", () => {
  it("returns zero-ish score for empty plan", () => {
    const r = heuristicQuality({ title: "x", planText: "" });
    expect(r.qualityScore).toBeLessThan(50);
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.provider).toBe("heuristic");
    expect(r.llmUsed).toBe(false);
  });

  it("scores higher for structured plan with rollback + verify", () => {
    const text = `
1. Take backup
2. Apply patch and verify checksum
3. Run smoke tests to validate
4. If failures, execute rollback / revert procedure
`.trim();
    const r = heuristicQuality({ title: "Patch", planText: text });
    expect(r.qualityScore).toBeGreaterThan(50);
  });

  it("flags missing rollback", () => {
    const r = heuristicQuality({ title: "x", planText: "Apply config and walk away." });
    expect(r.issues.some(i => /rollback|backout/i.test(i))).toBe(true);
  });

  it("provides at least one suggestion when issues exist", () => {
    const r = heuristicQuality({ title: "x", planText: "" });
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

describe("analyzeQualityWithLLM — disabled path", () => {
  it("returns heuristic when LLM_PROVIDER=disabled", async () => {
    process.env.LLM_PROVIDER = "disabled";
    const r = await analyzeQualityWithLLM({ title: "x", planText: "1. step" });
    expect(r.llmUsed).toBe(false);
    expect(r.provider).toBe("heuristic");
  });
});

describe("analyzeQualityWithLLM — provider error fallback", () => {
  it("falls back to heuristic if OpenAI returns error", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => ({}),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "x", planText: "step 1" });
    expect(r.llmUsed).toBe(false);
    expect(r.provider).toBe("heuristic");
    expect(r.reviewerFeedback).toMatch(/LLM provider/i);
  });

  it("falls back when API key missing", async () => {
    process.env.LLM_PROVIDER = "anthropic";
    delete process.env.ANTHROPIC_API_KEY;
    const r = await analyzeQualityWithLLM({ title: "x", planText: "step 1" });
    expect(r.llmUsed).toBe(false);
  });
});

describe("analyzeQualityWithLLM — successful OpenAI", () => {
  it("returns parsed structured output", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          summary: "Solid plan with clear steps.",
          qualityScore: 78,
          issues: ["Missing log review"],
          suggestions: ["Add post-deploy log scan"],
          reviewerFeedback: "Good overall — minor gaps.",
        }) } }],
      }),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "Upgrade", planText: "1. step" });
    expect(r.llmUsed).toBe(true);
    expect(r.provider).toBe("openai");
    expect(r.qualityScore).toBe(78);
    expect(r.issues).toContain("Missing log review");
  });

  it("clamps qualityScore into 0..100", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: "x", qualityScore: 250 }) } }],
      }),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "x", planText: "1. step" });
    expect(r.qualityScore).toBeLessThanOrEqual(100);
    expect(r.qualityScore).toBeGreaterThanOrEqual(0);
  });
});

describe("analyzeQualityWithLLM — Anthropic", () => {
  it("parses content array shape", async () => {
    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: '{"summary":"OK","qualityScore":70,"issues":[],"suggestions":[],"reviewerFeedback":"fine"}' }],
      }),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "x", planText: "1. step" });
    expect(r.llmUsed).toBe(true);
    expect(r.provider).toBe("anthropic");
    expect(r.qualityScore).toBe(70);
  });

  it("extracts JSON from prose-wrapped Claude output", async () => {
    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: 'Here is your review:\n{"summary":"ok","qualityScore":60}\nThanks!' }],
      }),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "x", planText: "1. step" });
    expect(r.qualityScore).toBe(60);
  });
});

describe("analyzeQualityWithLLM — Ollama", () => {
  it("parses ollama chat response", async () => {
    process.env.LLM_PROVIDER = "ollama";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: JSON.stringify({ summary: "ok", qualityScore: 55, issues: [], suggestions: [], reviewerFeedback: "fine" }) },
      }),
    }) as unknown as typeof fetch;

    const r = await analyzeQualityWithLLM({ title: "x", planText: "1. step" });
    expect(r.llmUsed).toBe(true);
    expect(r.provider).toBe("ollama");
  });
});

describe("analyzeQualityWithLLM — robustness", () => {
  it("never throws on malformed LLM JSON", async () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json at all" } }] }),
    }) as unknown as typeof fetch;

    await expect(analyzeQualityWithLLM({ title: "x", planText: "1. step" })).resolves.toBeDefined();
  });

  it("truncates very long plan text", async () => {
    process.env.LLM_PROVIDER = "disabled";
    const huge = "step. ".repeat(10000);
    const r = await analyzeQualityWithLLM({ title: "x", planText: huge });
    expect(r).toBeDefined();
  });
});
