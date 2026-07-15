/**
 * POST /api/admin/sync-source
 *
 * Diff-sync endpoint for sources the daily browser agent scrapes
 * (SVT, Civi — both bot-shielded, so the server can't reach their
 * live lists itself). The agent collects the source's CURRENT ids and
 * posts them here; we reconcile our board against that list:
 *
 *   - published job whose sourceRef has the prefix but ISN'T in the
 *     list → the posting closed at the source → unpublish
 *   - unpublished job whose sourceRef IS in the list → re-opened (or
 *     was wrongly killed) → republish
 *
 * Body: {
 *   prefix: "svt:" | "civi:",
 *   activeRefs: string[],      // full refs, e.g. "svt:1001782"
 *   dryRun?: boolean,
 *   force?: boolean            // required when the diff would
 *                              // unpublish >40% of the source — a
 *                              // partial scrape must not wipe a board
 * }
 *
 * Admin-only. Jobs of the source WITHOUT a sourceRef are never
 * touched (there's nothing to diff them against).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ALLOWED_PREFIXES = ["svt:", "civi:"];

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    prefix?: string;
    activeRefs?: string[];
    dryRun?: boolean;
    force?: boolean;
  } | null;

  const prefix = body?.prefix;
  if (!prefix || !ALLOWED_PREFIXES.includes(prefix)) {
    return NextResponse.json(
      { error: `prefix must be one of: ${ALLOWED_PREFIXES.join(", ")}` },
      { status: 400 },
    );
  }
  const activeRefs = (body?.activeRefs ?? []).filter(
    (r): r is string => typeof r === "string" && r.startsWith(prefix),
  );
  if (activeRefs.length === 0) {
    // An empty list is far more likely a broken scrape than a source
    // that really closed every posting — refuse outright.
    return NextResponse.json(
      { error: "activeRefs is empty — refusing to unpublish an entire source" },
      { status: 400 },
    );
  }
  const activeSet = new Set(activeRefs);

  // Load every tracked job of this source once; diff in JS to avoid
  // SQLite's bound-parameter limits on huge NOT IN lists.
  const tracked = await prisma.job.findMany({
    where: { sourceRef: { startsWith: prefix } },
    select: { id: true, sourceRef: true, isPublished: true },
  });

  const toUnpublish = tracked.filter(
    (j) => j.isPublished && j.sourceRef && !activeSet.has(j.sourceRef),
  );
  const toRepublish = tracked.filter(
    (j) => !j.isPublished && j.sourceRef && activeSet.has(j.sourceRef),
  );
  const trackedRefs = new Set(tracked.map((j) => j.sourceRef));
  const newAtSource = activeRefs.filter((r) => !trackedRefs.has(r));

  const publishedCount = tracked.filter((j) => j.isPublished).length;
  const wipeGuard =
    publishedCount > 20 && toUnpublish.length > publishedCount * 0.4;
  if (wipeGuard && !body?.force && !body?.dryRun) {
    return NextResponse.json(
      {
        error: `diff would unpublish ${toUnpublish.length}/${publishedCount} published ${prefix} jobs — pass force:true if the source really dropped that many`,
        wouldUnpublish: toUnpublish.length,
        wouldRepublish: toRepublish.length,
      },
      { status: 409 },
    );
  }

  if (body?.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      tracked: tracked.length,
      wouldUnpublish: toUnpublish.length,
      wouldRepublish: toRepublish.length,
      newAtSource: newAtSource.length,
      newRefsSample: newAtSource.slice(0, 20),
    });
  }

  const chunk = <T,>(arr: T[], n: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  let unpublished = 0;
  for (const ids of chunk(toUnpublish.map((j) => j.id), 400)) {
    const r = await prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { isPublished: false },
    });
    unpublished += r.count;
  }
  let republished = 0;
  for (const ids of chunk(toRepublish.map((j) => j.id), 400)) {
    const r = await prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { isPublished: true },
    });
    republished += r.count;
  }

  return NextResponse.json({
    ok: true,
    tracked: tracked.length,
    unpublished,
    republished,
    // The agent adds these itself via /api/admin/add-coral-jobs — the
    // server can't fetch titles/descriptions from a bot-shielded host.
    newAtSource: newAtSource.length,
    newRefs: newAtSource.slice(0, 500),
  });
}
