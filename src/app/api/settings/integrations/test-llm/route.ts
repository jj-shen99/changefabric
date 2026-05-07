import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, openaiKey, openaiModel, anthropicKey, anthropicModel, ollamaUrl, ollamaModel } = body;

    if (provider === "disabled") {
      return NextResponse.json({ success: true, message: "LLM is disabled - using heuristic analysis only" });
    }

    if (provider === "openai") {
      if (!openaiKey) {
        return NextResponse.json({ success: false, message: "OpenAI API key is required" });
      }
      // Test OpenAI connection with a minimal request
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      if (res.ok) {
        return NextResponse.json({ success: true, message: `Connected to OpenAI. Model: ${openaiModel || "gpt-4o-mini"}` });
      } else {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, message: err.error?.message || `OpenAI error: ${res.status}` });
      }
    }

    if (provider === "anthropic") {
      if (!anthropicKey) {
        return NextResponse.json({ success: false, message: "Anthropic API key is required" });
      }
      // Test Anthropic connection - just verify the key format for now
      // Anthropic doesn't have a simple models endpoint like OpenAI
      if (!anthropicKey.startsWith("sk-ant-")) {
        return NextResponse.json({ success: false, message: "Invalid Anthropic API key format (should start with sk-ant-)" });
      }
      return NextResponse.json({ success: true, message: `Anthropic API key configured. Model: ${anthropicModel || "claude-3-5-sonnet-20241022"}` });
    }

    if (provider === "ollama") {
      const baseUrl = ollamaUrl || "http://localhost:11434";
      const model = ollamaModel || "llama3.2";
      try {
        // Test Ollama connection by listing models
        const res = await fetch(`${baseUrl}/api/tags`, { 
          signal: AbortSignal.timeout(5000) 
        });
        if (res.ok) {
          const data = await res.json();
          const models = data.models?.map((m: { name: string }) => m.name) || [];
          if (models.length === 0) {
            return NextResponse.json({ success: true, message: `Connected to Ollama at ${baseUrl}. No models installed yet - run 'ollama pull ${model}'` });
          }
          const hasModel = models.some((m: string) => m.includes(model));
          if (hasModel) {
            return NextResponse.json({ success: true, message: `Connected to Ollama. Model '${model}' is available.` });
          } else {
            return NextResponse.json({ success: true, message: `Connected to Ollama. Model '${model}' not found. Available: ${models.slice(0, 5).join(", ")}` });
          }
        } else {
          return NextResponse.json({ success: false, message: `Ollama returned error: ${res.status}` });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        return NextResponse.json({ success: false, message: `Cannot connect to Ollama at ${baseUrl}: ${msg}` });
      }
    }

    return NextResponse.json({ success: false, message: "Unknown provider" });
  } catch (error) {
    console.error("LLM test error:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Test failed" });
  }
}
