/**
 * POST /api/cv-match
 *
 * Public lead-magnet endpoint. Accepts a CV (file or text), a target
 * role, and 8 questionnaire answers. Returns a CvMatchResult — score,
 * verdict, template choice — computed deterministically.
 *
 * Body shapes:
 *   multipart/form-data:
 *     cv          File (PDF / DOCX / DOC / image), OR
 *     cvText      pasted text instead of file
 *     jobText     target role name OR full job description
 *     answers     JSON array of 8 ints, each 1-5
 *   application/json:
 *     same fields, all strings + answers as int[]
 *
 * No LLM call here — Coral's pivot. Result is template-driven so it's
 * fast (10-100ms instead of 10-30s) and reliable.
 *
 * No auth. CORS open. Light per-IP rate limit.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractCvText } from "@/lib/cv-extract";
import { scoreFromQuestionnaire, QUESTIONNAIRE } from "@/lib/cv-match-analyzer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gemini OCR — only for reading the CV file. Doesn't analyse,
// just extracts text from scanned PDFs / image CVs. Cascade so a
// single-model quota failure doesn't kill the upload.
const VISION_EXTRACTION_PROMPT =
  `קרא את הטקסט המלא בקובץ קורות החיים המצורף וצא אותו בלבד. אם הקובץ הוא PDF סרוק או תמונה, חלץ טקסט באמצעות OCR. אל תוסיף הקדמות או הסברים — רק את הטקסט המלא, מסודר לפי הסדר שמופיע בקובץ.`;
const VISION_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

async function geminiVisionExtract(buf: Buffer, mime: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const body = JSON.stringify({
    contents: [{
      role: "user",
      parts: [
        { inline_data: { mime_type: mime, data: buf.toString("base64") } },
        { text: VISION_EXTRACTION_PROMPT },
      ],
    }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
  });
  for (const model of VISION_MODELS) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(45_000) },
      );
      if (!r.ok) continue;
      const data = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text.trim()) return text;
    } catch {
      // try next model
    }
  }
  throw new Error("Vision extraction failed across all models.");
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Naive in-memory rate-limiter — per-instance only but Vercel's free
// tier doesn't give us a shared cache. Good enough for the public
// lead-magnet load profile.
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

/**
 * Coral's existing trainees use CVs in her specific format. We match
 * by name as a proxy — pull the first 1-2 name-shaped tokens from the
 * CV head and look for a User row whose name contains both. Used to
 * decide whether the score caps at 65 (public) or runs free (trainee).
 */
async function isExistingTrainee(cvText: string): Promise<boolean> {
  const head = cvText.trim().slice(0, 300).replace(/[\n\r]+/g, " ");
  const tokenRegex = /(?:^|\s)([֐-׿A-Z][֐-׿A-Za-z\-']{1,30})/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(head)) !== null && tokens.length < 6) {
    if (!/@|http|www/i.test(m[1])) tokens.push(m[1]);
  }
  if (tokens.length < 2) return false;
  try {
    const row = await prisma.user.findFirst({
      where: {
        AND: [
          { name: { contains: tokens[0] } },
          { name: { contains: tokens[1] } },
        ],
      },
      select: { id: true },
    });
    return !!row;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "rate-limited", message: "יותר מדי בקשות. נסי שוב בעוד מספר דקות." },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  let cvText = "";
  let jobText = "";
  let answers: number[] = [];

  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json();
      cvText = String(body.cvText ?? "").trim();
      jobText = String(body.jobText ?? "").trim();
      if (Array.isArray(body.answers)) answers = body.answers.map(Number);
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      jobText = String(form.get("jobText") ?? "").trim();
      const inlineCv = String(form.get("cvText") ?? "").trim();
      const answersRaw = String(form.get("answers") ?? "").trim();
      if (answersRaw) {
        try { answers = JSON.parse(answersRaw); } catch { /* default empty */ }
      }
      if (inlineCv) {
        cvText = inlineCv;
      } else {
        const file = form.get("cv");
        if (file && typeof file === "object" && "arrayBuffer" in file) {
          const ab = await (file as File).arrayBuffer();
          const buf = Buffer.from(ab);
          const fileName = (file as File).name ?? "cv.pdf";
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
      { error: "job-too-short", message: "תפקיד היעד קצר מדי." },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  if (!Array.isArray(answers) || answers.length < QUESTIONNAIRE.length) {
    return NextResponse.json(
      { error: "answers-incomplete", message: `יש לענות על כל ${QUESTIONNAIRE.length} השאלות.` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Trainee detection + deterministic scoring. Pass cvText so the
  // scorer's CV-quality nudge can read it.
  const trainee = await isExistingTrainee(cvText);
  const result = scoreFromQuestionnaire(answers, trainee, cvText);

  // Log a "tool run" pageview so the admin dashboard separates "saw
  // the cv-match page" from "actually completed an analysis".
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).pageView.create({
    data: { path: "/cv-match/run", referrer: null },
  }).catch(() => {});

  return NextResponse.json({ ok: true, result }, { headers: CORS_HEADERS });
}
