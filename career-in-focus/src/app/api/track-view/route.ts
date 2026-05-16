/**
 * POST /api/track-view
 *
 * Fire-and-forget page-view logger. The PageViewTracker client
 * component pings this every time the user navigates. We store ONLY
 * the path + referrer — no IP, no user-agent, no session ID. Just
 * enough for Coral to read aggregate traffic numbers on the admin
 * dashboard.
 *
 * Responses are 204 No Content even on error so the client doesn't
 * waste user bandwidth retrying — analytics shouldn't block the page.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Paths we don't want clogging the table — internal admin/api routes
// or static asset URLs.
const SKIP_PREFIXES = ["/api/", "/_next/", "/admin"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      path?: string;
      referrer?: string;
      utmSource?: string;
      utmCampaign?: string;
    };
    const path = (body.path ?? "").trim().slice(0, 200);
    if (!path) return new NextResponse(null, { status: 204 });
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return new NextResponse(null, { status: 204 });

    const referrer = (body.referrer ?? "").trim().slice(0, 200) || null;
    const utmSource = (body.utmSource ?? "").trim().slice(0, 60) || null;
    const utmCampaign = (body.utmCampaign ?? "").trim().slice(0, 60) || null;

    // Best-effort session lookup — when the visitor is logged in, we
    // copy id + name into the row so the admin Recent-Visits feed can
    // show "Coral Shalev clicked /cv-match" instead of just "anon".
    let userId: string | null = null;
    let userName: string | null = null;
    try {
      const session = await auth();
      if (session?.user?.id) {
        userId = session.user.id;
        userName = session.user.name ?? null;
      }
    } catch {
      // not logged in / session unavailable — fine, leave null
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).pageView.create({
      data: { path, referrer, utmSource, utmCampaign, userId, userName },
    }).catch(() => {});
  } catch {
    // analytics must never break the user's session
  }
  return new NextResponse(null, { status: 204 });
}
