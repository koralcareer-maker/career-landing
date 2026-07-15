/**
 * POST /api/admin/republish-jobs
 *
 * Recovery endpoint for the 2026-07-14 validator incident: the nightly
 * link-checker treated Cloudflare 403s as "posting is gone" and
 * unpublished ~1,400 live SVT / LinkedIn jobs. Re-publishes every
 * unpublished job whose externalUrl points at a bot-shielded host that
 * the (now fixed) validator will no longer probe.
 *
 * Body (optional): { hosts?: string[] } — defaults to the same list
 * the validator skips. Returns per-host counts.
 *
 * Admin-only. Idempotent.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_HOSTS = ["svt.jobs", "linkedin.com", "alljobs.co.il"];

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { hosts?: string[] };
  const hosts =
    Array.isArray(body.hosts) && body.hosts.length > 0
      ? body.hosts.filter((h) => typeof h === "string" && h.length > 3)
      : DEFAULT_HOSTS;

  const perHost: Array<{ host: string; republished: number }> = [];
  for (const host of hosts) {
    const res = await prisma.job.updateMany({
      where: {
        isPublished: false,
        externalUrl: { contains: host },
      },
      data: { isPublished: true },
    });
    perHost.push({ host, republished: res.count });
  }

  return NextResponse.json({
    ok: true,
    total: perHost.reduce((n, h) => n + h.republished, 0),
    perHost,
  });
}
