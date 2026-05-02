import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BLOB_ROOT, saveGenerated } from "@/lib/blob";

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
 * 3. We download the 3 URLs server-side, send them to OpenAI's
 *    `images/edits` endpoint with model `gpt-image-1` (which accepts up to
 *    16 reference images and edits them based on a prompt — perfect for
 *    "preserve facial identity, restyle as professional headshot").
 * 4. We save each generated PNG to Vercel Blob and return the saved URLs.
 *    Persistence after refresh is handled by /api/tools/linkedin-photo/history
 *    listing this user's Blob folder — no DB required.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_GENDERS = ["man", "woman"] as const;
const ALLOWED_STYLES = ["formal", "casual", "creative"] as const;
type Gender = (typeof ALLOWED_GENDERS)[number];
type Style = (typeof ALLOWED_STYLES)[number];

const NUM_OUTPUTS = 2;

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(gender: Gender, style: Style): string {
  const subject = gender === "woman" ? "professional woman" : "professional man";
  const styleDesc: Record<Style, string> = {
    formal:
      "wearing a tailored business suit or blazer, clean light-grey studio background, soft diffused studio lighting with subtle rim light, confident approachable expression, slight smile, eyes looking directly at camera, sharp focus on the eyes",
    casual:
      "wearing smart-casual attire in neutral tones (sweater or button-up), clean neutral background, natural warm studio lighting, warm approachable expression, genuine smile, eyes looking at camera, sharp focus on the eyes",
    creative:
      "wearing modern creative-professional attire (tailored jacket or designer top), softly blurred modern office background, cinematic lighting with depth, confident creative expression, sharp focus on the eyes",
  };
  return [
    `Generate a single high-resolution professional LinkedIn headshot of the ${subject} shown in the reference photos.`,
    `${styleDesc[style]}.`,
    "Upper-body portrait, photorealistic, 8K corporate photography, color photo.",
    "CRITICAL: preserve the exact facial identity (face shape, eyes, nose, mouth, hairline) from the reference photos. Do not change ethnicity, age, or distinguishing features. The output person must look identifiably like the input person.",
  ].join(" ");
}

// ─── OpenAI Images Edit call ────────────────────────────────────────────────

interface OpenAIImagesResponse {
  data?: { b64_json?: string; url?: string }[];
  error?: { message?: string; type?: string; code?: string };
}

interface SourceFile {
  buffer: ArrayBuffer;
  ext: string;
  contentType: string;
}

async function fetchSource(url: string, idx: number): Promise<SourceFile> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`source-fetch-${res.status}: image ${idx + 1}`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const buffer = await res.arrayBuffer();
  return { buffer, ext, contentType };
}

async function callOpenAIEdits(
  sources: SourceFile[],
  prompt: string,
  apiKey: string
): Promise<Buffer[]> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", prompt);
  form.append("n", String(NUM_OUTPUTS));
  form.append("size", "1024x1024");
  form.append("quality", "medium"); // medium fits the 60s Vercel budget for n=2
  for (let i = 0; i < sources.length; i++) {
    const filename = `source-${i + 1}.${sources[i].ext}`;
    // Pass the raw ArrayBuffer to the Blob constructor — ArrayBuffer is a
    // BlobPart in DOM types and avoids the TS 5.7+ Uint8Array<ArrayBufferLike>
    // generic narrowing problem.
    const blob = new Blob([sources[i].buffer], { type: sources[i].contentType });
    form.append("image[]", blob, filename);
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const text = await res.text();
  let data: OpenAIImagesResponse;
  try {
    data = JSON.parse(text) as OpenAIImagesResponse;
  } catch {
    throw new Error(`openai-bad-json-${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? text.slice(0, 200);
    throw new Error(`openai-${res.status}-${data.error?.code ?? "err"}: ${msg}`);
  }
  if (!data.data || data.data.length === 0) {
    throw new Error("openai-empty: no images returned");
  }

  const buffers: Buffer[] = [];
  for (const item of data.data) {
    if (item.b64_json) {
      buffers.push(Buffer.from(item.b64_json, "base64"));
    } else if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) throw new Error(`openai-url-fetch-${r.status}`);
      buffers.push(Buffer.from(await r.arrayBuffer()));
    }
  }
  if (buffers.length === 0) {
    throw new Error("openai-empty-payload: data items had no b64 or url");
  }
  return buffers;
}

/** Run the OpenAI call once. On a transient failure, retry exactly once. */
async function generateWithRetry(
  sources: SourceFile[],
  prompt: string,
  apiKey: string
): Promise<Buffer[]> {
  try {
    return await callOpenAIEdits(sources, prompt, apiKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const transient =
      msg.includes("openai-5") ||
      msg.includes("openai-429") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("ECONNRESET") ||
      msg.includes("openai-bad-json") ||
      msg.includes("openai-empty");
    if (!transient) throw e;
    console.warn("[linkedin-photo] transient failure, retrying once:", msg);
    return await callOpenAIEdits(sources, prompt, apiKey);
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

interface RequestBody {
  sourceUrls?: unknown;
  gender?: unknown;
  style?: unknown;
  jobId?: unknown; // unix-ms timestamp identifying this generation folder
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const userId = session.user.id;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("[linkedin-photo] OPENAI_API_KEY missing");
    return NextResponse.json(
      {
        error:
          "המחולל לא מוגדר. יש להוסיף את משתנה הסביבה OPENAI_API_KEY ב-Vercel (Settings → Environment Variables).",
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
    // Reject other users' blobs (URL.pathname always starts with "/")
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
  const jobId = typeof body.jobId === "number" && Number.isFinite(body.jobId) ? body.jobId : Date.now();

  const gender = body.gender as Gender;
  const style = body.style as Style;
  const sourceUrls = body.sourceUrls as string[];

  console.log("[linkedin-photo] generate start", {
    userId,
    jobId,
    gender,
    style,
    sources: sourceUrls.length,
  });

  try {
    // 1. Fetch all 3 sources from Blob (server-to-Blob is fast, same region typically)
    const sources = await Promise.all(sourceUrls.map((u, i) => fetchSource(u, i)));

    // 2. Build prompt + call OpenAI (with one retry on transient failures)
    const prompt = buildPrompt(gender, style);
    const pngBuffers = await generateWithRetry(sources, prompt, OPENAI_API_KEY);

    // 3. Save outputs to Blob in parallel
    const saved = await Promise.all(
      pngBuffers.map((buf, i) => saveGenerated(userId, jobId, i, buf))
    );

    const images = saved.map((s) => s.url);
    console.log("[linkedin-photo] generate success", { userId, jobId, count: images.length });
    return NextResponse.json({ images, jobId });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error("[linkedin-photo] generate failure:", { userId, jobId, raw });

    let userMsg: string;
    let status = 502;
    if (raw.startsWith("source-fetch-")) {
      userMsg = "אחת התמונות לא נטענה מאחסון הענן — נסי להעלות שוב";
      status = 400;
    } else if (raw.startsWith("openai-401") || raw.startsWith("openai-403")) {
      userMsg = "הרשאות OpenAI אינן תקינות — יש לעדכן את OPENAI_API_KEY ב-Vercel";
      status = 503;
    } else if (raw.startsWith("openai-429")) {
      userMsg = "המודל בעומס כרגע — נסי שוב בעוד דקה";
      status = 429;
    } else if (raw.startsWith("openai-400") && raw.includes("safety")) {
      userMsg = "המודל סירב לעבד את התמונות מסיבות בטיחות — נסי תמונות אחרות";
      status = 400;
    } else if (raw.startsWith("openai-400")) {
      userMsg = "אחת התמונות נדחתה ע״י המודל — נסי תמונות פנים ברורות יותר (JPG/PNG/WEBP)";
      status = 400;
    } else if (raw.startsWith("openai-5")) {
      userMsg = "שירות התמונות של OpenAI נכשל — נסי שוב בעוד מספר דקות";
      status = 502;
    } else if (raw.startsWith("openai-empty")) {
      userMsg = "המודל לא החזיר תמונות הפעם — נסי שוב";
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
