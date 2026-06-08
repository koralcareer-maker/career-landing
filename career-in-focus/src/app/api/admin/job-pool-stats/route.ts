/**
 * GET /api/admin/job-pool-stats
 *
 * Dashboard for the job board's health. Built because Coral noticed
 * "המון משרות באתר שלא פעילות" — we need to see at a glance how big
 * the published pool is, where jobs come from, how old they are, and
 * how many got auto-unpublished by the nightly validator.
 *
 * Returns:
 *   total / published / unpublished — overall pool
 *   bySource — count per `source` field, split by published state
 *   byAge — counts bucketed by createdAt: <7d / 7-30d / 30-90d / 90d+
 *   oldestPublished — first 10 oldest still-live jobs (candidates to
 *     manually review since they're the most likely to be stale)
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [total, published, bySource, age7, age30, age90, ageOld, oldestPublished] =
    await Promise.all([
      prisma.job.count(),
      prisma.job.count({ where: { isPublished: true } }),
      prisma.job.groupBy({
        by: ["source", "isPublished"],
        _count: { _all: true },
      }),
      prisma.job.count({ where: { isPublished: true, createdAt: { gte: d7 } } }),
      prisma.job.count({
        where: { isPublished: true, createdAt: { gte: d30, lt: d7 } },
      }),
      prisma.job.count({
        where: { isPublished: true, createdAt: { gte: d90, lt: d30 } },
      }),
      prisma.job.count({ where: { isPublished: true, createdAt: { lt: d90 } } }),
      prisma.job.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "asc" },
        take: 15,
        select: {
          id: true,
          title: true,
          company: true,
          source: true,
          createdAt: true,
          externalUrl: true,
        },
      }),
    ]);

  // Reshape groupBy into a flat per-source table.
  const sourceMap = new Map<
    string,
    { published: number; unpublished: number }
  >();
  for (const row of bySource) {
    const key = row.source ?? "(no source)";
    const slot = sourceMap.get(key) ?? { published: 0, unpublished: 0 };
    if (row.isPublished) slot.published += row._count._all;
    else slot.unpublished += row._count._all;
    sourceMap.set(key, slot);
  }
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, counts]) => ({ source, ...counts }))
    .sort((a, b) => b.published + b.unpublished - (a.published + a.unpublished));

  return NextResponse.json({
    ok: true,
    total,
    published,
    unpublished: total - published,
    byAge: {
      under7Days: age7,
      between7And30Days: age30,
      between30And90Days: age90,
      over90Days: ageOld,
    },
    sourceBreakdown,
    oldestPublished,
  });
}
