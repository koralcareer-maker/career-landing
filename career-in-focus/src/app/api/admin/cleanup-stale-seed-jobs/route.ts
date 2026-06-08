/**
 * POST /api/admin/cleanup-stale-seed-jobs
 *
 * Unpublishes "סידור ידני - X" seed jobs older than a threshold. The
 * /api/admin/seed-curated-jobs route was used to bootstrap empty
 * categories with curated job postings — but the seed URLs are
 * mostly drushim.co.il category filters, which always return 200
 * (so the nightly link validator can't tell they're stale). They
 * were intentionally seeded to make the board look populated while
 * real ATS feeds (Greenhouse / Lever / LinkedIn / Civi) ramped up.
 *
 * Now that real feeds account for ~530 live jobs, Coral wants the
 * old placeholder seeds gone. This route mass-unpublishes them
 * (sets isPublished=false; rows kept so we can revert) for any seed
 * job older than `olderThanDays` (default 30).
 *
 * Body shape (optional):
 *   { olderThanDays?: number, dryRun?: boolean, sourcePrefix?: string }
 *
 * Returns the count and a small per-source breakdown.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    olderThanDays?: number;
    dryRun?: boolean;
    sourcePrefix?: string;
  };

  const olderThanDays = Math.max(1, Math.min(365, body.olderThanDays ?? 30));
  const dryRun = body.dryRun === true;
  const sourcePrefix = body.sourcePrefix ?? "סידור ידני";

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  // SQLite/Prisma quirk: there's no native `startsWith` filter without
  // case-sensitivity tuning, so we use `contains` on the unique prefix
  // since seed sources are always in the form `"<prefix> - <category>"`.
  const where = {
    isPublished: true,
    source: { contains: sourcePrefix },
    createdAt: { lt: cutoff },
  };

  const matching = await prisma.job.findMany({
    where,
    select: { id: true, source: true },
  });

  // Bucket by source for the response so we can show the per-category
  // breakdown ("סידור ידני - חינוך והדרכה: 82 unpublished").
  const bySource = new Map<string, number>();
  for (const j of matching) {
    const key = j.source ?? "(no source)";
    bySource.set(key, (bySource.get(key) ?? 0) + 1);
  }
  const breakdown = Array.from(bySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  let updated = 0;
  if (!dryRun && matching.length > 0) {
    const result = await prisma.job.updateMany({
      where: { id: { in: matching.map((j) => j.id) } },
      data: { isPublished: false },
    });
    updated = result.count;
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    olderThanDays,
    cutoff: cutoff.toISOString(),
    sourcePrefix,
    matchedCount: matching.length,
    unpublishedCount: updated,
    breakdown,
  });
}
