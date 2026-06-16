/**
 * POST /api/admin/candidates/import-leads
 *
 * Bulk-import candidates from the OLD site's leads CSV (and any other
 * pre-parsed source where we have name/email/phone but NOT a CV body).
 *
 * The standard /import endpoint expects raw CV text and uses Gemini to
 * extract structured fields. That path is wrong for two reasons here:
 *   1. These leads have no CV body — only the contact form fields.
 *   2. Gemini quota is finite; burning ~80 calls on entries we already
 *      have structured is wasteful.
 *
 * This endpoint takes the structured rows directly. Same dedup rule
 * Coral set originally: email match OR name match wins (no creation).
 *
 * Body:
 *   { leads: Array<{ name, email?, phone?, targetRole?, source?, notes? }> }
 *
 * Returns per-row {status: created | duplicate-by-email | duplicate-by-name | skipped}.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface LeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  targetRole?: string | null;
  source?: string | null;
  notes?: string | null;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.leads)) {
    return NextResponse.json({ error: "expected { leads: [...] }" }, { status: 400 });
  }
  const leads = body.leads as LeadInput[];
  const defaultSource = (body.source as string | undefined) ?? "ייבוא ידני - ליד ישן";

  const results: Array<{ name: string; status: string; matchedBy?: string }> = [];

  for (const lead of leads) {
    const name = lead.name?.trim();
    if (!name) {
      results.push({ name: "(empty)", status: "skipped-no-name" });
      continue;
    }
    const email = lead.email?.trim().toLowerCase() || null;
    const phone = lead.phone?.trim() || null;

    // Email-first dedup, then name. Coral's standing rule: never
    // create when either signal matches an existing candidate.
    const dupChecks: Array<{ email?: string } | { name: string }> = [];
    if (email) dupChecks.push({ email });
    if (name && name !== "לא ידוע") dupChecks.push({ name });

    if (dupChecks.length > 0) {
      const dup = await prisma.candidate.findFirst({
        where: { OR: dupChecks as never },
        select: { id: true, name: true, email: true },
      });
      if (dup) {
        results.push({
          name,
          status: "duplicate",
          matchedBy: dup.email === email ? "email" : "name",
        });
        continue;
      }
    }

    try {
      await prisma.candidate.create({
        data: {
          name,
          email,
          phone,
          targetRole: lead.targetRole ?? null,
          source: lead.source ?? defaultSource,
          sourceRef: email ?? phone ?? `legacy-lead:${name}`,
          summary: lead.notes ?? null,
          rawCvText: null,
          skills: JSON.stringify([]),
          languages: JSON.stringify([]),
        },
      });
      results.push({ name, status: "created" });
    } catch (e) {
      results.push({
        name,
        status: "error: " + String(e instanceof Error ? e.message : e).slice(0, 100),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total: leads.length,
    created: results.filter((r) => r.status === "created").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    skipped: results.filter((r) => r.status.startsWith("skipped")).length,
    errors: results.filter((r) => r.status.startsWith("error")).length,
    results,
  });
}
