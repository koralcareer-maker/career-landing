import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Idempotent one-shot migration. Schema declarations live in
 * schema.prisma for the generated Prisma client; production DB columns
 * are added via this endpoint because Vercel's deploy doesn't run
 * `prisma migrate`. SQLite/libsql doesn't support ADD COLUMN IF NOT
 * EXISTS, so each new column is gated by a PRAGMA table_info check
 * (`addColumnIfMissing` helper below). Safe to click any number of
 * times — the second run is a no-op.
 *
 * Adds in order:
 *   1. JobAlert table + indexes (job-match alert system)
 *   2. User.emailJobAlerts (opt-out flag for #1)
 *   3. Profile.js_*  / Profile.portfolioUrl / Profile.additionalLinks
 *      (job-search wizard step 3 + 4)
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  const log: string[] = [];

  // ── helper: add column to a table only when missing ────────────
  async function addColumnIfMissing(
    table: string,
    column: string,
    typeAndDefault: string,
  ) {
    const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      `PRAGMA table_info("${table}");`,
    );
    if (cols.some((c) => c.name === column)) {
      log.push(`· ${table}.${column} already exists`);
      return;
    }
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN "${column}" ${typeAndDefault};`,
    );
    log.push(`✓ ${table}.${column}`);
  }

  // 1. JobAlert table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobAlert" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "jobId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "JobAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE
    );
  `);
  log.push("✓ JobAlert table");

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "JobAlert_jobId_userId_key" ON "JobAlert"("jobId", "userId");
  `);
  log.push("✓ JobAlert unique index");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "JobAlert_userId_sentAt_idx" ON "JobAlert"("userId", "sentAt");
  `);
  log.push("✓ JobAlert userId/sentAt index");

  // 2. User.emailJobAlerts column.
  await addColumnIfMissing("User", "emailJobAlerts", "BOOLEAN NOT NULL DEFAULT 1");

  // 3. Profile columns for the job-search wizard.
  //    Step 3 (סטטוס חיפוש) — all nullable so legacy users aren't disturbed.
  await addColumnIfMissing("Profile", "js_actively", "TEXT");
  await addColumnIfMissing("Profile", "js_searchWeeks", "INTEGER");
  await addColumnIfMissing("Profile", "js_recentInterviews", "INTEGER");
  await addColumnIfMissing("Profile", "js_isApplying", "BOOLEAN");
  //    Step 4 (נכסים מקצועיים).
  await addColumnIfMissing("Profile", "portfolioUrl", "TEXT");
  await addColumnIfMissing("Profile", "additionalLinks", "TEXT");

  // 4. CvFeedback table — caches CV-feedback analyses per (user, file).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CvFeedback" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "contentHash" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "result" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  log.push("✓ CvFeedback table");

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "CvFeedback_userId_contentHash_key" ON "CvFeedback"("userId", "contentHash");
  `);
  log.push("✓ CvFeedback unique index");

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CvFeedback_userId_createdAt_idx" ON "CvFeedback"("userId", "createdAt");
  `);
  log.push("✓ CvFeedback userId/createdAt index");

  return NextResponse.json({ ok: true, log });
}
