/**
 * Daily cron — verifies every published job's externalUrl is still
 * reachable, then pulls in fresh jobs from Israeli companies' public
 * ATS feeds (Greenhouse / Lever / Comeet) so the board stays alive
 * without manual maintenance.
 *
 * Coral asked for this explicitly: "אחת ליום בערב לוודא שכל הקישורים
 * פעילים מה שלא להוריד" + "להזין את המערכת פעם ביומיים". Both jobs
 * live in this single cron route because Vercel's Pro plan caps the
 * project at 7 cron entries — splitting them into separate crons
 * blocks every deploy with a silent "Deploying outputs ● Error".
 *
 * Strategy (validation):
 *   - HEAD request first (cheaper). Some boards block HEAD → fall back
 *     to a tiny GET with Range: bytes=0-0 so we don't download a full
 *     HTML page just to learn it exists.
 *   - 2xx / 3xx → keep published.
 *   - 4xx / 5xx (after retry) → mark isPublished=false. We don't delete
 *     so admins can see what got auto-unpublished and re-enable if it
 *     was a transient outage.
 *   - Network errors (DNS failure, timeout) → keep published this run;
 *     transient errors shouldn't take down jobs. The next nightly run
 *     will catch persistent ones.
 *
 * Strategy (fetch):
 *   - Always run `syncCompanyCareers()` — it's free (public ATS APIs)
 *     and idempotent by externalUrl, so daily is safe.
 *   - The expensive Gemini fetcher is NOT run from cron — it stays on
 *     the admin manual trigger (`/api/admin/fetch-jobs`).
 *
 * Scheduled at 21:00 UTC (vercel.json). Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncCompanyCareers } from "@/lib/company-careers";

const CRON_SECRET_FALLBACK = "career-in-focus-cron-2026"; // mirrors other cron routes

const REQUEST_TIMEOUT_MS = 8_000;
const CONCURRENCY = 8;        // how many URLs we hit in parallel
const USER_AGENT =
  "Mozilla/5.0 (compatible; CareerInFocus-LinkChecker/1.0; +https://app.careerinfocus.co.il)";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? CRON_SECRET_FALLBACK;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    where: {
      isPublished: true,
      externalUrl: { not: null },
    },
    select: { id: true, externalUrl: true, title: true, company: true },
  });

  const results = { total: jobs.length, alive: 0, dead: 0, skipped: 0 };
  const deadIds: string[] = [];

  // Bounded concurrency: process in chunks of CONCURRENCY so we don't
  // open hundreds of sockets at once and don't get rate-limited.
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    const checks = await Promise.all(
      chunk.map(async (j) => {
        if (!j.externalUrl) return { id: j.id, status: "skipped" as const };
        const status = await probeUrl(j.externalUrl);
        return { id: j.id, status, url: j.externalUrl };
      }),
    );
    for (const c of checks) {
      if (c.status === "alive") results.alive++;
      else if (c.status === "dead") { results.dead++; deadIds.push(c.id); }
      else results.skipped++;
    }
  }

  if (deadIds.length > 0) {
    // Single bulk update — fewer round-trips than per-row updates.
    await prisma.job.updateMany({
      where: { id: { in: deadIds } },
      data: { isPublished: false },
    });
  }

  // After validation, pull fresh jobs from public ATS feeds. Idempotent
  // (skips dupes by externalUrl) so daily runs only add genuinely new
  // listings. Errors here shouldn't fail the validation summary, so we
  // catch and report alongside.
  let careersSummary: { inserted: number; perCompany: Array<{ company: string; inserted: number }> } | null = null;
  let careersError: string | null = null;
  try {
    const careerResults = await syncCompanyCareers();
    careersSummary = {
      inserted: careerResults.reduce((s, c) => s + c.inserted, 0),
      perCompany: careerResults.map((c) => ({ company: c.company, inserted: c.inserted })),
    };
  } catch (e) {
    careersError = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json({
    ok: true,
    ...results,
    unpublishedIds: deadIds,
    careersSync: careersSummary,
    careersError,
  });
}

// Hosts that sit behind bot-shields (Cloudflare interactive challenges
// and the like). Probing them from a datacenter IP returns 403/503 for
// PERFECTLY LIVE pages — on 2026-07-14 this wrongly unpublished ~1,400
// SVT + LinkedIn jobs in one night. We don't probe them at all; their
// listings only leave the board when their importer stops returning
// them or Coral unpublishes manually.
const BOT_SHIELDED_HOSTS = ["svt.jobs", "linkedin.com", "alljobs.co.il"];

/**
 * Probe a single URL. Returns:
 *   "alive"   — 2xx/3xx, or a bot-shielded host we can't meaningfully probe
 *   "dead"    — HTTP 404/410 (the only statuses that reliably mean
 *               "this posting is gone"; 403/429/5xx are bot-blocking
 *               or server hiccups on live pages)
 *   "skipped" — network error (timeout, DNS, refused) — inconclusive
 */
async function probeUrl(url: string): Promise<"alive" | "dead" | "skipped"> {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (BOT_SHIELDED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return "alive";
    }
  } catch {
    return "skipped"; // mailto:/coral-direct: pseudo-URLs — not probeable
  }

  // Try HEAD first. Many job boards return 405 on HEAD or simply hang —
  // fall back to a tiny GET, which is what a real browser would do.
  const headStatus = await singleProbe(url, "HEAD");
  if (headStatus >= 200 && headStatus < 400) return "alive";

  const getStatus = await singleProbe(url, "GET");
  if (getStatus >= 200 && getStatus < 400) return "alive";
  if (getStatus === 404 || getStatus === 410) return "dead";
  return "skipped";
}

async function singleProbe(url: string, method: "HEAD" | "GET"): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      // Range trick: GET but only first byte. Saves bandwidth on huge
      // job pages while still triggering the server's normal pipeline.
      headers: {
        "User-Agent": USER_AGENT,
        ...(method === "GET" ? { Range: "bytes=0-0" } : {}),
      },
      signal: controller.signal,
      redirect: "follow",
    });
    return res.status;
  } catch {
    return -1; // network error / timeout — treated as inconclusive
  } finally {
    clearTimeout(timer);
  }
}
