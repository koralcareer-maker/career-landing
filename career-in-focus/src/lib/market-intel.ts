/**
 * Market Intelligence engine — replaces the old "Updates" page with a
 * smart feed of career-relevant news, processed in Hebrew.
 *
 * Flow per article:
 *   1. Pull from RSS / list source
 *   2. Skip if URL already seen in DB
 *   3. Send original title + body to Gemini with a structured JSON
 *      schema asking for: relevance score, category, hebrew title,
 *      summary, why-it-matters, job-search insight, recommended action,
 *      importance label.
 *   4. If Gemini's relevanceScore >= MIN_RELEVANCE → insert as PUBLISHED.
 *      Below threshold → insert as DRAFT (kept for audit, hidden from
 *      members) so the cron doesn't re-process it next run.
 */

export const MIN_RELEVANCE = 55;

export const CATEGORIES = [
  "שוק העבודה",
  "בינה מלאכותית ותעסוקה",
  "הייטק וטכנולוגיה",
  "גיוסים ופיטורים",
  "שכר ותנאים",
  "מגמות קריירה",
  "מיומנויות מבוקשות",
] as const;

export const IMPORTANCE_LABELS = [
  "חשוב למחפשי עבודה",
  "משפיע על שוק העבודה",
  "מגמה שכדאי להכיר",
  "דורש פעולה",
] as const;

export interface RawArticle {
  url:           string;
  title:         string;          // original (Hebrew or English)
  body:          string;          // article body / summary text
  sourceName:    string;
  language:      "he" | "en";
  publishedAt:   Date;
}

export interface ProcessedArticle {
  hebrewTitle:       string;
  summaryHebrew:     string;
  whyItMatters:      string;
  jobSearchInsight:  string;
  recommendedAction: string;
  category:          string;
  importanceLabel:   string | null;
  relevanceScore:    number;
}

/**
 * Build the prompt that asks Gemini to classify + translate + analyze
 * a single article in one shot. Stays under ~600 tokens of input.
 */
function buildPrompt(article: RawArticle): string {
  const langDirective = article.language === "en"
    ? "המאמר במקור באנגלית — תרגם את הכותרת לעברית, וכל שאר השדות בעברית."
    : "המאמר במקור בעברית — שמור כותרת קרובה למקור, וכל שאר השדות בעברית.";

  const dateStr = isFinite(article.publishedAt.getTime())
    ? article.publishedAt.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return `אתה אנליסט שוק העבודה של פלטפורמה ישראלית למחפשי עבודה (קריירה בפוקוס). תפקידך לעבד מאמר אחד ולסווג אותו לפיד מודיעין שוק העבודה.

${langDirective}

מאמר לעיבוד:
=== כותרת מקור ===
${article.title}

=== מקור ===
${article.sourceName} (${dateStr})

=== תוכן ===
${article.body.slice(0, 2400)}

המשימה: החזר JSON בלבד (בלי \`\`\`, בלי טקסט מסביב), במבנה הבא בדיוק:

{
  "relevanceScore": <מספר 0-100 לרלוונטיות למחפשי עבודה ישראלים>,
  "category": "<אחת מהקטגוריות בלבד>",
  "hebrewTitle": "<כותרת בעברית, 8-14 מילים, ידידותית למקצוענים>",
  "summaryHebrew": "<סיכום 3-5 שורות בעברית, ענייני, מה קרה ומה ההיקף>",
  "whyItMatters": "<משפט-שניים: למה זה משנה דווקא למחפשי עבודה>",
  "jobSearchInsight": "<תובנה פרקטית: מה ללמוד מזה לחיפוש עבודה אישי>",
  "recommendedAction": "<פעולה ספציפית אחת שמחפש/ת עבודה צריכ/ה לעשות עכשיו בעקבות הכתבה>",
  "importanceLabel": "<תווית חשיבות אחת או null>"
}

קטגוריות מותרות: שוק העבודה | בינה מלאכותית ותעסוקה | הייטק וטכנולוגיה | גיוסים ופיטורים | שכר ותנאים | מגמות קריירה | מיומנויות מבוקשות

תוויות חשיבות מותרות: חשוב למחפשי עבודה | משפיע על שוק העבודה | מגמה שכדאי להכיר | דורש פעולה | null

דירוג רלוונטיות:
- 80-100: השפעה ישירה על מחפשי עבודה (פיטורים גדולים, מגייסים פתאומיים, AI שמשנה תפקיד)
- 60-79: רלוונטי וכדאי לדעת (מגמת שכר, מיומנויות מבוקשות)
- 40-59: מעניין כללית, פחות אקשנבילי
- 0-39: לא רלוונטי למחפשי עבודה (פוליטיקה כללית, חדשות סלבס, חדשות טכנולוגיה ללא קשר לתעסוקה)

החזר אך ורק את ה-JSON.`;
}

/**
 * Call Gemini and parse a structured response. Returns null on any
 * failure so the cron can move to the next article.
 */
export async function processArticle(article: RawArticle): Promise<ProcessedArticle | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[market-intel] GEMINI_API_KEY missing — skipping");
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  let raw = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(article) }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.4,
          responseMimeType: "application/json",
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
    });
    const data = (await res.json()) as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
      error?: { message: string };
    };
    if (data.error) {
      console.error("[market-intel] Gemini error:", data.error.message);
      return null;
    }
    raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (err) {
    console.error("[market-intel] fetch error:", err);
    return null;
  }

  if (!raw) return null;

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  let parsed: Partial<ProcessedArticle>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[market-intel] failed to parse JSON. Raw start:", raw.slice(0, 200));
    return null;
  }

  // Validate required fields
  if (
    typeof parsed.hebrewTitle !== "string" ||
    typeof parsed.summaryHebrew !== "string" ||
    typeof parsed.relevanceScore !== "number" ||
    typeof parsed.category !== "string"
  ) {
    return null;
  }

  return {
    hebrewTitle:       parsed.hebrewTitle.trim(),
    summaryHebrew:     parsed.summaryHebrew?.trim() ?? "",
    whyItMatters:      parsed.whyItMatters?.trim() ?? "",
    jobSearchInsight:  parsed.jobSearchInsight?.trim() ?? "",
    recommendedAction: parsed.recommendedAction?.trim() ?? "",
    category:          parsed.category.trim(),
    importanceLabel:   typeof parsed.importanceLabel === "string" && parsed.importanceLabel !== "null"
                          ? parsed.importanceLabel.trim()
                          : null,
    relevanceScore:    Math.max(0, Math.min(100, Math.round(parsed.relevanceScore))),
  };
}

// ─── RSS sources we currently scan ─────────────────────────────────────
//
// New sources can be added here without touching the pipeline. Each
// source has a parser hint that tells the fetcher how to pull the body
// (RSS description, OG description, or fallback to title only).
export interface SourceConfig {
  name:     string;
  rssUrl:   string;
  language: "he" | "en";
}

export const SOURCES: SourceConfig[] = [
  { name: "Ynet — דיגיטל",     rssUrl: "https://www.ynet.co.il/Integration/StoryRss544.xml", language: "he" },
  { name: "Ynet — צרכנות",      rssUrl: "https://www.ynet.co.il/Integration/StoryRss545.xml", language: "he" },
  { name: "Globes — הייטק",     rssUrl: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2", language: "he" },
];

/**
 * Pull a basic list of articles from one RSS source. Returns at most
 * `limit` items. Body is the RSS <description> field — Gemini gets
 * enough to summarize from that.
 */
export async function fetchSource(src: SourceConfig, limit = 8): Promise<RawArticle[]> {
  const res = await fetch(src.rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (CareerInFocus market-intel bot)" },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn(`[market-intel] ${src.name}: HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const items: RawArticle[] = [];

  const itemBlocks = xml.split(/<item[\s>]/).slice(1, limit + 1);
  for (const blk of itemBlocks) {
    const title =
      pickTag(blk, "title") ??
      pickTag(blk, "title", "<![CDATA[", "]]>");
    const link = pickTag(blk, "link");
    const pubDate = pickTag(blk, "pubDate");
    const description =
      pickTag(blk, "description") ??
      pickTag(blk, "description", "<![CDATA[", "]]>") ??
      "";
    if (!title || !link) continue;

    items.push({
      url:         link,
      title:       decodeHtml(title),
      body:        decodeHtml(stripHtml(description)),
      sourceName:  src.name,
      language:    src.language,
      publishedAt: pubDate ? new Date(pubDate) : new Date(),
    });
  }
  return items;
}

function pickTag(xml: string, tag: string, openWrap?: string, closeWrap?: string): string | null {
  // Plain <tag>value</tag>
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (openWrap && closeWrap && v.startsWith(openWrap) && v.endsWith(closeWrap)) {
    v = v.slice(openWrap.length, v.length - closeWrap.length).trim();
  }
  return v || null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
