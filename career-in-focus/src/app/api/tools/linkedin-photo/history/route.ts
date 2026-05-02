import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserHistory, countUserJobsSince, startOfMonthMs } from "@/lib/blob";

export const runtime = "nodejs";

const MAX_JOBS_PER_MONTH = 10;

/**
 * Returns the current user's previous LinkedIn-photo generations as
 * grouped jobs (newest first), plus the current month's quota usage.
 * The list is reconstructed from Vercel Blob, so it persists across
 * page refreshes and deployments without requiring any database schema.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ jobs: [], quotaUsed: 0, quotaMax: MAX_JOBS_PER_MONTH });
  }

  try {
    const [jobs, quotaUsed] = await Promise.all([
      listUserHistory(session.user.id, 12),
      countUserJobsSince(session.user.id, startOfMonthMs()),
    ]);
    return NextResponse.json({ jobs, quotaUsed, quotaMax: MAX_JOBS_PER_MONTH });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin-photo/history] list failed:", msg);
    return NextResponse.json({
      jobs: [],
      quotaUsed: 0,
      quotaMax: MAX_JOBS_PER_MONTH,
      warning: "טעינת היסטוריה נכשלה",
    });
  }
}
