/**
 * Manual / external trigger — refreshes the job board with listings
 * from public ATS feeds (Greenhouse / Lever / Comeet) followed by a
 * supplementary Gemini grounded-search pass.
 *
 * Originally this was wired to a Vercel cron, but the project's plan
 * caps us at 7 cron entries and we already use all 7. Instead:
 *   - The nightly `/api/cron/validate-job-links` cron also calls
 *     `syncCompanyCareers()` so the board still refreshes daily for
 *     free.
 *   - This endpoint stays available for the admin "run fetch now"
 *     button (proxied via /api/admin/fetch-jobs) and for any external
 *     scheduler (cron-job.org, GitHub Actions, etc.) Coral might wire
 *     up later. Still protected by CRON_SECRET so it can't be hammered
 *     by anonymous traffic.
 */

import { NextRequest, NextResponse } from "next/server";
import { runJobFetch } from "@/lib/job-fetcher";
import { ALL_CATEGORIES } from "@/lib/job-categories-config";
import { syncCompanyCareers } from "@/lib/company-careers";

const CRON_SECRET_FALLBACK = "career-in-focus-cron-2026";

export const dynamic = "force-dynamic";
export const maxDuration = 600; // up to 10 min — Gemini queries are slow

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? CRON_SECRET_FALLBACK;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Primary feed: each Israeli company's public ATS board. Free,
  // legal, reliable — covers most hi-tech roles.
  const careerResults = await syncCompanyCareers();
  const careersInserted = careerResults.reduce((s, c) => s + c.inserted, 0);

  // Supplementary feed: Gemini grounded search fills in non-hi-tech
  // categories (management at non-Greenhouse cos, marketing, sales,
  // recruiting). Best-effort — if the Gemini quota is exhausted the
  // career feed already covered the launch baseline.
  const geminiResult = await runJobFetch(ALL_CATEGORIES);

  return NextResponse.json({
    ok: true,
    companyCareers: {
      inserted: careersInserted,
      perCompany: careerResults,
    },
    geminiFallback: {
      totalInserted: geminiResult.totalInserted,
      totalSkipped: geminiResult.totalSkipped,
      perCategory: geminiResult.perCategory,
    },
  });
}
