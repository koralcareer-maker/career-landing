import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractCvText } from "@/lib/cv-extract";

/**
 * CV upload + analysis. Three-stage pipeline:
 *
 *   1. Native extraction (mammoth for DOCX, pdf-parse for PDF) handles
 *      ~95% of normal CVs in <1s, completely free.
 *   2. AI vision fallback (Gemini multimodal) rescues image-only PDFs
 *      and weird formats that native parsers miss.
 *   3. AI analysis (Gemini text mode) runs the structured-feedback
 *      prompt against whatever text we got out.
 *
 * Stage 3 is run regardless of which extraction stage succeeded,
 * because the analysis prompt is what produces the JSON the UI
 * expects.
 *
 * Uses Node runtime (not Edge) so we can use Buffer + mammoth +
 * pdf-parse, and so we get the longer Vercel function timeout
 * (default 60s on hobby/pro).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_KEY = () => (process.env.GEMINI_API_KEY ?? "").trim();

const ANALYSIS_PROMPT = `אתה מומחה גיוס ומיתוג מקצועי ישראלי עם ניסיון רב. נתח את הטקסט הבא של קורות חיים.

ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים):
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש בהתבסס על הרקע",
  "yearsExperience": <מספר שנות ניסיון כולל>,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער 1", "פער 2", "פער 3", "פער 4"],
  "marketSkills": ["מיומנות חמה 1 שמעסיקים מחפשים עכשיו", "מיומנות 2", "מיומנות 3"],
  "cvFeedback": ["פידבק ספציפי 1 לשיפור קורות החיים","פידבק 2","פידבק 3","פידבק 4","פידבק 5"],
  "summary": "סיכום פרופיל מקצועי בעברית — 2 משפטים",
  "atsLevel": "green" | "yellow" | "red",
  "atsReasons": ["סיבה קצרה 1", "סיבה קצרה 2"]
}

חוזקות: מה בולט ומוכח בקורות החיים.
פערים: מה חסר להפוך למועמד תחרותי יותר.
marketSkills: מיומנויות שחמות בשוק העכשווי לתפקיד זה (2025).
cvFeedback: עצות ספציפיות ופרקטיות — כל פריט = פעולה אחת ברורה.

atsLevel: דירוג כללי של תאימות הקורות חיים למערכות ATS:
  - "green"  = עוברים ATS ברוב המערכות (מבנה נקי, מילות מפתח, ללא טבלאות מורכבות)
  - "yellow" = עוברים בחלק מהמערכות אבל יש סיכון (טבלאות, פורמט לא סטנדרטי, מילות מפתח חלשות)
  - "red"    = סיכון גבוה לא להגיע למגייס (תמונות, עמודות, גרפיקה, מילות מפתח חסרות)
atsReasons: 2 סיבות קצרות (עד 8 מילים כל אחת) למה הציון הנוכחי. בלי מונחים טכניים — בעברית פשוטה.

החזר JSON בלבד.`;

const VISION_EXTRACTION_PROMPT = `קרא את הטקסט המלא בקובץ קורות החיים המצורף וצא אותו בלבד. אם הקובץ הוא PDF סרוק או תמונה, חלץ טקסט באמצעות OCR. אל תוסיף הקדמות או הסברים — רק את הטקסט המלא, מסודר לפי הסדר שמופיע בקובץ.`;

async function callGemini(prompt: string, fileBuf?: Buffer, mime?: string): Promise<string> {
  const parts: Array<Record<string, unknown>> = [];
  if (fileBuf && mime) {
    parts.push({ inline_data: { mime_type: mime, data: fileBuf.toString("base64") } });
  }
  parts.push({ text: prompt });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY()}`,
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
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`gemini http ${r.status}: ${err.slice(0, 300)}`);
  }
  const data = await r.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error) throw new Error(`gemini api: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

export async function POST(req: NextRequest) {
  // Use auth() — NextAuth v5's canonical session reader. The previous
  // getToken() call was an Edge-runtime workaround that doesn't see
  // v5's session cookie under the same name in Node runtime, which is
  // why customers saw "נדרשת כניסה" right after my Edge → Node move.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  void req; // not used in Node runtime — auth() reads cookies internally

  if (!GEMINI_KEY()) {
    console.error("[analyze-cv] GEMINI_API_KEY missing");
    return NextResponse.json(
      { error: "ניתוח קורות חיים לא זמין כרגע (חסרה הגדרה אצל המנהל). פני לקורל." },
      { status: 503 },
    );
  }

  let base64Data = "";
  let mimeType = "";
  let fileName = "cv";
  try {
    const body = await req.json() as { base64Data: string; mimeType: string; fileName?: string };
    base64Data = body.base64Data ?? "";
    mimeType = body.mimeType ?? "";
    fileName = body.fileName ?? "cv";
    if (!base64Data) throw new Error("missing base64Data");
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לקרוא את הקובץ. נסי להעלות PDF או Word פשוט יותר." },
      { status: 400 },
    );
  }

  // 10MB raw cap — generous, since native extraction is fast and
  // bandwidth from the user's browser is the main constraint.
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מעל 10MB). שמרי כ-PDF דחוס או הסירי תמונות." },
      { status: 413 },
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(base64Data, "base64");
    if (buf.length === 0) throw new Error("empty");
  } catch {
    return NextResponse.json(
      { error: "הקובץ פגום או ריק. נסי קובץ אחר." },
      { status: 400 },
    );
  }

  // === Stage 1+2: extract text ===
  // Native first; if the file is a scanned/image PDF we call Gemini
  // multimodal as the AI vision fallback. The extractor never throws.
  const extracted = await extractCvText(buf, fileName, {
    aiVisionExtract: async (b, m) => callGemini(VISION_EXTRACTION_PROMPT, b, m),
  });

  if (!extracted.text || extracted.text.length < 30) {
    return NextResponse.json(
      {
        error:
          extracted.warning ??
          "לא הצלחנו לחלץ טקסט מקורות החיים. ייתכן שזה PDF סרוק. נסי לפתוח ב-Word ולשמור מחדש כ-PDF.",
      },
      { status: 422 },
    );
  }

  // === Stage 3: structured analysis on the extracted text ===
  let analysisText = "";
  try {
    analysisText = await callGemini(`${ANALYSIS_PROMPT}\n\n--- קורות חיים ---\n${extracted.text}`);
  } catch (e) {
    console.error("[analyze-cv] analysis failed:", e);
    return NextResponse.json(
      { error: "הניתוח התעכב או נכשל. נסי שוב בעוד רגע." },
      { status: 502 },
    );
  }

  const cleaned = analysisText.replace(/```json\n?|\n?```/g, "").trim();
  let result: unknown;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.error("[analyze-cv] failed to parse Gemini JSON:", cleaned.slice(0, 300));
    return NextResponse.json(
      { error: "הניתוח חזר בפורמט לא תקין. נסי שוב." },
      { status: 502 },
    );
  }

  // Surface the extraction telemetry alongside the result so the UI
  // (and future debugging) can see whether we used the fast path or
  // had to fall back. Doesn't affect existing consumers.
  return NextResponse.json({
    ...(result as Record<string, unknown>),
    _extraction: {
      source: extracted.source,
      format: extracted.format,
      usedFallback: extracted.usedFallback,
      textLength: extracted.text.length,
      warning: extracted.warning ?? null,
    },
  });
}
