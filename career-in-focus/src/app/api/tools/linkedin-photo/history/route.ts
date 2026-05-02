import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUserHistory } from "@/lib/blob";

export const runtime = "nodejs";

/**
 * Returns the current user's previous LinkedIn-photo generations as
 * grouped jobs (newest first). The list is reconstructed from Vercel
 * Blob, so it persists across page refreshes and deployments without
 * requiring any database schema.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Without the token we can't read Blob — return empty rather than 503,
    // so the page still renders the upload UI cleanly.
    return NextResponse.json({ jobs: [] });
  }

  try {
    const jobs = await listUserHistory(session.user.id, 12);
    return NextResponse.json({ jobs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin-photo/history] list failed:", msg);
    return NextResponse.json({ jobs: [], warning: "טעינת היסטוריה נכשלה" });
  }
}
