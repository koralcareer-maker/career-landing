/**
 * POST /api/admin/candidates/import-from-file
 *
 * Multipart upload of a PDF or DOCX CV. Extracts text server-side
 * (pdf-parse / mammoth — both already in package.json), then routes
 * through the same Gemini extractor + embedder + dedup pipeline that
 * /import uses. This is what unlocks pouring Coral's Gmail CV
 * attachments and any locally-saved PDFs into the pool quickly: she
 * drops the files into the upload UI and they land as structured
 * candidate rows.
 *
 * Returns the same shape as /import so the upload UI can render a
 * row-per-file outcome (created / duplicate-by-identity / error).
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractCandidate, embedCandidate } from "@/lib/candidate-extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function extractFileText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  // PDF — uses pdf-parse (lazy import so we don't load it for DOCX files).
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const res = await pdfParse(buf);
    return (res.text ?? "").trim();
  }
  // DOCX — mammoth's raw-text extractor.
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return (res.value ?? "").trim();
  }
  // Plain text fallback (Coral occasionally saves CVs as .txt).
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return buf.toString("utf-8").trim();
  }
  throw new Error(`unsupported file type: ${file.type || name}`);
}

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing 'file' field" }, { status: 400 });
  }
  const source = (form.get("source") as string | null) ?? "manual";
  const sourceRef = (form.get("sourceRef") as string | null) ?? `file:${file.name}`;
  const cvUrl = (form.get("cvUrl") as string | null) ?? null;

  // Idempotency by sourceRef (lets the upload UI re-send the same
  // file safely — gets the original candidate back instead of dup).
  const dupBySource = await prisma.candidate.findFirst({
    where: { source, sourceRef },
    select: { id: true, name: true },
  });
  if (dupBySource) {
    return NextResponse.json({
      ok: true,
      status: "duplicate-by-sourceRef",
      candidateId: dupBySource.id,
      name: dupBySource.name,
      file: file.name,
    });
  }

  // Parse file → text.
  let rawCvText: string;
  try {
    rawCvText = await extractFileText(file);
  } catch (e) {
    return NextResponse.json(
      { error: "file-parse-failed", file: file.name, detail: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
  if (!rawCvText || rawCvText.length < 50) {
    return NextResponse.json(
      { error: "file-too-short", file: file.name, chars: rawCvText.length },
      { status: 400 },
    );
  }

  // Gemini extraction.
  let extracted;
  try {
    extracted = await extractCandidate(rawCvText);
  } catch (e) {
    return NextResponse.json(
      { error: "extractor-failed", file: file.name, detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  // Name + email dedup (Coral's rule).
  const candidateName = extracted.name?.trim();
  const candidateEmail = extracted.email?.trim().toLowerCase();
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
        file: file.name,
        matchedBy: dup.email === candidateEmail ? "email" : "name",
      });
    }
  }

  // Embedding (non-fatal — candidate stored even if this fails).
  let embeddingJson: string | null = null;
  try {
    const vec = await embedCandidate(extracted);
    embeddingJson = JSON.stringify(vec);
  } catch {
    /* keep going */
  }

  const candidate = await prisma.candidate.create({
    data: {
      name: extracted.name,
      email: extracted.email,
      phone: extracted.phone,
      linkedinUrl: extracted.linkedinUrl,
      targetRole: extracted.targetRole,
      field: extracted.field,
      region: extracted.region,
      city: extracted.city,
      yearsExperience: extracted.yearsExperience,
      currentCompany: extracted.currentCompany,
      currentTitle: extracted.currentTitle,
      summary: extracted.summary,
      skills: JSON.stringify(extracted.skills ?? []),
      languages: JSON.stringify(extracted.languages ?? []),
      education: extracted.education,
      militaryUnit: extracted.militaryUnit,
      source,
      sourceRef,
      cvUrl,
      rawCvText,
      embedding: embeddingJson,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "created",
    candidateId: candidate.id,
    name: candidate.name,
    file: file.name,
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
