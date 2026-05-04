/**
 * Job Search Effectiveness Score (0-100) and supporting KPIs.
 *
 * Pure heuristic — no AI cost, deterministic, instant. Combined with
 * generateInsights() (lib/job-search-insights), it gives the member a
 * single number to track plus a list of specific things to fix.
 *
 * Five components, each normalized to 0-100 and weighted:
 *
 *   25%  volume         — recent application rate vs the weekly goal
 *   15%  diversity      — share of proactive outreach (vs job boards)
 *   15%  follow-through — open reminders that aren't stale
 *   25%  conversion     — interviews per submitted application
 *   20%  activity       — recency of last status update
 *
 * Anyone with zero applications gets a 0. Anyone with offers gets a
 * floor of 70 — landing offers obviously means the search is working.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set([
  "APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT",
  "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW",
  "TASK_HOME", "OFFER",
]);
const SUBMITTED_STATUSES = new Set([
  "APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT",
  "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW",
  "TASK_HOME", "OFFER", "REJECTED",
]);
const INTERVIEW_STATUSES = new Set([
  "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW",
  "ADVANCED_INTERVIEW", "TASK_HOME",
]);

export interface ScoreInput {
  applications: Array<{
    status: string;
    source: string | null;
    dateApplied: Date | null;
    createdAt: Date;
    updatedAt: Date;
    archived: boolean;
  }>;
  /** Number of open reminders that are NOT yet overdue. */
  openRemindersOnTrack: number;
  /** Number of open reminders that are overdue. */
  overdueReminders: number;
  /** Member's weekly application target (default 15). */
  weeklyGoal: number;
}

export interface ScoreBreakdown {
  /** 0-100, the headline number */
  score: number;
  /** "Excellent" | "Strong" | "Building" | "Stalling" */
  band: "excellent" | "strong" | "building" | "stalling";
  components: {
    volume:        { score: number; weight: number; label: string };
    diversity:     { score: number; weight: number; label: string };
    followThrough: { score: number; weight: number; label: string };
    conversion:    { score: number; weight: number; label: string };
    activity:      { score: number; weight: number; label: string };
  };
  kpis: {
    /** Applications submitted in the last 7 days */
    appsThisWeek: number;
    /** % of applications that received a response (interview or rejection counts) */
    responseRate: number;
    /** Interviews per submitted application, as % */
    interviewRate: number;
    /** Median days from dateApplied to first status change after APPLIED */
    avgResponseDays: number | null;
    /** Total submitted, total interviews, total offers */
    totalSubmitted: number;
    totalInterviews: number;
    totalOffers: number;
  };
}

function clamp(x: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, x));
}
function pct(num: number, denom: number) {
  return denom > 0 ? Math.round((num / denom) * 100) : 0;
}
function daysAgo(d: Date | null | undefined) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const { applications, overdueReminders, openRemindersOnTrack, weeklyGoal } = input;
  const live = applications.filter((a) => !a.archived);

  const submitted = live.filter((a) => SUBMITTED_STATUSES.has(a.status));
  const interviews = live.filter((a) => INTERVIEW_STATUSES.has(a.status));
  const offers = live.filter((a) => a.status === "OFFER");
  const outreach = live.filter((a) => a.status === "PROACTIVE_OUTREACH");
  const rejected = live.filter((a) => a.status === "REJECTED");

  const now = Date.now();
  const appsThisWeek = live.filter(
    (a) => a.createdAt && now - new Date(a.createdAt).getTime() <= WEEK_MS,
  ).length;

  // ─── 1. Volume — what fraction of weekly goal hit ────────────────────
  // Hitting goal = 100; double goal = capped at 100; zero apps = 0.
  const volumeScore = clamp((appsThisWeek / Math.max(1, weeklyGoal)) * 100);

  // ─── 2. Diversity — proactive outreach share of submissions ──────────
  // 30%+ outreach = 100; 0% = 25 (some baseline since job boards aren't useless).
  const submittedTotal = submitted.length;
  const outreachShare = submittedTotal > 0 ? outreach.length / submittedTotal : 0;
  const diversityScore = clamp(25 + (outreachShare / 0.3) * 75);

  // ─── 3. Follow-through — overdue reminders are penalized hard ────────
  // No overdue + at least one on-track reminder = 100.
  // Each overdue subtracts 25 points; floor at 0.
  let followThroughScore = 100;
  followThroughScore -= overdueReminders * 25;
  if (overdueReminders === 0 && openRemindersOnTrack === 0 && submittedTotal >= 5) {
    // Submitting without ever scheduling a follow-up — partial credit
    followThroughScore = 50;
  }
  followThroughScore = clamp(followThroughScore);

  // ─── 4. Conversion — interview rate after submission ─────────────────
  // 25%+ interview rate = 100; 0% with 5+ submissions = 20; in between linear.
  let conversionScore: number;
  if (submittedTotal < 5) {
    // Too few data points to score conversion meaningfully — neutral 60.
    conversionScore = 60;
  } else {
    const ir = interviews.length / submittedTotal;
    conversionScore = clamp(20 + (ir / 0.25) * 80);
  }

  // ─── 5. Activity — days since last status change on any active app ───
  // 0-3 days = 100; 4-7 = 70; 8-14 = 40; 15+ = 0.
  const activeApps = live.filter((a) => ACTIVE_STATUSES.has(a.status));
  let activityScore: number;
  if (activeApps.length === 0) {
    activityScore = submittedTotal === 0 ? 0 : 30;
  } else {
    const lastUpdate = Math.min(...activeApps.map((a) => daysAgo(a.updatedAt)));
    if (lastUpdate <= 3) activityScore = 100;
    else if (lastUpdate <= 7) activityScore = 70;
    else if (lastUpdate <= 14) activityScore = 40;
    else activityScore = 0;
  }

  // ─── Weighted total ──────────────────────────────────────────────────
  const components = {
    volume:        { score: Math.round(volumeScore),        weight: 25, label: "קצב הגשות" },
    diversity:     { score: Math.round(diversityScore),     weight: 15, label: "גיוון מקורות" },
    followThrough: { score: Math.round(followThroughScore), weight: 15, label: "מעקב ו-follow-up" },
    conversion:    { score: Math.round(conversionScore),    weight: 25, label: "המרה לראיון" },
    activity:      { score: Math.round(activityScore),      weight: 20, label: "פעילות עדכנית" },
  };

  let total =
    (components.volume.score        * components.volume.weight        +
     components.diversity.score     * components.diversity.weight     +
     components.followThrough.score * components.followThrough.weight +
     components.conversion.score    * components.conversion.weight    +
     components.activity.score      * components.activity.weight) / 100;

  // Special cases that override the formula
  if (submittedTotal === 0) total = 0;
  // Holding offers is unambiguous proof the search is working — don't let
  // a quiet week or a missed reminder drag the headline below "strong".
  if (offers.length > 0) total = Math.max(total, 70);

  total = Math.round(clamp(total));

  let band: ScoreBreakdown["band"];
  if (total >= 80)      band = "excellent";
  else if (total >= 60) band = "strong";
  else if (total >= 35) band = "building";
  else                  band = "stalling";

  // ─── KPIs (raw numbers we expose alongside the score) ─────────────────
  const responseRate = pct(interviews.length + rejected.length, submittedTotal);
  const interviewRate = pct(interviews.length + offers.length, submittedTotal);
  const avgResponseDays = computeAvgResponseDays(live);

  return {
    score: total,
    band,
    components,
    kpis: {
      appsThisWeek,
      responseRate,
      interviewRate,
      avgResponseDays,
      totalSubmitted: submittedTotal,
      totalInterviews: interviews.length,
      totalOffers: offers.length,
    },
  };
}

// Median days between dateApplied and the most recent updatedAt — a rough
// proxy for "how long until something happens". We use median rather than
// mean so one outlier (an interview booked 60 days late) doesn't skew it.
function computeAvgResponseDays(apps: ScoreInput["applications"]): number | null {
  const candidates = apps.filter(
    (a) =>
      a.dateApplied &&
      (a.status === "FOLLOWUP_SENT" ||
       a.status === "INTERVIEW_SCHEDULED" ||
       a.status === "FIRST_INTERVIEW" ||
       a.status === "ADVANCED_INTERVIEW" ||
       a.status === "TASK_HOME" ||
       a.status === "OFFER" ||
       a.status === "REJECTED"),
  );
  if (candidates.length === 0) return null;
  const diffs = candidates
    .map((a) => {
      const applied = new Date(a.dateApplied!).getTime();
      const updated = new Date(a.updatedAt).getTime();
      return Math.max(0, Math.round((updated - applied) / 86400000));
    })
    .sort((x, y) => x - y);
  return diffs[Math.floor(diffs.length / 2)];
}
