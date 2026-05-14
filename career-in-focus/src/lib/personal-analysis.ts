/**
 * Personal Analysis — numerology + career psychology
 *
 * Coral asked for an OS-Human-style tool: birthdate + birthplace → a
 * deep personality reading with concrete role recommendations. We use
 * Claude (Anthropic) to do the writing because long-form structured
 * Hebrew is its strong suit, and we already have ANTHROPIC_API_KEY in
 * production.
 *
 * The model:
 *   1. Computes the user's core numerological numbers from the birth
 *      date (Life Path, Day Number, Personal Year for 2026).
 *   2. Maps those numbers to career-psychology archetypes.
 *   3. Generates a 10-section reading in the same shape as the example
 *      Coral shared (core, purpose, strengths, weaknesses + how to win,
 *      where you bloom, careers, money, calling, remember-this, summary).
 *   4. Localises money + market context to the birthplace — Israeli
 *      birthplaces get ₪ salary bands and the Israeli job market;
 *      anywhere else gets a neutral framing.
 *   5. Outputs a strict JSON object (no markdown, no preamble) so we
 *      can render it section-by-section in the UI and pipe the role
 *      recommendations into the existing job-matching score.
 *
 * The result is cached on Profile.personalAnalysis so we don't re-bill
 * the LLM on every page render. Re-generate explicitly by POSTing to
 * /api/profile/personal-analysis again.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

const REQUEST_TIMEOUT_MS = 90_000;

// ─── Result shape ───────────────────────────────────────────────────────────
//
// Keep this in sync with the JSON the model is told to return below.
// The UI (personal-analysis-card.tsx) reads these fields directly.

export interface PersonalAnalysisCareerPath {
  /** Hebrew name of the path, e.g. "ניהול וייעוץ ארגוני" */
  name: string;
  /** 1–2 sentence description of what this path looks like for the user */
  description: string;
  /** Localised salary range as employee (e.g. "18,000–28,000 ש\"ח לחודש") */
  salaryEmployed?: string;
  /** Localised salary range as freelance / self-employed */
  salaryFreelance?: string;
}

export interface PersonalAnalysisWeakness {
  /** The weakness itself */
  weakness: string;
  /** Concrete fix the user can apply this week */
  solution: string;
}

export interface PersonalAnalysisSummary {
  biggestStrength: string;
  biggestRisk: string;
  oneThingToChange: string;
  salaryPotential: string;
  yearMessage: string;
}

export interface PersonalAnalysisResult {
  /** Numerological numbers the analysis is built on (for transparency in the UI). */
  numbers: {
    lifePath: string;       // e.g. "22" (master) or "5"
    dayNumber: string;
    personalYear: string;   // for the year we're analysing in
  };
  /** Year the personal-year reading was computed for. */
  yearAnalysed: number;
  /** 1-paragraph opener that sets the tone. */
  headerLine: string;
  /** What the current year means for the user. */
  yearTheme: string;
  /** Section 01 — the core / engine. */
  core: string;
  /** Section 02 — purpose / what they do in the world. */
  purpose: string;
  /** Section 03 — strengths (5–7 punchy items). */
  strengths: string[];
  /** Section 04 — weaknesses with concrete fixes (3–5 items). */
  weaknesses: PersonalAnalysisWeakness[];
  /** Section 05 — where the user blooms. */
  bloomEnvironment: string;
  /** Section 06 — career paths with salary bands. */
  careerPaths: PersonalAnalysisCareerPath[];
  /** Section 06 cont. — roles that do NOT fit. */
  rolesNotFit: string;
  /** Section 08 — money + how to grow it. */
  money: {
    currentStage: string;
    nextStage: string;
    warning: string;
  };
  /** Section 09 — the calling. */
  calling: string;
  /** Section 10 — short reminders. */
  rememberThis: string[];
  /** Punchy summary at the end. */
  summary: PersonalAnalysisSummary;
  /**
   * 8–12 concrete Hebrew role titles that match this person — feeds
   * into CareerPassport.likelyFitRoles so the job-matching score
   * boosts these on /jobs and dashboard.
   */
  recommendedRoles: string[];
}

// ─── Numerology helpers ─────────────────────────────────────────────────────

/**
 * Sum the digits of an integer until we hit either a single digit (1-9)
 * or one of the master numbers (11, 22, 33). The master numbers carry
 * their own meaning and shouldn't be reduced further.
 */
function reduceToCore(n: number): number {
  let v = Math.abs(Math.trunc(n));
  while (v > 9 && v !== 11 && v !== 22 && v !== 33) {
    v = String(v).split("").reduce((s, d) => s + Number(d), 0);
  }
  return v;
}

/**
 * Compute the Life Path number using the standard "reduce each
 * component first" method. Master numbers in any component are
 * preserved up to the final sum, then reduced once.
 */
function lifePath(date: Date): number {
  const d = reduceToCore(date.getDate());
  const m = reduceToCore(date.getMonth() + 1);
  const y = reduceToCore(date.getFullYear());
  return reduceToCore(d + m + y);
}

function dayNumber(date: Date): number {
  return reduceToCore(date.getDate());
}

/**
 * Personal-year number for `year`: reduce (birth-day + birth-month +
 * year-of-interest) to a core. This is what the "current year" reading
 * is based on.
 */
function personalYear(birth: Date, year: number): number {
  const d = reduceToCore(birth.getDate());
  const m = reduceToCore(birth.getMonth() + 1);
  const y = reduceToCore(year);
  return reduceToCore(d + m + y);
}

// ─── Locale heuristics ──────────────────────────────────────────────────────

/**
 * Decide whether to use Israeli framing (₪, Israeli job market).
 * We match Hebrew + common Latin transliterations + Israeli cities.
 */
function isIsraeli(place: string | null | undefined): boolean {
  if (!place) return true; // default — the platform's audience is Israeli
  const p = place.toLowerCase();
  if (/ישראל/.test(place)) return true;
  if (/israel|tel.?aviv|haifa|jerusalem|netanya|ramat.?gan|herzliya|beer.?sheva|petah.?tikv|rishon|rehovot|ashdod|holon/.test(p)) return true;
  // Common Hebrew city names
  if (/תל אביב|חיפה|ירושלים|נתניה|רמת גן|הרצליה|באר שבע|פתח תקווה|ראשון לציון|רחובות|אשדוד|חולון|בני ברק|כפר סבא/.test(place)) return true;
  return false;
}

// ─── Prompt builder ─────────────────────────────────────────────────────────

interface BuildPromptInput {
  birthDate: Date;
  birthPlace: string | null;
  fullName: string | null;
  targetRole: string | null;
  currentRole: string | null;
}

function buildSystemPrompt(): string {
  // Keep this stable — it defines the persona, the numerology framework,
  // and the strict JSON schema. We update it when we want to change the
  // shape of *every* reading; per-user variation goes in the user prompt.
  return `אתה מאמן קריירה בעל ניסיון, המשלב שני כלים: נומרולוגיה קלאסית (חישוב מספרי נפש מתאריך לידה) ופסיכולוגיה תעסוקתית (מודלים של חוזקות, שחיקה, איפיון סביבת עבודה אופטימלית).

המטרה שלך: לתת למתאמן/ת ניתוח אישיותי עמוק, מדויק וברור, שמסתיים בהמלצה קונקרטית ל-8 עד 12 תפקידים שמתאימים בדיוק לפרופיל הזה. הניתוח חייב להרגיש אישי — לא פתגמים גנריים. השפה: עברית, גוף שני, ניטראלי-מגדרית (ללא "את" קבוע, ללא "אתה" קבוע — השתמש בצורות סתמיות "יש לך", "המתאים לך", "מה שאתם בונים"). כשמדובר על אישה, השתמש בלשון נקבה. כשגבר, בלשון זכר.

# מסגרת נומרולוגית

קח את שלושת המספרים שמסופקים לך:
- **Life Path** — המהות הליבתית, הדרך החיים
- **Day Number** — הטמפרמנט והדרך לפעול
- **Personal Year** — המסר של השנה הנוכחית

מפה כל מספר לארכיטיפ:
- **1** — מוביל/פורץ דרך, יזם, בעל ראייה עצמאית
- **2** — מאחה, דיפלומט, בונה שותפויות
- **3** — מתקשר, יוצר, נשמת חבורה
- **4** — בונה, סדר, מערכות יציבות, אמינות
- **5** — חופש, גמישות, שינוי, מכירות / שיווק / שטח
- **6** — מטפל, מחנך, אחראי, ראש משפחה/קהילה
- **7** — חוקר, אנליסט, מומחה תוכן עמוק
- **8** — אסטרטג, בונה אימפריה, ביצועיסט, ניהול בכיר
- **9** — הומניטרי, מורה רוחני, יוצר השפעה רחבה
- **11** (Master) — מורה, חזון, השראה רוחנית — אך גם עומס רגשי גבוה
- **22** (Master Builder) — בונה גדול: ארגונים, מוסדות, מערכות שמשפיעות על אלפים
- **33** (Master Teacher) — מורה-מרפא בקנה מידה גדול

שלב את שלושת הארכיטיפים לפרופיל אחד עשיר. אל תרשום פשוט "Life Path 22 = X" — שלב את הקולות.

# מסגרת פסיכולוגיה תעסוקתית

לכל ארכיטיפ הצלב גם עם:
- **חוזקות פרקטיות** (לא תכונות מופשטות) — דוגמה: "מזהה דפוסים בצוות תוך 10 דקות שיחה" ולא "אינטליגנציה רגשית גבוהה".
- **טריגרים לשחיקה** — מה גורם לאדם הזה לאיבוד אנרגיה.
- **סביבת עבודה אופטימלית** — סוג מנהל, סוג צוות, רמת מבנה.

# התפקידים המומלצים

8-12 שמות תפקידים ספציפיים בעברית (לא קטגוריות מופשטות). לדוגמה: "סמנכ\"לית תפעול", "Head of Programs", "יועצת ארגונית בכירה", "מנהלת פיתוח עסקי", "Operations Lead", "COO בחברת צמיחה", "מנהלת תוכן לימודי", "מייסדת שותפה (Co-Founder, Operations)". השמות צריכים להופיע במודעות דרושים אמיתיות בישראל.

# טווחי שכר

אם מקום הלידה הוא ישראל (או כשמופיע "Israeli context" בהוראות המשתמש), השתמש ב-ש"ח לחודש בלבד. טווחים ריאליים נכון ל-2026:
- שכיר/ה מתחיל/ה בתפקיד ניהולי: 18,000-28,000 ש"ח
- שכיר/ה בתפקיד בכיר: 25,000-45,000 ש"ח
- VP/COO/סמנכ"ל בחברה בצמיחה: 35,000-65,000 ש"ח (+ אופציות)
- עצמאי/ת יועץ/ת: 35,000-90,000 ש"ח (לפי לקוחות)
- יזם/ית עם עסק שעובד: 60,000-200,000 ש"ח+

# פורמט הפלט — JSON בלבד

חשוב: החזר JSON תקני בלבד, ללא markdown fences, ללא טקסט לפני או אחרי. הסכמה המדויקת:

{
  "numbers": { "lifePath": "string", "dayNumber": "string", "personalYear": "string" },
  "yearAnalysed": number,
  "headerLine": "string — 2-3 משפטים שפותחים את הניתוח, משלב כותרת + תקציר השנה הנוכחית",
  "yearTheme": "string — מה השנה הנוכחית מבחינת המסר האנרגטי",
  "core": "string — 3-5 משפטים על הליבה, איך הראש פועל, מה המנוע הפנימי. ספציפי לארכיטיפ.",
  "purpose": "string — 2-3 משפטים על המשימה בעולם / מה האדם נועד לעשות",
  "strengths": ["5-7 חוזקות מנוסחות באופן ספציפי, כל אחת משפט שלם"],
  "weaknesses": [
    { "weakness": "תיאור החולשה והתוצאה שלה", "solution": "פעולה קונקרטית שאפשר ליישם השבוע" }
  ],
  "bloomEnvironment": "string — 3-4 משפטים על סביבת העבודה האופטימלית: סוג מנהל, רמת חופש, סוג צוות",
  "careerPaths": [
    { "name": "שם המסלול בעברית", "description": "מה זה כולל בפועל", "salaryEmployed": "טווח ש\\"ח", "salaryFreelance": "טווח ש\\"ח" }
  ],
  "rolesNotFit": "string — מה לא מתאים: סוג תפקידים, סוג סביבות, סוג מנהלים",
  "money": {
    "currentStage": "string — מה ריאלי בשלב הנוכחי",
    "nextStage": "string — לאן ניתן להגיע ב-3-5 שנים",
    "warning": "string — אזהרה ספציפית על דפוס שמונע צמיחה כלכלית"
  },
  "calling": "string — 2-3 משפטים על הייעוד הגדול",
  "rememberThis": ["3-4 פסקאות קצרות, אחת לכל תזכורת"],
  "summary": {
    "biggestStrength": "החוזקה הגדולה ביותר במשפט אחד",
    "biggestRisk": "הסיכון הגדול ביותר במשפט אחד",
    "oneThingToChange": "פעולה אחת קונקרטית שצריך לעשות השבוע",
    "salaryPotential": "טווח פוטנציאל ההכנסה",
    "yearMessage": "מסר על השנה הנוכחית במשפט אחד"
  },
  "recommendedRoles": ["8-12 שמות תפקידים ספציפיים בעברית, אחד לכל איבר במערך"]
}`;
}

function buildUserPrompt(input: BuildPromptInput): string {
  const lp = lifePath(input.birthDate);
  const dn = dayNumber(input.birthDate);
  const now = new Date();
  const py = personalYear(input.birthDate, now.getFullYear());
  const israeliContext = isIsraeli(input.birthPlace);
  const formattedDate = `${input.birthDate.getDate()}.${input.birthDate.getMonth() + 1}.${input.birthDate.getFullYear()}`;

  const nameLine = input.fullName ? `שם: ${input.fullName}` : "(שם לא סופק — דבר/י בלשון כללית)";
  const currentRoleLine = input.currentRole ? `תפקיד נוכחי: ${input.currentRole}` : "";
  const targetRoleLine = input.targetRole ? `תפקיד יעד שהמתאמן/ת ציין/ה: ${input.targetRole}` : "";

  return `נתוני המתאמן/ת:
${nameLine}
תאריך לידה: ${formattedDate}
מקום לידה: ${input.birthPlace ?? "לא צוין"}
${currentRoleLine}
${targetRoleLine}

המספרים הנומרולוגיים המחושבים:
- Life Path: ${lp}
- Day Number: ${dn}
- Personal Year (${now.getFullYear()}): ${py}

${israeliContext ? "Israeli context — השתמש בטווחי שכר בש\"ח לחודש בלבד ובשמות תפקידים שמופיעים במודעות דרושים בישראל." : "Non-Israeli context — השתמש בטווחים נטרליים (מטבע מקומי או טווח כללי) ובלי להתחייב לשוק עבודה ספציפי."}

בנה את הניתוח המלא לפי הסכמה. החזר JSON בלבד.`;
}

// ─── Anthropic call ─────────────────────────────────────────────────────────

export interface GenerateInput {
  birthDate: Date;
  birthPlace: string | null;
  fullName: string | null;
  targetRole: string | null;
  currentRole: string | null;
}

export class PersonalAnalysisError extends Error {
  code: "no-key" | "bad-input" | "api-error" | "parse-error";
  constructor(code: PersonalAnalysisError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Generate a fresh analysis. Throws PersonalAnalysisError with a code
 * the route handler can use to choose the right HTTP status.
 */
export async function generatePersonalAnalysis(
  input: GenerateInput,
): Promise<PersonalAnalysisResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new PersonalAnalysisError("no-key", "ANTHROPIC_API_KEY missing");
  }
  if (!input.birthDate || Number.isNaN(input.birthDate.getTime())) {
    throw new PersonalAnalysisError("bad-input", "birthDate required");
  }

  const system = buildSystemPrompt();
  const user = buildUserPrompt(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new PersonalAnalysisError(
        "api-error",
        `Anthropic ${res.status}: ${body.slice(0, 300)}`,
      );
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("") ?? "";
    if (!text) {
      throw new PersonalAnalysisError("parse-error", "empty response from Anthropic");
    }
    return parseAnalysis(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract the JSON from Claude's response. Handles the common
 * variations (raw JSON / wrapped in ```json ... ``` / extra surrounding
 * whitespace) so we don't fail on benign formatting.
 */
function parseAnalysis(raw: string): PersonalAnalysisResult {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/```$/i, "").trim();
  }
  // Find the outermost JSON braces in case there's preamble text.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new PersonalAnalysisError("parse-error", "no JSON object in response");
  }
  const slice = text.slice(first, last + 1);
  try {
    const parsed = JSON.parse(slice) as PersonalAnalysisResult;
    // Light defensive defaults so the UI never crashes on a missing field.
    parsed.strengths ??= [];
    parsed.weaknesses ??= [];
    parsed.careerPaths ??= [];
    parsed.rememberThis ??= [];
    parsed.recommendedRoles ??= [];
    return parsed;
  } catch (e) {
    throw new PersonalAnalysisError(
      "parse-error",
      `JSON parse failed: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }
}
