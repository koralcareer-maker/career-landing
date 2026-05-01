import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Vercel Pro: 60s function budget. We use up to ~55s — 5s for upload + 50s for queue poll.
export const maxDuration = 60;

// ─── Validation constants ────────────────────────────────────────────────────

const ALLOWED_GENDERS = ["man", "woman"] as const;
const ALLOWED_STYLES  = ["formal", "casual", "creative"] as const;
type Gender = (typeof ALLOWED_GENDERS)[number];
type Style  = (typeof ALLOWED_STYLES)[number];

// Server-side cap on each base64 image (after client compression to 1024px JPEG 90%
// each photo should be ~200-500KB binary = ~270-700KB base64). 6MB per slot is a
// safe cap that fits comfortably under Vercel's ~4.5MB body limit for 3 images.
const MAX_BASE64_LEN = 6_000_000;

// Total request body cap. Vercel rejects anything over ~4.5MB at the platform level
// before the function runs, but we double-check after parsing for clean errors.
const MAX_TOTAL_BASE64 = 4_500_000;

// ─── Pure-TS CRC32 + ZIP (no extra deps; runs in Node runtime) ───────────────

const CRC_TABLE = (() => {
  const t: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: { name: string; data: Uint8Array }[]): Buffer {
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const size = data.length;
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    parts.push(local, Buffer.from(data));
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(offset, 42);
    nameBytes.copy(cd, 46);
    centralDir.push(cd);
    offset += 30 + nameBytes.length + size;
  }
  const centralBuf = Buffer.concat(centralDir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, eocd]);
}

// ─── fal.ai REST helpers ─────────────────────────────────────────────────────

async function uploadZipToFal(
  zipBuffer: Buffer,
  fileName: string,
  apiKey: string
): Promise<string> {
  // Step 1: initiate — get presigned PUT URL + final CDN URL
  const initRes = await fetch(
    "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
    {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name: fileName, content_type: "application/zip" }),
    }
  );
  if (!initRes.ok) {
    const text = await initRes.text().catch(() => `HTTP ${initRes.status}`);
    throw new Error(`fal-initiate-${initRes.status}: ${text.slice(0, 200)}`);
  }
  const initData = (await initRes.json()) as { upload_url?: string; file_url?: string };
  if (!initData.upload_url || !initData.file_url) {
    throw new Error(`fal-initiate-no-urls: ${JSON.stringify(initData).slice(0, 200)}`);
  }

  // Step 2: PUT the bytes
  const putRes = await fetch(initData.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "application/zip" },
    body: new Uint8Array(zipBuffer),
  });
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => `HTTP ${putRes.status}`);
    throw new Error(`fal-put-${putRes.status}: ${text.slice(0, 200)}`);
  }
  return initData.file_url;
}

interface FalSubmitResponse {
  request_id?: string;
  detail?: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | string;
  queue_position?: number;
  logs?: { message: string }[];
}

interface FalResultResponse {
  images?: { url: string; width?: number; height?: number }[];
  detail?: string;
}

async function submitToFalQueue(
  zipUrl: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://queue.fal.run/fal-ai/photomaker", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_archive_url: zipUrl,
      prompt,
      style: "Photographic (Default)",
      num_steps: 30,
      style_strength_ratio: 20,
      guidance_scale: 5,
      num_images: 4,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`fal-submit-${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as FalSubmitResponse;
  if (!data.request_id) {
    throw new Error(`fal-submit-no-id: ${data.detail ?? "unknown"}`);
  }
  return data.request_id;
}

/**
 * Poll fal.ai queue for up to maxMs milliseconds. Returns the final image URLs
 * from fal's CDN. Throws on timeout, failure, or empty results.
 */
async function pollFalUntilDone(
  requestId: string,
  apiKey: string,
  maxMs: number
): Promise<string[]> {
  const statusUrl = `https://queue.fal.run/fal-ai/photomaker/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/photomaker/requests/${requestId}`;
  const headers   = { Authorization: `Key ${apiKey}` };

  const deadline = Date.now() + maxMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() > deadline) {
      throw new Error("fal-timeout: job did not complete within budget");
    }
    await new Promise((r) => setTimeout(r, 2500));

    const statusRes = await fetch(statusUrl, { headers });
    if (!statusRes.ok) {
      // Transient — keep polling unless we're out of time
      console.warn(`[linkedin-photo] fal status HTTP ${statusRes.status}`);
      continue;
    }
    const status = (await statusRes.json()) as FalStatusResponse;
    if (status.status === "FAILED") {
      const lastLog = status.logs?.[status.logs.length - 1]?.message ?? "no logs";
      throw new Error(`fal-failed: ${lastLog.slice(0, 200)}`);
    }
    if (status.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, { headers });
      if (!resultRes.ok) {
        const text = await resultRes.text().catch(() => `HTTP ${resultRes.status}`);
        throw new Error(`fal-result-${resultRes.status}: ${text.slice(0, 200)}`);
      }
      const data = (await resultRes.json()) as FalResultResponse;
      const urls = data.images?.map((i) => i.url).filter(Boolean) ?? [];
      if (urls.length === 0) {
        throw new Error(`fal-empty: ${data.detail ?? "no images returned"}`);
      }
      return urls;
    }
    // IN_QUEUE / IN_PROGRESS → keep polling
  }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

// PhotoMaker requires the trigger word "img" right after the noun describing
// the subject. The model uses it to know which token represents the input face.
function buildPrompt(gender: Gender, style: Style): string {
  const subject = `${gender} img`;
  const styleDesc: Record<Style, string> = {
    formal:
      "professional LinkedIn headshot, business formal suit or blazer, clean white or light grey studio background, soft diffused studio lighting with subtle rim light, confident and approachable expression, slight smile, eyes looking directly at camera, shoulders visible, upper body portrait, photorealistic, 8K professional corporate photography",
    casual:
      "professional LinkedIn headshot, smart casual attire in neutral tones (sweater or button-up), clean neutral background, natural warm studio lighting, warm approachable expression, genuine smile, eyes looking at camera, upper body portrait, photorealistic, high-resolution professional portrait photography",
    creative:
      "professional LinkedIn headshot, creative professional attire (tailored jacket, designer top), modern gradient or softly blurred office background, cinematic lighting with depth, confident creative expression, upper body portrait, photorealistic, editorial portrait photography",
  };
  return `professional LinkedIn headshot of a ${subject}, ${styleDesc[style]}, preserve facial identity, sharp focus on eyes`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

interface RequestBody {
  photos?: unknown;
  gender?: unknown;
  style?: unknown;
}

export async function POST(req: NextRequest) {
  // Auth
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }

  // API key
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    console.error("[linkedin-photo] FAL_KEY missing");
    return NextResponse.json(
      {
        error:
          "המחולל לא מוגדר עדיין. יש להוסיף את משתנה הסביבה FAL_KEY ב-Vercel (Settings → Environment Variables).",
      },
      { status: 503 }
    );
  }

  // Parse body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }

  // Validate
  if (!Array.isArray(body.photos) || body.photos.length !== 3) {
    return NextResponse.json({ error: "יש להעלות בדיוק 3 תמונות" }, { status: 400 });
  }
  let totalLen = 0;
  for (let i = 0; i < body.photos.length; i++) {
    const p = body.photos[i];
    if (typeof p !== "string" || p.length === 0) {
      return NextResponse.json({ error: `תמונה ${i + 1} אינה תקינה` }, { status: 400 });
    }
    if (p.length > MAX_BASE64_LEN) {
      return NextResponse.json(
        { error: `תמונה ${i + 1} גדולה מדי — נסי תמונה קטנה יותר או קומפקטית יותר` },
        { status: 413 }
      );
    }
    totalLen += p.length;
  }
  if (totalLen > MAX_TOTAL_BASE64) {
    return NextResponse.json(
      { error: "סך גודל התמונות חורג מהמגבלה — צמצמי לפחות תמונה אחת" },
      { status: 413 }
    );
  }
  if (typeof body.gender !== "string" || !ALLOWED_GENDERS.includes(body.gender as Gender)) {
    return NextResponse.json({ error: 'מגדר לא תקין — חייב להיות "man" או "woman"' }, { status: 400 });
  }
  if (typeof body.style !== "string" || !ALLOWED_STYLES.includes(body.style as Style)) {
    return NextResponse.json({ error: "סגנון לא תקין — formal / casual / creative" }, { status: 400 });
  }

  const gender  = body.gender as Gender;
  const style   = body.style as Style;
  const photos  = body.photos as string[];

  // Build ZIP from photos
  const photoBuffers = photos.map((b64, i) => ({
    name: `photo${i + 1}.jpg`,
    data: new Uint8Array(Buffer.from(b64, "base64")),
  }));
  const zipBuffer = createZip(photoBuffers);

  const prompt = buildPrompt(gender, style);

  // Pipeline: upload → submit → poll. Each step has clear server-side logging.
  try {
    console.log("[linkedin-photo] uploading zip to fal", { sizeBytes: zipBuffer.length });
    const zipUrl = await uploadZipToFal(zipBuffer, "photos.zip", FAL_KEY);

    console.log("[linkedin-photo] submitting to fal queue", { gender, style });
    const requestId = await submitToFalQueue(zipUrl, prompt, FAL_KEY);

    console.log("[linkedin-photo] polling for result", { requestId });
    const images = await pollFalUntilDone(requestId, FAL_KEY, 50_000);

    console.log("[linkedin-photo] success", { requestId, count: images.length });
    return NextResponse.json({ images });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error("[linkedin-photo] failure:", raw);

    // Map technical errors → clean Hebrew user-facing message
    let userMsg: string;
    let status = 502;
    if (raw.startsWith("fal-timeout")) {
      userMsg = "ה-AI לקח יותר מדי זמן — נסי שוב בעוד דקה (עומס זמני)";
      status = 504;
    } else if (raw.startsWith("fal-submit") && raw.includes("401")) {
      userMsg = "הרשאות API אינן תקינות — יש לעדכן את FAL_KEY ב-Vercel";
      status = 503;
    } else if (raw.includes("400") || raw.includes("422")) {
      userMsg = "אחת התמונות נדחתה ע״י המודל — נסי תמונות פנים ברורות יותר";
      status = 400;
    } else if (raw.startsWith("fal-failed")) {
      userMsg = "המודל נכשל בעיבוד — נסי תמונות חדות יותר עם פנים ברורים";
    } else if (raw.startsWith("fal-empty")) {
      userMsg = "המודל לא החזיר תמונות הפעם — נסי שוב";
    } else if (raw.includes("ETIMEDOUT") || raw.includes("ECONNRESET")) {
      userMsg = "תקלת רשת מול ספק התמונות — נסי שוב";
    } else {
      userMsg = "אירעה שגיאה ביצירת התמונה. אם זה ממשיך, פני לקורל.";
    }

    return NextResponse.json({ error: userMsg, debug: raw.slice(0, 300) }, { status });
  }
}
