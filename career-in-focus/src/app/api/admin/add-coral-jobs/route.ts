/**
 * POST /api/admin/add-coral-jobs
 *
 * Direct-add endpoint for jobs Coral pastes from WhatsApp / DMs /
 * employer emails — the cases where there's no civi.co.il URL to
 * scrape. Accepts a structured array, dedupes by externalUrl (which
 * for these is usually `mailto:contact?subject=...`), and persists
 * with `isHot=true` so the new entries rank to the top of their
 * category per Coral's standing rule.
 *
 * Body shape:
 *   { jobs: Array<{ title, company, description, location, field,
 *                   contactEmail?, externalUrl? }> }
 *
 * If `externalUrl` is omitted, we generate `mailto:<contactEmail>` —
 * that's stable enough to dedupe re-pastes of the same posting from
 * the same recruiter.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyRegion } from "@/lib/regions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CoralJobInput {
  title: string;
  company: string;
  description: string;
  location?: string | null;
  field: string;
  contactEmail?: string | null;
  externalUrl?: string | null;
  /** Stable source id, e.g. "svt:1001782" — used by the daily sync diff. */
  sourceRef?: string | null;
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.jobs)) {
    return NextResponse.json({ error: "expected { jobs: [...] }" }, { status: 400 });
  }
  const jobs = body.jobs as CoralJobInput[];
  // Historically this endpoint hardcoded the source, which lumped the
  // SVT and Civi imports under "קורל - ישיר" in every stats view. The
  // caller may now label the batch.
  const batchSource =
    typeof body.source === "string" && body.source.length > 1
      ? (body.source as string)
      : "קורל - ישיר";

  // Normalize and assign externalUrl if missing.
  const normalized = jobs.map((j) => {
    const externalUrl =
      j.externalUrl ??
      (j.contactEmail
        ? `mailto:${j.contactEmail}?subject=${encodeURIComponent(j.title + " — קריירה בפוקוס")}`
        : `coral-direct:${j.title}-${j.company}`.replace(/\s+/g, "-"));
    const region = classifyRegion(j.location);
    return { ...j, externalUrl, region };
  });

  // Batch dedup by externalUrl.
  const urls = normalized.map((j) => j.externalUrl);
  const existing = await prisma.job.findMany({
    where: { externalUrl: { in: urls } },
    select: { externalUrl: true },
  });
  const existingSet = new Set(existing.map((e) => e.externalUrl));

  const results: Array<{ title: string; status: string; id?: string }> = [];
  for (const j of normalized) {
    if (existingSet.has(j.externalUrl)) {
      results.push({ title: j.title, status: "duplicate" });
      continue;
    }
    try {
      const created = await prisma.job.create({
        data: {
          title: j.title,
          company: j.company,
          description: j.description,
          summary: j.description.slice(0, 240),
          location: j.location ?? null,
          region: j.region,
          field: j.field,
          source: batchSource,
          sourceRef: j.sourceRef ?? null,
          externalUrl: j.externalUrl,
          isHot: true,
          isPublished: true,
        },
      });
      existingSet.add(j.externalUrl);
      results.push({ title: j.title, status: "created", id: created.id });
    } catch (e) {
      results.push({
        title: j.title,
        status: "error: " + String(e instanceof Error ? e.message : e).slice(0, 100),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    total: jobs.length,
    inserted: results.filter((r) => r.status === "created").length,
    duplicates: results.filter((r) => r.status === "duplicate").length,
    errors: results.filter((r) => r.status.startsWith("error")).length,
    results,
  });
}
