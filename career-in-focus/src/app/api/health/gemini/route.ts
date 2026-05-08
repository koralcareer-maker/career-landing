import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public Gemini-connectivity probe. Sends a minimal text-only prompt
 * to gemini-2.5-flash and reports back what came out. No file, no
 * user data — just answers 'is the AI service reachable from this
 * deploy with these credentials?'.
 *
 * Returns the HTTP status, error message (if any), and a tiny
 * sample of the response. Doesn't return the API key.
 */
export async function GET() {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) {
    return NextResponse.json({ ok: false, reason: "GEMINI_API_KEY missing" }, { status: 200 });
  }

  type GeminiResponse = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
      safetyRatings?: Array<{ category?: string; probability?: string }>;
    }>;
    promptFeedback?: { blockReason?: string };
    error?: { code?: number; message?: string; status?: string };
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  };

  async function tryModel(model: string, prompt: string) {
    const startedAt = Date.now();
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            // Removed maxOutputTokens cap — too low values can cause
            // 'MAX_TOKENS' before any text is emitted (Gemini reasons
            // first then writes), so 'empty reply' looks like a model
            // bug when it's just a budget issue.
            generationConfig: { temperature: 0 },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const elapsedMs = Date.now() - startedAt;
      const text = await r.text();
      let data: GeminiResponse | null = null;
      try { data = JSON.parse(text); } catch { /* leave null */ }
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return {
        model,
        httpStatus: r.status,
        elapsedMs,
        ok: r.ok && !data?.error && reply.length > 0,
        replyLen: reply.length,
        sampleReply: reply.slice(0, 80),
        finishReason: data?.candidates?.[0]?.finishReason ?? null,
        promptBlockReason: data?.promptFeedback?.blockReason ?? null,
        safetyRatings: data?.candidates?.[0]?.safetyRatings ?? null,
        usage: data?.usageMetadata ?? null,
        error: data?.error ?? null,
      };
    } catch (e) {
      return {
        model,
        ok: false,
        reason: "network",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // Try the same model the analyze-cv route uses, and fall back to
  // 1.5-flash so we can see whether it's a model-specific behaviour
  // change (deprecation, rollout, etc.) vs a key/quota issue.
  const [primary, fallback] = await Promise.all([
    tryModel("gemini-2.5-flash", "Reply with one word: hello"),
    tryModel("gemini-1.5-flash", "Reply with one word: hello"),
  ]);

  return NextResponse.json({ primary, fallback });
}
