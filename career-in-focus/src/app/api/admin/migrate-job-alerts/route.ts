import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * One-shot migration that creates the JobAlert table and adds the
 * emailJobAlerts column to User. Same pattern as the earlier
 * job-tracking migration: schema declarations live in schema.prisma
 * for the generated Prisma client, but production DB columns are
 * added via this endpoint because Vercel's deploy doesn't run
 * `prisma migrate`.
 *
 * Idempotent — `IF NOT EXISTS` on every statement so a second click
 * is a no-op. Trigger from /admin/migrate-job-alerts.
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

  // 2. User.emailJobAlerts column. SQLite/libsql don't support
  //    ADD COLUMN IF NOT EXISTS, so we check pragma first.
  const userColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info("User");`,
  );
  const hasColumn = userColumns.some((c) => c.name === "emailJobAlerts");
  if (!hasColumn) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN "emailJobAlerts" BOOLEAN NOT NULL DEFAULT 1;`,
    );
    log.push("✓ User.emailJobAlerts column");
  } else {
    log.push("· User.emailJobAlerts already exists");
  }

  return NextResponse.json({ ok: true, log });
}
