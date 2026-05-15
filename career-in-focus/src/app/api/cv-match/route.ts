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
          const extraction = await extractCvText(buf, fileName);
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
  if (!jobText || jobText.length < 30) {
    return NextResponse.json(
      { error: "job-too-short", message: "תיאור המשרה קצר מדי. הדביקי את כל תיאור התפקיד." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const result = await analyzeCvMatch(cvText, jobText);
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
