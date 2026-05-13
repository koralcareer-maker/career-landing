/**
 * Lightweight matching helpers — score how well a Job or Course fits the
 * current user, based on Profile + CareerPassport. The scores aren't
 * "AI smart" yet (no embeddings); they're keyword/signal heuristics that
 * combine targetRole, desiredField, skill gaps, strengths, and explicit
 * matches. They're consistent across dashboard, /jobs, /courses so that
 * users see the same number everywhere.
 *
 * If the user has no profile data yet, scores fall back to a neutral
 * baseline (~30%) — so nothing shows as "matching" by accident.
 */

import { parseJsonArray } from "@/lib/utils";

// Minimal shapes — keep these loose so the helpers work with any
// Prisma row shape (just the fields we read).
export interface MatchableProfile {
  targetRole?: string | null;
  currentRole?: string | null;
  desiredField?: string | null;
  yearsExperience?: number | null;
  strengths?: string | null;       // JSON array
  missingSkills?: string | null;   // JSON array
  q_industryInterests?: string | null; // JSON array
  q_valuesAtWork?: string | null;  // JSON array
}

export interface MatchablePassport {
  jobMatchScore?: number;
  strengths?: string | null;        // JSON array
  skillGaps?: string | null;        // JSON array
  likelyFitRoles?: string | null;   // JSON array
  recommendedIndustries?: string | null; // JSON array
}

export interface MatchableJob {
  title: string;
  company?: string | null;
  summary?: string | null;
  description?: string | null;
  field?: string | null;
  location?: string | null;
  experienceLevel?: string | null;
}

export interface MatchableCourse {
  title: string;
  description?: string | null;
  category?: string | null;
}

export interface MatchResult {
  score: number;       // 0-100
  reasons: string[];   // human-readable Hebrew reasons (max 3)
}

// ─── tokenisation helpers ────────────────────────────────────────────────────

/** Split a Hebrew/English string into normalised tokens (lower-cased, deduped). */
function tokenise(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[\s,/\\\-—|·•()[\]{}"'!?]+/u)
    .filter((t) => t.length >= 2);
}

/** True if any of the source tokens overlap with the target string (substring match). */
function anyTokenIn(sourceTokens: string[], target: string | null | undefined): boolean {
  if (!target) return false;
  const lt = target.toLowerCase();
  return sourceTokens.some((t) => t.length >= 2 && lt.includes(t));
}

/** Combine multiple text fields (title + summary + description + field) into one. */
function jobBlob(job: MatchableJob): string {
  return [job.title, job.summary, job.description, job.field, job.location, job.experienceLevel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function courseBlob(course: MatchableCourse): string {
  return [course.title, course.description, course.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ─── Job matching ────────────────────────────────────────────────────────────

/**
 * Score a job against the user, 0-100. Heuristic — uses simple keyword
 * overlap between the user's signals (target role, desired field, passport
 * fit-roles + industries, strengths) and the job's text.
 */
export function matchJobToUser(
  job: MatchableJob,
  profile: MatchableProfile | null | undefined,
  passport: MatchablePassport | null | undefined
): MatchResult {
  // No profile at all — neutral 30%, no reasons.
  if (!profile && !passport) return { score: 30, reasons: [] };

  const reasons: string[] = [];
  const blob = jobBlob(job);

  // ── 1. Target-role match is the GATE, not a +30 bonus ────────────
  //
  // Old algorithm added +30 when ANY token matched and added nothing
  // when nothing matched. That let unrelated jobs reach 100% via
  // industry + fit-roles + strengths firing on tangential overlaps
  // (Coral was a "סמנכלית משאבי אנוש" target and saw 100% on Backend
  // Engineer postings — strengths like "ניהול" matched generic
  // management copy in tech roles).
  //
  // New rule:
  //  - Tokens must be >= 3 chars (Hebrew/English) — drops noise
  //    like "של" / "in" / "to".
  //  - Score is **proportional** to how many target tokens match
  //    the job (intersection-over-union style, capped at 60).
  //  - If 0 tokens match, the *entire* match maxes at 50 — secondary
  //    signals (industry, strengths) can lift it from the baseline
  //    but never make an unrelated job look like a great fit.
  const targetTokens = tokenise(profile?.targetRole).filter((t) => t.length >= 3);
  const matchedTargetTokens = targetTokens.filter((t) => blob.includes(t));

  let score = 25; // baseline
  const targetMatched = matchedTargetTokens.length > 0;
  let cap = targetMatched ? 100 : 50;

  if (targetTokens.length > 0 && targetMatched) {
    const ratio = matchedTargetTokens.length / targetTokens.length;
    const bonus = Math.round(ratio * 50); // up to +50 for a full overlap
    score += bonus;
    reasons.push(`תואם לתפקיד היעד שלך (${profile?.targetRole})`);
  } else if (targetTokens.length > 0) {
    // We have a target role and the job didn't match any of its words.
    // Hard ceiling — don't let the rest of the signals push above 50.
    cap = 50;
  }

  // ── 2. Desired field / industry interests — tightened ───────────
  //
  // Same proportional treatment, lighter weight (+15 max). Industry
  // tokens like "טכנולוגיה" or "Tech" are deliberately filtered out
  // because they match nearly every hi-tech posting.
  const GENERIC_FIELD = new Set([
    "טכנולוגיה", "tech", "technology", "software", "high-tech", "hitech",
    "general", "כללי", "אחר",
  ]);
  const fieldTokens = [
    ...tokenise(profile?.desiredField),
    ...parseJsonArray(profile?.q_industryInterests).flatMap(tokenise),
    ...parseJsonArray(passport?.recommendedIndustries).flatMap(tokenise),
  ].filter((t) => t.length >= 3 && !GENERIC_FIELD.has(t));
  if (fieldTokens.length > 0) {
    const matched = fieldTokens.filter((t) => blob.includes(t));
    if (matched.length > 0) {
      score += Math.min(15, matched.length * 5);
      reasons.push("תחום העניין שלך");
    }
  }

  // ── 3. Likely-fit roles from the AI passport ─────────────────────
  //
  // Now only fires when the passport explicitly named a role that
  // overlaps the job title (not the summary or location). This stops
  // generic "Manager" / "Senior" tokens from matching every senior
  // role across the board.
  const fitRoleTokens = parseJsonArray(passport?.likelyFitRoles)
    .flatMap(tokenise)
    .filter((t) => t.length >= 4);
  const titleLower = (job.title ?? "").toLowerCase();
  if (fitRoleTokens.length > 0) {
    const matched = fitRoleTokens.filter((t) => titleLower.includes(t));
    if (matched.length > 0) {
      score += Math.min(15, matched.length * 5);
      reasons.push("התאים לקריירה שלך לפי הדרכון");
    }
  }

  // ── 4. Strengths — small evidence bonus, requires real overlap ──
  //
  // Strengths are user-declared (e.g. "ניהול צוות", "Python"). Only
  // tokens >= 4 chars qualify so short Hebrew connectors don't
  // accidentally fire.
  const strengthTokens = [
    ...parseJsonArray(profile?.strengths),
    ...parseJsonArray(passport?.strengths),
  ].flatMap(tokenise).filter((t) => t.length >= 4);
  if (strengthTokens.length > 0 && strengthTokens.some((t) => blob.includes(t))) {
    score += 5;
    reasons.push("מתאים לחוזקות שלך");
  }

  return {
    score: Math.max(15, Math.min(cap, score)),
    reasons: reasons.slice(0, 3),
  };
}

// ─── Course matching ─────────────────────────────────────────────────────────

/**
 * Score a course against the user, 0-100. Most weight on closing skill gaps
 * (from the career passport) — that's what makes a course "relevant" rather
 * than "exists".
 */
export function matchCourseToUser(
  course: MatchableCourse,
  profile: MatchableProfile | null | undefined,
  passport: MatchablePassport | null | undefined
): MatchResult {
  if (!profile && !passport) return { score: 30, reasons: [] };

  let score = 30;
  const reasons: string[] = [];
  const blob = courseBlob(course);

  // 1. Skill gaps from career passport — heaviest signal
  const skillGapTokens = parseJsonArray(passport?.skillGaps).flatMap(tokenise);
  if (skillGapTokens.length > 0 && skillGapTokens.some((t) => blob.includes(t))) {
    score += 40;
    reasons.push("סוגר פערי מיומנויות שלך");
  }

  // 2. Missing skills from profile (user-declared)
  const missingTokens = parseJsonArray(profile?.missingSkills).flatMap(tokenise);
  if (missingTokens.length > 0 && missingTokens.some((t) => blob.includes(t))) {
    score += 20;
    reasons.push("מיומנות שציינת שחסרה לך");
  }

  // 3. Desired field
  const fieldTokens = tokenise(profile?.desiredField);
  if (fieldTokens.length > 0 && fieldTokens.some((t) => blob.includes(t))) {
    score += 15;
    reasons.push("התחום שאת מכוונת אליו");
  }

  // 4. Target role keywords
  const targetTokens = tokenise(profile?.targetRole);
  if (targetTokens.length > 0 && targetTokens.some((t) => blob.includes(t))) {
    score += 10;
    reasons.push("רלוונטי לתפקיד היעד");
  }

  return { score: Math.min(100, score), reasons: reasons.slice(0, 3) };
}

// ─── Threshold helpers ───────────────────────────────────────────────────────

/** Default threshold for "matches you" filtering (used on dashboard). */
export const RELEVANCE_THRESHOLD = 70;

/**
 * The single canonical "career fit" score to display in the UI.
 * Uses passport.jobMatchScore when available (the AI-generated number
 * shown on the passport page) so the dashboard never disagrees with it;
 * falls back to a profile-completeness readiness score when no passport
 * has been generated yet.
 */
export function getDisplayedMatchScore(
  passport: MatchablePassport | null | undefined,
  readiness: number
): { value: number; label: string; isPassport: boolean } {
  if (passport && typeof passport.jobMatchScore === "number" && passport.jobMatchScore > 0) {
    return {
      value: passport.jobMatchScore,
      label: "התאמה לקריירה",
      isPassport: true,
    };
  }
  return {
    value: readiness,
    label: "השלמת פרופיל",
    isPassport: false,
  };
}
