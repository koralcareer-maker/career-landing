/**
 * Shared types for the "הגדרת חיפוש העבודה שלך" wizard.
 * One wizard state object lives in the parent client; each step
 * receives the slice it needs plus a setter, so steps stay focused
 * and the parent owns persistence.
 */

export interface WizardState {
  // Step 1 — career direction
  targetRole: string;
  industries: string[];
  desiredField: string;        // primary industry (drives backwards-compat fields)
  region: string;
  workType: "remote" | "hybrid" | "office" | "";

  // Step 2 — background
  currentRole: string;
  yearsExperience: number | null;
  strengths: string[];
  resumeUrl: string | null;     // populated by the existing CV upload flow

  // Step 3 — search status
  jsActively: "yes" | "passive" | "no" | "";
  jsSearchWeeks: number | null;
  jsRecentInterviews: number | null;
  jsIsApplying: boolean | null;

  // Step 4 — assets
  linkedinUrl: string;
  portfolioUrl: string;
  additionalLinks: Array<{ label: string; url: string }>;
}

export const EMPTY_WIZARD_STATE: WizardState = {
  targetRole: "",
  industries: [],
  desiredField: "",
  region: "",
  workType: "",

  currentRole: "",
  yearsExperience: null,
  strengths: [],
  resumeUrl: null,

  jsActively: "",
  jsSearchWeeks: null,
  jsRecentInterviews: null,
  jsIsApplying: null,

  linkedinUrl: "",
  portfolioUrl: "",
  additionalLinks: [],
};

export const REGIONS = ["צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת"] as const;

export const WORK_TYPE_OPTIONS = [
  { value: "remote", label: "מהבית" },
  { value: "hybrid", label: "היברידי" },
  { value: "office", label: "מהמשרד" },
] as const;

export const INDUSTRIES = [
  "הייטק / תוכנה", "פינטק", "ביוטכנולוגיה / פארמה", "בריאות / רפואה",
  "חינוך / אקדמיה", "בנקאות / פיננסים", "נדל\"ן", "ייעוץ / עסקים",
  "שיווק / פרסום", "מדיה / תקשורת", "מסחר אלקטרוני / קמעונאות",
  "לוגיסטיקה / שרשרת אספקה", "תעשייה / ייצור", "הנדסה / בנייה",
  "ממשלה / מגזר ציבורי", "עמותות / מגזר שלישי", "תיירות / אירוח",
  "ספורט / פנאי", "אחר",
] as const;
