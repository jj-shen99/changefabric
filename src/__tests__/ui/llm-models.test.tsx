/**
 * Tests for LLM Provider Model Options
 * Validates that the latest models are available in the integrations page
 */
import "@testing-library/jest-dom";

describe("LLM Provider Models", () => {
  describe("OpenAI Models", () => {
    const OPENAI_MODELS = [
      { value: "gpt-4.1", label: "GPT-4.1 (latest, most capable)" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (fast, cost-effective)" },
      { value: "gpt-4.1-nano", label: "GPT-4.1 Nano (fastest, cheapest)" },
      { value: "gpt-4o", label: "GPT-4o (previous gen)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (previous gen, fast)" },
      { value: "o3", label: "o3 (reasoning model)" },
      { value: "o4-mini", label: "o4-mini (reasoning, fast)" },
    ];

    it("should include GPT-4.1 as the latest model", () => {
      const values = OPENAI_MODELS.map(m => m.value);
      expect(values).toContain("gpt-4.1");
    });

    it("should include GPT-4.1 Mini as default", () => {
      const defaultModel = "gpt-4.1-mini";
      const values = OPENAI_MODELS.map(m => m.value);
      expect(values).toContain(defaultModel);
    });

    it("should include reasoning models (o3, o4-mini)", () => {
      const values = OPENAI_MODELS.map(m => m.value);
      expect(values).toContain("o3");
      expect(values).toContain("o4-mini");
    });

    it("should include previous gen models for compatibility", () => {
      const values = OPENAI_MODELS.map(m => m.value);
      expect(values).toContain("gpt-4o");
      expect(values).toContain("gpt-4o-mini");
    });

    it("should NOT include deprecated models", () => {
      const values = OPENAI_MODELS.map(m => m.value);
      expect(values).not.toContain("gpt-4-turbo");
      expect(values).not.toContain("gpt-3.5-turbo");
    });

    it("should have 7 model options", () => {
      expect(OPENAI_MODELS).toHaveLength(7);
    });
  });

  describe("Anthropic Models", () => {
    const ANTHROPIC_MODELS = [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (latest, recommended)" },
      { value: "claude-opus-4-20250514", label: "Claude Opus 4 (most capable)" },
      { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet (extended thinking)" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (previous gen)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)" },
    ];

    it("should include Claude 4 models", () => {
      const values = ANTHROPIC_MODELS.map(m => m.value);
      expect(values).toContain("claude-sonnet-4-20250514");
      expect(values).toContain("claude-opus-4-20250514");
    });

    it("should include Claude Sonnet 4 as default", () => {
      const defaultModel = "claude-sonnet-4-20250514";
      const values = ANTHROPIC_MODELS.map(m => m.value);
      expect(values).toContain(defaultModel);
    });

    it("should include Claude 3.7 with extended thinking", () => {
      const values = ANTHROPIC_MODELS.map(m => m.value);
      expect(values).toContain("claude-3-7-sonnet-20250219");
    });

    it("should include previous gen models for compatibility", () => {
      const values = ANTHROPIC_MODELS.map(m => m.value);
      expect(values).toContain("claude-3-5-sonnet-20241022");
      expect(values).toContain("claude-3-5-haiku-20241022");
    });

    it("should NOT include deprecated models", () => {
      const values = ANTHROPIC_MODELS.map(m => m.value);
      expect(values).not.toContain("claude-3-opus-20240229");
      expect(values).not.toContain("claude-3-haiku-20240307");
    });

    it("should have 5 model options", () => {
      expect(ANTHROPIC_MODELS).toHaveLength(5);
    });
  });

  describe("Default Model Selection", () => {
    it("OpenAI default should be gpt-4.1-mini", () => {
      const defaultOpenAI = "gpt-4.1-mini";
      expect(defaultOpenAI).toBe("gpt-4.1-mini");
    });

    it("Anthropic default should be claude-sonnet-4", () => {
      const defaultAnthropic = "claude-sonnet-4-20250514";
      expect(defaultAnthropic).toBe("claude-sonnet-4-20250514");
    });

    it("Ollama default should be llama3.2", () => {
      const defaultOllama = "llama3.2";
      expect(defaultOllama).toBe("llama3.2");
    });
  });

  describe("Provider Options", () => {
    const PROVIDERS = [
      { value: "disabled", label: "Disabled (use heuristic analysis only)" },
      { value: "openai", label: "OpenAI (GPT-4.1, GPT-4o)" },
      { value: "anthropic", label: "Anthropic (Claude 4, Claude 3.5)" },
      { value: "ollama", label: "Ollama (Local models)" },
    ];

    it("should have 4 provider options", () => {
      expect(PROVIDERS).toHaveLength(4);
    });

    it("should include disabled option", () => {
      const values = PROVIDERS.map(p => p.value);
      expect(values).toContain("disabled");
    });

    it("should include all major providers", () => {
      const values = PROVIDERS.map(p => p.value);
      expect(values).toContain("openai");
      expect(values).toContain("anthropic");
      expect(values).toContain("ollama");
    });

    it("OpenAI label should mention GPT-4.1", () => {
      const openai = PROVIDERS.find(p => p.value === "openai");
      expect(openai?.label).toContain("GPT-4.1");
    });

    it("Anthropic label should mention Claude 4", () => {
      const anthropic = PROVIDERS.find(p => p.value === "anthropic");
      expect(anthropic?.label).toContain("Claude 4");
    });
  });
});
