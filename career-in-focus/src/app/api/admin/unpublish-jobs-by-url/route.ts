/**
 * POST /api/admin/unpublish-jobs-by-url
 *
 * Body: { urlContains: string, dryRun?: boolean }
 *
 * Unpublishes every published job whose externalUrl contains the given
 * fragment. Built for the SVT share-link migration leftovers: 107
 * imported positions no longer exist in Coral's SVT agent list (closed
 * at the source), so no share link could be generated for them and
 * their agent-console URL bounces visitors to SVT's homepage. The
 * nightly validator deliberately never probes svt.jobs, so without
 * this they'd linger forever.
 *
 * Admin-only. dryRun returns the count without changing anything.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    urlContains?: string;
    dryRun?: boolean;
  } | null;
  const frag = body?.urlContains;
  if (typeof frag !== "string" || frag.length < 10) {
    return NextResponse.json(
      { error: "urlContains (min 10 chars) required" },
      { status: 400 },
    );
  }

  const where = { isPublished: true, externalUrl: { contains: frag } };
  if (body?.dryRun) {
    const count = await prisma.job.count({ where });
    return NextResponse.json({ ok: true, dryRun: true, wouldUnpublish: count });
  }
  const res = await prisma.job.updateMany({ where, data: { isPublished: false } });
  return NextResponse.json({ ok: true, unpublished: res.count });
}
