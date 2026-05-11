import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JOB_CATEGORIES, mapFieldToCategory } from "@/lib/job-categories";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Bulk-import Civi job URLs. Admin pastes a list of
 * `app.civi.co.il/promo/id=...` URLs; for each one we:
 *
 *   1. Fetch the HTML server-side.
 *   2. Ask Gemini to extract structured fields (title, company,
 *      location, field, summary, experience).
 *   3. Map the freeform `field` to one of our 32 canonical
 *      JOB_CATEGORIES via mapFieldToCategory.
 *   4. Insert into the Job table — idempotent by externalUrl.
 *
 * Same shape as /api/admin/import-civi-jobs* but the data is provided
 * at request time rather than hardcoded in the route. This is what
 * Coral uses to add fresh batches without code changes.
 */

interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  summary: string;
  field: string;
  experienceLevel: string | null;
}

async function extractWithGemini(html: string, sourceUrl: string): Promise<ExtractedJob | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Strip <script>/<style> so the prompt isn't drowned in JS.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 8000);

  const prompt = `מתוך תיאור משרה ישראלית שמיובא מ-civi.co.il, חלץ את הפרטים הבאים. החזר JSON תקין ואחר ושום דבר נוסף.

URL: ${sourceUrl}

תוכן הדף:
${cleaned}

החזר JSON במבנה:
{
  "title": "תפקיד בעברית, ניטרלי-מגדר אם אפשר (לדוגמה 'איש/ת מכירות')",
  "company": "שם החברה. אם לא צוין, רשום תיאור כללי ('חברה קמעונאית מובילה' וכו')",
  "location": "אזור / עיר. אם לא צוין, 'ארצי' או תיאור גמיש",
  "summary": "סיכום של 2-3 משפטים, בעברית, על המשרה",
  "field": "קטגוריה כללית (בנקאות, מכירות, היי-טק, וכו')",
  "experienceLevel": "ניסיון נדרש בעברית (מחרוזת אחת), או null אם אין"
}`;

  try {
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
            maxOutputTokens: 1024,
          },
        }),
      },
    );
    if (!r.ok) return null;
    const data = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(txt) as ExtractedJob;
  } catch {
    return null;
  }
}

async function fetchJobHtml(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      },
      redirect: "follow",
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

interface ImportResult {
  total: number;
  imported: { title: string; id: string; category: string }[];
  skipped: { url: string; reason: string }[];
  failed: { url: string; reason: string }[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  let body: { urls?: string[] };
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  // Dedupe + trim + filter empty.
  const urls = Array.from(
    new Set(rawUrls.map((u) => u.trim()).filter((u) => u.startsWith("http"))),
  );

  if (urls.length === 0) {
    return NextResponse.json({ error: "לא סופקו URLs" }, { status: 400 });
  }
  if (urls.length > 50) {
    return NextResponse.json(
      { error: "מקסימום 50 URLs בפעם. חלקי את הרשימה." },
      { status: 400 },
    );
  }

  const result: ImportResult = {
    total: urls.length,
    imported: [],
    skipped: [],
    failed: [],
  };

  for (const url of urls) {
    try {
      // Idempotency — skip URLs already in DB.
      const exists = await prisma.job.findFirst({
        where: { externalUrl: url },
        select: { id: true, title: true },
      });
      if (exists) {
        result.skipped.push({ url, reason: "already-imported" });
        continue;
      }

      const html = await fetchJobHtml(url);
      if (!html) {
        result.failed.push({ url, reason: "fetch-failed" });
        continue;
      }

      const extracted = await extractWithGemini(html, url);
      if (!extracted || !extracted.title) {
        result.failed.push({ url, reason: "extract-failed" });
        continue;
      }

      const category = mapFieldToCategory(extracted.field);

      const job = await prisma.job.create({
        data: {
          title: extracted.title.slice(0, 200),
          company: extracted.company.slice(0, 200),
          location: extracted.location.slice(0, 200),
          summary: extracted.summary.slice(0, 2000),
          // Store the canonical category in `field` so the /jobs filter
          // picks it up directly without needing mapFieldToCategory at
          // read time.
          field: category,
          experienceLevel: extracted.experienceLevel?.slice(0, 500) ?? undefined,
          externalUrl: url,
          source: "civi.co.il",
          isPublished: true,
          createdById: session.user.id,
        },
        select: { id: true, title: true },
      });
      result.imported.push({ title: job.title, id: job.id, category });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.failed.push({ url, reason: msg.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    importedCount: result.imported.length,
    skippedCount: result.skipped.length,
    failedCount: result.failed.length,
    ...result,
    categoriesCovered: Array.from(
      new Set(result.imported.map((i) => i.category)),
    ).sort((a, b) => JOB_CATEGORIES.indexOf(a as never) - JOB_CATEGORIES.indexOf(b as never)),
  });
}
