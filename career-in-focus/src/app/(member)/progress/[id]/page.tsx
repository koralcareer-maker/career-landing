import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ApplicationDetailClient } from "./detail-client";
import { INTERVIEW_PREP } from "@/lib/job-search-insights";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const app = await prisma.jobApplication.findUnique({ where: { id } });
  if (!app || app.userId !== session.user.id) notFound();

  const [journal, reminders] = await Promise.all([
    prisma.jobApplicationJournalEntry.findMany({
      where: { applicationId: id },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.jobApplicationReminder.findMany({
      where: { applicationId: id },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  // Pre-resolve the prep block for the current status (if relevant).
  const prep = INTERVIEW_PREP[app.status] ?? null;

  return (
    <div className="p-4 sm:p-6">
      <ApplicationDetailClient
        application={{
          ...app,
          createdAt: app.createdAt.toISOString(),
          updatedAt: app.updatedAt.toISOString(),
          dateApplied: app.dateApplied?.toISOString() ?? null,
          nextFollowUp: app.nextFollowUp?.toISOString() ?? null,
          interviewDate: app.interviewDate?.toISOString() ?? null,
        }}
        journal={journal.map((j) => ({
          ...j,
          createdAt: j.createdAt.toISOString(),
          occurredAt: j.occurredAt.toISOString(),
        }))}
        reminders={reminders.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          dueAt: r.dueAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
        }))}
        prep={prep}
      />
    </div>
  );
}
