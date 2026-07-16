/**
 * Daily FREE-tier job digest cron.
 *
 * Runs every morning at 07:00 Israel (04:00 UTC in winter, 05:00 in
 * summer — Vercel schedules are UTC, so we run at 04:00 UTC and
 * accept a one-hour early send in the summer months rather than
 * juggle DST math on the schedule).
 *
 * For every User where subscriptionStatus="FREE":
 *   - Look up their Candidate row (matched by email — that's how the
 *     /join flow links User → Candidate).
 *   - Split Candidate.field on commas to get the fields they picked.
 *   - Find every published Job created in the last 24h whose `field`
 *     value appears in that list. Cap at 30 per email so the digest
 *     stays readable.
 *   - Skip the user entirely if there's nothing new — no email is
 *     better than "no matches today".
 *   - Send a Hebrew HTML digest via Resend. Every job row links
 *     directly to the externalUrl so the user goes straight to the
 *     original posting (SVT / Civi / AllJobs / etc.) to apply.
 *
 * Protected by the same CRON_SECRET as the other cron routes so an
 * anonymous curl can't accidentally trigger the digest at midnight.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchRecentCandidates } from "@/lib/candidate-matching";
import { syncRecruitmentOs } from "@/lib/recruitment-os-sync";
import { mapFieldToCategory } from "@/lib/job-categories";

const CRON_SECRET_FALLBACK = "career-in-focus-cron-2026";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_JOBS_PER_EMAIL = 30;
const RESEND_FROM =
  process.env.RESEND_FROM ?? "קורל <noreply@careerinfocus.co.il>";

interface JobRow {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  field: string | null;
  externalUrl: string | null;
  isHot: boolean;
}

async function sendDigestEmail(opts: {
  to: string;
  name: string | null;
  gender: string | null;
  jobs: JobRow[];
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const firstName = (opts.name ?? "").split(" ")[0] || "";
  const F = opts.gender !== "m";
  const greet = F
    ? `בוקר טוב${firstName ? ` ${firstName}` : ""} ☕`
    : `בוקר טוב${firstName ? ` ${firstName}` : ""} ☕`;
  const jobsLabel =
    opts.jobs.length === 1 ? "משרה חדשה" : `${opts.jobs.length} משרות חדשות`;

  const rows = opts.jobs
    .map((j) => {
      const meta = [j.company, j.location, j.field].filter(Boolean).join(" · ");
      const hot = j.isHot ? "🔥 " : "";
      const url = j.externalUrl ?? `https://app.careerinfocus.co.il/jobs/${j.id}`;
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee">
          <a href="${url}" style="color:#0d9488;font-weight:700;font-size:15px;text-decoration:none">
            ${hot}${j.title}
          </a>
          ${meta ? `<div style="font-size:12px;color:#666;margin-top:4px">${meta}</div>` : ""}
        </td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:Arial,sans-serif;background:#fafafa;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #eee">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-weight:900;color:#0d9488;font-size:22px">קריירה בפוקוס</div>
    </div>
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 6px 0">${greet}</h1>
    <p style="color:#475569;font-size:14px;margin:0 0 20px 0">
      נמצאו ${jobsLabel} שמתאימות לתחומים שסימנת. לחיצה על הכותרת מובילה ישירות להגשת מועמדות.
    </p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="text-align:center;margin-top:24px">
      <a href="https://app.careerinfocus.co.il/jobs" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">
        לכל המשרות באתר
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;line-height:1.6">
      קיבלתם את המייל הזה כי נרשמתם ללוח המשרות של קריירה בפוקוס. אנחנו שולחים עדכון רק כשנמצאות משרות חדשות שמתאימות לכם.<br>
      <a href="https://app.careerinfocus.co.il/billing" style="color:#94a3b8">להסרה מהתפוצה</a>
    </p>
  </div>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: opts.to,
      subject: `🎯 נמצאו ${jobsLabel} בתחום שלך`,
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? CRON_SECRET_FALLBACK;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Everyone on the FREE tier. Skip anyone marked cancelled or whose
  // accessStatus was flipped off later (e.g. because they refunded
  // via a paid upgrade path).
  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "FREE",
      accessStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      name: true,
      gender: true,
    },
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let sent = 0;
  let skippedNoMatch = 0;
  let skippedNoFields = 0;
  const errors: string[] = [];

  // One jobs query for the whole run. Users picked CANONICAL categories
  // (lib/job-categories) at signup, while Job.field holds free-form
  // values — so both sides go through mapFieldToCategory and matching
  // happens in category space.
  const recentJobs = (
    await prisma.job.findMany({
      where: { isPublished: true, createdAt: { gte: since } },
      orderBy: [{ isHot: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        field: true,
        externalUrl: true,
        isHot: true,
      },
    })
  ).map((j) => ({ ...j, category: mapFieldToCategory(j.field) }));

  for (const u of users) {
    try {
      const cand = await prisma.candidate.findFirst({
        where: { email: u.email },
        select: { field: true },
      });
      const categories = new Set(
        (cand?.field ?? "")
          .split(/[,;]+/)
          .map((f) => f.trim())
          .filter(Boolean)
          .map((f) => mapFieldToCategory(f)),
      );
      categories.delete("אחר"); // never blast the catch-all bucket
      if (categories.size === 0) {
        skippedNoFields++;
        continue;
      }
      const jobs = recentJobs
        .filter((j) => categories.has(j.category))
        .slice(0, MAX_JOBS_PER_EMAIL);
      if (jobs.length === 0) {
        skippedNoMatch++;
        continue;
      }
      await sendDigestEmail({
        to: u.email,
        name: u.name,
        gender: u.gender,
        jobs,
      });
      sent++;
    } catch (e) {
      errors.push(
        `${u.email}: ${e instanceof Error ? e.message.slice(0, 100) : "err"}`
      );
    }
  }

  // Second leg — sync Coral's own recruitment system ("גיוס בפוקוס")
  // into the board: adds newly opened client jobs (SPD, ברק פיננסים…),
  // refreshes existing ones, retires filled/cancelled ones. Runs here
  // instead of its own cron so we stay under the plan's cron cap.
  let osSync: Awaited<ReturnType<typeof syncRecruitmentOs>> | { error: string };
  try {
    osSync = await syncRecruitmentOs();
  } catch (e) {
    osSync = { error: e instanceof Error ? e.message.slice(0, 120) : "failed" };
  }

  // Third leg — candidate↔job auto-matcher catch-up. Candidates that
  // arrived via bulk imports (no after() hook) get matched + emailed
  // here, at most once: matchCandidateToJobs skips existing pairs.
  let matching: { candidates: number; newMatches: number; emailed: number } | { error: string };
  try {
    const run = await matchRecentCandidates({ sinceHours: 26, notify: true });
    matching = {
      candidates: run.candidates,
      newMatches: run.results.reduce((n, r) => n + r.newMatches, 0),
      emailed: run.results.reduce((n, r) => n + r.emailed, 0),
    };
  } catch (e) {
    matching = { error: e instanceof Error ? e.message.slice(0, 120) : "failed" };
  }

  return NextResponse.json({
    ok: true,
    freeUsers: users.length,
    sent,
    skippedNoMatch,
    skippedNoFields,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
    osSync,
    matching,
  });
}
