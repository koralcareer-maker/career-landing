import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  BLOB_ROOT,
  saveGenerated,
  countUserJobsSince,
  startOfMonthMs,
} from "@/lib/blob";

/**
 * LinkedIn photo generator — generation endpoint.
 *
 * Architecture
 * ────────────
 * 1. The client uploads the 3 source photos directly to Vercel Blob using a
 *    short-lived token issued by /api/tools/linkedin-photo/upload — no bytes
 *    pass through this route.
 * 2. The client then calls THIS endpoint with only:
 *      { sourceUrls: string[3], gender, style, jobId }
 * 3. We fetch the 3 sources from Blob, base64-encode them, and call Google's
 *    Gemini 2.5 Flash Image API (the "Nano Banana" model) — it accepts up
 *    to ~10 reference images plus a prompt and returns generated PNG/JPEG
 *    bytes inline. Free tier: 100 requests/day, 10 RPM.
 * 4. Each user is limited to MAX_JOBS_PER_MONTH generations per calendar
 *    month — counted from existing Blob folders, no DB row needed.
 * 5. We save each generated image to Vercel Blob and return the saved URLs.
 *    Persistence after refresh is via /api/tools/linkedin-photo/history.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_GENDERS = ["man", "woman"] as const;
const ALLOWED_STYLES = ["formal", "casual", "creative"] as const;
type Gender = (typeof ALLOWED_GENDERS)[number];
type Style = (typeof ALLOWED_STYLES)[number];

/** Number of variants we ask Gemini to produce for one user request. */
const NUM_OUTPUTS = 2;

/** Per-user monthly quota. Counts distinct generation jobs (timestamp folders). */
const MAX_JOBS_PER_MONTH = 2;

/** Gemini 2.5 Flash Image — image-out-capable preview model. */
const GEMINI_MODEL = "gemini-2.5-flash-image-preview";

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(gender: Gender, style: Style): string {
  const subject = gender === "woman" ? "woman" : "man";
  const styleDesc: Record<Style, string> = {
    formal:
      "wearing a tailored business suit or blazer, against a clean light-grey studio background with soft diffused studio lighting, confident approachable expression, slight smile, eyes looking directly at the camera",
    casual:
      "wearing smart-casual attire in neutral tones (a sweater or a button-up shirt), against a clean neutral background with natural warm studio lighting, warm friendly expression with a genuine smile, eyes looking directly at the camera",
    creative:
      "wearing modern creative-professional attire (a tailored jacket or designer top), against a softly blurred modern office background with cinematic lighting, confident creative expression",
  };
  // Phrasing tuned to minimize Gemini safety filter blocks: emphasize that
  // the output is "the same person" rather than asking to "transform" or
  // "modify" them.
  return [
    `Create a professional LinkedIn-style headshot of the same ${subject} shown in the reference photographs.`,
    `The output should be photorealistic high-quality color photography, ${styleDesc[style]}.`,
    `It is the SAME PERSON — keep their face shape, eyes, nose, mouth, hairline and skin tone identical to the reference photos.`,
    `Upper-body portrait, sharp focus on the eyes, professional corporate photography style.`,
    `Return one generated image.`,
  ].join(" ");
}

// ─── Gemini Generative Language API call ────────────────────────────────────

interface GeminiInlineData {
  mimeType?: string;
  mime_type?: string;
  data: string; // base64
}

interface GeminiPart {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
  safetyRatings?: { category: string; probability: string }[];
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string; safetyRatings?: unknown[] };
  error?: { code?: number; message?: string; status?: string };
}

interface SourceFile {
  base64: string;
  mimeType: string;
}

async function fetchSource(url: string, idx: number): Promise<SourceFile> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`source-fetch-${res.status}: image ${idx + 1}`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mimeType };
}

/** One Gemini call. Returns PNG/JPEG bytes for the first image part found. */
async function callGeminiOnce(
  sources: SourceFile[],
  prompt: string,
  apiKey: string
): Promise<Buffer> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const parts: GeminiPart[] = [
    { text: prompt },
    ...sources.map<GeminiPart>((s) => ({
      inlineData: { mimeType: s.mimeType, data: s.base64 },
    })),
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    }),
  });

  const text = await res.text();
  let data: GeminiResponse;
  try {
    data = JSON.parse(text) as GeminiResponse;
  } catch {
    throw new Error(`gemini-bad-json-${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = data.error?.message ?? text.slice(0, 200);
    throw new Error(`gemini-${res.status}-${data.error?.status ?? "err"}: ${msg}`);
  }
  if (data.promptFeedback?.blockReason) {
    throw new Error(`gemini-blocked: ${data.promptFeedback.blockReason}`);
  }
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error("gemini-empty: no candidates");
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`gemini-finish-${candidate.finishReason}`);
  }
  const imgPart = candidate.content?.parts?.find(
    (p) => p.inlineData?.data || p.inline_data?.data
  );
  const inline = imgPart?.inlineData ?? imgPart?.inline_data;
  if (!inline?.data) {
    throw new Error("gemini-empty-payload: no inlineData in response");
  }
  return Buffer.from(inline.data, "base64");
}

/** Run Gemini once. On a transient failure, retry exactly once. */
async function generateOneWithRetry(
  sources: SourceFile[],
  prompt: string,
  apiKey: string
): Promise<Buffer> {
  try {
    return await callGeminiOnce(sources, prompt, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const transient =
      msg.includes("gemini-5") ||
      msg.includes("gemini-429") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("ECONNRESET") ||
      msg.includes("gemini-bad-json") ||
      msg.includes("gemini-empty");
    if (!transient) throw e;
    console.warn("[linkedin-photo] transient Gemini failure, retrying once:", msg);
    return await callGeminiOnce(sources, prompt, apiKey);
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

interface RequestBody {
  sourceUrls?: unknown;
  gender?: unknown;
  style?: unknown;
  jobId?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const userId = session.user.id;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("[linkedin-photo] GEMINI_API_KEY missing");
    return NextResponse.json(
      {
        error:
          "המחולל לא מוגדר. יש להוסיף את משתנה הסביבה GEMINI_API_KEY ב-Vercel (Settings → Environment Variables).",
      },
      { status: 503 }
    );
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[linkedin-photo] BLOB_READ_WRITE_TOKEN missing");
    return NextResponse.json(
      { error: "אחסון התמונות לא מוגדר. הפעילי Vercel Blob והוסיפי את BLOB_READ_WRITE_TOKEN." },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }

  // Validate sourceUrls
  if (!Array.isArray(body.sourceUrls) || body.sourceUrls.length !== 3) {
    return NextResponse.json({ error: "יש להעלות בדיוק 3 תמונות" }, { status: 400 });
  }
  const allowedHostSuffix = ".public.blob.vercel-storage.com";
  const userBlobPrefix = `${BLOB_ROOT}/${userId}/`;
  for (let i = 0; i < body.sourceUrls.length; i++) {
    const u = body.sourceUrls[i];
    if (typeof u !== "string" || !u.startsWith("https://")) {
      return NextResponse.json({ error: `תמונה ${i + 1} — כתובת לא תקינה` }, { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      return NextResponse.json({ error: `תמונה ${i + 1} — URL לא חוקי` }, { status: 400 });
    }
    if (!parsed.hostname.endsWith(allowedHostSuffix)) {
      return NextResponse.json(
        { error: `תמונה ${i + 1} חייבת להיות מאוחסנת ב-Vercel Blob` },
        { status: 400 }
      );
    }
    if (!parsed.pathname.startsWith(`/${userBlobPrefix}`)) {
      return NextResponse.json(
        { error: `תמונה ${i + 1} אינה שייכת למשתמש המחובר` },
        { status: 403 }
      );
    }
  }

  if (typeof body.gender !== "string" || !ALLOWED_GENDERS.includes(body.gender as Gender)) {
    return NextResponse.json({ error: 'מגדר לא תקין — חייב להיות "man" או "woman"' }, { status: 400 });
  }
  if (typeof body.style !== "string" || !ALLOWED_STYLES.includes(body.style as Style)) {
    return NextResponse.json({ error: "סגנון לא תקין — formal / casual / creative" }, { status: 400 });
  }
  const jobId =
    typeof body.jobId === "number" && Number.isFinite(body.jobId) ? body.jobId : Date.now();

  const gender = body.gender as Gender;
  const style = body.style as Style;
  const sourceUrls = body.sourceUrls as string[];

  // ─── Per-user monthly quota ───────────────────────────────────────────────
  const since = startOfMonthMs();
  const usedThisMonth = await countUserJobsSince(userId, since);
  if (usedThisMonth >= MAX_JOBS_PER_MONTH) {
    console.log("[linkedin-photo] quota exceeded", { userId, usedThisMonth });
    return NextResponse.json(
      {
        error: `מיצית את מכסת היצירות החינמית לחודש (${MAX_JOBS_PER_MONTH} בחודש). המכסה תתחדש בתחילת החודש הבא.`,
        quotaUsed: usedThisMonth,
        quotaMax: MAX_JOBS_PER_MONTH,
      },
      { status: 429 }
    );
  }

  console.log("[linkedin-photo] generate start", {
    userId,
    jobId,
    gender,
    style,
    sources: sourceUrls.length,
    usedThisMonth,
  });

  try {
    // 1. Fetch all 3 sources from Blob
    const sources = await Promise.all(sourceUrls.map((u, i) => fetchSource(u, i)));

    // 2. Build prompt + call Gemini twice in parallel (it produces 1 image per call)
    const prompt = buildPrompt(gender, style);
    const pngBuffers = await Promise.all(
      Array.from({ length: NUM_OUTPUTS }, () => generateOneWithRetry(sources, prompt, GEMINI_API_KEY))
    );

    // 3. Save outputs to Blob in parallel
    const saved = await Promise.all(
      pngBuffers.map((buf, i) => saveGenerated(userId, jobId, i, buf))
    );

    const images = saved.map((s) => s.url);
    console.log("[linkedin-photo] generate success", { userId, jobId, count: images.length });
    return NextResponse.json({
      images,
      jobId,
      quotaUsed: usedThisMonth + 1,
      quotaMax: MAX_JOBS_PER_MONTH,
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error("[linkedin-photo] generate failure:", { userId, jobId, raw });

    let userMsg: string;
    let status = 502;
    if (raw.startsWith("source-fetch-")) {
      userMsg = "אחת התמונות לא נטענה מאחסון הענן — נסי להעלות שוב";
      status = 400;
    } else if (raw.startsWith("gemini-401") || raw.startsWith("gemini-403")) {
      userMsg = "הרשאות Gemini אינן תקינות — יש לעדכן את GEMINI_API_KEY ב-Vercel";
      status = 503;
    } else if (raw.startsWith("gemini-429")) {
      userMsg = "המודל בעומס כרגע (חרגנו ממכסת השימוש החינמית) — נסי שוב בעוד דקה";
      status = 429;
    } else if (raw.startsWith("gemini-blocked") || raw.startsWith("gemini-finish-SAFETY")) {
      userMsg =
        "מסנני הבטיחות של Google חסמו את היצירה. זה קורה לפעמים בתמונות פנים — נסי תמונות אחרות, או זוויות שונות.";
      status = 400;
    } else if (raw.startsWith("gemini-finish-RECITATION")) {
      userMsg = "המודל סירב הפעם — נסי שוב או החליפי תמונה";
      status = 400;
    } else if (raw.startsWith("gemini-400")) {
      userMsg = "אחת התמונות נדחתה ע״י המודל — נסי תמונות פנים ברורות יותר (JPG/PNG/WEBP)";
      status = 400;
    } else if (raw.startsWith("gemini-5")) {
      userMsg = "שירות Gemini נכשל — נסי שוב בעוד מספר דקות";
      status = 502;
    } else if (raw.startsWith("gemini-empty")) {
      userMsg = "המודל לא החזיר תמונה הפעם — נסי שוב";
    } else if (raw.includes("ETIMEDOUT") || raw.includes("ECONNRESET")) {
      userMsg = "תקלת רשת מול ספק התמונות — נסי שוב";
    } else if (raw.includes("Vercel Blob") || raw.includes("BLOB_")) {
      userMsg = "שמירה לאחסון נכשלה — נסי שוב, ואם זה ממשיך פני לקורל";
    } else {
      userMsg = "אירעה שגיאה ביצירת התמונה. אם זה ממשיך, פני לקורל.";
    }

    return NextResponse.json({ error: userMsg, debug: raw.slice(0, 300) }, { status });
  }
}
