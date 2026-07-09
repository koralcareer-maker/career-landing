/**
 * POST /api/admin/paste-jobs
 *
 * Takes raw text (typically pasted from a WhatsApp job broadcast) and
 * uses Gemini to extract one or more structured job records, then
 * persists them with source="קורל - וואטסאפ", isHot=true, isPublished=true.
 *
 * Body: { text: string, source?: string }
 *
 * Dedupes by generated externalUrl (contactEmail-derived mailto: or
 * synthetic "coral-paste:<slug>") so the same message pasted twice
 * doesn't create duplicates.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyRegion } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ExtractedJob {
  title: string;
  company: string;
  description: string;
  location: string | null;
  field: string;
  contactEmail: string | null;
  externalUrl: string | null;
}

const VALID_FIELDS = [
  "AI/ML", "Customer Success", "Cyber", "Mobile", "QA",
  "גיוס", "דאטה", "חברתי קהילתי", "כספים", "לוגיסטיקה",
  "מוצר", "מכירות", "משאבי אנוש", "ניהול", "עיצוב",
  "פיתוח", "שיווק", "שירות לקוחות", "תעשייה", "תפעול",
  "אדמיניסטרציה", "בנקאות", "ביטוח", "רפואה ובריאות",
  "חינוך והדרכה", "מסעדנות ותיירות", "עורכי דין", "אבטחה",
];

async function extractJobsWithGemini(text: string): Promise<ExtractedJob[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const prompt = `נתון טקסט של פרסום משרות (בד"כ מוואטסאפ). חלצי את כל המשרות שמופיעות בטקסט. עשוי להיות אחד או יותר.

טקסט:
${text.slice(0, 6000)}

תחומים אפשריים לשדה field: ${VALID_FIELDS.join(", ")}

החזירי JSON תקין בלבד במבנה הבא, בלי טקסט סביב:
{
  "jobs": [
    {
      "title": "כותרת התפקיד המדויקת",
      "company": "שם החברה (אם לא ברור - 'חברה מובילה')",
      "description": "תיאור מלא של המשרה כולל דרישות, אזורי עבודה, תנאים - כמו שמופיע בטקסט",
      "location": "מיקום (עיר או אזור) או null",
      "field": "תחום מהרשימה למעלה שהכי מתאים",
      "contactEmail": "אימייל ליצירת קשר אם מופיע, אחרת null",
      "externalUrl": "URL אם מופיע קישור בטקסט (civi.co.il, alljobs וכו') אחרת null"
    }
  ]
}

חשוב: אם יש מספר משרות בטקסט (למשל רשימה עם כותרות שונות), החזירי את כולן. אם זה רק טקסט של משרה אחת - החזירי מערך עם משרה אחת.`;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const data = (await r.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(txt) as { jobs?: ExtractedJob[] };
  return Array.isArray(parsed.jobs) ? parsed.jobs : [];
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== "string" || body.text.trim().length < 20) {
    return NextResponse.json(
      { error: "צריך לשלוח שדה text עם לפחות 20 תווים" },
      { status: 400 },
    );
  }

  const source = typeof body.source === "string" ? body.source : "קורל - וואטסאפ";

  let extracted: ExtractedJob[] = [];
  try {
    extracted = await extractJobsWithGemini(body.text);
  } catch (e) {
    return NextResponse.json(
      { error: "extraction failed: " + String(e instanceof Error ? e.message : e) },
      { status: 500 },
    );
  }

  if (extracted.length === 0) {
    return NextResponse.json(
      { error: "לא זוהתה משרה בטקסט. נסי לוודא שיש כותרת + תיאור." },
      { status: 400 },
    );
  }

  const normalized = extracted.map((j) => {
    const externalUrl =
      j.externalUrl ??
      (j.contactEmail
        ? `mailto:${j.contactEmail}?subject=${encodeURIComponent(j.title + " — קריירה בפוקוס")}`
        : `coral-paste:${(j.title + "-" + j.company).replace(/\s+/g, "-").slice(0, 100)}`);
    const region = classifyRegion(j.location);
    return { ...j, externalUrl, region };
  });

  const urls = normalized.map((j) => j.externalUrl);
  const existing = await prisma.job.findMany({
    where: { externalUrl: { in: urls } },
    select: { externalUrl: true, id: true },
  });
  const existingSet = new Set(existing.map((e) => e.externalUrl));

  const results: Array<{ title: string; company: string; status: string; id?: string }> = [];
  for (const j of normalized) {
    if (existingSet.has(j.externalUrl)) {
      results.push({ title: j.title, company: j.company, status: "duplicate" });
      continue;
    }
    try {
      const created = await prisma.job.create({
        data: {
          title: j.title,
          company: j.company,
          description: j.description,
          summary: j.description.slice(0, 240),
          location: j.location ?? null,
          region: j.region,
          field: j.field,
          source,
          externalUrl: j.externalUrl,
          isHot: true,
          isPublished: true,
        },
      });
      existingSet.add(j.externalUrl);
      results.push({
        title: j.title,
        company: j.company,
        status: "created",
        id: created.id,
      });
    } catch (e) {
      results.push({
        title: j.title,
        company: j.company,
        status: "error: " + String(e instanceof Error ? e.message : e).slice(0, 100),
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const duplicates = results.filter((r) => r.status === "duplicate").length;
  const errors = results.filter((r) => r.status.startsWith("error")).length;

  return NextResponse.json({
    ok: true,
    total: results.length,
    created,
    duplicates,
    errors,
    jobs: results,
  });
}
