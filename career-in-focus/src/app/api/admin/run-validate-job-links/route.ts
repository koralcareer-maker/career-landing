/**
 * POST /api/admin/run-validate-job-links
 *
 * Coral asked: "אתה מקפיד לעשות בקרה והלוריד אותה" — the nightly
 * validation cron exists but she wants to be able to trigger it on
 * demand and see the result instead of waiting for 21:00 UTC.
 *
 * Same pattern as /api/admin/refresh-news: this admin route proxies
 * to the existing cron handler with CRON_SECRET so the validation
 * logic stays in one place.
 *
 * Returns the cron's full summary (alive / dead / unpublished IDs)
 * plus before/after counts of published jobs.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const cronSecret = process.env.CRON_SECRET ?? "career-in-focus-cron-2026";
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://app.careerinfocus.co.il";

  const beforePublished = await prisma.job.count({ where: { isPublished: true } });

  let cronResult: unknown = null;
  let cronError: string | null = null;
  try {
    const r = await fetch(`${origin}/api/cron/validate-job-links`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    cronResult = await r.json().catch(() => ({ raw: "non-JSON response" }));
    if (!r.ok) cronError = `cron returned ${r.status}`;
  } catch (e) {
    cronError = e instanceof Error ? e.message : String(e);
  }

  const afterPublished = await prisma.job.count({ where: { isPublished: true } });

  return NextResponse.json({
    ok: cronError === null,
    publishedBefore: beforePublished,
    publishedAfter: afterPublished,
    unpublishedThisRun: beforePublished - afterPublished,
    cronResult,
    cronError,
  });
}
