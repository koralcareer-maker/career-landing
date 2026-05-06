import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchJobToUser } from "@/lib/matching";
import { sendJobMatchAlert, type JobMatchAlertItem } from "@/lib/email/resend";

export const runtime = "nodejs";

// Hardcoded — same reasoning as the reminders cron: the Vercel env var
// pointed at a domain whose DNS wasn't configured, breaking every link.
const APP_URL = "https://career-landing-tau.vercel.app";

// Score below this threshold means we don't bother emailing the member.
// Per Coral: anything 60%+ is worth surfacing in an alert.
const ALERT_THRESHOLD = 60;

// Cap matches per email so the digest doesn't sprawl. Top 5 is plenty —
// if we have more, the user can click through to /jobs.
const MAX_JOBS_PER_EMAIL = 5;

// Look back this many hours when picking jobs to alert on. Daily cron at
// 8am means the 36-hour window catches anything imported since yesterday
// morning, with a buffer so a late-night import isn't lost.
const LOOKBACK_HOURS = 36;

/**
 * Daily cron — wakes at 8am Israel, finds jobs published in the last
 * ~36 hours, scores them against every active member's profile, and
 * sends a short digest email of the matches ≥60%. Idempotent via the
 * JobAlert (jobId, userId) unique key, so re-running the same day is a
 * no-op for already-alerted matches.
 *
 *   /api/cron/job-alerts
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);

  // 1. Recent jobs to consider (all published, all sources).
  const recentJobs = await prisma.job.findMany({
    where: {
      isPublished: true,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      title: true,
      company: true,
      summary: true,
      description: true,
      location: true,
      field: true,
      experienceLevel: true,
    },
  });

  if (recentJobs.length === 0) {
    return NextResponse.json({
      ok: true,
      jobsScanned: 0,
      usersScanned: 0,
      emailsSent: 0,
      message: "No recent jobs in the lookback window",
    });
  }

  // 2. All active members who opted in to job alerts and have at least
  //    a profile or passport to score against. Members without any
  //    profile data would just get the neutral 30% baseline — no value
  //    in emailing them.
  const users = await prisma.user.findMany({
    where: {
      accessStatus: "ACTIVE",
      emailJobAlerts: true,
      OR: [{ profile: { isNot: null } }, { careerPassport: { isNot: null } }],
    },
    select: {
      id: true,
      email: true,
      name: true,
      profile: true,
      careerPassport: true,
    },
  });

  // 3. Pull existing JobAlert rows so we don't email twice for the same
  //    (jobId, userId). One round trip rather than per-pair lookups.
  const jobIds = recentJobs.map((j) => j.id);
  const userIds = users.map((u) => u.id);
  const existing = await prisma.jobAlert.findMany({
    where: { jobId: { in: jobIds }, userId: { in: userIds } },
    select: { jobId: true, userId: true },
  });
  const alreadyAlerted = new Set(existing.map((e) => `${e.userId}:${e.jobId}`));

  // 4. For each user, pick the matching jobs, send one digest, then
  //    insert the JobAlert rows in a single batch. Per-user serialisation
  //    keeps memory bounded for the dashboard's eventual growth.
  let emailsSent = 0;
  let alertsRecorded = 0;
  const failures: string[] = [];

  for (const user of users) {
    const matches: Array<JobMatchAlertItem & { jobId: string }> = [];

    for (const job of recentJobs) {
      if (alreadyAlerted.has(`${user.id}:${job.id}`)) continue;

      const result = matchJobToUser(job, user.profile, user.careerPassport);
      if (result.score >= ALERT_THRESHOLD) {
        matches.push({
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          score: result.score,
          reasons: result.reasons,
          url: `${APP_URL}/jobs`,
        });
      }
    }

    if (matches.length === 0) continue;

    // Highest score first, capped.
    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, MAX_JOBS_PER_EMAIL);

    try {
      const emailJobs: JobMatchAlertItem[] = top.map((m) => ({
        title: m.title,
        company: m.company,
        location: m.location,
        score: m.score,
        reasons: m.reasons,
        url: m.url,
      }));
      await sendJobMatchAlert({
        to: user.email,
        name: user.name?.split(" ")[0] ?? "חבר",
        jobs: emailJobs,
        appUrl: APP_URL,
      });
      emailsSent++;

      // Record alerts for *all* matches we considered (not just top 5),
      // so we don't re-email the user about a job we already decided to
      // skip in tomorrow's run.
      await prisma.jobAlert.createMany({
        data: matches.map((m) => ({
          jobId: m.jobId,
          userId: user.id,
          score: m.score,
        })),
      });
      alertsRecorded += matches.length;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      failures.push(`${user.email}: ${msg.slice(0, 200)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    jobsScanned: recentJobs.length,
    usersScanned: users.length,
    emailsSent,
    alertsRecorded,
    failures: failures.slice(0, 20),
  });
}
