import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge runtime: 30-second timeout vs 10s for serverless
// Needed because Gemini PDF analysis typically takes 10-25 seconds
export const runtime = "edge";

const GEMINI_KEY = () => process.env.GEMINI_API_KEY ?? "";

const PROMPT = `אתה מומחה גיוס ומיתוג מקצועי ישראלי עם ניסיון רב. אתה מנתח את קורות החיים המצורפים.

ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים):
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש בהתבסס על הרקע",
  "yearsExperience": <מספר שנות ניסיון כולל>,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער 1", "פער 2", "פער 3", "פער 4"],
  "marketSkills": ["מיומנות חמה 1 שמעסיקים מחפשים עכשיו", "מיומנות 2", "מיומנות 3"],
  "cvFeedback": [
    "פידבק ספציפי 1 לשיפור קורות החיים",
    "פידבק 2",
    "פידבק 3",
    "פידבק 4",
    "פידבק 5"
  ],
  "summary": "סיכום פרופיל מקצועי בעברית — 2 משפטים"
}

חוזקות: מה בולט ומוכח בקורות החיים.
פערים: מה חסר להפוך למועמד תחרותי יותר.
marketSkills: מיומנויות שחמות בשוק העכשווי לתפקיד זה (2025).
cvFeedback: עצות ספציפיות ופרקטיות — כל פריט = פעולה אחת ברורה.
החזר JSON בלבד.`;

export async function POST(req: NextRequest) {
  // Use getToken (edge-safe JWT check) instead of auth() which uses PrismaAdapter
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const token = await getToken({ req, secret });
  if (!token) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }

  // Hard error when the AI key is missing instead of returning fake
  // data dressed as success — that path used to silently lie to the
  // user and was almost certainly the source of 'CV upload doesn't
  // work' reports.
  if (!GEMINI_KEY()) {
    console.error("[analyze-cv] GEMINI_API_KEY missing");
    return NextResponse.json(
      { error: "ניתוח קורות חיים לא זמין כרגע (חסרה הגדרה אצל המנהל). פני לקורל." },
      { status: 503 },
    );
  }

  let base64Data: string;
  let mimeType: string;
  try {
    const body = await req.json() as { base64Data: string; mimeType: string };
    base64Data = body.base64Data;
    mimeType   = body.mimeType;
    if (!base64Data) throw new Error("missing base64Data");
  } catch {
    return NextResponse.json({ error: "לא הצלחנו לקרוא את הקובץ. נסי להעלות PDF או Word פשוט יותר." }, { status: 400 });
  }

  // Size guard — base64 is ~1.37× the byte length, hard cap at ~6MB
  // raw to keep Gemini happy and avoid Vercel body-size rejections.
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 6 * 1024 * 1024) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מעל 6MB). שמרי כ-PDF דחוס או הסירי תמונות." },
      { status: 413 },
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: PROMPT },
            ],
          }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
        }),
      }
    );

    const data = await res.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
      error?: { message: string };
    };

    if (!res.ok || data.error) {
      const detail = data.error?.message ?? `HTTP ${res.status}`;
      console.error("[analyze-cv] Gemini rejected:", detail);
      // Surface a friendly Hebrew error to the user with the underlying
      // detail truncated, so support can see the cause without exposing
      // raw API errors in the UI.
      return NextResponse.json(
        { error: "הניתוח נכשל מול שירות ה-AI. נסי שוב בעוד רגע. אם הבעיה ממשיכה, פני לקורל.", detail: detail.slice(0, 200) },
        { status: 502 },
      );
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!raw.trim()) {
      console.error("[analyze-cv] empty Gemini response", data);
      return NextResponse.json(
        { error: "לא הצלחנו לפענח את הקובץ. נסי PDF פשוט יותר (בלי טבלאות מורכבות / תמונות)." },
        { status: 502 },
      );
    }
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    let result: unknown;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error("[analyze-cv] failed to parse Gemini JSON:", clean.slice(0, 300));
      return NextResponse.json(
        { error: "הניתוח חזר בפורמט לא תקין. נסי שוב." },
        { status: 502 },
      );
    }
    return NextResponse.json(result);

  } catch (e) {
    console.error("[analyze-cv] edge error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "הניתוח התעכב או נכשל ברשת. נסי שוב.", detail: msg.slice(0, 200) },
      { status: 504 },
    );
  }
}
