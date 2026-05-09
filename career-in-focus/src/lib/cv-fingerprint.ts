/**
 * Layer 3 of the upload pipeline — deterministic 'does this look like
 * a CV?' check that runs AFTER text extraction and BEFORE the Gemini
 * analysis call.
 *
 * Why have this on top of Gemini's own isNotCv detection:
 *   - Saves tokens. Obvious non-CVs (invoices, receipts, recipes,
 *     blank pages) are caught here without paying for AI analysis.
 *   - Faster fail. User sees the rejection in <1s instead of 8-15s.
 *   - More specific error messages. We can say "this looks like a
 *     contract, not a CV" — Gemini's response is generic.
 *   - Defense in depth. Gemini sometimes accepts borderline cases
 *     that aren't actually CVs; this layer is stricter.
 *
 * Scoring is rule-based: count CV-positive signals, count anti-CV
 * signals, decide. No AI, no network.
 */

export type FingerprintVerdict =
  | { isCv: true;  confidence: number; signals: string[] }
  | { isCv: false; confidence: number; reason: string; suggestedFileType?: string };

interface RegexCheck {
  name: string;
  regex: RegExp;
  weight: number; // higher = stronger signal
}

// Strong CV indicators. Multiple matches = high confidence.
// Weights tuned empirically: explicit CV section headers > dates > contact > skills.
const CV_POSITIVE: RegexCheck[] = [
  { name: "header-cv",       regex: /קורות[\s-]*חיים|רזומה|\b(curriculum vitae|resume|CV)\b/i,        weight: 3 },
  { name: "header-experience", regex: /ניסיון[\s-]*תעסוקתי|ניסיון[\s-]*מקצועי|work experience|employment history|professional experience/i, weight: 3 },
  { name: "header-education", regex: /\bהשכלה\b|\beducation\b|\bacademic\b|תואר[\s-]*ראשון|תואר[\s-]*שני|B\.A\.|M\.A\.|B\.Sc|M\.Sc|MBA/i, weight: 3 },
  { name: "header-skills",   regex: /\bמיומנויות\b|\bכישורים\b|\bכישורי[\s-]*מחשב\b|\bskills\b|\btechnical skills\b|\bcompetencies\b/i, weight: 2 },
  { name: "date-range",      regex: /(20\d\d|19\d\d)\s*[-–—]\s*(20\d\d|19\d\d|present|היום|הווה|עד היום)/i,        weight: 2 },
  { name: "month-year",      regex: /(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+(20\d\d|19\d\d)/i, weight: 1 },
  { name: "email",           regex: /[\w.+-]+@[\w-]+\.[\w.-]+/,                                                weight: 2 },
  { name: "phone-il",        regex: /(\+?972|0)\s?5\d[-\s]?\d{3}[-\s]?\d{4}|0\d{1,2}[-\s]?\d{7}/,             weight: 2 },
  { name: "linkedin",        regex: /linkedin\.com\/in\//i,                                                    weight: 3 },
  { name: "github",          regex: /github\.com\/[\w-]+/i,                                                    weight: 1 },
  { name: "languages",       regex: /\bשפות\b|\blanguages\b|\bעברית\b|\bאנגלית\b|\benglish\b|\bhebrew\b/i,    weight: 1 },
  { name: "responsibilities", regex: /\b(אחראי|אחראית|ניהול|ניהלתי|הובלתי|פיתחתי|יישמתי|managed|led|developed|implemented|coordinated|responsible for)\b/i, weight: 2 },
];

// Strong anti-CV indicators. Each one shifts the verdict toward
// "this isn't a CV" with a specific suggested type.
const NON_CV_SIGNALS: Array<{ regex: RegExp; type: string; description: string }> = [
  { regex: /\b(חשבונית|invoice|receipt|לפני מע"?מ|כולל מע"?מ|סה"?כ לתשלום)\b/i,               type: "invoice",      description: "חשבונית או קבלה" },
  { regex: /\b(הסכם|חוזה|whereas|hereby|the parties agree|terms and conditions|תנאי שימוש)\b/i, type: "contract",     description: "חוזה או מסמך משפטי" },
  { regex: /\b(מתכון|recipe|ingredients|מצרכים|הוראות הכנה|preheat|cup of|כף|כפית|גרם)\b/i,    type: "recipe",       description: "מתכון" },
  { regex: /\b(article|blog|posted on|by:|published|כתבה|פרסום|מאמר)\b/i,                       type: "article",      description: "כתבה או מאמר" },
  { regex: /\b(תעודת זהות|ת\.?ז\.?|date of birth|drivers? license|passport|דרכון)\b/i,         type: "id-document",  description: "מסמך זהות" },
  { regex: /\b(application form|טופס|please fill in|מלא את הפרטים)\b/i,                         type: "form",         description: "טופס למילוי" },
  { regex: /\b(certificate|תעודה|granted to|הוענקה ל|hereby certifies|אישור על)\b/i,            type: "certificate",  description: "תעודת הוקרה" },
];

const MIN_TEXT_LENGTH    = 250;   // CVs almost always have at least this much text
const MIN_TEXT_LENGTH_WARNING = 600;
const MIN_CV_SIGNALS     = 3;     // need this many positive signals (weighted) to pass

/**
 * Inspect extracted text and decide whether it looks like a CV.
 * Returns isCv:true with confidence + signal names when accepted,
 * isCv:false with a specific reason otherwise.
 */
export function looksLikeCv(text: string): FingerprintVerdict {
  const t = (text ?? "").trim();

  // Empty / nearly empty extraction.
  if (t.length < 30) {
    return {
      isCv: false,
      confidence: 0,
      reason: "הקובץ ריק או שלא הצלחנו לקרוא ממנו טקסט. נסי קובץ אחר.",
    };
  }

  // Anti-CV check first — these are decisive. Even if we see CV-ish
  // keywords, if there's a clear invoice/recipe/contract signal we
  // trust it (CVs don't have these terms).
  for (const sig of NON_CV_SIGNALS) {
    if (sig.regex.test(t)) {
      return {
        isCv: false,
        confidence: 0.9,
        reason: `הקובץ נראה כמו ${sig.description}, לא קורות חיים. אם זה קוח שלך — וודאי שהוא בפורמט CV סטנדרטי.`,
        suggestedFileType: sig.type,
      };
    }
  }

  // Suspiciously short.
  if (t.length < MIN_TEXT_LENGTH) {
    return {
      isCv: false,
      confidence: 0.7,
      reason: `הקובץ קצר מאוד (${t.length} תווים) — קורות חיים בדרך כלל מכילים לפחות עמוד שלם של תוכן. ייתכן שהקובץ ריק או חסר.`,
    };
  }

  // Count weighted CV signals.
  let score = 0;
  const matched: string[] = [];
  for (const check of CV_POSITIVE) {
    if (check.regex.test(t)) {
      score += check.weight;
      matched.push(check.name);
    }
  }

  // Need at least MIN_CV_SIGNALS weighted signals to look like a CV.
  if (score < MIN_CV_SIGNALS) {
    return {
      isCv: false,
      confidence: Math.min(0.6, score / 8),
      reason: "הטקסט לא מכיל מאפיינים של קורות חיים (ניסיון תעסוקתי, השכלה, מיומנויות, פרטי קשר). וודאי שהעלת את הקובץ הנכון.",
    };
  }

  // Length warning still passes but we reduce confidence.
  const confidence = t.length < MIN_TEXT_LENGTH_WARNING
    ? Math.min(0.7, score / 12)
    : Math.min(0.95, score / 10);

  return { isCv: true, confidence, signals: matched };
}
