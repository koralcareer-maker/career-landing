import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * One-shot admin endpoint that creates the new job-tracking tables
 * (JobApplicationJournalEntry + JobApplicationReminder) and adds the
 * extra columns to JobApplication needed for the new "job search OS"
 * feature.
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS and tolerates ALTER TABLE
 * "duplicate column" errors. Safe to click multiple times.
 *
 * Trigger from a logged-in admin browser:
 *   POST /api/admin/migrate-job-tracking
 */

interface MigrationStep {
  description: string;
  sql: string;
  /** SQL state errors that are safe to ignore (column already exists, etc). */
  tolerateSqlErrors?: string[];
}

// Each statement is run inside its own try/catch so a single duplicate-column
// failure doesn't abort the rest. This is the price we pay for libsql not
// supporting true Prisma migrate flows.
const STEPS: MigrationStep[] = [
  {
    description: "Add interviewDate column",
    sql: `ALTER TABLE "JobApplication" ADD COLUMN "interviewDate" DATETIME`,
    tolerateSqlErrors: ["duplicate column", "already exists"],
  },
  {
    description: "Add nextStep column",
    sql: `ALTER TABLE "JobApplication" ADD COLUMN "nextStep" TEXT`,
    tolerateSqlErrors: ["duplicate column", "already exists"],
  },
  {
    description: "Add priority column",
    sql: `ALTER TABLE "JobApplication" ADD COLUMN "priority" INTEGER`,
    tolerateSqlErrors: ["duplicate column", "already exists"],
  },
  {
    description: "Add archived column",
    sql: `ALTER TABLE "JobApplication" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT 0`,
    tolerateSqlErrors: ["duplicate column", "already exists"],
  },
  {
    description: "Create JobApplicationJournalEntry table",
    sql: `CREATE TABLE IF NOT EXISTS "JobApplicationJournalEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "applicationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "text" TEXT NOT NULL,
      "tag" TEXT,
      FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    description: "Index JobApplicationJournalEntry by application",
    sql: `CREATE INDEX IF NOT EXISTS "idx_jae_application_occurred"
      ON "JobApplicationJournalEntry"("applicationId", "occurredAt")`,
  },
  {
    description: "Index JobApplicationJournalEntry by user",
    sql: `CREATE INDEX IF NOT EXISTS "idx_jae_user_occurred"
      ON "JobApplicationJournalEntry"("userId", "occurredAt")`,
  },
  {
    description: "Create JobApplicationReminder table",
    sql: `CREATE TABLE IF NOT EXISTS "JobApplicationReminder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "applicationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "dueAt" DATETIME NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'OTHER',
      "title" TEXT NOT NULL,
      "notes" TEXT,
      "completed" BOOLEAN NOT NULL DEFAULT 0,
      "completedAt" DATETIME,
      FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    description: "Index JobApplicationReminder by application",
    sql: `CREATE INDEX IF NOT EXISTS "idx_jar_application_due"
      ON "JobApplicationReminder"("applicationId", "dueAt")`,
  },
  {
    description: "Index JobApplicationReminder by user",
    sql: `CREATE INDEX IF NOT EXISTS "idx_jar_user_due_completed"
      ON "JobApplicationReminder"("userId", "dueAt", "completed")`,
  },
  {
    description: "Create UserCourseCompletion table",
    sql: `CREATE TABLE IF NOT EXISTS "UserCourseCompletion" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    description: "Unique index for UserCourseCompletion (userId, courseId)",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uniq_ucc_user_course"
      ON "UserCourseCompletion"("userId", "courseId")`,
  },
  {
    description: "Index UserCourseCompletion by user",
    sql: `CREATE INDEX IF NOT EXISTS "idx_ucc_user"
      ON "UserCourseCompletion"("userId")`,
  },
  {
    description: "Create UserSkillCompletion table",
    sql: `CREATE TABLE IF NOT EXISTS "UserSkillCompletion" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "skillName" TEXT NOT NULL,
      "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    description: "Unique index for UserSkillCompletion (userId, skillName)",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uniq_usc_user_skill"
      ON "UserSkillCompletion"("userId", "skillName")`,
  },
  {
    description: "Index UserSkillCompletion by user",
    sql: `CREATE INDEX IF NOT EXISTS "idx_usc_user"
      ON "UserSkillCompletion"("userId")`,
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "אדמין בלבד" }, { status: 403 });
  }

  const results: { step: string; ok: boolean; tolerated?: boolean; error?: string }[] = [];

  for (const step of STEPS) {
    try {
      await prisma.$executeRawUnsafe(step.sql);
      results.push({ step: step.description, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const tolerable = step.tolerateSqlErrors?.some((t) => msg.toLowerCase().includes(t));
      if (tolerable) {
        results.push({ step: step.description, ok: true, tolerated: true });
      } else {
        results.push({ step: step.description, ok: false, error: msg.slice(0, 200) });
      }
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    total: STEPS.length,
    ok: okCount,
    failed: failCount,
    results,
  });
}
