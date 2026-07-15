/**
 * POST /api/admin/migrate-candidate-matches
 *
 * One-shot Turso migration for the CandidateMatch table (see
 * migrate-candidate-table/route.ts for why these exist: the build only
 * runs `prisma generate`, never `prisma migrate deploy`). Idempotent.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATEMENTS: Array<{ label: string; sql: string }> = [
  {
    label: "CandidateMatch table",
    sql: `CREATE TABLE IF NOT EXISTS "CandidateMatch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "candidateId" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "score" INTEGER NOT NULL,
      "reasons" TEXT,
      "requirementsCheck" TEXT,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "emailedAt" DATETIME,
      CONSTRAINT "CandidateMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CandidateMatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
  },
  {
    label: "CandidateMatch_candidateId_jobId_key",
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS "CandidateMatch_candidateId_jobId_key" ON "CandidateMatch"("candidateId", "jobId")`,
  },
  {
    label: "CandidateMatch_status_createdAt_idx",
    sql: `CREATE INDEX IF NOT EXISTS "CandidateMatch_status_createdAt_idx" ON "CandidateMatch"("status", "createdAt")`,
  },
  {
    label: "CandidateMatch_candidateId_idx",
    sql: `CREATE INDEX IF NOT EXISTS "CandidateMatch_candidateId_idx" ON "CandidateMatch"("candidateId")`,
  },
];

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ label: string; ok: boolean; error?: string }> = [];
  for (const st of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(st.sql);
      results.push({ label: st.label, ok: true });
    } catch (e) {
      results.push({
        label: st.label,
        ok: false,
        error: String(e instanceof Error ? e.message : e).slice(0, 200),
      });
    }
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
