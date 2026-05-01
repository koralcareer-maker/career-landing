import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Node runtime (auth() needs Prisma adapter). 60s on Vercel Pro covers
// the 2 parallel Gemini calls (~10-15s each, run in parallel).
export const maxDuration = 60;

const ALLOWED_GENDERS = ["man", "woman"] as const;
const ALLOWED_STYLES  = ["formal", "casual", "creative"] as const;

type Gender = (typeof ALLOWED_GENDERS)[number];
type Style  = (typeof ALLOWED_STYLES)[number];

interface Variant {
  styling: string;
  setting: string;
  lighting: string;
  expression: string;
}

const STYLES: Record<Style, Variant[]> = {
  formal: [
    {
      styling: "wearing a sharp tailored navy blazer over a crisp white shirt, no tie, polished executive look",
      setting: "clean light-grey studio gradient background, subtle vignette",
      lighting: "soft diffused key light from camera-left with gentle rim light",
      expression: "confident slight smile, direct eye contact, head straight",
    },
    {
      styling: "charcoal grey suit jacket with a soft-toned shirt, modern executive style",
      setting: "off-white seamless studio backdrop with very soft gradient",
      lighting: "warm key light with bright fill, magazine-cover lighting",
      expression: "warm professional smile, head turned three-quarters to camera",
    },
  ],
  casual: [
    {
      styling: "quality fine-knit sweater in soft beige or warm grey, smart casual",
      setting: "warm neutral studio backdrop in soft beige tones",
      lighting: "natural warm window-style lighting from the side, golden-hour tone",
      expression: "genuine warm smile showing slight teeth, relaxed and approachable",
    },
    {
      styling: "smart casual button-up shirt, top button open, modern minimalist look",
      setting: "clean off-white studio with subtle warm tone",
      lighting: "soft diffused front lighting, even skin tones",
      expression: "calm confident smile, head slightly angled, friendly and engaged",
    },
  ],
  creative: [
    {
      styling: "stylish tailored jacket over a designer top, modern creative-professional look",
      setting: "softly blurred modern minimalist office space, bokeh background",
      lighting: "cinematic side lighting with depth and subtle shadow play",
      expression: "confident charismatic expression, slight smirk, head three-quarters",
    },
    {
      styling: "refined modern outfit with subtle texture or pattern, designer-grade clothing",
      setting: "subtle deep-blue gradient background with soft glow",
      lighting: "dramatic rim light from behind plus soft front fill",
      expression: "thoughtful confident look, slight smile, direct gaze",
    },
  ],
};

function buildPrompt(gender: Gender, v: Variant): string {
  return `Generate a hyper-realistic professional LinkedIn headshot photograph.

CRITICAL — IDENTITY PRESERVATION: Use the reference photos to preserve the EXACT face of this ${gender}. Keep the same facial structure, eye shape, eye color, nose, mouth, jawline, skin tone, hair color, hair style, and any defining features (freckles, glasses, beard, etc.) IDENTICAL to the reference. Do not alter, beautify, or change the person's face.

STYLING: ${v.styling}.
SETTING: ${v.setting}.
LIGHTING: ${v.lighting}.
EXPRESSION: ${v.expression}.
FRAMING: Tight upper-body portrait, chest up, square 1:1 composition, face occupies center 60% of the frame.
TECHNICAL: Sharp focus on the eyes, shallow depth of field, photographic realism, high-end commercial photography quality, no plastic skin.
NEGATIVE: No illustrations, paintings, cartoons, or stylized art. Do not change the person's race, age, or gender. No watermarks, no text.`;
}

interface GeminiResponse {
  candidates?: { content: { parts: { inline_data?: { data: string; mime_type: string } }[] } }[];
  error?: { message: string; status?: string; code?: number };
  promptFeedback?: { blockReason?: string };
}

interface VariantResult { image?: string; error?: string }

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

async function generateOne(
  variant: Variant,
  gender: Gender,
  refs: { inline_data: { mime_type: string; data: string } }[],
  apiKey: string
): Promise<VariantResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildPrompt(gender, variant) }, ...refs] }],
    generationConfig: { imageConfig: { aspectRatio: "1:1" } },
  });

  // Up to 2 attempts: original + 1 retry on overload only.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await res.json().catch(() => null)) as GeminiResponse | null;
      if (!data) {
        if (attempt === 1) { await sleep(2000); continue; }
        return { error: `שגיאת שרת מהמודל (HTTP ${res.status})` };
      }
      if (data.error) {
        const isOverload =
          data.error.code === 429 ||
          data.error.code === 503 ||
          /UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i.test(
            data.error.status ?? data.error.message ?? ""
          );
        if (isOverload && attempt === 1) { await sleep(3000); continue; }
        return { error: `שגיאת המודל: ${data.error.message.slice(0, 200)}` };
      }
      const block = data.promptFeedback?.blockReason;
      if (block) return { error: `התמונה נחסמה ע"י מסנן בטיחות (${block})` };

      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inline_data?.data);
      if (!part?.inline_data?.data) {
        return { error: "המודל לא החזיר תמונה — נסי תמונה ברורה יותר של הפנים" };
      }
      return { image: `data:${part.inline_data.mime_type ?? "image/png"};base64,${part.inline_data.data}` };
    } catch (e) {
      if (attempt === 1) { await sleep(1500); continue; }
      return { error: `שגיאת רשת מול המודל: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` };
    }
  }
  return { error: "כשל לא צפוי" };
}

interface RequestBody {
  photos?: unknown;
  gender?: unknown;
  style?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY חסר ב-Vercel — יש להוסיף אותו ב-Settings → Environment Variables" },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }

  if (!Array.isArray(body.photos) || body.photos.length !== 3) {
    return NextResponse.json({ error: "יש להעלות בדיוק 3 תמונות" }, { status: 400 });
  }
  for (let i = 0; i < body.photos.length; i++) {
    const p = body.photos[i];
    if (typeof p !== "string" || p.length === 0) {
      return NextResponse.json({ error: `תמונה ${i + 1} אינה תקינה` }, { status: 400 });
    }
    if (p.length > 6_000_000) {
      return NextResponse.json(
        { error: `תמונה ${i + 1} גדולה מדי אחרי דחיסה — נסי תמונה אחרת` },
        { status: 413 }
      );
    }
  }
  if (typeof body.gender !== "string" || !ALLOWED_GENDERS.includes(body.gender as Gender)) {
    return NextResponse.json({ error: 'מגדר לא תקין — חייב להיות "man" או "woman"' }, { status: 400 });
  }
  if (typeof body.style !== "string" || !ALLOWED_STYLES.includes(body.style as Style)) {
    return NextResponse.json({ error: "סגנון לא תקין — formal / casual / creative" }, { status: 400 });
  }

  const gender = body.gender as Gender;
  const style  = body.style as Style;
  const photos = body.photos as string[];
  const refs   = photos.map((data) => ({ inline_data: { mime_type: "image/jpeg", data } }));
  const variants = STYLES[style];

  const settled = await Promise.all(variants.map((v) => generateOne(v, gender, refs, apiKey)));
  const images = settled.map((r) => r.image).filter((x): x is string => Boolean(x));
  const errors = settled.map((r) => r.error).filter((x): x is string => Boolean(x));

  if (images.length === 0) {
    const reason = errors[0] ?? "לא הצלחנו ליצור תמונות הפעם";
    console.error("[linkedin-photo] all variants failed", { errors });
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  return NextResponse.json({ images, partialErrors: errors });
}
