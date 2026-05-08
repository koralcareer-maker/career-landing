import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractCvText } from "@/lib/cv-extract";

/**
 * CV upload + analysis. Three-stage pipeline:
 *
 *   1. Native extraction (mammoth for DOCX, pdf-parse for PDF) handles
 *      ~95% of normal CVs in <1s, completely free.
 *   2. AI vision fallback (Gemini multimodal) rescues image-only PDFs
 *      and weird formats that native parsers miss.
 *   3. AI analysis (Gemini text mode) runs the structured-feedback
 *      prompt against whatever text we got out.
 *
 * Stage 3 is run regardless of which extraction stage succeeded,
 * because the analysis prompt is what produces the JSON the UI
 * expects.
 *
 * Uses Node runtime (not Edge) so we can use Buffer + mammoth +
 * pdf-parse, and so we get the longer Vercel function timeout
 * (default 60s on hobby/pro).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_KEY = () => (process.env.GEMINI_API_KEY ?? "").trim();

const ANALYSIS_PROMPT = `את מגייסת בכירה בישראל עם 15+ שנות ניסיון, סקרת אלפי קורות חיים. את ביקורתית, מחמירה, ומסרבת לעבור על פגמים.

⚠️ שלב 0 — זיהוי האם זה בכלל קורות חיים:

לפני כל ניתוח, בדקי האם הטקסט שלפניך הוא באמת קורות חיים מקצועיים:
- האם יש סעיפי CV מובהקים (ניסיון תעסוקתי, השכלה, מיומנויות)?
- האם יש שמות חברות + תפקידים + תאריכים?
- האם יש פרטי קשר (טלפון/מייל/לינקדאין)?

אם הקובץ הוא לא קורות חיים — חשבונית, חוזה, מסמך משפטי, מצגת, תמונה ריקה, הודעה אישית, חוברת, כל דבר אחר — אסור לתת ציון. החזירי במקום זאת:
{
  "isNotCv": true,
  "currentRole": "—",
  "targetRole": "—",
  "yearsExperience": 0,
  "strengths": [],
  "skillGaps": [],
  "marketSkills": [],
  "cvFeedback": ["הקובץ שהועלה לא נראה כקורות חיים. נסי להעלות קובץ קורות חיים מקצועי."],
  "summary": "הקובץ לא זוהה כקורות חיים מקצועיים.",
  "atsLevel": "red",
  "atsReasons": ["הקובץ לא נראה כקורות חיים", "אין מבנה מקצועי של CV"]
}

⚠️ שלב 1 — אם זה כן קורות חיים, נתחי אותו (כל שאר ההוראות מטה):

ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים):
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש בהתבסס על הרקע",
  "yearsExperience": <מספר שנות ניסיון כולל>,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער 1", "פער 2", "פער 3", "פער 4"],
  "marketSkills": ["מיומנות חמה 1 שמעסיקים מחפשים עכשיו", "מיומנות 2", "מיומנות 3"],
  "cvFeedback": ["פידבק ספציפי 1 לשיפור קורות החיים","פידבק 2","פידבק 3","פידבק 4","פידבק 5"],
  "summary": "סיכום פרופיל מקצועי בעברית — 2 משפטים",
  "atsLevel": "green" | "yellow" | "red",
  "atsReasons": ["סיבה קצרה 1", "סיבה קצרה 2"]
}

הוראות:
- חוזקות: מה בולט ומוכח בקו"ח.
- פערים: מה חסר להפוך למועמד תחרותי.
- marketSkills: מיומנויות חמות בשוק 2025 לתפקיד זה.
- cvFeedback: 5 עצות פרקטיות וקונקרטיות לשיפור.

⚠️ דירוג atsLevel — קריטריונים מחמירים:

"green" (5-10% מהקו"ח בלבד — שמור רק לקו"ח באיכות גבוהה במיוחד) חייב לעמוד ב-כל-הקריטריונים:
✓ הישגים מספריים/אחוזיים מוכחים בכל תפקיד עיקרי ("חיסכון של X%", "ניהול תקציב של Y₪")
✓ פסקת תקציר מקצועית מובהקת בראש הקובץ (3-5 שורות)
✓ תאריכי עבודה מדויקים ומלאים (חודש + שנה) בכל ניסיון
✓ מבנה ברור עם כותרות סטנדרטיות (ניסיון תעסוקתי / השכלה / מיומנויות)
✓ שמות חברות וכותרות תפקיד ספציפיים וברורים
✓ מילות מפתח מקצועיות חזקות שתואמות את תפקיד היעד
✓ אורך תוכן הולם (1-2 עמודים, לא חצי עמוד)
✓ ללא שגיאות כתיב או דקדוק

"yellow" (רוב הקו"ח — ~60%): מבנה בסיסי תקין אבל חסר משהו משמעותי:
- חסרים הישגים כמותיים מוכחים, או
- אין פסקת תקציר מקצועי, או
- תיאורי תפקיד כלליים בלי ייחוד, או
- מילות מפתח חלשות לתחום היעד, או
- היעדר ציון תוצאות עסקיות

"red" (~30% מהקו"ח — אם אחד מאלה קורה): סיכון גבוה לא להגיע לראיון:
- תיאורי תפקיד גנריים בלבד ("השתתפתי", "עזרתי", "ביצעתי", בלי תוצאה)
- אין הישגים כמותיים בכלל בקובץ
- חוסר בהירות לגבי תפקיד היעד / מיקוד מקצועי
- מבנה לא ברור או חסרות כותרות סטנדרטיות
- תוכן קצר מדי או שטחי (פחות מעמוד, או חצי עמוד עם פיסקה אחת)
- שגיאות כתיב/דקדוק/תרגום
- חסרים תאריכים או לא ברורים
- מבנה ויזואלי בעייתי (טבלאות מורכבות, עמודות, גרפיקה)

חוק ברזל: היות מחמירה. אם יש ספק בין "ירוק" ל-"צהוב" — תני "צהוב". אם יש ספק בין "צהוב" ל-"אדום" — תני "אדום". זה לא מקצועי לתת לקו"ח גרועים ציון טוב — זה גורם להם לא להבין למה הם לא מקבלים ראיונות.

atsReasons: 2 סיבות ספציפיות מהקובץ עצמו — מה חסר/חזק (עד 12 מילים כל סיבה). בעברית פשוטה.

החזר JSON בלבד.`;

const VISION_EXTRACTION_PROMPT = `קרא את הטקסט המלא בקובץ קורות החיים המצורף וצא אותו בלבד. אם הקובץ הוא PDF סרוק או תמונה, חלץ טקסט באמצעות OCR. אל תוסיף הקדמות או הסברים — רק את הטקסט המלא, מסודר לפי הסדר שמופיע בקובץ.`;

async function callGemini(prompt: string, fileBuf?: Buffer, mime?: string): Promise<string> {
  const parts: Array<Record<string, unknown>> = [];
  if (fileBuf && mime) {
    parts.push({ inline_data: { mime_type: mime, data: fileBuf.toString("base64") } });
  }
  parts.push({ text: prompt });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`gemini http ${r.status}: ${err.slice(0, 300)}`);
  }
  const data = await r.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };
  if (data.error) throw new Error(`gemini api: ${data.error.message}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

export async function POST(req: NextRequest) {
  // Use auth() — NextAuth v5's canonical session reader. The previous
  // getToken() call was an Edge-runtime workaround that doesn't see
  // v5's session cookie under the same name in Node runtime, which is
  // why customers saw "נדרשת כניסה" right after my Edge → Node move.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  void req; // not used in Node runtime — auth() reads cookies internally

  if (!GEMINI_KEY()) {
    console.error("[analyze-cv] GEMINI_API_KEY missing");
    return NextResponse.json(
      { error: "ניתוח קורות חיים לא זמין כרגע (חסרה הגדרה אצל המנהל). פני לקורל." },
      { status: 503 },
    );
  }

  let base64Data = "";
  let mimeType = "";
  let fileName = "cv";
  try {
    const body = await req.json() as { base64Data: string; mimeType: string; fileName?: string };
    base64Data = body.base64Data ?? "";
    mimeType = body.mimeType ?? "";
    fileName = body.fileName ?? "cv";
    if (!base64Data) throw new Error("missing base64Data");
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו לקרוא את הקובץ. נסי להעלות PDF או Word פשוט יותר." },
      { status: 400 },
    );
  }

  // 10MB raw cap — generous, since native extraction is fast and
  // bandwidth from the user's browser is the main constraint.
  const approxBytes = (base64Data.length * 3) / 4;
  if (approxBytes > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "הקובץ גדול מדי (מעל 10MB). שמרי כ-PDF דחוס או הסירי תמונות." },
      { status: 413 },
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(base64Data, "base64");
    if (buf.length === 0) throw new Error("empty");
  } catch {
    return NextResponse.json(
      { error: "הקובץ פגום או ריק. נסי קובץ אחר." },
      { status: 400 },
    );
  }

  // === Stage 1+2: extract text ===
  // Native first; if the file is a scanned/image PDF we call Gemini
  // multimodal as the AI vision fallback. The extractor never throws.
  const extracted = await extractCvText(buf, fileName, {
    aiVisionExtract: async (b, m) => callGemini(VISION_EXTRACTION_PROMPT, b, m),
  });

  // Per Coral: PDF is ALWAYS scanned. Never tell the user "we couldn't
  // read your file" — the file IS the file, the result is the score.
  // If extraction came back empty/poor, that's itself a signal to
  // recruiters and ATS that the CV is unreadable → return synthetic
  // RED result instead of blocking with a 422.
  if (!extracted.text || extracted.text.length < 30) {
    const tooLittleText: Record<string, unknown> = {
      currentRole: "—",
      targetRole:  "—",
      yearsExperience: 0,
      strengths: [],
      skillGaps: [],
      marketSkills: [],
      cvFeedback: [
        "הקובץ קשה לקריאה אוטומטית — מערכות ATS לא יוכלו לעבד אותו",
        "אם זה PDF סרוק/מצולם — צרי גרסת PDF דיגיטלית מתוך Word",
        "אם זה PDF עם הצפנה/הגנת סיסמה — שמרי גרסה ללא הגנות",
        "וודאי שהטקסט בקובץ ניתן לבחירה ולהעתקה (סימן לקריאות)",
        "במקרה הקיצון — הקלידי את הקורות חיים ב-Word ושמרי שוב כ-PDF",
      ],
      summary: "הקובץ קיים אבל הטקסט לא ניתן לחילוץ אוטומטי — מערכות ATS יתקשו או יתעלמו.",
      atsLevel: "red",
      atsReasons: [
        "המערכת לא הצליחה לחלץ טקסט קריא מהקובץ",
        "מערכות ATS אוטומטיות יתקלו באותה בעיה",
      ],
      _extraction: {
        source: extracted.source,
        format: extracted.format,
        usedFallback: extracted.usedFallback,
        textLength: extracted.text.length,
        warning: extracted.warning ?? "טקסט לא חולץ — סקירה מבוססת על קריאות אוטומטית בלבד",
      },
    };
    return NextResponse.json(tooLittleText);
  }

  // === Stage 3: structured analysis on the extracted text ===
  // Pull the user's target role + years experience from their profile
  // so the recruiter prompt scores AGAINST a real target instead of
  // guessing one. Strict scoring needs role context to grade keyword
  // alignment / market relevance honestly.
  let userTargetRole = "";
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { targetRole: true, desiredField: true },
    });
    userTargetRole = profile?.targetRole?.trim() || "";
    if (!userTargetRole && profile?.desiredField) {
      userTargetRole = `תחום: ${profile.desiredField}`;
    }
  } catch {
    /* ignore — analysis still works without target context */
  }

  const targetContext = userTargetRole
    ? `\n\n📍 תפקיד היעד שהמשתמשת ציינה ב-onboarding: "${userTargetRole}". התאימי את הסקירה לתפקיד הזה — מה רלוונטי, מה חסר, מה לא בקו"ח שמגייס/ת לתפקיד זה היה מצפה לראות.`
    : `\n\nהמשתמשת לא ציינה תפקיד יעד ספציפי. הסיקי את התפקיד הסביר ביותר לפי הקו"ח עצמו וסקרי כאילו זה היעד.`;

  let analysisText = "";
  try {
    analysisText = await callGemini(`${ANALYSIS_PROMPT}${targetContext}\n\n--- קורות חיים ---\n${extracted.text}`);
  } catch (e) {
    console.error("[analyze-cv] analysis failed:", e);
    return NextResponse.json(
      { error: "הניתוח התעכב או נכשל. נסי שוב בעוד רגע." },
      { status: 502 },
    );
  }

  const cleaned = analysisText.replace(/```json\n?|\n?```/g, "").trim();
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    console.error("[analyze-cv] failed to parse Gemini JSON:", cleaned.slice(0, 300));
    return NextResponse.json(
      { error: "הניתוח חזר בפורמט לא תקין. נסי שוב." },
      { status: 502 },
    );
  }

  // If Gemini detected the file isn't a CV at all (invoice / contract
  // / random PDF / blank file etc.), trust that classification — don't
  // run the format-based override on top, the existing reasons explain
  // the real problem.
  const isNotCv = result.isNotCv === true;

  // Per Coral's ATS-grade direction: any non-PDF upload (Word, RTF,
  // image, etc.) gets an automatic red ATS rating. Skipped when the
  // file isn't a CV — that case has its own (worse) explanation.
  if (extracted.format !== "pdf" && !isNotCv) {
    result.atsLevel = "red";
    result.atsReasons = [
      "פורמט הקובץ אינו PDF — חלק ממערכות ATS לא יקראו אותו נקי",
      "מומלץ לשמור מחדש כ-PDF לפני שליחה למשרה",
    ];
  }

  // Surface the extraction telemetry alongside the result so the UI
  // (and future debugging) can see whether we used the fast path or
  // had to fall back. Doesn't affect existing consumers.
  return NextResponse.json({
    ...result,
    _extraction: {
      source: extracted.source,
      format: extracted.format,
      usedFallback: extracted.usedFallback,
      textLength: extracted.text.length,
      warning: extracted.warning ?? null,
      atsOverridden: extracted.format !== "pdf",
    },
  });
}
