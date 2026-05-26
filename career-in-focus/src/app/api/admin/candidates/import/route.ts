/**
 * POST /api/admin/candidates/import
 *
 * Ingest a single CV into the Candidate pool. Used by the agent-side
 * Canva importer (one design or one page at a time), Gmail attachment
 * sync, and eventually the public lead form once it's built.
 *
 * Body:
 *   {
 *     rawCvText: string,        // Full text of the CV
 *     source: "canva"|"gmail"|"whatsapp"|"form"|"manual",
 *     sourceRef?: string,       // e.g. "canva:DAHKsz1s7-U:1"
 *     cvUrl?: string,           // link back to original (Canva view URL etc.)
 *     overrides?: Partial<Candidate>,  // optional per-field overrides
 *                                       // (lets the caller force a name when
 *                                       // the extractor can't tell)
 *   }
 *
 * Pipeline:
 *   1. dedup on (source, sourceRef) — skip if already imported
 *   2. extract structured fields with Gemini Flash (lib/candidate-extractor)
 *   3. compute embedding with text-embedding-004
 *   4. persist to DB
 *
 * Admin-only. Idempotent — re-running with the same sourceRef returns
 * the existing row instead of creating a duplicate.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractCandidate, embedCandidate } from "@/lib/candidate-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ImportBody {
  rawCvText: string;
  source: "canva" | "gmail" | "whatsapp" | "form" | "manual";
  sourceRef?: string;
  cvUrl?: string;
  overrides?: Record<string, unknown>;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.rawCvText || body.rawCvText.length < 50) {
    return NextResponse.json({ error: "rawCvText too short" }, { status: 400 });
  }
  if (!body.source) {
    return NextResponse.json({ error: "source required" }, { status: 400 });
  }

  // Idempotency: skip if already imported from same source/sourceRef.
  if (body.sourceRef) {
    const existing = await prisma.candidate.findFirst({
      where: { source: body.source, sourceRef: body.sourceRef },
      select: { id: true, name: true },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        status: "duplicate",
        candidateId: existing.id,
        name: existing.name,
      });
    }
  }

  // Extract structured fields via Gemini.
  let extracted;
  try {
    extracted = await extractCandidate(body.rawCvText);
  } catch (e) {
    return NextResponse.json(
      {
        error: "extractor-failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }

  // Name + email dedup (Coral's rule: one candidate per person). Email
  // wins because it's globally unique; name match is the fallback when
  // the CV doesn't have an email or the email differs (e.g. work vs
  // personal). Case-insensitive trim on name to handle "רחל" vs " רחל ".
  const ov = (body.overrides ?? {}) as Partial<typeof extracted>;
  const candidateName = (ov.name ?? extracted.name)?.trim();
  const candidateEmail = (ov.email ?? extracted.email)?.trim().toLowerCase();
  const dupChecks: Array<{ email?: string } | { name: string }> = [];
  if (candidateEmail) dupChecks.push({ email: candidateEmail });
  if (candidateName && candidateName !== "לא ידוע") dupChecks.push({ name: candidateName });
  if (dupChecks.length > 0) {
    const dup = await prisma.candidate.findFirst({
      where: { OR: dupChecks as never },
      select: { id: true, name: true, email: true },
    });
    if (dup) {
      return NextResponse.json({
        ok: true,
        status: "duplicate-by-identity",
        candidateId: dup.id,
        name: dup.name,
        matchedBy: dup.email === candidateEmail ? "email" : "name",
      });
    }
  }

  // Compute embedding. If this fails we still store the candidate
  // without an embedding — the auto-matcher can backfill later.
  let embeddingJson: string | null = null;
  try {
    const vec = await embedCandidate(extracted);
    embeddingJson = JSON.stringify(vec);
  } catch {
    // Non-fatal: candidate gets stored, embedding stays null.
  }

  // Apply caller overrides (e.g. force a name when extractor said "לא ידוע").
  // (ov is already declared above for the dedup check.)
  const merged = { ...extracted, ...ov };

  const candidate = await prisma.candidate.create({
    data: {
      name: merged.name,
      email: merged.email,
      phone: merged.phone,
      linkedinUrl: merged.linkedinUrl,
      targetRole: merged.targetRole,
      field: merged.field,
      region: merged.region,
      city: merged.city,
      yearsExperience: merged.yearsExperience,
      currentCompany: merged.currentCompany,
      currentTitle: merged.currentTitle,
      summary: merged.summary,
      skills: JSON.stringify(merged.skills ?? []),
      languages: JSON.stringify(merged.languages ?? []),
      education: merged.education,
      militaryUnit: merged.militaryUnit,
      source: body.source,
      sourceRef: body.sourceRef ?? null,
      cvUrl: body.cvUrl ?? null,
      rawCvText: body.rawCvText,
      embedding: embeddingJson,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "created",
    candidateId: candidate.id,
    name: candidate.name,
    extracted: {
      email: extracted.email,
      phone: extracted.phone,
      targetRole: extracted.targetRole,
      field: extracted.field,
      region: extracted.region,
      yearsExperience: extracted.yearsExperience,
      skills: extracted.skills.slice(0, 5),
    },
    hasEmbedding: embeddingJson !== null,
  });
}
