/**
 * Every-2-days cron — refreshes the job board with real listings
 * pulled live via Gemini's Google-Search grounding.
 *
 * The actual scraping logic lives in lib/job-fetcher.ts (so the
 * /admin "run fetch now" button can call exactly the same code path
 * Coral asked for: "להזין את המערכת פעם ביומיים").
 *
 * Scheduled in vercel.json at 06:00 Israel every 2 days.
 * Protected by the same CRON_SECRET as the other cron routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { runJobFetch } from "@/lib/job-fetcher";
import { ALL_CATEGORIES } from "@/lib/job-categories-config";

const CRON_SECRET_FALLBACK = "career-in-focus-cron-2026";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // up to 10 min — Gemini queries are slow

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? CRON_SECRET_FALLBACK;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runJobFetch(ALL_CATEGORIES);
  return NextResponse.json({
    ok: true,
    totalInserted: result.totalInserted,
    totalSkipped: result.totalSkipped,
    perCategory: result.perCategory,
  });
}
