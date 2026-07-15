/**
 * POST /api/admin/migrate-job-sourceref
 *
 * One-shot Turso migration: adds Job.sourceRef (stable source-system
 * id like "svt:1001782" / "civi:882671") + index, then backfills the
 * Civi refs by parsing the promo id straight out of each externalUrl.
 * SVT refs can't be derived server-side (the share shortlinks are
 * opaque) — the browser-side agent backfills those via
 * /api/admin/update-job-urls using its position→shortlink mapping.
 *
 * Idempotent: the ADD COLUMN error for an existing column is caught
 * and reported as already-applied; the backfill only touches rows
 * where sourceRef is still null.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ step: string; ok: boolean; detail?: string }> = [];

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Job" ADD COLUMN "sourceRef" TEXT`);
    results.push({ step: "add column", ok: true });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    results.push({
      step: "add column",
      ok: /duplicate column/i.test(msg),
      detail: /duplicate column/i.test(msg) ? "already exists" : msg.slice(0, 150),
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Job_sourceRef_idx" ON "Job"("sourceRef")`,
    );
    results.push({ step: "index", ok: true });
  } catch (e) {
    results.push({ step: "index", ok: false, detail: String(e).slice(0, 150) });
  }

  // Civi backfill — promo id lives in the URL itself.
  let civiBackfilled = 0;
  try {
    const civiJobs = await prisma.job.findMany({
      where: { externalUrl: { contains: "civi.co.il/promo" }, sourceRef: null },
      select: { id: true, externalUrl: true },
    });
    for (const j of civiJobs) {
      const promoId = j.externalUrl?.match(/id=(\d+)/)?.[1];
      if (!promoId) continue;
      await prisma.job.update({
        where: { id: j.id },
        data: { sourceRef: `civi:${promoId}` },
      });
      civiBackfilled++;
    }
    results.push({ step: "civi backfill", ok: true, detail: `${civiBackfilled} rows` });
  } catch (e) {
    results.push({ step: "civi backfill", ok: false, detail: String(e).slice(0, 150) });
  }

  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
