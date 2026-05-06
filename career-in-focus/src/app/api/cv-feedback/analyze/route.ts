import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isCvFeedbackResult, type CvFeedbackResult } from "@/lib/cv-feedback-types";

// Node runtime + 60s budget — we hit Prisma directly for the cache, and
// edge-runtime Prisma pulls 'node:path' which the bundler refuses. Gemini
// PDF analysis runs 8-20s so 60s leaves comfortable headroom.
export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_KEY = () => process.env.GEMINI_API_KEY ?? "";

const PROMPT_HEADER = `אתה מגייסת בכירה בישראל. את סורקת קורות חיים ומחזירה משוב מעשי, ישיר וקצר.

החזר/י אך ורק JSON תקין (ללא markdown, ללא הסברים), בדיוק במבנה הבא:
{
  "qualityScore": <0-100, ציון איכות כללי>,
  "qualityBreakdown": {
    "clarity": <0-100>, "positioning": <0-100>, "achievements": <0-100>,
    "structure": <0-100>, "relevance": <0-100>, "wording": <0-100>,
    "skillsVisibility": <0-100>, "interviewPotential": <0-100>
  },
  "atsScore": <0-100>,
  "atsRiskLevel": "low" | "medium" | "high",
  "atsRiskReasons": ["סיבה 1", "סיבה 2", ...],
  "atsSystems": {
    "low": ["שמות מערכות שיקראו את הקורות חיים בקלות"],
    "medium": ["מערכות שיתכן ויעצרו על parsing"],
    "high": ["מערכות שעלולות לבלוע מידע"]
  },
  "summary": "סיכום של 2-4 משפטים — רושם כללי, חוזקה הכי בולטת, חולשה הכי בולטת, עדיפות מיידית",
  "worksWell": ["נקודה חזקה 1", "נקודה חזקה 2", ...],
  "weakens": ["חולשה 1", "חולשה 2", ...],
  "fixes": [
    { "priority": "high",     "text": "תיקון בעדיפות גבוהה" },
    { "priority": "medium",   "text": "תיקון בעדיפות בינונית" },
    { "priority": "optional", "text": "תיקון אופציונלי" }
  ],
  "missingKeywords": ["מילת מפתח חסרה 1", "מילת מפתח 2", ...],
  "suggestedTitles": ["5-8 כותרות תפקיד ריאליסטיות"],
  "nextAction": "השלב הבא: <משפט אחד מעשי>"
}

הנחיות:
- אל תבטיח/י שקורות החיים יעברו את כל מערכות ATS. השתמש/י בשפה כמו "סיכון נמוך/בינוני/גבוה".
- מערכות ATS מוכרות לבחור מתוכן: Greenhouse, Lever, iCIMS, Taleo, Workday, SAP SuccessFactors.
- אם יש בעיות בפורמט (טבלאות, עמודות, גרפיקה, אייקונים, headers/footers, כותרות לא סטנדרטיות, מילות מפתח חסרות, parsing קשה) — שיכבי אותן ב-atsRiskReasons.
- כל bullet קצר (עד 12 מילים).
- כל "fixes" — פעולה אחת ברורה. מקסימום 6 תיקונים.
- "missingKeywords" — אם נמסר תפקיד יעד, השווה אליו. אחרת, הסק תפקידים סבירים.
- "suggestedTitles" — 5-8 כותרות ריאליסטיות שמתאימות לרקע.
- ענה/י בעברית.
- החזר/י JSON בלבד.`;

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function userMessage(targetRole: string | null): string {
  if (targetRole && targetRole.trim()) {
    return `${PROMPT_HEADER}\n\nתפקיד יעד שהמשתמש/ת ציין/ה: "${targetRole.trim()}"`;
  }
  return `${PROMPT_HEADER}\n\nלא צוין תפקיד יעד — הסק מהקורות חיים את התפקיד הסביר ביותר.`;
}

async function callGemini(base64Data: string, mimeType: string, prompt: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY()}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
        maxOutputTokens: 2200,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`gemini ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.find?.((p: { text?: string }) => typeof p.text === "string")?.text;
  if (typeof text !== "string") throw new Error("gemini: no text in response");

  // Gemini sometimes wraps the JSON in ```json ... ``` despite the
  // responseMimeType hint. Strip if present.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!GEMINI_KEY()) {
    return NextResponse.json(
      { error: "הניתוח התעכב. נסה שוב בעוד רגע." },
      { status: 503 },
    );
  }

  let body: { base64Data?: string; mimeType?: string; fileName?: string; targetRole?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const base64Data = (body.base64Data ?? "").trim();
  const mimeType = (body.mimeType ?? "application/pdf").trim();
  const fileName = (body.fileName ?? "cv").trim().slice(0, 200);
  const targetRole = (body.targetRole ?? "").trim() || null;

  if (!base64Data) {
    return NextResponse.json(
      { error: "הקובץ ריק או לא ניתן לפענוח." },
      { status: 400 },
    );
  }

  // File-size guard (very rough — base64 is ~1.37× the byte length).
  // Hard cap at ~6MB raw to keep Gemini happy and the request body small.
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 6 * 1024 * 1024) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מקסימום 6MB). נסה PDF דחוס יותר." },
      { status: 413 },
    );
  }

  // Hash the bytes to drive the cache. We hash the decoded buffer so a
  // re-encoded base64 of the same file resolves to the same key.
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64Data, "base64");
    if (bytes.length === 0) throw new Error("empty");
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לקרוא את הקובץ. נסה להעלות PDF או Word פשוט יותר." },
      { status: 400 },
    );
  }

  const contentHash = sha256Hex(bytes);

  // Cache hit? Return immediately. The DB unique index on (userId,
  // contentHash) keeps this O(1).
  const cached = await prisma.cvFeedback.findFirst({
    where: { userId, contentHash },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    try {
      const parsed = JSON.parse(cached.result);
      if (isCvFeedbackResult(parsed)) {
        return NextResponse.json({ result: parsed, cached: true, fileName: cached.fileName });
      }
    } catch {
      // fall through and re-analyze if the cached row is corrupted
    }
  }

  // Cache miss — call Gemini.
  let parsed: unknown;
  try {
    parsed = await callGemini(base64Data, mimeType, userMessage(targetRole));
  } catch (e) {
    console.error("[cv-feedback] gemini failed:", e);
    return NextResponse.json(
      { error: "הניתוח התעכב. נסה שוב בעוד רגע." },
      { status: 504 },
    );
  }

  if (!isCvFeedbackResult(parsed)) {
    console.error("[cv-feedback] gemini returned unexpected shape:", parsed);
    return NextResponse.json(
      { error: "לא הצלחנו לפענח את התוצאה. נסה שוב." },
      { status: 502 },
    );
  }

  // Persist (upsert by unique key — re-uploads of the same file now
  // resolve from cache on the next call).
  const result: CvFeedbackResult = parsed;
  await prisma.cvFeedback.upsert({
    where: { userId_contentHash: { userId, contentHash } },
    create: { userId, contentHash, fileName, result: JSON.stringify(result) },
    update: { fileName, result: JSON.stringify(result), createdAt: new Date() },
  });

  return NextResponse.json({ result, cached: false, fileName });
}
