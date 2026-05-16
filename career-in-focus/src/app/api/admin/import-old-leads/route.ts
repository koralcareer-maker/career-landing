/**
 * POST /api/admin/import-old-leads
 *
 * One-time admin tool: imports the historical leads extracted from
 * Coral's Gmail (see lib/data/old-site-leads.ts) into the Lead table
 * so they show up in /admin/leads + are addressable by the OLD_LEADS
 * broadcast audience.
 *
 * Safe to re-run: we dedupe on (email + name) so existing rows are
 * skipped, not duplicated. Each insert keeps the original Gmail
 * createdAt timestamp so timelines stay accurate.
 *
 * Auth: admin only. No body required.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OLD_SITE_LEADS } from "@/lib/data/old-site-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of OLD_SITE_LEADS) {
    try {
      // Dedup: skip if a lead with the same email already exists, or
      // (when email is null) one with the same phone. This makes the
      // endpoint idempotent — Coral can hit "import" twice safely.
      const existing = await prisma.lead.findFirst({
        where: lead.email
          ? { email: lead.email }
          : lead.phone
            ? { phone: lead.phone }
            : { name: lead.name },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.lead.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          source: lead.source,
          createdAt: new Date(lead.createdAt),
        },
      });
      inserted++;
    } catch (e) {
      errors.push(`${lead.name}: ${String(e instanceof Error ? e.message : e).slice(0, 100)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: OLD_SITE_LEADS.length,
    inserted,
    skipped,
    errors: errors.slice(0, 10),
  });
}
