/**
 * POST /api/admin/run-matching
 *
 * Manual trigger for the candidate↔job auto-matcher. Two modes:
 *
 *   { candidateId: "..." }          — match one candidate now
 *   { sinceHours: 720, notify: false } — bulk backfill for recent
 *                                        candidates (default 26h)
 *
 * notify defaults to FALSE here (unlike the signup hook / cron) so a
 * manual backfill over the historical pool doesn't blast hundreds of
 * emails by accident — pass notify:true explicitly to send offers.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  matchCandidateToJobs,
  matchRecentCandidates,
} from "@/lib/candidate-matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    candidateId?: string;
    sinceHours?: number;
    notify?: boolean;
    limit?: number;
  };
  const notify = body.notify === true;

  if (body.candidateId) {
    const result = await matchCandidateToJobs(body.candidateId, { notify });
    return NextResponse.json({ ok: true, mode: "single", notify, result });
  }

  const run = await matchRecentCandidates({
    sinceHours: body.sinceHours ?? 26,
    notify,
    limit: body.limit,
  });
  return NextResponse.json({
    ok: true,
    mode: "bulk",
    notify,
    candidates: run.candidates,
    newMatches: run.results.reduce((n, r) => n + r.newMatches, 0),
    emailed: run.results.reduce((n, r) => n + r.emailed, 0),
    sample: run.results.filter((r) => r.newMatches > 0).slice(0, 15),
  });
}
