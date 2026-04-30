import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Allow up to 60s on Vercel Pro; on hobby plan the queue polling avoids this limit
export const maxDuration = 60;

// ─── Pure-TS CRC32 ────────────────────────────────────────────────────────────

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

// ─── Pure-TS ZIP creator (stored, no compression) ────────────────────────────

function createZip(files: { name: string; data: Uint8Array }[]): Buffer {
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const size = data.length;

    // Local file header (30 bytes + name)
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);   // stored
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);
    parts.push(local, Buffer.from(data));

    // Central directory entry (46 bytes + name)
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

// ─── Fal.ai helpers ───────────────────────────────────────────────────────────

const FAL_KEY = () => process.env.FAL_KEY ?? "";

async function uploadToFal(data: Buffer, fileName: string, contentType: string): Promise<string> {
  // Step 1: Initiate upload — get a presigned PUT URL + the final CDN URL
  const initRes = await fetch(
    "https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
    {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_KEY()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name: fileName, content_type: contentType }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text().catch(() => `HTTP ${initRes.status}`);
    throw new Error(`fal.ai initiate failed (${initRes.status}): ${errText.slice(0, 300)}`);
  }

  const { upload_url, file_url } = await initRes.json() as { upload_url: string; file_url: string };

  // Step 2: PUT the binary to the presigned URL (no auth header needed — it's pre-signed)
  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(data),
  });

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => `HTTP ${putRes.status}`);
    throw new Error(`fal.ai upload PUT failed (${putRes.status}): ${errText.slice(0, 300)}`);
  }

  return file_url;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });

  if (!FAL_KEY()) {
    return NextResponse.json({ error: "FAL_KEY אינו מוגדר — יש להוסיף אותו לסביבה" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const gender = (formData.get("gender") as string | null) ?? "woman";
    const style  = (formData.get("style")  as string | null) ?? "formal";

    // Collect uploaded photos
    const photoBuffers: { name: string; data: Uint8Array }[] = [];
    for (let i = 1; i <= 3; i++) {
      const file = formData.get(`photo${i}`) as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() ?? "jpg";
        photoBuffers.push({ name: `photo${i}.${ext}`, data: new Uint8Array(await file.arrayBuffer()) });
      }
    }

    if (photoBuffers.length === 0) {
      return NextResponse.json({ error: "יש להעלות לפחות תמונה אחת" }, { status: 400 });
    }

    // Create ZIP + upload
    const zip = createZip(photoBuffers);
    const zipUrl = await uploadToFal(zip, "photos.zip", "application/zip");

    // Build prompt
    const genderHe = gender === "man" ? "man" : "woman";
    const prompts: Record<string, string> = {
      formal: `professional LinkedIn headshot of a ${genderHe} img, business formal suit or blazer, clean white or light grey studio background, soft diffused studio lighting with subtle rim light, confident and approachable expression, slight smile, eyes looking directly at camera, shoulders visible, upper body portrait, preserve facial identity, photorealistic, 8K professional corporate photography`,
      casual: `professional LinkedIn headshot of a ${genderHe} img, smart casual attire in neutral tones, clean neutral background, natural warm studio lighting, warm approachable expression, genuine smile, eyes looking at camera, upper body portrait, preserve facial identity, photorealistic, high resolution professional portrait photography`,
      creative: `professional LinkedIn headshot of a ${genderHe} img, creative professional attire, modern gradient or blurred office background, cinematic lighting, confident creative expression, upper body portrait, preserve facial identity, photorealistic, editorial portrait photography`,
    };
    const prompt = prompts[style] ?? prompts.formal;

    // Submit to fal.ai queue
    const submitRes = await fetch("https://queue.fal.run/fal-ai/photomaker", {
      method: "POST",
      headers: { Authorization: `Key ${FAL_KEY()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_archive_url: zipUrl,
        prompt,
        style: "Photographic (Default)",
        num_steps: 30,
        style_strength_ratio: 20,
        guidance_scale: 5,
        num_images: 2,
      }),
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      console.error("PhotoMaker queue submit error:", err);
      return NextResponse.json({ error: `שגיאה בהגשת משימה ל-fal.ai: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const submitted = await submitRes.json() as { request_id?: string };
    const requestId = submitted.request_id;

    if (!requestId) {
      return NextResponse.json({ error: "לא התקבל request_id מ-fal.ai" }, { status: 500 });
    }

    return NextResponse.json({ requestId });

  } catch (err) {
    console.error("LinkedIn photo route unhandled error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `שגיאת שרת: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
