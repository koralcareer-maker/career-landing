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

  const startedAt = Date.now();
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "השב במילה אחת בלבד: שלום." }] }],
          generationConfig: { maxOutputTokens: 16, temperature: 0 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const elapsedMs = Date.now() - startedAt;
    const text = await r.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    type GeminiOk = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    type GeminiErr = { error?: { code?: number; message?: string; status?: string } };
    const ok = r.ok && !(data as GeminiErr)?.error;
    const reply = (data as GeminiOk)?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const err = (data as GeminiErr)?.error;

    return NextResponse.json({
      ok,
      httpStatus: r.status,
      elapsedMs,
      sampleReply: reply.slice(0, 80),
      error: err
        ? { code: err.code, status: err.status, message: err.message?.slice(0, 200) }
        : null,
      // Help us see WHICH model rejected if there's a deprecation issue.
      model: "gemini-2.5-flash",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      reason: "network",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
