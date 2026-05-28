"use server";

/**
 * Public "קורל מקושרים" talent-pool intake.
 *
 * Anyone with the /talent link fills the form (name, contact, target
 * role, region, free-text about-me, optional CV file). On submit we:
 *   1. parse the CV file if attached (pdf-parse / mammoth)
 *   2. build a rawCvText blob from the form fields + parsed file
 *   3. run the Gemini→Claude extractor for a structured summary +
 *      a Gemini embedding (so the auto-matcher can rank them later)
 *   4. dedup by email/name (Coral's one-person rule)
 *   5. persist a Candidate row with source="form", handledByCoral=false
 *
 * Public + unauthenticated by design — this is the link Coral blasts to
 * her audience. We guard with a honeypot field and basic validation,
 * and the endpoint only ever CREATES a candidate (never reads/edits the
 * pool), so there's no data-exposure surface.
 */

import { prisma } from "@/lib/prisma";
import { extractCandidate, embedCandidate, type ExtractedCandidate } from "@/lib/candidate-extractor";

export interface SubmitTalentState {
  ok?: boolean;
  error?: string;
  fields?: {
    name?: string;
    email?: string;
    phone?: string;
    targetRole?: string;
    region?: string;
    about?: string;
  };
}

async function extractFileText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const res = await pdfParse(buf);
    return (res.text ?? "").trim();
  }
  if (
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: buf });
    return (res.value ?? "").trim();
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return buf.toString("utf-8").trim();
  }
  return ""; // unknown type → ignore, we still have the form fields
}

export async function submitTalent(
  _prev: SubmitTalentState,
  formData: FormData,
): Promise<SubmitTalentState> {
  // Honeypot — bots fill hidden fields. Pretend success, store nothing.
  if (formData.get("_hp")) return { ok: true };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const targetRole = String(formData.get("targetRole") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const file = formData.get("cv");

  const fields = { name, email, phone, targetRole, region, about };

  if (name.length < 2) return { error: "נא למלא שם מלא", fields };
  if (!phone && !email) return { error: "נא להשאיר טלפון או אימייל ליצירת קשר", fields };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "כתובת האימייל לא תקינה", fields };
  }

  // Parse the CV file if one was attached (≤8MB, pdf/docx/txt).
  let fileText = "";
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) {
      return { error: "הקובץ גדול מדי (מקסימום 8MB)", fields };
    }
    try {
      fileText = await extractFileText(file);
    } catch {
      // Non-fatal — proceed with just the form fields.
    }
  }

  // Build the text blob the AI extractor works on.
  const rawCvText = [
    `שם: ${name}`,
    email && `אימייל: ${email}`,
    phone && `טלפון: ${phone}`,
    targetRole && `תפקיד מבוקש: ${targetRole}`,
    region && `אזור: ${region}`,
    about && `על עצמי: ${about}`,
    fileText && `\nקורות חיים:\n${fileText}`,
  ]
    .filter(Boolean)
    .join("\n");

  // AI extraction — fall through to a minimal record if both Gemini and
  // Claude are unavailable, so a submission is never lost.
  let extracted: ExtractedCandidate;
  try {
    extracted = await extractCandidate(rawCvText);
  } catch {
    extracted = {
      name, email: email || null, phone: phone || null, linkedinUrl: null,
      targetRole: targetRole || null, field: null, region: region || null,
      city: null, yearsExperience: null, currentCompany: null, currentTitle: null,
      summary: about || null, skills: [], languages: [], education: null, militaryUnit: null,
    };
  }

  // Form fields are authoritative over AI guesses for identity + intent.
  const finalName = name || extracted.name;
  const finalEmail = (email || extracted.email || "").toLowerCase() || null;
  const finalPhone = phone || extracted.phone;
  const finalRole = targetRole || extracted.targetRole;
  const finalRegion = region || extracted.region;

  // Dedup by email then name (one person per pool).
  const dupChecks: Array<{ email?: string } | { name: string }> = [];
  if (finalEmail) dupChecks.push({ email: finalEmail });
  if (finalName && finalName !== "לא ידוע") dupChecks.push({ name: finalName });
  if (dupChecks.length > 0) {
    const dup = await prisma.candidate.findFirst({
      where: { OR: dupChecks as never },
      select: { id: true },
    });
    if (dup) {
      // Already in the pool — treat as success so the visitor isn't
      // told "you already applied" (Coral can dedup-merge later).
      return { ok: true };
    }
  }

  // Embedding (non-fatal).
  let embeddingJson: string | null = null;
  try {
    embeddingJson = JSON.stringify(await embedCandidate(extracted));
  } catch {
    /* keep going */
  }

  try {
    await prisma.candidate.create({
      data: {
        name: finalName,
        email: finalEmail,
        phone: finalPhone,
        linkedinUrl: extracted.linkedinUrl,
        targetRole: finalRole,
        field: extracted.field,
        region: finalRegion,
        city: extracted.city,
        yearsExperience: extracted.yearsExperience,
        currentCompany: extracted.currentCompany,
        currentTitle: extracted.currentTitle,
        summary: extracted.summary ?? (about || null),
        skills: JSON.stringify(extracted.skills ?? []),
        languages: JSON.stringify(extracted.languages ?? []),
        education: extracted.education,
        militaryUnit: extracted.militaryUnit,
        source: "form",
        sourceRef: `form:${finalEmail ?? finalPhone ?? Date.now()}`,
        rawCvText,
        embedding: embeddingJson,
      },
    });
  } catch {
    return {
      error: "אירעה שגיאה בשמירה. נסו שוב או כתבו ל-koralcareer@gmail.com",
      fields,
    };
  }

  return { ok: true };
}
