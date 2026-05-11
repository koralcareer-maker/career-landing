"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * AI-powered per-application analysis. Three deliverables in one
 * model call so the user can act on all of them without context-
 * switching:
 *
 *   1. follow-up message — ready-to-send, 3-4 lines
 *   2. CV improvements   — concrete bullets to tweak for THIS job
 *   3. next action       — single most-impactful step right now
 *
 * Uses Gemini (same provider as /coaching). The model gets the
 * member's profile + passport + the application row + journal
 * entries so its suggestions can reference real details from
 * their actual context, not generic advice.
 *
 * Result is gender-aware via the user's stored gender field; if
 * gender is unknown we default to feminine to match brand voice.
 */

export type ApplicationAnalysisStatus = "ok" | "missing_key" | "error";

export interface ApplicationAnalysis {
  status: ApplicationAnalysisStatus;
  /** Raw error message — shown to user when status !== "ok". */
  message?: string;
  /** Three structured sections; empty arrays if model didn't return them. */
  followupMessage?: string;
  cvSuggestions?: string[];
  nextAction?: string;
  /** ISO timestamp when generated. */
  generatedAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  SAVED: "נשמרה",
  FIT_CHECKED: "נבדקה התאמה",
  APPLIED: "הוגשה",
  PROACTIVE_OUTREACH: "פנייה יזומה",
  FOLLOWUP_SENT: "Follow-up נשלח",
  INTERVIEW_SCHEDULED: "ראיון נקבע",
  FIRST_INTERVIEW: "ראיון ראשון",
  ADVANCED_INTERVIEW: "ראיון מתקדם",
  TASK_HOME: "משימת בית",
  OFFER: "הצעה",
  REJECTED: "נדחתה",
  FROZEN: "מוקפאת",
};

function fmtField(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ") || "—";
  } catch {
    // not JSON — fall through and return raw
  }
  return value;
}

export async function analyzeApplication(applicationId: string): Promise<ApplicationAnalysis> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "לא מחובר/ת" };
  }
  const userId = session.user.id;

  if (!process.env.GEMINI_API_KEY) {
    return {
      status: "missing_key",
      message: "ה-AI אינו זמין כרגע — חסר מפתח. פני למנהלת המערכת.",
    };
  }

  // ─── Pull all the context the model needs in parallel ─────────────────
  const [app, profile, passport, journal] = await Promise.all([
    prisma.jobApplication.findUnique({ where: { id: applicationId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.jobApplicationJournalEntry.findMany({
      where: { applicationId },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
  ]);

  if (!app || app.userId !== userId) {
    return { status: "error", message: "המועמדות לא נמצאה" };
  }

  const isM = session.user.gender === "m";
  const tone = isM
    ? "פנה אל המשתמש בלשון זכר (אתה / שלך). השתמש בפעלים בזכר (תשלח, תוכל, כתבת)."
    : "פני אל המשתמשת בלשון נקבה (את / שלך). השתמשי בפעלים בנקבה (תשלחי, תוכלי, כתבת).";

  const userBlock = `
=== המשתמש ===
שם: ${session.user.name ?? "—"}
מגדר: ${isM ? "זכר" : "נקבה"}
תפקיד יעד: ${profile?.targetRole ?? "—"}
תפקיד נוכחי / רקע: ${profile?.currentRole ?? "—"}
שנות ניסיון: ${profile?.yearsExperience ?? "—"}
חוזקות עיקריות: ${fmtField(profile?.strengths)}
מיומנויות חסרות: ${fmtField(profile?.missingSkills)}
מטרת מעבר: ${profile?.careerTransitionGoal ?? "—"}
אתגר עיקרי: ${profile?.mainChallenge ?? "—"}
${passport?.summary ? `\n--- סיכום דרכון קריירה ---\n${passport.summary}` : ""}
`.trim();

  const journalText = journal.length > 0
    ? journal
        .map((j, i) => {
          const date = j.occurredAt.toLocaleDateString("he-IL");
          const tag = j.tag ? ` [${j.tag}]` : "";
          return `(${i + 1}) ${date}${tag}: ${j.text}`;
        })
        .join("\n")
    : "—";

  const appBlock = `
=== המועמדות שצריך לנתח ===
חברה: ${app.company}
תפקיד: ${app.role}
מקור: ${app.source ?? "—"}
סטטוס נוכחי: ${STATUS_LABELS[app.status] ?? app.status}
תאריך הגשה: ${app.dateApplied ? app.dateApplied.toLocaleDateString("he-IL") : "טרם הוגש"}
תאריך עדכון אחרון: ${app.updatedAt.toLocaleDateString("he-IL")}
ראיון מתוזמן: ${app.interviewDate ? app.interviewDate.toLocaleDateString("he-IL") : "—"}
Follow-up מתוזמן: ${app.nextFollowUp ? app.nextFollowUp.toLocaleDateString("he-IL") : "—"}
צעד הבא שתועד: ${app.nextStep ?? "—"}
הערות: ${app.notes ?? "—"}
${app.jobLink ? `קישור למשרה: ${app.jobLink}` : ""}

--- יומן (6 אירועים אחרונים) ---
${journalText}
`.trim();

  const prompt = `${userBlock}

${appBlock}

המשימה שלך: לתת ניתוח קצר ומעשי של המועמדות הזו, מותאם אישית למשתמש לפי הפרופיל למעלה. ${tone}

הוצא JSON בלבד (בלי טקסט מסביב, בלי \`\`\`json), עם המבנה הבא בדיוק:

{
  "followupMessage": "טקסט מוכן לשליחה (3-4 שורות, עברית, ידידותי-מקצועי, מותאם לסטטוס הנוכחי). אם הסטטוס ׳נדחתה׳ או ׳מוקפאת׳ — החזר מחרוזת ריקה.",
  "cvSuggestions": ["3-5 בולטים מאוד ספציפיים — מה לשנות/להדגיש בקו״ח דווקא בשביל המשרה הזו, מבוסס על תפקיד היעד וחוזקות המשתמש"],
  "nextAction": "המהלך היחיד הכי חשוב לעשות עכשיו על המועמדות הזו (משפט אחד, אקשנבילי, גם אומר מתי)"
}

כללי כתיבה:
- אישי, לא גנרי. לצטט פרטים אמיתיים (חברה, תפקיד, חוזקות, יומן).
- ${tone}
- אם אין מספיק מידע (למשל סטטוס SAVED ללא הגשה) — תייצר נכון: followupMessage ריק, nextAction = "הגש/י" או "סגור/י החלטה".
- אם הסטטוס OFFER — followupMessage = שאלות הבהרה לפני קבלה; nextAction = משא ומתן או החלטה.
`;

  // ─── Call Gemini (same model the coaching feature uses) ───────────────
  let raw: string;
  let finishReason: string | undefined;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          // 1024 was getting cut off mid-JSON for longer applications with
          // a busy journal — bump well above the worst-case payload.
          maxOutputTokens: 2500,
          temperature: 0.4,
          responseMimeType: "application/json",
          // responseSchema enforces shape on the model side so we don't
          // have to repair freeform output. Cheaper + more reliable than
          // prompt-only JSON contracts.
          responseSchema: {
            type: "object",
            properties: {
              followupMessage: { type: "string" },
              cvSuggestions: { type: "array", items: { type: "string" } },
              nextAction: { type: "string" },
            },
            required: ["followupMessage", "cvSuggestions", "nextAction"],
          },
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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      error?: { message: string };
      promptFeedback?: { blockReason?: string };
    };
    if (data.error) {
      console.error("[analyzeApplication] Gemini error:", data.error.message);
      return { status: "error", message: "אירעה שגיאה זמנית. נסי שוב בעוד רגע." };
    }
    if (data.promptFeedback?.blockReason) {
      console.error("[analyzeApplication] prompt blocked:", data.promptFeedback.blockReason);
      return { status: "error", message: "התוכן נחסם על ידי המסנן. נסי שוב." };
    }
    finishReason = data.candidates?.[0]?.finishReason;
    raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (err) {
    console.error("[analyzeApplication] fetch error:", err);
    return { status: "error", message: "שגיאת רשת. בדקי חיבור ונסי שוב." };
  }

  if (!raw) {
    console.error("[analyzeApplication] empty response. finishReason:", finishReason);
    return { status: "error", message: "לא התקבלה תשובה. נסי שוב." };
  }

  // ─── Parse the JSON the model returned ────────────────────────────────
  // Even with responseSchema + responseMimeType, the model can still wrap
  // output in ```json fences, prepend chatter, or truncate when the response
  // hits a token limit. Try the lenient path before giving up.
  let parsed: { followupMessage?: string; cvSuggestions?: string[]; nextAction?: string } | null = null;

  // 1) try as-is.
  try {
    parsed = JSON.parse(raw);
  } catch { /* fall through */ }

  // 2) strip fences anywhere, find the first { ... } block, parse that.
  if (!parsed) {
    const stripped = raw.replace(/```(?:json)?/gi, "").trim();
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = stripped.slice(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(slice);
      } catch { /* fall through */ }
    }
  }

  if (!parsed) {
    console.error("[analyzeApplication] failed to parse JSON. finishReason:", finishReason, "raw:", raw.slice(0, 500));
    const msg =
      finishReason === "MAX_TOKENS"
        ? "התשובה הייתה ארוכה מדי. נסי שוב — היא אמורה להתקצר."
        : "התשובה התקבלה במבנה לא צפוי. נסי שוב.";
    return { status: "error", message: msg };
  }

  return {
    status: "ok",
    followupMessage: typeof parsed.followupMessage === "string" ? parsed.followupMessage.trim() : "",
    cvSuggestions: Array.isArray(parsed.cvSuggestions)
      ? parsed.cvSuggestions.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [],
    nextAction: typeof parsed.nextAction === "string" ? parsed.nextAction.trim() : "",
    generatedAt: new Date().toISOString(),
  };
}
