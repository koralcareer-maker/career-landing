"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server actions for the job-search OS features:
 *  - Journal entries per application
 *  - Reminders per application
 *  - Application detail loader (combined view)
 *  - Application status / next-step / interview-date updates
 *
 * The simple CRUD on JobApplication itself stays in progress.ts so we
 * don't break the existing /progress flow while we redesign it.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");
  return session.user.id;
}

async function loadOwnedApplication(id: string, userId: string) {
  const app = await prisma.jobApplication.findUnique({ where: { id } });
  if (!app || app.userId !== userId) {
    throw new Error("המשרה לא נמצאה או שאינה שייכת אליך");
  }
  return app;
}

// ─── Application detail ──────────────────────────────────────────────────────

export async function getApplicationDetail(applicationId: string) {
  const userId = await requireUser();
  const application = await loadOwnedApplication(applicationId, userId);

  const [journal, reminders] = await Promise.all([
    prisma.jobApplicationJournalEntry.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "desc" },
    }),
    prisma.jobApplicationReminder.findMany({
      where: { applicationId },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  return { application, journal, reminders };
}

// ─── Update core JobApplication fields (new "OS" fields) ─────────────────────

interface UpdateApplicationCoreInput {
  applicationId: string;
  status?: string;
  nextStep?: string | null;
  interviewDate?: string | null;       // ISO string or null to clear
  priority?: number | null;            // 1=low 2=medium 3=high
  archived?: boolean;
  notes?: string | null;
}

export async function updateApplicationCore(input: UpdateApplicationCoreInput) {
  const userId = await requireUser();
  await loadOwnedApplication(input.applicationId, userId);

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.nextStep !== undefined) data.nextStep = input.nextStep;
  if (input.interviewDate !== undefined) {
    data.interviewDate = input.interviewDate ? new Date(input.interviewDate) : null;
  }
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.archived !== undefined) data.archived = input.archived;
  if (input.notes !== undefined) data.notes = input.notes;

  await prisma.jobApplication.update({
    where: { id: input.applicationId },
    data,
  });

  revalidatePath("/progress");
  revalidatePath(`/progress/${input.applicationId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Journal entries ─────────────────────────────────────────────────────────

const JOURNAL_TAGS = ["INTERVIEW", "FOLLOWUP", "NOTE", "FEELING", "LEARNING", "OUTREACH"] as const;
type JournalTag = (typeof JOURNAL_TAGS)[number];

interface AddJournalEntryInput {
  applicationId: string;
  text: string;
  tag?: JournalTag | null;
  occurredAt?: string; // ISO; defaults to now
}

export async function addJournalEntry(input: AddJournalEntryInput) {
  const userId = await requireUser();
  await loadOwnedApplication(input.applicationId, userId);

  const trimmed = input.text.trim();
  if (!trimmed) throw new Error("טקסט נדרש");
  if (input.tag && !JOURNAL_TAGS.includes(input.tag)) {
    throw new Error("תגית לא תקינה");
  }

  const entry = await prisma.jobApplicationJournalEntry.create({
    data: {
      applicationId: input.applicationId,
      userId,
      text: trimmed.slice(0, 4000),
      tag: input.tag ?? null,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
    },
  });

  revalidatePath(`/progress/${input.applicationId}`);
  return entry;
}

export async function deleteJournalEntry(entryId: string) {
  const userId = await requireUser();
  const entry = await prisma.jobApplicationJournalEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== userId) {
    throw new Error("הרשומה לא נמצאה");
  }
  await prisma.jobApplicationJournalEntry.delete({ where: { id: entryId } });
  revalidatePath(`/progress/${entry.applicationId}`);
  return { ok: true };
}

// ─── Reminders ───────────────────────────────────────────────────────────────

const REMINDER_TYPES = ["FOLLOWUP", "INTERVIEW_PREP", "THANK_YOU", "RESEARCH", "OTHER"] as const;
type ReminderType = (typeof REMINDER_TYPES)[number];

interface AddReminderInput {
  applicationId: string;
  title: string;
  dueAt: string;        // ISO
  type?: ReminderType;
  notes?: string | null;
}

export async function addReminder(input: AddReminderInput) {
  const userId = await requireUser();
  await loadOwnedApplication(input.applicationId, userId);

  const title = input.title.trim();
  if (!title) throw new Error("כותרת נדרשת");
  if (!input.dueAt) throw new Error("תאריך נדרש");
  const dueAt = new Date(input.dueAt);
  if (isNaN(dueAt.getTime())) throw new Error("תאריך לא תקין");
  const type = input.type && REMINDER_TYPES.includes(input.type) ? input.type : "OTHER";

  const reminder = await prisma.jobApplicationReminder.create({
    data: {
      applicationId: input.applicationId,
      userId,
      title: title.slice(0, 200),
      dueAt,
      type,
      notes: input.notes ? input.notes.slice(0, 1000) : null,
    },
  });

  revalidatePath(`/progress/${input.applicationId}`);
  revalidatePath("/dashboard");
  return reminder;
}

export async function toggleReminderComplete(reminderId: string) {
  const userId = await requireUser();
  const r = await prisma.jobApplicationReminder.findUnique({ where: { id: reminderId } });
  if (!r || r.userId !== userId) throw new Error("התזכורת לא נמצאה");

  const next = await prisma.jobApplicationReminder.update({
    where: { id: reminderId },
    data: {
      completed: !r.completed,
      completedAt: !r.completed ? new Date() : null,
    },
  });

  revalidatePath(`/progress/${r.applicationId}`);
  revalidatePath("/dashboard");
  return next;
}

/**
 * Auto-tracks a Job (from the /jobs catalogue) into the user's
 * JobApplication tracker when they click "Apply". Idempotent — if a
 * JobApplication for the same Job (same jobLink or company+role) already
 * exists for this user, returns the existing one instead of creating a
 * duplicate. Returns { id, isNew } so the client can show a "תווסף למעקב"
 * vs. "כבר במעקב" toast.
 */
export async function trackApplicationFromJob(jobId: string): Promise<{
  id: string;
  isNew: boolean;
}> {
  const userId = await requireUser();

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("המשרה לא נמצאה");

  // Try to find an existing tracked application for this job (by external
  // URL first — most reliable signal — then fall back to company+role).
  const existing = await prisma.jobApplication.findFirst({
    where: {
      userId,
      OR: [
        job.externalUrl ? { jobLink: job.externalUrl } : { id: "__nope__" },
        { company: job.company, role: job.title },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const created = await prisma.jobApplication.create({
    data: {
      userId,
      company: job.company,
      role: job.title,
      jobLink: job.externalUrl,
      source: job.source ?? "מקטלוג המשרות",
      dateApplied: new Date(),
      status: "APPLIED",
      notes: job.summary ?? job.description ?? null,
    },
    select: { id: true },
  });
  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return { id: created.id, isNew: true };
}

/**
 * Quick action used by the welcome banner — add a follow-up reminder
 * exactly N days from now, with a sensible default title. Returns the
 * created reminder so the UI can show "+ Reminder set for D/M/Y".
 */
export async function addQuickFollowupReminder(applicationId: string, daysFromNow = 7) {
  const userId = await requireUser();
  const app = await loadOwnedApplication(applicationId, userId);

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + daysFromNow);

  return prisma.jobApplicationReminder.create({
    data: {
      applicationId,
      userId,
      title: `Follow-up — ${app.company}`,
      dueAt,
      type: "FOLLOWUP",
    },
  });
}

export async function deleteReminder(reminderId: string) {
  const userId = await requireUser();
  const r = await prisma.jobApplicationReminder.findUnique({ where: { id: reminderId } });
  if (!r || r.userId !== userId) throw new Error("התזכורת לא נמצאה");
  await prisma.jobApplicationReminder.delete({ where: { id: reminderId } });
  revalidatePath(`/progress/${r.applicationId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Cross-cutting reads (used by dashboard + main /progress) ────────────────

/** Reminders due in the next N days (default 7), open only, newest first. */
export async function getUpcomingReminders(days = 7) {
  const userId = await requireUser();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + days);
  return prisma.jobApplicationReminder.findMany({
    where: {
      userId,
      completed: false,
      dueAt: { lte: horizon },
    },
    orderBy: { dueAt: "asc" },
    include: { application: { select: { company: true, role: true, id: true } } },
    take: 20,
  });
}

/** Applications with a scheduled interview in the next N days. */
export async function getUpcomingInterviews(days = 14) {
  const userId = await requireUser();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + days);
  const now = new Date();
  return prisma.jobApplication.findMany({
    where: {
      userId,
      archived: false,
      interviewDate: { gte: now, lte: horizon },
    },
    orderBy: { interviewDate: "asc" },
    take: 10,
  });
}

/** Active applications grouped by status. */
export async function getActiveApplicationsByStatus() {
  const userId = await requireUser();
  const apps = await prisma.jobApplication.findMany({
    where: {
      userId,
      archived: false,
      status: { notIn: ["REJECTED", "FROZEN"] },
    },
    orderBy: { updatedAt: "desc" },
  });
  const byStatus = apps.reduce<Record<string, typeof apps>>((acc, a) => {
    (acc[a.status] ??= []).push(a);
    return acc;
  }, {});
  return { apps, byStatus };
}
