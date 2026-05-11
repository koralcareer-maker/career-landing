import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Auto-fill helper for the job-application tracker. The user pastes a URL
 * to a job posting (LinkedIn / Civi / Drushim / company careers page / ...);
 * we fetch the page and ask Gemini to pull out company + role + a one-line
 * note. Everything's best-effort — if anything fails we return null fields
 * and the form falls back to manual entry.
 */

interface Extracted {
  company: string | null;
  role: string | null;
  location: string | null;
  notes: string | null;
}

function sourceFromHostname(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("civi.co.il")) return "Civi";
    if (host.includes("alljobs.co.il")) return "AllJobs";
    if (host.includes("drushim.co.il")) return "Drushim";
    if (host.includes("jobmaster.co.il")) return "JobMaster";
    if (host.includes("glassdoor.com")) return "Glassdoor";
    if (host.includes("indeed.com") || host.includes("indeed.co.il")) return "Indeed";
    if (host.includes("ziprecruiter")) return "ZipRecruiter";
    if (host.includes("googleads") || host.includes("careers.google")) return "Google Careers";
    if (host.includes("greenhouse.io") || host.includes("lever.co") || host.includes("workable.com")) return "אתר חברה";
    if (host.endsWith(".co.il") || host.endsWith(".com") || host.endsWith(".net")) return "אתר חברה";
    return host;
  } catch {
    return "";
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      // Some career sites are slow — but the API maxDuration caps us anyway.
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

async function extractWithGemini(html: string, sourceUrl: string): Promise<Extracted | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Try to keep the <title> + first few headers if possible since LinkedIn
  // and similar sites stuff key info there. Then strip the rest aggressively
  // so we stay under Gemini's token budget.
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].slice(0, 200) : "";

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogTitle = ogTitleMatch ? ogTitleMatch[1].slice(0, 200) : "";
  const ogDesc = ogDescMatch ? ogDescMatch[1].slice(0, 400) : "";

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 7000);

  const prompt = `נתון דף משרה מאתר באינטרנט. חלצי את הפרטים. כתבי בעברית. תני שמות הגיוניים — אל תמציאי. אם משהו לא ברור — החזירי null.

URL: ${sourceUrl}
<title>: ${title}
<og:title>: ${ogTitle}
<og:description>: ${ogDesc}

תוכן הדף:
${cleaned}

החזירי JSON תקין בלבד במבנה הבא, בלי שום טקסט סביב:
{
  "company": "שם החברה כפי שמופיע בדף (לדוגמה 'Google', 'וויקס', 'בנק הפועלים'). null אם לא ברור.",
  "role": "כותרת המשרה (לדוגמה 'מנהל/ת מוצר', 'Senior Frontend Developer'). null אם לא ברור.",
  "location": "מיקום (לדוגמה 'תל אביב', 'הרצליה', 'מרחוק'). null אם לא צוין.",
  "notes": "סיכום בשורה אחת קצרה של דרישות מרכזיות, או null."
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
            maxOutputTokens: 512,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!r.ok) return null;
    const data = (await r.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(txt) as Extracted;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "JSON לא תקין" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "כתובת לא תקינה" }, { status: 400 });
  }

  const source = sourceFromHostname(url);

  const html = await fetchHtml(url);
  if (!html) {
    // Page couldn't be fetched (LinkedIn 403, network error, etc.).
    // Still give the user the URL + auto-detected source — they'll
    // fill the rest manually.
    return NextResponse.json({
      ok: true,
      company: null,
      role: null,
      location: null,
      notes: null,
      source,
      jobLink: url,
      reason: "fetch-failed",
    });
  }

  const extracted = await extractWithGemini(html, url);

  return NextResponse.json({
    ok: true,
    company: extracted?.company ?? null,
    role: extracted?.role ?? null,
    location: extracted?.location ?? null,
    notes: extracted?.notes ?? null,
    source,
    jobLink: url,
    reason: extracted ? null : "extract-failed",
  });
}
