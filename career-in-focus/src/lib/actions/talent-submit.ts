"use server";

/**
 * Public "קורל מקושרים" talent-pool intake.
 *
 * Anyone with the /talent link fills the form (name, contact, target
 * role, region, free-text about-me). On submit we build a rawCvText
 * blob from the fields, run the Gemini→Claude extractor for a
 * structured summary + a Gemini embedding (so the auto-matcher can rank
 * them later), dedup by email/name (Coral's one-person rule), and
 * persist a Candidate row with source="form", handledByCoral=false.
 *
 * NOTE: CV file parsing lives in the dedicated /api/talent/upload-cv
 * route handler, NOT here. Bundling node-only deps (pdf-parse/mammoth)
 * inside a server action breaks the Next build because actions are
 * wrapped as client-callable references; route handlers don't have
 * that constraint. The form posts text here and (optionally) the file
 * to that route separately.
 *
 * Public + unauthenticated by design — this is the link Coral blasts to
 * her audience. Honeypot + validation guard the open endpoint, and it
 * only ever CREATES a candidate (never reads/edits the pool).
 */

import { prisma } from "@/lib/prisma";
import { extractCandidate, embedCandidate, type ExtractedCandidate } from "@/lib/candidate-extractor";

export type SubmitTalentState = {
  ok?: boolean;
  error?: string;
  fields?: {
    name?: string;
    email?: string;
    phone?: string;
    targetRole?: string;
    region?: string;
    about?: string;
    salaryExpectation?: string;
    domains?: string;   // comma-joined multi-select
    locations?: string; // comma-joined multi-select
  };
};

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
  const about = String(formData.get("about") ?? "").trim();
  const salaryExpectation = String(formData.get("salaryExpectation") ?? "").trim();
  // Multi-select chips arrive as comma-joined strings.
  const domains = String(formData.get("domains") ?? "").trim();
  const locations = String(formData.get("locations") ?? "").trim();
  // Region falls back to the multi-select locations (legacy single field kept for compat).
  const region = locations || String(formData.get("region") ?? "").trim();
  // The client may have parsed a CV to text via /api/talent/upload-cv
  // and passed it back in this hidden field.
  const cvText = String(formData.get("cvText") ?? "").trim();

  const fields = { name, email, phone, targetRole, region, about, salaryExpectation, domains, locations };

  if (name.length < 2) return { error: "נא למלא שם מלא", fields };
  if (!phone && !email) return { error: "נא להשאיר טלפון או אימייל ליצירת קשר", fields };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "כתובת האימייל לא תקינה", fields };
  }

  const rawCvText = [
    `שם: ${name}`,
    email && `אימייל: ${email}`,
    phone && `טלפון: ${phone}`,
    targetRole && `תפקיד מבוקש: ${targetRole}`,
    domains && `תחומים: ${domains}`,
    locations && `אזורים: ${locations}`,
    salaryExpectation && `ציפיות שכר: ${salaryExpectation}`,
    about && `על עצמי: ${about}`,
    cvText && `\nקורות חיים:\n${cvText}`,
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
  // Multi-select chips win over the AI's single guess.
  const finalField = domains || extracted.field;
  const finalRegion = locations || extracted.region;

  // Dedup by email then name (one person per pool).
  const dupChecks: Array<{ email?: string } | { name: string }> = [];
  if (finalEmail) dupChecks.push({ email: finalEmail });
  if (finalName && finalName !== "לא ידוע") dupChecks.push({ name: finalName });
  if (dupChecks.length > 0) {
    const dup = await prisma.candidate.findFirst({
      where: { OR: dupChecks as never },
      select: { id: true },
    });
    if (dup) return { ok: true }; // already in pool — treat as success
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
        field: finalField,
        region: finalRegion,
        salaryExpectation: salaryExpectation || null,
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
