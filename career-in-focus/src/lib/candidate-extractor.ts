/**
 * Candidate Extractor — parse raw CV text into structured Candidate fields
 *
 * Used by /api/admin/candidates/import to ingest CVs from any source
 * (Canva design pages, Gmail attachments, the public lead form). The
 * extractor calls Gemini Flash with a strict JSON schema and falls
 * through a model cascade so a single quota hit doesn't break the
 * pipeline mid-batch.
 *
 * The output shape is intentionally a subset of the Prisma Candidate
 * model — only the fields we can reliably extract from CV text. We
 * leave embedding/source/sourceRef/cvUrl for the calling route to set.
 */

const GEMINI_MODELS = [
  "gemini-2.0-flash",       // fast + roomy free-tier quota
  "gemini-2.5-flash-lite",  // cheaper fallback
  "gemini-2.5-flash",       // primary if 2.0 throttled
  "gemini-1.5-flash",       // legacy
];

const REQUEST_TIMEOUT_MS = 30_000;

export interface ExtractedCandidate {
  name: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  targetRole: string | null;
  field: string | null;
  region: string | null;
  city: string | null;
  yearsExperience: number | null;
  currentCompany: string | null;
  currentTitle: string | null;
  summary: string | null;
  skills: string[];
  languages: string[];
  education: string | null;
  militaryUnit: string | null;
}

const SYSTEM_PROMPT = `אתה מומחה לעיבוד קורות חיים בעברית ובאנגלית. קבל טקסט גולמי של קורות חיים והוצא ממנו אובייקט JSON עם השדות הבאים:

{
  "name": "שם מלא של המועמד (חובה - אם לא ברור, נסה לנחש מתוך הטקסט. אם באמת אין שם, החזר 'לא ידוע')",
  "email": "כתובת אימייל או null",
  "phone": "מספר טלפון או null (פורמט ישראלי: 050-1234567 או דומה)",
  "linkedinUrl": "URL מלא של פרופיל LinkedIn או null",
  "targetRole": "תפקיד מבוקש בעברית (לדוגמה 'מנהלת פרויקטים', 'Project Manager', 'מערכות מידע') או null",
  "field": "תחום מקצועי קצר בעברית (לדוגמה 'פיתוח', 'שיווק', 'חינוך והדרכה', 'רפואה ובריאות', 'מכירות ושיווק') או null",
  "region": "אחד מהאזורים: 'צפון' | 'חיפה' | 'מרכז' | 'שפלה' | 'ירושלים' | 'דרום' | 'אילת' או null",
  "city": "עיר מגורים או null",
  "yearsExperience": מספר שלם של שנות ניסיון או null,
  "currentCompany": "שם החברה הנוכחית או האחרונה או null",
  "currentTitle": "התפקיד הנוכחי בחברה או null",
  "summary": "סיכום קצר (עד 200 תווים) בעברית של רקע מקצועי",
  "skills": ["מערך", "של", "מיומנויות"] (לפחות 3 פריטים אם אפשר, או [] אם אין),
  "languages": ["עברית - שפת אם", "אנגלית - גבוהה"] (פורמט: 'שפה - רמה'),
  "education": "סיכום השכלה בשורה אחת (תואר + מוסד) או null",
  "militaryUnit": "יחידה צבאית או null"
}

החזר JSON תקין בלבד, ללא markdown, ללא הסברים, ללא טקסט מסביב.`;

export async function extractCandidate(rawCvText: string): Promise<ExtractedCandidate> {
  const geminiKey = process.env.GEMINI_API_KEY;
  let lastError: Error | null = null;
  // Try Gemini cascade first (free / cheap).
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        return await callExtractor(model, rawCvText, geminiKey);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        continue;
      }
    }
  }
  // Gemini exhausted (or no key). Fall back to Claude — ANTHROPIC_API_KEY
  // is already configured for the personal-analysis lib. Claude Haiku
  // is fast and cheap (~$0.25/MM input tokens) and handles structured
  // JSON output well, so we don't lose anything by routing through it
  // when Gemini's daily quota tanks.
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      return await callClaudeExtractor(rawCvText, anthropicKey);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw new Error(`Candidate extractor exhausted: ${lastError?.message ?? "no API keys configured"}`);
}

async function callClaudeExtractor(raw: string, key: string): Promise<ExtractedCandidate> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: raw }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) throw new Error("empty response from Claude");
  return parseExtractedCandidate(text);
}

async function callExtractor(model: string, raw: string, key: string): Promise<ExtractedCandidate> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: raw }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini ${model} ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error(`empty response from ${model}`);
    return parseExtractedCandidate(text);
  } finally {
    clearTimeout(timer);
  }
}

function parseExtractedCandidate(raw: string): ExtractedCandidate {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/i, "").replace(/```$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("no JSON in extractor response");
  const parsed = JSON.parse(text.slice(first, last + 1)) as Partial<ExtractedCandidate>;
  // Normalize: ensure required name + default arrays.
  return {
    name: (parsed.name && String(parsed.name).trim()) || "לא ידוע",
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    linkedinUrl: parsed.linkedinUrl ?? null,
    targetRole: parsed.targetRole ?? null,
    field: parsed.field ?? null,
    region: parsed.region ?? null,
    city: parsed.city ?? null,
    yearsExperience:
      typeof parsed.yearsExperience === "number" ? parsed.yearsExperience : null,
    currentCompany: parsed.currentCompany ?? null,
    currentTitle: parsed.currentTitle ?? null,
    summary: parsed.summary ?? null,
    skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
    languages: Array.isArray(parsed.languages) ? parsed.languages.map(String) : [],
    education: parsed.education ?? null,
    militaryUnit: parsed.militaryUnit ?? null,
  };
}

/**
 * Compute a Gemini text-embedding vector for a candidate. We embed the
 * concatenation of {name, targetRole, currentTitle, skills, summary}
 * because those are the fields the auto-matcher cares about. Returns a
 * 768-float array (Gemini's text-embedding-004 default).
 */
export async function embedCandidate(c: ExtractedCandidate): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const text = [
    c.name,
    c.targetRole,
    c.currentTitle,
    c.field,
    c.summary,
    c.skills.join(", "),
  ]
    .filter(Boolean)
    .join(" | ");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: "SEMANTIC_SIMILARITY",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`embedding ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  if (!data.embedding?.values) throw new Error("no embedding values returned");
  return data.embedding.values;
}
