/**
 * Free CV-Match analyzer.
 *
 * Coral asked for the strongest possible top-of-funnel hook: a public,
 * no-signup tool where visitors paste a CV + job description and get
 * an honest, professional match analysis.
 *
 * Goal: deliver enough value to be shareable AND create real urgency
 * about subscribing. The analysis is intentionally direct about gaps —
 * not cruel, but honest — because the "you're close but not there"
 * gap is what motivates payment.
 *
 * Uses the same Gemini cascade pattern as personal-analysis.ts so we
 * keep working when individual models hit quota.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
];

const REQUEST_TIMEOUT_MS = 60_000;

// ─── Result shape ───────────────────────────────────────────────────

export interface CvMatchStrength {
  /** 2-4 word title (e.g. "ניסיון רלוונטי בניהול מוצר") */
  title: string;
  /** 1-sentence proof from the CV that justifies the call-out */
  proof: string;
}

export interface CvMatchGap {
  /** 2-4 word title — phrased as missing capability, not criticism */
  title: string;
  /** 1-sentence reason why this matters for THIS job */
  why: string;
  /** Concrete action to close the gap (1 sentence) */
  action: string;
  /** "high" / "medium" / "low" priority */
  severity: "high" | "medium" | "low";
}

export interface CvMatchResult {
  /** 0-100 overall match. */
  score: number;
  /** 1-2 sentence verdict — direct, professional, slightly destabilising */
  verdict: string;
  /** Hebrew label (e.g. "התאמה גבוהה / חלקית / נמוכה") */
  matchLabel: string;
  /** 3 strengths from the CV that align with the job */
  strengths: CvMatchStrength[];
  /** 3 gaps that prevent a higher score */
  gaps: CvMatchGap[];
  /** Single biggest leverage point — what would move the score most */
  topLever: string;
  /** Suggested next step framing — sets up the upgrade CTA */
  nextStepFraming: string;
  /** Estimated rank-vs-other-candidates band */
  candidateRank: string;
}

export class CvMatchError extends Error {
  code: "no-key" | "bad-input" | "api-error" | "parse-error";
  constructor(code: CvMatchError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

// ─── Prompts ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `אתה יועץ קריירה בכיר ב"קריירה בפוקוס" עם 15+ שנות ניסיון בגיוס בישראל. אתה מנתח בקליק קורות חיים מול תפקיד יעד שהמשתמש מציין, ומחזיר ניתוח התאמה מקצועי, ישיר, ושימושי.

הקלט של תפקיד היעד יכול להיות:
- **שם תפקיד קצר בלבד** (לדוגמה: "מנהלת חשבונות בכירה", "Senior Product Manager"). במקרה הזה, השתמש בידע הכללי שלך על מה הדרישות הסטנדרטיות לתפקיד הזה בשוק הישראלי, וצור ניתוח שמשווה את ה-CV מול הסטנדרט.
- **תיאור משרה מלא**. במקרה הזה, השווה את ה-CV מול הדרישות הספציפיות בתיאור.

# מטרות הניתוח
1. **כן ומדויק** — ציון אמיתי, לא מחמיא. רוב הקו"ח לא מתאימים ב-90%+ למשרה ספציפית. ציון ממוצע אמיתי הוא 55-75.
2. **שימושי** — כל פער מנוסח עם פעולה קונקרטית שאפשר ליישם השבוע.
3. **דוחף לפעולה** — הניסוח של ה-gaps והפסקה "topLever" צריך להבליט פוטנציאל שאינו מנוצל — "אם תסגרי את הפער הזה, את עוברת מ-72% ל-89%". זה יוצר תחושת **חסר** ספציפי, לא ייאוש כללי.

# שיטת הניקוד
- 30 נקודות: התאמת תפקיד (current/past titles vs target title)
- 25 נקודות: התאמת שנות ניסיון
- 20 נקודות: התאמת מיומנויות טכניות / כלים נדרשים
- 15 נקודות: השכלה רלוונטית
- 10 נקודות: סקטור / סוג ארגון

מספרים יוצאים מהבטן — אל תכתוב פירוט של ה-30/25/20 ב-output, רק תן score סופי.

# סגנון
- עברית מקצועית, גוף שני נקבה (אא"כ ברור מהשם שזה גבר).
- אסור: "אולי", "תיאוריה", "מקובל". כן: "במשרה הספציפית הזו ראיתי...".
- אסור להמליץ על השלמת אקדמיה אם הקו"ח כבר מציין תואר רלוונטי.
- כל gap עם action ספציפי השבוע — לא "ללמוד יותר על X" אלא "להוסיף קורס Y ב-Coursera ב-3 ימים".

# פורמט הפלט — JSON בלבד, בלי markdown, בלי טקסט נוסף
{
  "score": <0-100>,
  "matchLabel": "<התאמה גבוהה / התאמה חלקית / התאמה נמוכה / לא מתאים>",
  "verdict": "<משפט-שניים: מי את ומה החסר. ישיר, מקצועי. דוגמה: 'יש לך 5 שנות ניסיון רלוונטי בניהול מוצר, אבל המשרה מבקשת ניסיון ספציפי ב-B2B SaaS שאת לא מציגה בצורה ברורה ב-CV.'>",
  "strengths": [
    { "title": "<חוזקה ב-2-4 מילים>", "proof": "<צטוט/אזכור ספציפי מה-CV שמוכיח את החוזקה>" },
    ...3 בסך הכל
  ],
  "gaps": [
    { "title": "<פער ב-2-4 מילים>", "why": "<למה זה משנה למשרה הספציפית>", "action": "<פעולה קונקרטית השבוע>", "severity": "high" / "medium" / "low" },
    ...3 בסך הכל
  ],
  "topLever": "<משפט שמדגיש את הפער המשמעותי ביותר: 'אם תסגרי את X, הציון שלך עולה ל-Y%'>",
  "nextStepFraming": "<משפט שמכין את הקרקע לפיצ'ר הבא — בלי 'הירשמי' או 'שלמי'. במקום: 'יש פערים ספציפיים שהקו"ח שלך לא מנצל. הצעד הבא הוא תוכנית פעולה ממוקדת ל-4 שבועות שתסגור אותם.'>",
  "candidateRank": "<פס דירוג אומדן: 'בעשירון העליון של המועמדים', 'במחצית העליונה', 'במחצית התחתונה', 'נדרשת התאמה משמעותית'>"
}`;

function buildUserPrompt(cvText: string, jobText: string): string {
  return `--- קורות חיים ---
${cvText.trim().slice(0, 8000)}

--- תפקיד היעד ---
${jobText.trim().slice(0, 4000)}

נתח את ההתאמה. אם הקלט קצר (שם תפקיד בלבד) — השתמש בידע שוק העבודה הישראלי כדי להסיק את הדרישות הסטנדרטיות לתפקיד וצור ניתוח על בסיסן. החזר JSON תקני בלבד, ללא markdown fences, ללא הקדמה.`;
}

// ─── Engine ─────────────────────────────────────────────────────────

export async function analyzeCvMatch(
  cvText: string,
  jobText: string,
): Promise<CvMatchResult> {
  if (!cvText || cvText.trim().length < 50) {
    throw new CvMatchError("bad-input", "קורות החיים קצרים מדי לניתוח");
  }
  if (!jobText || jobText.trim().length < 3) {
    throw new CvMatchError("bad-input", "תפקיד היעד קצר מדי לניתוח");
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!anthropicKey && !geminiKey) {
    throw new CvMatchError("no-key", "מנוע AI לא מוגדר");
  }

  const user = buildUserPrompt(cvText, jobText);

  // Prefer Anthropic when configured.
  if (anthropicKey) {
    try {
      return await callAnthropic(SYSTEM_PROMPT, user, anthropicKey);
    } catch (e) {
      if (!geminiKey) throw e;
      console.warn("[cv-match] Anthropic failed, trying Gemini:", e instanceof Error ? e.message : e);
    }
  }
  if (!geminiKey) throw new CvMatchError("no-key", "GEMINI_API_KEY missing");
  return await callGeminiCascade(SYSTEM_PROMPT, user, geminiKey);
}

async function callAnthropic(system: string, user: string, key: string): Promise<CvMatchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CvMatchError("api-error", `Anthropic ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("") ?? "";
    if (!text) throw new CvMatchError("parse-error", "empty response from Anthropic");
    return parseResult(text);
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiCascade(system: string, user: string, key: string): Promise<CvMatchResult> {
  const tried: string[] = [];
  let lastError: CvMatchError | null = null;

  for (const model of GEMINI_MODELS) {
    tried.push(model);
    try {
      return await callGeminiModel(model, system, user, key);
    } catch (e) {
      if (!(e instanceof CvMatchError)) throw e;
      lastError = e;
      const retryable =
        (e.code === "api-error" && /429|503|overload|UNAVAILABLE|quota/i.test(e.message)) ||
        (e.code === "parse-error" && /empty|MAX_TOKENS/i.test(e.message));
      if (!retryable) throw e;
      console.warn(`[cv-match] ${model} failed (${e.code}); trying next`);
    }
  }
  throw new CvMatchError(
    "api-error",
    `כל מנועי ה-AI לא זמינים (${tried.join(", ")}). ${lastError?.message ?? ""}`,
  );
}

async function callGeminiModel(
  model: string, system: string, user: string, key: string,
): Promise<CvMatchResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.6,
          // 8192 keeps long Hebrew structured responses from being
          // truncated mid-array (the cause of Coral's "Expected ','
          // or ']'" parse error). Gemini's hidden 'thinking' tokens
          // count against this cap, so the buffer matters.
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new CvMatchError("api-error", `Gemini ${model} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) {
      const reasons: string[] = [];
      if (data.promptFeedback?.blockReason) reasons.push(`blockReason=${data.promptFeedback.blockReason}`);
      if (candidate?.finishReason) reasons.push(`finishReason=${candidate.finishReason}`);
      throw new CvMatchError(
        "parse-error",
        `empty response from Gemini ${model}${reasons.length ? ` (${reasons.join(", ")})` : ""}`,
      );
    }
    return parseResult(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Repair common LLM JSON mistakes before parsing. Gemini occasionally
 * forgets a comma between array elements (Coral hit this exact case),
 * leaves trailing commas before `]`/`}`, or wraps the whole payload
 * in markdown fences even when `responseMimeType: application/json`
 * is set. We patch all three in-place.
 *
 * Designed to be safe — every regex is anchored on structural chars,
 * never inside string content.
 */
function repairJson(input: string): string {
  let s = input;

  // 1. Missing commas between adjacent objects/arrays/strings in an array.
  //    e.g. `}\n  {`  →  `},\n  {`
  s = s.replace(/}(\s*\n\s*){/g, "},$1{");
  s = s.replace(/](\s*\n\s*)\[/g, "],$1[");
  s = s.replace(/"(\s*\n\s*)"/g, '",$1"');
  // Catch the case where there's a number / closing brace before the next entry.
  s = s.replace(/(["\d}\]])(\s*\n\s*)([{\[])/g, "$1,$2$3");

  // 2. Trailing commas before close — invalid JSON but common in LLM output.
  s = s.replace(/,(\s*[}\]])/g, "$1");

  // 3. Smart-quote / curly-quote substitution that breaks JSON parsers.
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return s;
}

function parseResult(raw: string): CvMatchResult {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/```$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new CvMatchError("parse-error", "no JSON object in response");
  }
  const slice = text.slice(first, last + 1);

  // Two-pass parse: try as-is, then attempt repair, then give up.
  // The cascade in callGemini will rotate to the next model when we
  // throw — so it's safe to be strict here.
  const tryParse = (s: string) => JSON.parse(s) as CvMatchResult;

  let parsed: CvMatchResult;
  try {
    parsed = tryParse(slice);
  } catch (firstErr) {
    try {
      parsed = tryParse(repairJson(slice));
    } catch {
      // Surface the FIRST error — it's usually more informative than
      // the post-repair one.
      throw new CvMatchError(
        "parse-error",
        `JSON parse failed: ${firstErr instanceof Error ? firstErr.message : "unknown"}`,
      );
    }
  }

  parsed.strengths ??= [];
  parsed.gaps ??= [];
  if (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 100) {
    parsed.score = Math.max(0, Math.min(100, Number(parsed.score) || 50));
  }
  return parsed;
}
