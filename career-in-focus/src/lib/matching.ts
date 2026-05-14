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
  const titleLower = (job.title ?? "").toLowerCase();

  // ── 1. Target-role match — STRICT, title-anchored ─────────────────
  //
  // Coral kept seeing unrelated jobs at 60-70% after the last pass.
  // Root cause: matching against the full job blob (title + summary +
  // description + field + location) is too loose — a target role like
  // "סמנכלית משאבי אנוש" with tokens ["סמנכלית","משאבי","אנוש"] would
  // hit "אנוש" inside Hebrew descriptions of unrelated tech jobs that
  // mention "תקשורת אנושית" or "ניסיון אנושי", earning the partial
  // bonus.
  //
  // New rule — three-tier match, anchored on TITLE primarily:
  //   - 2+ target tokens in the job TITLE → strong match (up to +60)
  //   - 1+ target token in the title       → medium match (up to +35)
  //   - 2+ tokens elsewhere in the blob    → weak match (+10)
  //   - 0 tokens in title and < 2 in blob  → no match, cap at 35
  //
  // For 1-token target roles (e.g. "Developer", "QA"), 1 title token
  // is already a strong signal — we treat it as "2+" to avoid penalising
  // short titles unfairly.
  const targetTokens = tokenise(profile?.targetRole).filter((t) => t.length >= 3);
  const matchedInTitle = targetTokens.filter((t) => titleLower.includes(t));
  const matchedInBlob = targetTokens.filter((t) => blob.includes(t));

  let score = 22; // baseline
  let cap = 35;   // tightest ceiling — only lifted when we actually match

  if (targetTokens.length > 0) {
    const titleRatio = matchedInTitle.length / targetTokens.length;
    const blobRatio = matchedInBlob.length / targetTokens.length;
    const isShortTarget = targetTokens.length === 1;

    if (matchedInTitle.length >= 2 || (isShortTarget && matchedInTitle.length === 1)) {
      // Strong title hit.
      score += Math.round(titleRatio * 60);
      cap = 96;
      reasons.push(`תואם לתפקיד היעד שלך (${profile?.targetRole})`);
    } else if (matchedInTitle.length === 1) {
      // One-of-many token in title — medium signal.
      score += Math.round(titleRatio * 35);
      cap = 75;
      reasons.push("חופף חלקית לתפקיד היעד שלך");
    } else if (matchedInBlob.length >= 2) {
      // No title hit, but multiple tokens elsewhere — weak.
      score += Math.min(15, Math.round(blobRatio * 25));
      cap = 55;
    }
    // else: keep cap at 35 — clearly unrelated to target role
  } else {
    // No target role declared yet — lift the cap so the score is at
    // least informative based on secondary signals.
    cap = 70;
  }

  // ── 2. Desired field / industry interests — modest signal ───────
  //
  // Generic industry tokens like "טכנולוגיה" or "tech" are deliberately
  // filtered out because they match nearly every hi-tech posting and
  // would lift every unrelated job's score.
  const GENERIC_FIELD = new Set([
    "טכנולוגיה", "tech", "technology", "software", "high-tech", "hitech",
    "general", "כללי", "אחר", "ניהול", "management",
  ]);
  const fieldTokens = [
    ...tokenise(profile?.desiredField),
    ...parseJsonArray(profile?.q_industryInterests).flatMap(tokenise),
    ...parseJsonArray(passport?.recommendedIndustries).flatMap(tokenise),
  ].filter((t) => t.length >= 4 && !GENERIC_FIELD.has(t));
  if (fieldTokens.length > 0) {
    const matched = fieldTokens.filter((t) => blob.includes(t));
    if (matched.length > 0) {
      score += Math.min(10, matched.length * 4);
      reasons.push("תחום העניין שלך");
    }
  }

  // ── 3. Likely-fit roles from the AI passport — TITLE-only ───────
  //
  // The passport sometimes suggests broad roles ("Senior Manager")
  // that match every senior posting. Restricting this signal to the
  // job's title (not the blob) and to tokens ≥ 5 chars cuts the
  // noise dramatically.
  const fitRoleTokens = parseJsonArray(passport?.likelyFitRoles)
    .flatMap(tokenise)
    .filter((t) => t.length >= 5);
  if (fitRoleTokens.length > 0) {
    const matched = fitRoleTokens.filter((t) => titleLower.includes(t));
    if (matched.length > 0) {
      score += Math.min(10, matched.length * 5);
      reasons.push("התאים לקריירה שלך לפי הדרכון");
    }
  }

  // ── 4. Strengths — small evidence bonus, capped tight ───────────
  //
  // Strengths are user-declared ("ניהול צוות", "Python"). Tokens
  // ≥ 5 chars only, and the bonus is capped at +5 so a generic
  // strength like "תקשורת" can't repeatedly inflate every job.
  const strengthTokens = [
    ...parseJsonArray(profile?.strengths),
    ...parseJsonArray(passport?.strengths),
  ].flatMap(tokenise).filter((t) => t.length >= 5);
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
