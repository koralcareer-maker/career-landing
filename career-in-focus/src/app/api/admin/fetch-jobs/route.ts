/**
 * Admin endpoint — manually triggers a job-fetch cycle without waiting
 * for the cron. Useful right after launch and any time Coral wants a
 * fresh batch. Same underlying code as /api/cron/fetch-jobs.
 *
 * Protected by the requireAdmin() session check, not CRON_SECRET, so
 * Coral hits it from the browser when logged in as an admin.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runJobFetch } from "@/lib/job-fetcher";
import { ALL_CATEGORIES, MANAGEMENT, TECH, PROFESSIONAL } from "@/lib/job-categories-config";
import { syncCompanyCareers } from "@/lib/company-careers";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional `?bucket=careers|management|tech|professional|all` to
  // refresh just one slice. `careers` runs only the company-board feed
  // (fast, no Gemini cost). `all` runs everything.
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") ?? "all";

  if (bucket === "careers") {
    const careerResults = await syncCompanyCareers();
    return NextResponse.json({
      ok: true,
      bucket,
      inserted: careerResults.reduce((s, c) => s + c.inserted, 0),
      perCompany: careerResults,
    });
  }

  const cats =
    bucket === "management" ? MANAGEMENT :
    bucket === "tech" ? TECH :
    bucket === "professional" ? PROFESSIONAL :
    ALL_CATEGORIES;

  // Full ("all") mode also runs the company feed for free coverage.
  const careerResults = bucket === "all" ? await syncCompanyCareers() : null;
  const geminiResult = await runJobFetch(cats);
  return NextResponse.json({
    ok: true,
    bucket,
    companyCareers: careerResults
      ? { inserted: careerResults.reduce((s, c) => s + c.inserted, 0), perCompany: careerResults }
      : null,
    geminiFallback: {
      totalInserted: geminiResult.totalInserted,
      totalSkipped: geminiResult.totalSkipped,
      perCategory: geminiResult.perCategory,
    },
  });
}
