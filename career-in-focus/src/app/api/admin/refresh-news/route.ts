/**
 * POST /api/admin/refresh-news
 *
 * Coral needs to be able to refresh the /updates feed on demand
 * without waiting for the daily cron — the article supply was getting
 * stale because the auto-run was hitting Gemini quota issues, and the
 * admin had no way to retry from the UI.
 *
 * This route is admin-only (checks the session role) and proxies into
 * the same cron handlers that Vercel calls daily, passing through the
 * server-side CRON_SECRET so the cron routes accept the request.
 *
 * Returns a summary: how many raw RSS Updates were added + how many
 * MarketIntelArticles were processed by Gemini.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET לא מוגדר ב-Vercel" },
      { status: 500 },
    );
  }

  // Resolve absolute origin from the existing app URL (works in
  // production behind Vercel; falls back to localhost in dev).
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://app.careerinfocus.co.il";

  // Run both cron handlers in parallel. Each writes to a different
  // table — /api/cron/news adds raw RSS Updates, /api/cron/market-intel
  // adds Gemini-processed MarketIntelArticles. Either one going through
  // is enough to refresh the feed.
  const results = await Promise.allSettled([
    fetch(`${origin}/api/cron/news`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    }).then(async (r) => ({ kind: "news", ok: r.ok, body: await r.json().catch(() => ({})) })),
    fetch(`${origin}/api/cron/market-intel`, {
      method: "GET",
      headers: { Authorization: `Bearer ${cronSecret}` },
    }).then(async (r) => ({ kind: "market-intel", ok: r.ok, body: await r.json().catch(() => ({})) })),
  ]);

  const summary = results.map((r, i) => {
    const kind = i === 0 ? "news" : "market-intel";
    if (r.status === "fulfilled") {
      return { kind, ok: r.value.ok, body: r.value.body };
    }
    return { kind, ok: false, error: String(r.reason).slice(0, 200) };
  });

  return NextResponse.json({ ok: true, summary });
}
