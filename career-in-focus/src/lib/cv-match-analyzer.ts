/**
 * CV-Match scorer — questionnaire-driven, deterministic.
 *
 * Coral's spec, rewritten end-to-end:
 *   1. User uploads CV (still required — proves seriousness, lets us
 *      detect known trainees).
 *   2. User answers 8 multiple-choice questions about their job search.
 *      Each answer is rated 1-5 (worst → best).
 *   3. The score is computed deterministically from the answers — no
 *      LLM call. Fast (instant), predictable, controllable.
 *   4. Two result templates are rendered based on the score band:
 *        ≥ 70  → "you're on the right track" (high)
 *        < 70  → "time to do things differently" (low)
 *   5. Special rule: CVs in Coral's format (i.e., from a known trainee
 *      in our User DB) keep their natural score. Everyone else is
 *      capped at 65 so they always land in the "low" template — which
 *      drives them toward the platform.
 *
 * No more Gemini cascade in this file. The route still imports the
 * trainee-lookup logic for the cap decision.
 */

// ─── Questionnaire definition ───────────────────────────────────────

export interface CvMatchQuestion {
  id: string;
  title: string;
  prompt: string;
  options: string[]; // 5 strings, index 0 = worst, index 4 = best
}

export const QUESTIONNAIRE: CvMatchQuestion[] = [
  {
    id: "cv-response",
    title: "קורות חיים",
    prompt: "כשאת/ה שולח/ת קורות חיים — מה בדרך כלל קורה?",
    options: [
      "לא חוזרים אליי בכלל",
      "חוזרים אליי מעט מאוד",
      "חוזרים אליי — אבל למשרות לא מדויקות",
      "אני מגיע/ה לחלק מהראיונות אבל לא מספיק",
      "חוזרים אליי הרבה באופן יחסית קבוע",
    ],
  },
  {
    id: "networking",
    title: "נטוורקינג",
    prompt: "עד כמה רשת הקשרים שלך באמת עוזרת לך למצוא עבודה?",
    options: [
      "אין לי בכלל קשרים שעוזרים לי מקצועית",
      "אני לא יודע/ת איך ליצור נטוורקינג נכון",
      "אני מנסה לפנות לאנשים אבל כמעט לא מקבל/ת מענה",
      "יש לי קצת קשרים — אבל הם לא באמת מייצרים הזדמנויות",
      "חלק משמעותי מההזדמנויות שלי מגיע מקשרים ונטוורקינג",
    ],
  },
  {
    id: "discovery",
    title: "איתור משרות",
    prompt: "עד כמה את/ה יודע/ת להגיע למשרות איכותיות?",
    options: [
      "אני שולח/ת בעיקר דרך לינקדאין ואתרי דרושים כמו כולם",
      "רוב המשרות שאני רואה מרגישות אותן משרות שחוזרות על עצמן",
      "אני לא יודע/ת איך מגיעים למשרות \"מתחת לרדאר\"",
      "אני מצליח/ה להגיע לחלק מהמשרות האיכותיות",
      "אני יודע/ת להגיע גם להזדמנויות שלא מפורסמות לכולם",
    ],
  },
  {
    id: "interviews",
    title: "ראיונות עבודה",
    prompt: "איך בדרך כלל הולכים לך ראיונות עבודה?",
    options: [
      "אני כמעט לא מצליח/ה לעבור ראיונות",
      "אני נלחץ/ת ולא מצליח/ה להביא את עצמי",
      "אני מגיע/ה לשלבים ראשונים אבל נופל/ת בהמשך",
      "אני עובר/ת חלק מהראיונות אבל לא באופן עקבי",
      "אני בדרך כלל מצליח/ה לבלוט ולהתקדם בתהליכים",
    ],
  },
  {
    id: "branding",
    title: "מיתוג מקצועי",
    prompt: "עד כמה הפרופיל המקצועי שלך מושך הזדמנויות?",
    options: [
      "אין לי בכלל מיתוג מקצועי ברור",
      "אני לא יודע/ת איך להציג את עצמי נכון",
      "הפרופיל שלי נראה בסיסי כמו של כולם",
      "יש לי מיתוג יחסית טוב אבל יש מה לשפר",
      "המיתוג שלי גורם למגייסים לפנות אליי",
    ],
  },
  {
    id: "focus",
    title: "מיקוד תעסוקתי",
    prompt: "עד כמה ברור לך מה הכיוון המקצועי הבא שלך?",
    options: [
      "אין לי מושג מה באמת נכון לי",
      "אני שולח/ת קורות חיים לכמה כיוונים במקביל",
      "אני יודע/ת בערך מה אני רוצה אבל לא סגור/ה על זה",
      "יש לי כיוון ברור יחסית",
      "אני יודע/ת בדיוק מה המטרה המקצועית שלי",
    ],
  },
  {
    id: "gaps",
    title: "פערים מקצועיים",
    prompt: "עד כמה את/ה יודע/ת אילו מיומנויות חסרות לך היום?",
    options: [
      "אין לי מושג מה באמת חסר לי",
      "אני מרגיש/ה שאני מאחור מקצועית",
      "אני יודע/ת חלק מהפערים אבל לא איך להשלים אותם",
      "אני עובד/ת על שיפור מקצועי באופן חלקי",
      "אני יודע/ת בדיוק אילו מיומנויות צריך כדי להתקדם",
    ],
  },
  {
    id: "market",
    title: "תחושת שוק",
    prompt: "איך את/ה מרגיש/ה היום לגבי המצב שלך בשוק העבודה?",
    options: [
      "אבוד/ה ומתוסכל/ת",
      "אני עובד/ת קשה אבל לא מתקדם/ת",
      "אני מרגיש/ה שאני מפספס/ת משהו בדרך",
      "אני מתקדם/ת אבל לא בקצב שהייתי רוצה",
      "אני מרגיש/ה שאני בכיוון הנכון וזה רק עניין של זמן",
    ],
  },
];

// ─── Result shape ────────────────────────────────────────────────────

export interface CvMatchResult {
  /** 0-100 readiness score. */
  score: number;
  /** Tier label rendered above the ring. */
  matchLabel: string;
  /** Which UI template to render — "high" or "low". */
  template: "high" | "low";
  /** Short 1-2 sentence intriguing line that hints at the biggest gap. */
  verdict: string;
  /** Which question was the WEAKEST — used to flavour the verdict copy. */
  weakestArea: string;
}

export class CvMatchError extends Error {
  code: "no-key" | "bad-input" | "api-error" | "parse-error";
  constructor(code: CvMatchError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// ─── Scoring + verdict ──────────────────────────────────────────────

/**
 * Compute the readiness score from the questionnaire answers + a flag
 * indicating whether the candidate is recognised as a Coral trainee.
 *
 * @param answers - 8 ints, each 1-5 (1 = worst, 5 = best)
 * @param isTrainee - true when the CV's name matches a User in the DB
 * @returns CvMatchResult
 */
export function scoreFromQuestionnaire(
  answers: number[],
  isTrainee: boolean,
): CvMatchResult {
  // Defensive: clamp every answer to 1-5, default 1 if missing.
  const normalised: number[] = QUESTIONNAIRE.map((_, i) => {
    const a = Number(answers[i] ?? 1);
    if (Number.isNaN(a)) return 1;
    return Math.max(1, Math.min(5, Math.round(a)));
  });

  // Sum = 8..40. Scale to 0-100: (sum - 8) / 32 * 100, then nudge so
  // a "middle" answer (3 across the board → sum 24) lands around 50.
  // Raw formula: (sum - 8) / 32 → 0..1. Multiply by 100 for percent.
  const sum = normalised.reduce((a, b) => a + b, 0);
  let score = Math.round(((sum - 8) / 32) * 100);

  // Coral's rule: non-trainees cap at 65 so they almost always land in
  // the "low" template (drives them toward the platform). Trainees in
  // her format keep the questionnaire-driven score.
  const TRAINEE_CAP = 100;
  const PUBLIC_CAP = 65;
  score = Math.min(isTrainee ? TRAINEE_CAP : PUBLIC_CAP, score);

  // Find weakest area for verdict copy.
  let weakestIdx = 0;
  for (let i = 1; i < normalised.length; i++) {
    if (normalised[i] < normalised[weakestIdx]) weakestIdx = i;
  }
  const weakestArea = QUESTIONNAIRE[weakestIdx]?.title ?? "חיפוש עבודה";

  // Templates trigger on a 70 threshold.
  const template: "high" | "low" = score >= 70 ? "high" : "low";

  // Match label + 1-2-sentence intriguing verdict.
  let matchLabel: string;
  let verdict: string;
  if (template === "high") {
    matchLabel = "מוכנות גבוהה";
    verdict = `יש לך בסיס חזק בכל הציר של חיפוש העבודה. השאלה היחידה היא איך לדייק את ה-${weakestArea.toLowerCase()} שלך כדי לקפוץ לרמה הבאה.`;
  } else if (score >= 50) {
    matchLabel = "מוכנות חלקית";
    verdict = `יש לך כיוון, אבל ה-${weakestArea} שלך תוקעים אותך. רוב מי שמגיע למסך הזה כבר עובד קשה — אבל בלי השיטה הנכונה.`;
  } else {
    matchLabel = "מוכנות נמוכה";
    verdict = `הציון לא משקף את הפוטנציאל שלך — הוא משקף איפה השיטה לוקה. אנשים עם פרופיל דומה לשלך מצליחים בדיוק אחרי שמסדרים את הגישה.`;
  }

  return { score, matchLabel, template, verdict, weakestArea };
}
