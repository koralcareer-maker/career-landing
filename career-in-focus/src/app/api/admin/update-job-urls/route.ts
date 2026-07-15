/**
 * POST /api/admin/update-job-urls
 *
 * Bulk externalUrl rewriter. Built for the SVT share-link fix: the
 * import stored agent-console URLs (svt.jobs/position/{id}) that
 * bounce anonymous visitors to SVT's homepage; each job needs Coral's
 * personal share shortlink (svt.jobs/u/XXXX) instead, harvested from
 * her logged-in session.
 *
 * Body: { pairs: Array<{ match: string; url: string }> } — for each
 * pair, every job whose externalUrl CONTAINS `match` gets its
 * externalUrl replaced with `url`. Caps at 500 pairs per call.
 *
 * Admin-only. Idempotent (re-running the same mapping is a no-op).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    pairs?: Array<{ match?: string; url?: string }>;
  } | null;
  const pairs = (body?.pairs ?? [])
    .filter(
      (p): p is { match: string; url: string } =>
        typeof p.match === "string" &&
        p.match.length >= 8 &&
        typeof p.url === "string" &&
        p.url.startsWith("https://"),
    )
    .slice(0, 500);
  if (pairs.length === 0) {
    return NextResponse.json({ error: "expected { pairs: [{match, url}] }" }, { status: 400 });
  }

  let updated = 0;
  for (const p of pairs) {
    const res = await prisma.job.updateMany({
      where: { externalUrl: { contains: p.match } },
      data: { externalUrl: p.url },
    });
    updated += res.count;
  }

  return NextResponse.json({ ok: true, pairs: pairs.length, updated });
}
