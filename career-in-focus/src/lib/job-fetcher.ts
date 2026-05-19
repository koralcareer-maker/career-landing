/**
 * Auto-fetch jobs from the web using Gemini with Google-Search
 * grounding. The grounded model can hit live search results, parse
 * listings from major Israeli job boards, and return structured JSON
 * we can drop into our Job table.
 *
 * Why grounded Gemini rather than scraping:
 *   - The big Israeli boards (AllJobs / JobMaster / Drushim / LinkedIn)
 *     either block scraping or require paid API access. Grounded Gemini
 *     is the closest legal/reliable shortcut we have without adding a
 *     paid scraper subscription.
 *   - Gemini's grounding tool fetches search-engine snippets, so the
 *     URLs come from Google indexing (not scraping the boards) — that
 *     keeps us inside fair-use territory.
 *
 * Quality safety net:
 *   - Each URL goes through the same HEAD/GET probe that the nightly
 *     link-validator uses (lib/.../validate-job-links). Dead URLs
 *     are dropped *before* the row gets created, not after.
 *   - Idempotent by externalUrl (the @unique on Job.externalUrl in
 *     Prisma — already there) so re-running doesn't dupe rows.
 */

import { prisma } from "@/lib/prisma";
import type { FetchCategory } from "./job-categories-config";

const REQUEST_TIMEOUT_MS = 30_000;

interface FetchedJob {
  title: string;
  company: string;
  description?: string;
  location?: string;
  region?: string;
  externalUrl: string;
}

interface FetchResult {
  query: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

/**
 * Run one fetch cycle for the supplied list of categories.
 * Returns a per-category summary so the cron handler / admin tool
 * can display what happened.
 */
export async function runJobFetch(
  categories: FetchCategory[],
): Promise<{ totalInserted: number; totalSkipped: number; perCategory: FetchResult[] }> {
  const perCategory: FetchResult[] = [];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const cat of categories) {
    const summary: FetchResult = {
      query: cat.query,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      errors: [],
    };
    try {
      const jobs = await askGeminiForJobs(cat);
      summary.fetched = jobs.length;
      for (const j of jobs) {
        const ok = await tryInsertJob(j, cat);
        if (ok) summary.inserted++;
        else summary.skipped++;
      }
    } catch (e) {
      summary.errors.push(e instanceof Error ? e.message : "unknown");
    }
    perCategory.push(summary);
    totalInserted += summary.inserted;
    totalSkipped += summary.skipped;
  }

  return { totalInserted, totalSkipped, perCategory };
}

/**
 * Ask Gemini (with Google Search grounding) for `cat.target` real job
 * listings matching the query. Returns parsed JSON or [] on any error.
 */
async function askGeminiForJobs(cat: FetchCategory): Promise<FetchedJob[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return [];

  const prompt = `אני בונה לוח משרות בישראל. חפש בגוגל ${cat.target} משרות פעילות עבור: "${cat.query}".

חוקים נוקשים — אסור לעבור עליהם:
1. רק משרות שפורסמו ב-30 הימים האחרונים.
2. רק URL מלא ופעיל ממקור אמיתי: LinkedIn jobs, AllJobs, JobMaster, Drushim, GeeksDontFly, Indeed Israel, drushim.co.il, או דף קריירה רשמי של חברה.
3. רק חברות אמיתיות שפועלות בישראל. **בלי המצאות**. אם אינך בטוח בכתובת ה-URL, אל תכלול את המשרה.
4. אל תחזיר תיאורים גנריים. כל תיאור צריך להיות 1-2 משפטים מהמודעה האמיתית.

החזר JSON בלבד, ללא markdown, בפורמט:
{
  "jobs": [
    {
      "title": "כותרת המשרה כפי שמופיעה במודעה",
      "company": "שם החברה",
      "description": "1-2 משפטים מהמודעה",
      "location": "תל אביב / חיפה / מרכז / ...",
      "region": "מרכז / צפון / חיפה / שפלה / ירושלים / דרום / אילת",
      "externalUrl": "https://..."
    }
  ]
}`;

  // Model cascade. Pro has the best grounded-search quality but free
  // tier is capped at ~50 requests/day across the project, and on
  // 2026-05-19 the first SOCIAL fetch run came back with 0 fetched /
  // 0 errors logged — Pro was silently quota-blocked. Flash gives us
  // ~1500 requests/day on the same key and supports grounded search.
  // Try each model in order; whichever returns a non-empty array wins.
  const MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // The grounded-search tool is what makes this actually work —
          // without it the model just makes URLs up. Google Search is
          // the public tool name; Gemini auto-routes the query and feeds
          // the snippets back into the answer.
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        }),
      });
      if (!res.ok) {
        console.warn(`[job-fetcher] ${model} HTTP`, res.status, await res.text().catch(() => ""));
        // 429 = quota / rate limit. Try the next model.
        if (res.status === 429 || res.status === 503) continue;
        // Other HTTP errors: bail this query, don't burn through every model.
        return [];
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!text.trim()) {
        // Empty body — possibly safety-blocked or a silent quota issue.
        // Fall through to the next cheaper model.
        continue;
      }
      // Grounded responses sometimes wrap JSON in ```json ... ``` fences.
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      try {
        const parsed = JSON.parse(clean) as { jobs?: FetchedJob[] };
        const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
        if (jobs.length > 0) return jobs;
        // Zero jobs from this model — try the next.
      } catch {
        // JSON parse fail — try the next model.
      }
    }
    return [];
  } catch (e) {
    console.warn("[job-fetcher] error for query", cat.query, e instanceof Error ? e.message : e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates the URL is reachable, then upserts the job into the DB.
 * Returns true if a new row was inserted; false if skipped (dead URL,
 * duplicate, or missing fields).
 */
async function tryInsertJob(j: FetchedJob, cat: FetchCategory): Promise<boolean> {
  if (!j.title || !j.company || !j.externalUrl) return false;
  if (!/^https?:\/\//i.test(j.externalUrl)) return false;

  // Idempotent: existing row → leave it alone.
  const dup = await prisma.job.findFirst({
    where: { externalUrl: j.externalUrl },
    select: { id: true },
  });
  if (dup) return false;

  // Cheap reachability check before persisting. Drops obvious 404s
  // / hallucinated URLs so they never enter the listing.
  const alive = await probeUrl(j.externalUrl);
  if (!alive) return false;

  await prisma.job.create({
    data: {
      title: j.title.slice(0, 200),
      company: j.company.slice(0, 120),
      summary: j.description?.slice(0, 600) ?? null,
      location: j.location?.slice(0, 80) ?? null,
      region: classifyRegion(j.region ?? j.location ?? null),
      field: cat.field,
      experienceLevel: cat.experienceLevel ?? null,
      source: detectSource(j.externalUrl),
      externalUrl: j.externalUrl,
      isPublished: true,
    },
  });
  return true;
}

async function probeUrl(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7_000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CareerInFocus-Fetcher/1.0)" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (res.status >= 200 && res.status < 400) return true;
    // Some boards 405 HEAD — try a tiny GET.
    if (res.status === 405) {
      const r2 = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        signal: ctrl.signal,
      });
      return r2.status >= 200 && r2.status < 400;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const REGIONS = ["צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת"] as const;
function classifyRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const r = raw.trim();
  for (const region of REGIONS) {
    if (r.includes(region)) return region;
  }
  // Common city → region heuristic. Lightweight; the nightly link-
  // validator doesn't care, and this just helps the dashboard chips.
  if (/תל אביב|הרצליה|רמת גן|פתח תקווה|רעננה|בני ברק|כפר סבא/.test(r)) return "מרכז";
  if (/ירושלים|בית שמש/.test(r)) return "ירושלים";
  if (/חיפה|קריות/.test(r)) return "חיפה";
  if (/באר שבע|אשדוד|אשקלון|דימונה/.test(r)) return "דרום";
  if (/נתניה|ראשון לציון|רחובות|חולון/.test(r)) return "שפלה";
  if (/נצרת|טבריה|עפולה|צפת/.test(r)) return "צפון";
  return null;
}

function detectSource(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("alljobs")) return "AllJobs";
    if (host.includes("jobmaster")) return "JobMaster";
    if (host.includes("drushim")) return "Drushim";
    if (host.includes("indeed")) return "Indeed";
    if (host.includes("geeksdontfly") || host.includes("geek")) return "Geek";
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}
