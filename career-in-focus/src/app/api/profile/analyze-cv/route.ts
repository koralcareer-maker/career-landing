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

  if (!GEMINI_KEY()) {
    return NextResponse.json({
      currentRole: "לא זוהה",
      targetRole: "לא זוהה",
      yearsExperience: 0,
      strengths: ["ניסיון מקצועי", "עבודת צוות", "יוזמה"],
      skillGaps: ["אנגלית מקצועית", "ניהול פרויקטים", "כלים דיגיטליים"],
      marketSkills: ["Excel מתקדם", "Python בסיס", "ניהול נתונים"],
      cvFeedback: ["הוסף נתונים כמותיים לכל הישג", "הוסף מילות מפתח רלוונטיות"],
      summary: "GEMINI_API_KEY לא מוגדר — הוסף אותו ב-Vercel Environment Variables",
    });
  }

  let base64Data: string;
  let mimeType: string;
  try {
    const body = await req.json() as { base64Data: string; mimeType: string };
    base64Data = body.base64Data;
    mimeType   = body.mimeType;
    if (!base64Data) throw new Error("missing base64Data");
  } catch {
    return NextResponse.json({ error: "גוף הבקשה שגוי" }, { status: 400 });
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

    if (data.error) {
      console.error("Gemini error:", data.error.message);
      return NextResponse.json({ error: `Gemini: ${data.error.message}` }, { status: 500 });
    }

    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);

  } catch (e) {
    console.error("analyze-cv edge error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `ניתוח נכשל: ${msg.slice(0, 200)}` }, { status: 500 });
  }
}
