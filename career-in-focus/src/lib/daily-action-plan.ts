/**
 * Daily Action Plan — generates a short, ordered list of concrete tasks
 * the member should do TODAY to keep their search moving.
 *
 * The plan adapts to where they are right now:
 *   - behind on weekly goal      → emphasize new applications
 *   - heavy job-board reliance   → push proactive outreach
 *   - overdue follow-ups         → put follow-up on top
 *   - upcoming interviews        → prep tasks
 *   - quiet week                 → revive a stalled application
 *
 * Pure heuristic, no AI. Deterministic.
 */

import type { ScoreBreakdown } from "./job-search-score";

const ACTIVE_STATUSES = new Set([
  "APPLIED", "PROACTIVE_OUTREACH", "FOLLOWUP_SENT",
  "INTERVIEW_SCHEDULED", "FIRST_INTERVIEW", "ADVANCED_INTERVIEW",
  "TASK_HOME", "OFFER",
]);

export interface ActionPlanInput {
  applications: Array<{
    id: string;
    company: string;
    role: string;
    status: string;
    source: string | null;
    dateApplied: Date | null;
    nextFollowUp: Date | null;
    interviewDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    archived: boolean;
  }>;
  upcomingInterviews: Array<{
    id: string;
    company: string;
    role: string;
    interviewDate: Date;
  }>;
  overdueReminders: Array<{
    id: string;
    title: string;
    application: { id: string; company: string; role: string };
  }>;
  /** Member's weekly application goal (default 15). */
  weeklyGoal: number;
  /** Score breakdown, used to know which area to push hardest. */
  score: ScoreBreakdown;
}

export interface ActionTask {
  id: string;
  /** Order matters — first task = most urgent. */
  priority: number;
  /** Color hint for the UI: red = blocked, amber = behind, teal = on-track, emerald = momentum */
  intent: "urgent" | "behind" | "ontrack" | "momentum";
  /** Short imperative, gender-neutral via slash forms (תיצר/י) */
  title: string;
  /** One-line context — why this matters today */
  why: string;
  /** Optional CTA link to take the action right now */
  cta?: { href: string; label: string };
}

const DAYS_PER_WEEK = 7;
const WORKING_DAYS_PER_WEEK = 5; // we treat the week as 5 active days

function daysAgo(d: Date | null | undefined) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function buildActionPlan(input: ActionPlanInput): ActionTask[] {
  const { applications, upcomingInterviews, overdueReminders, weeklyGoal, score } = input;
  const tasks: ActionTask[] = [];

  const live = applications.filter((a) => !a.archived);
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const submittedThisWeek = live.filter(
    (a) => a.createdAt && now - new Date(a.createdAt).getTime() <= WEEK_MS,
  ).length;
  // Use a daily target that's the weekly goal divided across working days,
  // rounded up so we always nudge toward the goal rather than under.
  const dailyAppTarget = Math.max(2, Math.ceil(weeklyGoal / WORKING_DAYS_PER_WEEK));

  // ─── 1. Overdue follow-ups (highest urgency) ─────────────────────────
  // A late follow-up loses the conversation. Put it on top.
  if (overdueReminders.length > 0) {
    const first = overdueReminders[0];
    tasks.push({
      id: "overdue-followup",
      priority: 1,
      intent: "urgent",
      title:
        overdueReminders.length === 1
          ? `שלח/י follow-up ל-${first.application.company}`
          : `סגור/י ${overdueReminders.length} follow-ups שבאיחור`,
      why:
        overdueReminders.length === 1
          ? `התזכורת ׳${first.title}׳ עברה את התאריך. שתי שורות מספיקות.`
          : "תזכורות שעברו תאריך מאבדות מומנטום מול המגייס. עדיף לסגור עכשיו.",
      cta: {
        href: `/progress/${first.application.id}`,
        label: "פתח/י את המועמדות",
      },
    });
  }

  // ─── 2. Interview prep (within 3 days) ───────────────────────────────
  const soonInterview = upcomingInterviews.find((iv) => {
    const days = Math.ceil(
      (new Date(iv.interviewDate).getTime() - Date.now()) / 86400000,
    );
    return days >= 0 && days <= 3;
  });
  if (soonInterview) {
    const days = Math.ceil(
      (new Date(soonInterview.interviewDate).getTime() - Date.now()) / 86400000,
    );
    const when = days === 0 ? "היום" : days === 1 ? "מחר" : `בעוד ${days} ימים`;
    tasks.push({
      id: "interview-prep",
      priority: 2,
      intent: "urgent",
      title: `הכנה לראיון ב-${soonInterview.company} (${when})`,
      why: "30 דקות תרגול עם המאמן AI לפני ראיון משדרגות משמעותית את הביצוע. כדאי לעבור על שאלות הליבה ועל הסיפור האישי.",
      cta: { href: "/coaching", label: "התחל/י תרגול" },
    });
  }

  // ─── 3. Daily application target ─────────────────────────────────────
  // If we're behind on the weekly goal, set today's task accordingly.
  const remaining = Math.max(0, weeklyGoal - submittedThisWeek);
  if (remaining > 0) {
    const today = Math.min(remaining, dailyAppTarget);
    tasks.push({
      id: "daily-apps",
      priority: 3,
      intent: submittedThisWeek === 0 ? "behind" : "ontrack",
      title: `הגש/י ${today} ${today === 1 ? "מועמדות חדשה" : "מועמדויות חדשות"} היום`,
      why:
        submittedThisWeek === 0
          ? `עדיין 0 השבוע. היעד: ${weeklyGoal}. ${today} היום מחזיר/ה אותך לקצב.`
          : `${submittedThisWeek}/${weeklyGoal} השבוע. ${today} היום ישאיר/ו אותך/אותך בקצב.`,
      cta: { href: "/jobs", label: "לרשימת המשרות" },
    });
  } else if (weeklyGoal > 0) {
    tasks.push({
      id: "daily-apps-met",
      priority: 3,
      intent: "momentum",
      title: "השלמת את היעד השבועי 🎯",
      why: `${submittedThisWeek}/${weeklyGoal} השבוע — מעולה. היום אפשר להתמקד בפעולות איכות (פנייה יזומה, חיזוק לינקדאין).`,
      cta: { href: "/coaching", label: "מה הצעד הבא?" },
    });
  }

  // ─── 4. Proactive outreach push (if diversity score is low) ──────────
  if (score.components.diversity.score < 50) {
    tasks.push({
      id: "proactive-outreach",
      priority: 4,
      intent: "behind",
      title: "שלח/י 1-2 הודעות פנייה יזומה (לא דרך לוחות משרות)",
      why: "פניות ישירות לאנשים בתפקיד או למגייסים פנימיים נותנות פי 3-5 שיעור תגובה מהגשה ללוח משרות. החזק/ה ביותר השבוע: שני אנשים שמכירים אותך עקיף.",
      cta: { href: "/networking-prompts", label: "ניסוחים מוכנים" },
    });
  }

  // ─── 5. Revive a stalled application ─────────────────────────────────
  const stalled = live
    .filter((a) => ACTIVE_STATUSES.has(a.status) && daysAgo(a.updatedAt) >= 10)
    .sort((a, b) => daysAgo(b.updatedAt) - daysAgo(a.updatedAt))[0];
  if (stalled && tasks.length < 5) {
    const days = daysAgo(stalled.updatedAt);
    tasks.push({
      id: "revive-stalled",
      priority: 5,
      intent: "behind",
      title: `החזר/י לחיים את ${stalled.company} (שקטה ${days} ימים)`,
      why: "מועמדות שקטה יותר מ-10 ימים מאבדת מומנטום. אפשר לשלוח שורה למגייס/ת או להעלות לסטטוס ׳סגור/ה׳ אם זה לא מתקדם.",
      cta: {
        href: `/progress/${stalled.id}`,
        label: "פתח/י את הכרטיסייה",
      },
    });
  }

  // ─── 6. Resilience action when there's literally nothing else ────────
  if (tasks.length === 0) {
    tasks.push({
      id: "fresh-start",
      priority: 1,
      intent: "behind",
      title: "מלא/י את דרכון הקריירה (5 דקות)",
      why: "בלי דרכון מלא, ההתאמות וההמלצות גנריות. זה הבסיס לכל מה שיקרה כאן.",
      cta: { href: "/profile", label: "למילוי הדרכון" },
    });
  }

  return tasks.slice(0, 5).sort((a, b) => a.priority - b.priority);
}

/** Default weekly application goal in absence of a stored preference. */
export const DEFAULT_WEEKLY_GOAL = 15;
