import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  getUpcomingReminders,
  getUpcomingInterviews,
} from "@/lib/actions/job-tracking";
import { generateInsights } from "@/lib/job-search-insights";
import { computeScore } from "@/lib/job-search-score";
import { buildActionPlan, DEFAULT_WEEKLY_GOAL } from "@/lib/daily-action-plan";
import { TrackerClient } from "./tracker-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "מעקב חיפוש עבודה | קריירה בפוקוס" };

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [apps, upcomingReminders, upcomingInterviews] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: [{ archived: "asc" }, { updatedAt: "desc" }],
    }),
    getUpcomingReminders(7),
    getUpcomingInterviews(14),
  ]);

  const now = Date.now();
  const overdueReminderRows = upcomingReminders.filter(
    (r) => new Date(r.dueAt).getTime() < now,
  );
  const overdueReminders = overdueReminderRows.length;
  const openRemindersOnTrack = upcomingReminders.length - overdueReminders;

  // ─── Insights, score, action plan ─── all server-side, no AI cost ─────
  const insightInput = apps.map((a) => ({
    id: a.id,
    status: a.status,
    source: a.source,
    dateApplied: a.dateApplied,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    interviewDate: a.interviewDate,
    archived: a.archived,
  }));

  const insights = generateInsights({
    applications: insightInput,
    overdueReminders,
  });

  const weeklyGoal = DEFAULT_WEEKLY_GOAL;
  const scoreBreakdown = computeScore({
    applications: insightInput,
    openRemindersOnTrack,
    overdueReminders,
    weeklyGoal,
  });

  const actionPlan = buildActionPlan({
    applications: apps.map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
      source: a.source,
      dateApplied: a.dateApplied,
      nextFollowUp: a.nextFollowUp,
      interviewDate: a.interviewDate,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      archived: a.archived,
    })),
    upcomingInterviews,
    overdueReminders: overdueReminderRows.map((r) => ({
      id: r.id,
      title: r.title,
      application: r.application,
    })),
    weeklyGoal,
    score: scoreBreakdown,
  });

  // Plain-JSON serialise for client.
  const serialised = apps.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    status: a.status,
    source: a.source,
    dateApplied: a.dateApplied?.toISOString() ?? null,
    nextFollowUp: a.nextFollowUp?.toISOString() ?? null,
    interviewDate: a.interviewDate?.toISOString() ?? null,
    nextStep: a.nextStep,
    priority: a.priority,
    archived: a.archived,
    notes: a.notes,
    jobLink: a.jobLink,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div className="p-4 sm:p-6">
      <TrackerClient
        applications={serialised}
        upcomingReminders={upcomingReminders.map((r) => ({
          id: r.id,
          title: r.title,
          dueAt: r.dueAt.toISOString(),
          type: r.type,
          completed: r.completed,
          application: r.application,
        }))}
        upcomingInterviews={upcomingInterviews.map((a) => ({
          id: a.id,
          company: a.company,
          role: a.role,
          interviewDate: a.interviewDate!.toISOString(),
        }))}
        insights={insights}
        scoreBreakdown={scoreBreakdown}
        actionPlan={actionPlan}
        weeklyGoal={weeklyGoal}
      />
    </div>
  );
}
