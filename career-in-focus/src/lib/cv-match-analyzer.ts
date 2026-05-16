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
 *   5. Universal cap at 80. Even a perfect questionnaire never breaks
 *      80 — the missing 20% is deliberately blamed on the CV so the
 *      verdict has a real hook ("there's more to unlock here"). Coral's
 *      lead-magnet rule: nobody walks away thinking they're at 100%.
 *
 * No more Gemini cascade in this file. The route still imports the
 * trainee-lookup logic for the cap decision.
 */

// ─── Questionnaire definition ───────────────────────────────────────

export interface CvMatchQuestion {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  /**
   * Normally option index 0 scores 1 (worst) and option index 4 scores
   * 5 (best). When `reversed: true`, the mapping flips — first option
   * = best. Used for questions where the natural display order doesn't
   * match the severity order (e.g. "time in search": shortest reads
   * first, but shortest = best).
   */
  reversed?: boolean;
  /**
   * Explicit score-per-option override. Used when the options aren't
   * a linear scale — e.g., "where are you stuck?" has 7 categorically
   * different answers, each tied to a different severity level.
   * If present, `scoreMap[i]` is the value for option i (overrides
   * both default and `reversed`). Length must match `options.length`.
   */
  scoreMap?: number[];
  /**
   * When true, the user can tick multiple options. The contribution
   * to the score is the average of the selected options' values.
   * Only used by "stuck-stage" — most readiness signals are mutually
   * exclusive single choices.
   */
  multiSelect?: boolean;
}

export const QUESTIONNAIRE: CvMatchQuestion[] = [
  {
    id: "duration",
    title: "ותק בחיפוש",
    prompt: "כמה זמן את/ה מחפש/ת עבודה באופן אקטיבי?",
    reversed: true,
    options: [
      "פחות מחודש",
      "1-3 חודשים",
      "3-6 חודשים",
      "מעל חצי שנה",
      "מעל שנה",
    ],
  },
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
  {
    id: "stuck-stage",
    title: "איפה את/ה תקוע/ה",
    prompt: "איפה את/ה מרגיש/ה שהתהליך נתקע?",
    // 7 categorical options. The first one (no direction) is the most
    // fundamental gap. "Decision-making" implies high agency + good
    // signal-flow already, so it gets the high score. Multi-select
    // — most people are stuck at more than one stage.
    options: [
      "לא יודע/ת לאן לכוון בכלל ומאיפה להתחיל",
      "לא מוצא/ת משרות",
      "שולח/ת קו״ח – ואין חזרה",
      "יש פניות ממגייסים אך לא מדויק לי",
      "לא עובר/ת ראיונות טלפוניים",
      "מגיע/ה לראיונות – ולא מתקדם/ת",
      "קבלת החלטות (להישאר / לעבור / לשנות כיוון)",
    ],
    scoreMap: [1, 2, 2, 4, 3, 3, 5],
    multiSelect: true,
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
 * Quick heuristic CV-quality assessment. Looks at length + the
 * presence of common professional sections. Returns -10..+5 — a
 * SMALL nudge to the questionnaire score, not a dominant factor.
 * Coral's pivot is that the questionnaire is the main signal; the
 * CV bumps it up or down a bit when it's clearly poor or strong.
 */
function cvQualityNudge(cvText: string | undefined): number {
  if (!cvText || cvText.length < 50) return -8;
  const t = cvText.toLowerCase();
  let score = 0;
  // Length: very short → penalty; reasonable → bonus.
  if (cvText.length < 400) score -= 8;
  else if (cvText.length > 1500) score += 2;
  // Has email
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(cvText)) score += 1;
  // Has LinkedIn URL
  if (/linkedin\.com\/in\//i.test(t)) score += 1;
  // Has experience-section keyword
  if (/ניסיון|experience|העסקה|תפקיד/.test(t)) score += 1;
  // Has education
  if (/השכלה|education|תואר|degree|תיכון/.test(t)) score += 1;
  // Has skills
  if (/מיומנויות|כישורים|skills|כלים/.test(t)) score += 1;
  // Multiple jobs implied by multiple year tokens
  const years = (cvText.match(/\b(19|20)\d{2}\b/g) ?? []).length;
  if (years >= 4) score += 2;
  // Cap the nudge
  return Math.max(-10, Math.min(5, score));
}

/**
 * Compute the readiness score from the questionnaire answers + the
 * CV content + a flag indicating whether the candidate is recognised
 * as a Coral trainee.
 *
 * @param answers - 1-5 ints per question (or scoreMap-defined values)
 * @param isTrainee - true when the CV's name matches a User in the DB
 * @param cvText - the extracted CV text (used for the quality nudge)
 * @returns CvMatchResult
 */
export function scoreFromQuestionnaire(
  answers: number[],
  isTrainee: boolean,
  cvText?: string,
): CvMatchResult {
  // Defensive: clamp every answer to 1-5, default 1 if missing.
  const normalised: number[] = QUESTIONNAIRE.map((_, i) => {
    const a = Number(answers[i] ?? 1);
    if (Number.isNaN(a)) return 1;
    return Math.max(1, Math.min(5, Math.round(a)));
  });

  // Sum range = N..5N (N = total question count). Scale to 0-100 so
  // "middle" answer (3 across the board) maps to 50.
  const N = QUESTIONNAIRE.length;
  const sum = normalised.reduce((a, b) => a + b, 0);
  let score = Math.round(((sum - N) / (4 * N)) * 100);

  // CV-quality nudge — pull the score up or down a few points based
  // on the CV. This is what makes the result feel "smart" rather than
  // purely questionnaire-driven. Capped at ±10 either direction.
  const cvNudge = cvQualityNudge(cvText);
  score = Math.max(0, Math.min(100, score + cvNudge));

  // Coral's hard rule: NOTHING goes above 80, including known trainees.
  // The missing 20% is what the platform unlocks (CV optimisation +
  // method). Without this cap a perfect questionnaire would print 100,
  // which kills the value proposition. Trainees still get a slightly
  // higher floor via the natural CV-nudge — their CVs follow Coral's
  // format and score well — but never break 80.
  // We keep the `isTrainee` parameter in the signature for forward
  // compatibility (analytics, future trainee-only logic), but it no
  // longer drives the cap directly.
  void isTrainee;
  const MAX_SCORE = 80;
  score = Math.min(MAX_SCORE, score);

  // Pull the TOP 2 weakest areas (lowest answer values). Skip
  // "duration" (status, not a behaviour) and "stuck-stage" (it
  // describes the where, not the how). The verdict mentions both
  // weakest gaps so it reads like a multi-dimensional recruiter
  // assessment, not a one-line.
  const SKIP_FOR_WEAKEST = new Set(["duration", "stuck-stage"]);
  const eligible = normalised
    .map((value, i) => ({ value, i, id: QUESTIONNAIRE[i].id, title: QUESTIONNAIRE[i].title }))
    .filter((x) => !SKIP_FOR_WEAKEST.has(x.id))
    .sort((a, b) => a.value - b.value);
  const weakest1 = eligible[0]?.title ?? "חיפוש עבודה";
  const weakest2 = eligible[1]?.title ?? "מיתוג מקצועי";
  const weakestArea = weakest1; // backwards-compat for callers/UI

  // CV signal: is the CV thin / strong? Drives the recruiter-voice
  // verdict — a thin CV gets called out specifically.
  const cvFlag: "thin" | "neutral" | "strong" =
    cvNudge <= -5 ? "thin" : cvNudge >= 3 ? "strong" : "neutral";

  // Templates trigger on a 70 threshold.
  const template: "high" | "low" = score >= 70 ? "high" : "low";

  // Recruiter-voice verdicts. The voice is a senior recruiter with
  // 15+ years in Israeli hiring — direct, observational, pattern-
  // recognising. NOT flattery. NOT vague. References multiple
  // specific axes so the candidate feels seen.
  let matchLabel: string;
  let verdict: string;
  if (template === "high") {
    matchLabel = "מוכנות גבוהה";
    verdict =
      `רואים פה פרופיל איכותי — אחת התוצאות החזקות שאני רואה. ` +
      `אחרי 15 שנה בגיוס אני אומר/ת לך בכנות: מה שמפריד אותך מ-100% זה ` +
      (cvFlag === "thin"
        ? `הקורות חיים — הם לא ממצים את הפוטנציאל שלך, ומגייסים מקבלים החלטה תוך 7 שניות. `
        : `הדיוק של הקורות חיים — הם בסדר, אבל לא ממקסמים את הפוטנציאל שלך, ובשוק הזה זה ההבדל בין ראיון להתעלמות. `) +
      `יחד עם חידוד של ה-${weakest1.toLowerCase()} — זה מה שיביא את ההצעה.`;
  } else if (score >= 50) {
    matchLabel = "מוכנות חלקית";
    verdict =
      `רואה את המאמץ. הציון משקף שיש לך פוטנציאל, אבל ה-${weakest1} וה-${weakest2} שלך — ` +
      (cvFlag === "thin"
        ? `יחד עם הקורות חיים שלא מציגים את הסיפור המלא, `
        : `יחד עם איך שהפרופיל המקצועי שלך נראה היום, `) +
      `תוקעים את התהליך לפני שהוא מגיע למגייס/ת. רוב הפרופילים במצב הזה — לא חסרה להם יכולת, חסרה להם שיטה.`;
  } else {
    matchLabel = "מוכנות נמוכה";
    verdict =
      `אני רואה את הסיפור הזה כל יום ב-15 שנות גיוס. זה לא חוסר ניסיון. זה לא חוסר מאמץ. ` +
      `זו בעיה של שיטה: ה-${weakest1} שלך כמעט לא קיים, ה-${weakest2} מורידים את ההזדמנויות שאת/ה רואה ב-40-60%, ` +
      (cvFlag === "thin"
        ? `והקורות חיים בקושי ממסגרים את הניסיון שלך. `
        : `והקורות חיים לא ממסגרים את הסיפור שלך בצורה שתביא פניות. `) +
      `אנשים בדיוק מהפרופיל הזה — מקבלים תפקיד תוך 6-8 שבועות עם השיטה הנכונה.`;
  }

  return { score, matchLabel, template, verdict, weakestArea };
}
