/**
 * POST /api/admin/migrate-candidate-table
 *
 * Vercel doesn't run `prisma migrate deploy` automatically on this
 * project (the build script only runs `prisma generate`). So when we
 * add a new table the schema is updated for the Prisma client but the
 * Turso database itself never gets the CREATE TABLE. This one-shot
 * endpoint runs the Candidate-table SQL by hand via $executeRawUnsafe.
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT
 * EXISTS so repeated calls are safe. Returns a checklist of what got
 * created so we can see at a glance whether the migration applied.
 *
 * Admin-only. Once the Candidate table is live this route can be
 * deleted, but leaving it in for now means future single-table
 * migrations have a template.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATEMENTS: Array<{ label: string; sql: string }> = [
  {
    label: "Candidate table",
    sql: `CREATE TABLE IF NOT EXISTS "Candidate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "phone" TEXT,
      "linkedinUrl" TEXT,
      "targetRole" TEXT,
      "field" TEXT,
      "region" TEXT,
      "city" TEXT,
      "yearsExperience" INTEGER,
      "currentCompany" TEXT,
      "currentTitle" TEXT,
      "summary" TEXT,
      "skills" TEXT,
      "languages" TEXT,
      "education" TEXT,
      "militaryUnit" TEXT,
      "source" TEXT NOT NULL,
      "sourceRef" TEXT,
      "cvUrl" TEXT,
      "rawCvText" TEXT,
      "embedding" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "handledByCoral" BOOLEAN NOT NULL DEFAULT false
    )`,
  },
  {
    label: "Candidate_field_region_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Candidate_field_region_idx" ON "Candidate"("field", "region")`,
  },
  {
    label: "Candidate_source_sourceRef_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Candidate_source_sourceRef_idx" ON "Candidate"("source", "sourceRef")`,
  },
  {
    label: "Candidate_handledByCoral_createdAt_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Candidate_handledByCoral_createdAt_idx" ON "Candidate"("handledByCoral", "createdAt")`,
  },
  {
    label: "Candidate_email_idx",
    sql: `CREATE INDEX IF NOT EXISTS "Candidate_email_idx" ON "Candidate"("email")`,
  },
  {
    // SQLite has no ADD COLUMN IF NOT EXISTS — the per-statement
    // try/catch swallows the "duplicate column name" error on re-runs.
    label: "Candidate.salaryExpectation column",
    sql: `ALTER TABLE "Candidate" ADD COLUMN "salaryExpectation" TEXT`,
  },
];

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ label: string; ok: boolean; error?: string }> = [];
  for (const stmt of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(stmt.sql);
      results.push({ label: stmt.label, ok: true });
    } catch (e) {
      results.push({
        label: stmt.label,
        ok: false,
        error: e instanceof Error ? e.message.slice(0, 200) : String(e),
      });
    }
  }

  // Sanity check — count rows. If the table now exists we should get 0.
  let rowCount: number | null = null;
  try {
    const r = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM "Candidate"`,
    )) as Array<{ n: number | bigint }>;
    const raw = r[0]?.n;
    rowCount = typeof raw === "bigint" ? Number(raw) : (raw ?? null);
  } catch {
    rowCount = null;
  }

  return NextResponse.json({ ok: true, results, rowCount });
}
