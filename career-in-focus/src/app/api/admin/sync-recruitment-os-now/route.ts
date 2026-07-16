/**
 * POST /api/admin/sync-recruitment-os-now
 *
 * Manual trigger for the "גיוס בפוקוס" → board sync (see
 * lib/recruitment-os-sync). The automatic run rides the daily
 * digest cron; this is for running it on demand from the admin.
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncRecruitmentOs } from "@/lib/recruitment-os-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await syncRecruitmentOs();
  return NextResponse.json({ ok: !result.error, ...result });
}
