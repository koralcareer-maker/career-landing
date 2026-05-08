import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "@/lib/cv-extract";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint — run the FULL CV analysis pipeline (native
 * extract → AI vision fallback → Gemini analysis) on a base64 file
 * and return both the analysis JSON and the extraction telemetry.
 *
 * No auth, no DB writes, no profile updates. Deliberately public so
 * we can curl it with a real customer file from CLI to verify the
 * production pipeline before pointing customers at it.
 *
 * Same prompt the real /api/profile/analyze-cv route uses, so the
 * output is identical to what a member would actually see.
 */
const ANALYSIS_PROMPT = `אתה מומחה גיוס ומיתוג מקצועי ישראלי עם ניסיון רב. נתח את הטקסט הבא של קורות חיים.

ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים):
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש בהתבסס על הרקע",
  "yearsExperience": <מספר שנות ניסיון כולל>,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער 1", "פער 2", "פער 3", "פער 4"],
  "marketSkills": ["מיומנות חמה 1", "מיומנות 2", "מיומנות 3"],
  "cvFeedback": ["פידבק 1","פידבק 2","פידבק 3","פידבק 4","פידבק 5"],
  "summary": "סיכום פרופיל מקצועי בעברית — 2 משפטים",
  "atsLevel": "green" | "yellow" | "red",
  "atsReasons": ["סיבה קצרה 1", "סיבה קצרה 2"]
}

חוזקות: מה בולט ומוכח. פערים: מה חסר. marketSkills: מיומנויות חמות בשוק 2025. cvFeedback: עצות ספציפיות.
atsLevel: green/yellow/red לפי תאימות ATS. atsReasons: 2 סיבות קצרות (עד 8 מילים) בעברית פשוטה.
החזר JSON בלבד.`;

const VISION_PROMPT = `קרא את הטקסט המלא בקובץ קורות החיים המצורף וצא אותו בלבד. אם הקובץ הוא PDF סרוק או תמונה, חלץ טקסט באמצעות OCR. אל תוסיף הקדמות או הסברים.`;

async function callGemini(prompt: string, fileBuf?: Buffer, mime?: string): Promise<string> {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const parts: Array<Record<string, unknown>> = [];
  if (fileBuf && mime) {
    parts.push({ inline_data: { mime_type: mime, data: fileBuf.toString("base64") } });
  }
  parts.push({ text: prompt });
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!r.ok) throw new Error(`gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const data = await r.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(req: NextRequest) {
  let body: { base64Data?: string; mimeType?: string; fileName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const base64Data = (body.base64Data ?? "").trim();
  const fileName = (body.fileName ?? "cv").trim();
  if (!base64Data) return NextResponse.json({ error: "missing base64Data" }, { status: 400 });

  const buf = Buffer.from(base64Data, "base64");
  if (buf.length === 0) return NextResponse.json({ error: "empty buffer" }, { status: 400 });

  const startedAt = Date.now();
  const extracted = await extractCvText(buf, fileName, {
    aiVisionExtract: async (b, m) => callGemini(VISION_PROMPT, b, m),
  });
  const extractedAt = Date.now();

  if (!extracted.text || extracted.text.length < 30) {
    return NextResponse.json({
      stage: "extraction-failed",
      extraction: extracted,
      timings: { extractionMs: extractedAt - startedAt },
    });
  }

  let analysisRaw = "";
  let analysisErr: string | null = null;
  try {
    analysisRaw = await callGemini(`${ANALYSIS_PROMPT}\n\n--- קורות חיים ---\n${extracted.text}`);
  } catch (e) {
    analysisErr = e instanceof Error ? e.message : String(e);
  }
  const analyzedAt = Date.now();

  let analysis: unknown = null;
  if (analysisRaw) {
    const cleaned = analysisRaw.replace(/```json\n?|\n?```/g, "").trim();
    try { analysis = JSON.parse(cleaned); } catch { /* leave null */ }
  }

  return NextResponse.json({
    stage: analysisErr ? "analysis-failed" : "ok",
    analysisError: analysisErr,
    timings: {
      extractionMs: extractedAt - startedAt,
      analysisMs:   analyzedAt - extractedAt,
      totalMs:      analyzedAt - startedAt,
    },
    extraction: {
      source: extracted.source,
      format: extracted.format,
      usedFallback: extracted.usedFallback,
      textLength: extracted.text.length,
      warning: extracted.warning ?? null,
      preview: extracted.text.slice(0, 400),
    },
    analysis,
    analysisRawPreview: analysisRaw.slice(0, 500),
  });
}
