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

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optional `?bucket=management|tech|professional|all` to refresh just
  // one slice (handy when one category misfired and Coral wants a
  // re-run without burning another 30-query batch).
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket") ?? "all";
  const cats =
    bucket === "management" ? MANAGEMENT :
    bucket === "tech" ? TECH :
    bucket === "professional" ? PROFESSIONAL :
    ALL_CATEGORIES;

  const result = await runJobFetch(cats);
  return NextResponse.json({
    ok: true,
    bucket,
    totalInserted: result.totalInserted,
    totalSkipped: result.totalSkipped,
    perCategory: result.perCategory,
  });
}
