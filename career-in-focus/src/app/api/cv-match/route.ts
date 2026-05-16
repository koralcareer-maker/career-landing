/**
 * POST /api/cv-match
 *
 * Public lead-magnet endpoint. Accepts a CV (either as uploaded file or
 * pasted text) plus a job description, runs the analysis through the
 * Gemini cascade, and returns the structured result.
 *
 * No auth. CORS open so the marketing site can also embed this later.
 *
 * Two body shapes supported:
 *  - multipart/form-data → fields: cv (file), cvText (optional text override),
 *    jobText (required)
 *  - application/json → { cvText, jobText }
 *
 * Light rate-limit: a single IP can't fire more than ~30 requests / 5
 * minutes. In-memory only — survives one Vercel function instance, so
 * it's a best-effort guard, not a strict bound. Real abuse handling
 * would need Redis but the cost ceiling is the Gemini quota anyway.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "@/lib/cv-extract";
import { analyzeCvMatch, CvMatchError } from "@/lib/cv-match-analyzer";
import { prisma } from "@/lib/prisma";

/**
 * Lookup the candidate's name in the trainee DB.
 *
 * Coral's rule: if she personally wrote the CV (i.e. the candidate is
 * already a member/trainee in our DB), the result should reflect a
 * professional-grade CV. So we floor the score at 85 when the name
 * matches a User record.
 *
 * Heuristic name extraction — the candidate's first 1-3 word-tokens
 * usually appear in the first 200 chars of the CV. We then search for
 * any User.name that contains BOTH the first AND last token. Hebrew
 * and Latin alphabets both work because we just use substring match.
 */
async function isExistingTrainee(cvText: string): Promise<boolean> {
  const head = cvText.trim().slice(0, 300).replace(/[\n\r]+/g, " ");
  // Pull 2-4 word tokens of plausible name shape (Hebrew letters or
  // capital-Latin), skipping anything that looks like an email/URL.
  const tokenRegex = /(?:^|\s)([֐-׿A-Z][֐-׿A-Za-z\-']{1,30})/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(head)) !== null && tokens.length < 6) {
    if (!/@|http|www/i.test(m[1])) tokens.push(m[1]);
  }
  if (tokens.length < 2) return false;
  const first = tokens[0];
  const last = tokens[1];
  try {
    const row = await prisma.user.findFirst({
      where: {
        AND: [
          { name: { contains: first } },
          { name: { contains: last } },
        ],
      },
      select: { id: true },
    });
    return !!row;
  } catch (e) {
    console.warn("[cv-match] trainee lookup failed:", e);
    return false;
  }
}

// Gemini vision OCR — used when native PDF/DOCX extraction returns
// too little text. Mirrors the approach in /api/profile/analyze-cv:
// hand Gemini Flash the raw bytes as inline_data and ask it to OCR
// everything it sees, no commentary.
const VISION_EXTRACTION_PROMPT =
  `קרא את הטקסט המלא בקובץ קורות החיים המצורף וצא אותו בלבד. אם הקובץ הוא PDF סרוק או תמונה, חלץ טקסט באמצעות OCR. אל תוסיף הקדמות או הסברים — רק את הטקסט המלא, מסודר לפי הסדר שמופיע בקובץ.`;

const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

async function geminiVisionExtract(buf: Buffer, mime: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mime, data: buf.toString("base64") } },
          { text: VISION_EXTRACTION_PROMPT },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
  });

  // Try the model cascade — if Flash is rate-limited (very common on free
  // tier), bump to 2.0-Flash then 1.5-Flash. CV upload must NEVER fail
  // because of model quota.
  let lastErr: string = "";
  for (const model of VISION_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(45_000),
        },
      );
      if (!r.ok) {
        lastErr = `${model}: HTTP ${r.status}`;
        if (r.status === 429 || r.status === 503) continue;
        const errBody = await r.text().catch(() => "");
        lastErr = `${model}: ${r.status} ${errBody.slice(0, 200)}`;
        continue;
      }
      const data = (await r.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        error?: { message?: string };
      };
      if (data.error?.message) {
        lastErr = `${model}: ${data.error.message}`;
        continue;
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text.trim().length > 0) return text;
      lastErr = `${model}: empty response`;
    } catch (e) {
      lastErr = `${model}: ${e instanceof Error ? e.message : "fetch error"}`;
    }
  }
  throw new Error(`Vision extraction failed across all models. Last: ${lastErr}`);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Crude in-memory rate limiter ─────────────────────────────────────
const HITS = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = HITS.get(ip);
  if (!bucket || bucket.resetAt < now) {
    HITS.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "rate-limited", message: "יותר מדי בקשות. נסי שוב בעוד מספר דקות." },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let cvText = "";
  let jobText = "";

  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      cvText = String(body.cvText ?? "").trim();
      jobText = String(body.jobText ?? "").trim();
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      jobText = String(form.get("jobText") ?? "").trim();
      const inlineCv = String(form.get("cvText") ?? "").trim();
      if (inlineCv) {
        cvText = inlineCv;
      } else {
        const file = form.get("cv");
        if (file && typeof file === "object" && "arrayBuffer" in file) {
          const ab = await (file as File).arrayBuffer();
          const buf = Buffer.from(ab);
          const fileName = (file as File).name ?? "cv.pdf";
          // Pass the Gemini vision callback so the extractor can OCR
          // scanned PDFs / image-only PDFs / DOCs etc. Without this
          // callback the lib silently returns empty text on every PDF.
          const extraction = await extractCvText(buf, fileName, {
            aiVisionExtract: geminiVisionExtract,
          });
          cvText = extraction.text;
          if (!cvText) {
            return NextResponse.json(
              { error: "cv-extract-failed", message: extraction.warning ?? "לא הצלחנו לקרוא את קובץ הקו\"ח" },
              { status: 400, headers: CORS_HEADERS },
            );
          }
        }
      }
    } else {
      return NextResponse.json(
        { error: "bad-content-type" },
        { status: 415, headers: CORS_HEADERS },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: "bad-body", message: String(e instanceof Error ? e.message : e).slice(0, 200) },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (!cvText || cvText.length < 50) {
    return NextResponse.json(
      { error: "cv-too-short", message: "קורות החיים קצרים מדי. הדביקי טקסט מלא או העלי קובץ PDF/DOCX." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (!jobText || jobText.length < 3) {
    return NextResponse.json(
      { error: "job-too-short", message: "תפקיד היעד קצר מדי. הזיני שם תפקיד או הדביקי תיאור משרה." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const result = await analyzeCvMatch(cvText, jobText);

    // Trainee-CV floor: Coral's existing members get a professional-
    // grade CV by definition (she wrote it), so the score floors at 85.
    // Best-effort — a lookup failure can't break the response.
    const fromTrainee = await isExistingTrainee(cvText);
    if (fromTrainee && result.score < 85) {
      result.score = 85;
    }

    return NextResponse.json({ ok: true, result }, { headers: CORS_HEADERS });
  } catch (e) {
    if (e instanceof CvMatchError) {
      const status =
        e.code === "no-key" ? 503 :
        e.code === "bad-input" ? 400 :
        502;
      return NextResponse.json(
        { error: e.code, message: e.message },
        { status, headers: CORS_HEADERS },
      );
    }
    console.error("[cv-match]", e);
    return NextResponse.json(
      { error: "internal", message: "שגיאה כללית. נסי שוב בעוד דקה." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
