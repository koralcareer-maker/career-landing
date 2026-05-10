import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Cron — every two days, sweeps published jobs that link to civi.co.il
 * (and any other external source), HEAD-checks the URL, and unpublishes
 * anything that's gone dead (404 / 410 / 4xx).
 *
 * Sets `isPublished = false` (NOT deletes) so we never lose audit trail
 * and so the admin can re-enable manually if a check was wrong.
 *
 * Schedule in vercel.json: `0 0 */2 * *` — every 2 days at 00:00 UTC
 * (03:00 IST).
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_JOBS_PER_RUN = 200;

async function checkUrl(url: string): Promise<number | "timeout" | "network-error"> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "HEAD",
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (career-in-focus-bot; cleanup)",
      },
    });
    if (r.status === 405 || r.status === 501) {
      // Some boards block HEAD; fall back to GET (we don't read body).
      const g = await fetch(url, {
        method: "GET",
        signal: ctl.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (career-in-focus-bot; cleanup)",
        },
      });
      return g.status;
    }
    return r.status;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "timeout";
    return "network-error";
  } finally {
    clearTimeout(t);
  }
}

function isJobGone(status: number | "timeout" | "network-error"): boolean {
  if (status === "timeout") return false;        // transient
  if (status === "network-error") return false;  // transient
  // 401/403/404/410 → unpublish. 5xx → transient.
  if (status === 401 || status === 403 || status === 404 || status === 410) return true;
  if (status >= 400 && status < 500) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    where: {
      isPublished: true,
      externalUrl: { not: null },
    },
    select: { id: true, externalUrl: true, title: true },
    orderBy: { updatedAt: "asc" },
    take: MAX_JOBS_PER_RUN,
  });

  const unpublished: { id: string; title: string; status: number | string }[] = [];
  const kept: number[] = [];

  for (const j of jobs) {
    if (!j.externalUrl) continue;
    const status = await checkUrl(j.externalUrl);
    if (isJobGone(status)) {
      unpublished.push({ id: j.id, title: j.title, status });
    } else {
      kept.push(typeof status === "number" ? status : 0);
    }
  }

  if (unpublished.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: unpublished.map((u) => u.id) } },
      data: { isPublished: false },
    });
  }

  return NextResponse.json({
    ok: true,
    scannedCount: jobs.length,
    unpublishedCount: unpublished.length,
    keptCount: kept.length,
    unpublished,
  });
}
