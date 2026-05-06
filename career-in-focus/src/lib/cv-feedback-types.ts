/**
 * Shape of a CV feedback analysis. Stored as JSON in CvFeedback.result.
 * Kept in its own file so client + server + Prisma layer all agree.
 */

export interface CvFeedbackResult {
  /** 0-100 — overall CV quality (clarity, positioning, achievements, etc.) */
  qualityScore: number;
  /** Per-axis scores 0-100, each axis listed in the spec. */
  qualityBreakdown: {
    clarity: number;
    positioning: number;
    achievements: number;
    structure: number;
    relevance: number;
    wording: number;
    skillsVisibility: number;
    interviewPotential: number;
  };

  /** 0-100 — likelihood the CV passes ATS parsing cleanly. */
  atsScore: number;
  /** Risk bucket — used for the "סיכון נמוך/בינוני/גבוה" headline. */
  atsRiskLevel: "low" | "medium" | "high";
  /** Concrete reasons behind the risk level (tables, columns, icons, etc.) */
  atsRiskReasons: string[];
  /** ATS systems split by parsing-friendliness for THIS specific CV. */
  atsSystems: {
    low: string[];
    medium: string[];
    high: string[];
  };

  /** 2-4 sentence overall verdict. */
  summary: string;
  /** Short bullets — what the CV does well today. */
  worksWell: string[];
  /** Short bullets — what weakens the CV. */
  weakens: string[];
  /** Prioritised fix list. */
  fixes: Array<{ priority: "high" | "medium" | "optional"; text: string }>;
  /** Keywords the CV is missing for the role (target role inferred when none). */
  missingKeywords: string[];
  /** 5-8 realistic job titles inferred from the CV. */
  suggestedTitles: string[];
  /** One concrete next action ("השלב הבא: ..."). */
  nextAction: string;
}

/** Loose validator — confirms the JSON we got back from Gemini has the expected keys. */
export function isCvFeedbackResult(x: unknown): x is CvFeedbackResult {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.qualityScore === "number" &&
    typeof r.atsScore === "number" &&
    typeof r.atsRiskLevel === "string" &&
    typeof r.summary === "string" &&
    Array.isArray(r.worksWell) &&
    Array.isArray(r.weakens) &&
    Array.isArray(r.fixes) &&
    Array.isArray(r.suggestedTitles) &&
    typeof r.nextAction === "string"
  );
}
