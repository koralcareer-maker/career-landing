/**
 * GET /api/admin/category-counts
 *
 * Returns the number of published jobs in each of our 33 canonical
 * categories. Coral uses this to spot empty filter chips on /jobs so
 * she knows which sectors need a seed pass (the way חברה וקהילה did).
 *
 * Maps each Job.field to its canonical category via mapFieldToCategory
 * (same logic the /jobs UI uses) so the numbers Coral sees here match
 * what members see in the filter dropdown.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JOB_CATEGORIES, mapFieldToCategory } from "@/lib/job-categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jobs = await prisma.job.findMany({
    where: { isPublished: true },
    select: { field: true },
  });

  const counts: Record<string, number> = {};
  for (const c of JOB_CATEGORIES) counts[c] = 0;
  for (const j of jobs) {
    const cat = mapFieldToCategory(j.field);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  const rows = JOB_CATEGORIES.map((c) => ({ category: c, count: counts[c] ?? 0 }))
    .sort((a, b) => a.count - b.count);
  const empty = rows.filter((r) => r.count === 0).map((r) => r.category);
  const low   = rows.filter((r) => r.count > 0 && r.count < 5).map((r) => `${r.category} (${r.count})`);

  return NextResponse.json({
    ok: true,
    total: jobs.length,
    empty,
    low,
    rows,
  });
}
