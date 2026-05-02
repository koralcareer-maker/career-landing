import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  getUpcomingReminders,
  getUpcomingInterviews,
} from "@/lib/actions/job-tracking";
import { generateInsights } from "@/lib/job-search-insights";
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

  const overdueReminders = upcomingReminders.filter(
    (r) => new Date(r.dueAt).getTime() < Date.now()
  ).length;

  // Insights are computed on the server so they appear instantly without
  // a client roundtrip — pure heuristic, no AI cost.
  const insights = generateInsights({
    applications: apps.map((a) => ({
      id: a.id,
      status: a.status,
      source: a.source,
      dateApplied: a.dateApplied,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      interviewDate: a.interviewDate,
      archived: a.archived,
    })),
    overdueReminders,
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
      />
    </div>
  );
}
