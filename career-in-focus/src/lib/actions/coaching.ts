"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReadinessScore } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type Message = { role: "user" | "assistant"; content: string };

// ─── Build rich context about the user for Claude ─────────────────────────────

/**
 * Pretty-print a possibly-JSON-array string field. Many of the questionnaire
 * fields store either a single string or a JSON-encoded array — show them
 * the same way to the model.
 */
function fmtField(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ") || "—";
  } catch {
    // not JSON — fall through and return the raw string
  }
  return value;
}

/** Translate JobApplication.status enum codes to Hebrew labels. */
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    APPLIED: "הוגשה מועמדות",
    FOLLOWUP_SENT: "נשלח follow-up",
    INTERVIEW_SCHEDULED: "ראיון נקבע",
    INTERVIEWED: "התראיינה",
    OFFER: "קיבלה הצעה",
    REJECTED: "נדחתה",
    WITHDRAWN: "נסוגה",
    HIRED: "התקבלה",
  };
  return map[status] ?? status;
}

async function buildUserContext(userId: string) {
  const [profile, passport, apps, events, user] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.jobApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.event.findMany({ where: { isPublished: true, startAt: { gte: new Date() } }, take: 3 }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, createdAt: true } }),
  ]);

  const readiness = profile ? getReadinessScore(profile) : 0;
  const statusCounts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const daysSinceJoin = user?.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000)
    : 0;

  // Most recent 5 applications, with company / role / status / notes — gives
  // the coach concrete grounding to reference rather than just totals.
  const recentApps = apps.slice(0, 5).map((a) => {
    const lines = [`• ${a.role} ב-${a.company} — ${statusLabel(a.status)}`];
    if (a.dateApplied) {
      lines.push(`  הוגשה ב-${new Date(a.dateApplied).toLocaleDateString("he-IL")}`);
    }
    if (a.interviewStage) lines.push(`  שלב ראיון: ${a.interviewStage}`);
    if (a.notes) lines.push(`  הערות: ${a.notes.slice(0, 200)}`);
    return lines.join("\n");
  }).join("\n");

  return `
=== פרופיל המשתמשת ===
שם: ${user?.name ?? "לא ידוע"}
ימים מאז ההצטרפות: ${daysSinceJoin}
ניקוד השלמת פרופיל: ${readiness}%
קורות חיים: ${profile?.resumeUrl ? "✅ הועלו" : "❌ חסרים"}
לינקדאין: ${profile?.linkedinUrl ? "✅ הוזן" : "❌ חסר"}
דרכון קריירה: ${passport ? `✅ נוצר (ציון התאמה ${passport.jobMatchScore}%)` : "❌ עדיין לא נוצר"}
שאלון: ${profile?.questionnaireCompleted ? "✅ הושלם" : "❌ עוד לא הושלם"}

=== מסלול הקריירה ===
תפקיד נוכחי: ${profile?.currentRole ?? "לא הוגדר"}
תפקיד יעד: ${profile?.targetRole ?? "לא הוגדר"}
שנות ניסיון: ${profile?.yearsExperience ?? 0}
תחום מבוקש: ${profile?.desiredField ?? "לא הוגדר"}
מטרה במעבר: ${profile?.careerTransitionGoal ?? "לא הוגדרה"}
האתגר העיקרי: ${profile?.mainChallenge ?? "לא הוגדר"}
חוזקות שציינה: ${fmtField(profile?.strengths)}
פערים שציינה: ${fmtField(profile?.missingSkills)}

=== העדפות תעסוקה ===
שכר רצוי: ${profile?.preferredSalaryMin ?? "—"} עד ${profile?.preferredSalaryMax ?? "—"}
סוג חברה מועדף: ${profile?.preferredCompanyType ?? "לא הוגדר"}
גמישות גיאוגרפית: ${profile?.q_locationFlexible === true ? "כן" : profile?.q_locationFlexible === false ? "לא" : "לא ידוע"}
העדפת רימוט: ${profile?.q_remotePreference ?? "לא הוגדרה"}

=== שאלון 16 שאלות (תובנות עומק) ===
סגנון עבודה: ${profile?.q_workStyle ?? "—"}
עבודה בצוות / לבד: ${profile?.q_teamOrSolo ?? "—"}
מוטיבטורים: ${fmtField(profile?.q_motivators)}
הפחד הכי גדול: ${profile?.q_biggestFear ?? "—"}
היום האידיאלי בעבודה: ${profile?.q_idealDay ?? "—"}
הצלחה בעבר שאת גאה בה: ${profile?.q_pastAchievement ?? "—"}
סגנון למידה: ${profile?.q_learningStyle ?? "—"}
מטרת קצר טווח: ${profile?.q_shortTermGoal ?? "—"}
מטרת ארוך טווח: ${profile?.q_longTermGoal ?? "—"}
רמת נטוורקינג: ${profile?.q_networkingLevel ?? "—"}
חשיבות שכר: ${profile?.q_salaryPriority ?? "—"}
תחומי עניין: ${fmtField(profile?.q_industryInterests)}
דמויות מקצועיות מעוררות השראה: ${profile?.q_roleModels ?? "—"}
ערכים בעבודה: ${fmtField(profile?.q_valuesAtWork)}

=== דרכון הקריירה (תובנות AI) ===
${passport ? `ציון התאמה: ${passport.jobMatchScore}%
חוזקות (ע"פ AI): ${fmtField(passport.strengths)}
פערים (ע"פ AI): ${fmtField(passport.skillGaps)}
תפקידים מתאימים: ${fmtField(passport.likelyFitRoles)}
תחומים מומלצים: ${fmtField(passport.recommendedIndustries)}
המלצות פעולה הבאה: ${fmtField(passport.nextBestActions)}
${passport.summary ? `סיכום: ${passport.summary}` : ""}` : "עדיין לא נוצר — מומלץ לעודד את המשתמשת ליצור אותו דרך /guide."}

=== מצב חיפוש עבודה ===
סה"כ הגשות: ${apps.length}
פילוח: ${Object.entries(statusCounts).map(([s, n]) => `${statusLabel(s)}: ${n}`).join(" | ") || "—"}
${recentApps ? `\n5 הגשות אחרונות:\n${recentApps}` : ""}

=== אירועים קרובים ===
${events.map(e => `• ${e.title} — ${new Date(e.startAt).toLocaleDateString("he-IL")}`).join("\n") || "אין"}

=== הנחיות שימוש בקונטקסט הזה ===
- השתמשי במידע הזה כדי להפנות לפרטים ספציפיים מהקריירה של המשתמשת (למשל "ראיתי שהמטרה ארוכת הטווח שלך היא X").
- אל תזכירי שדות שמסומנים — או "לא הוגדר" — כי זו תהיה הצפה. אם נתון חיוני חסר, עודדי בעדינות להשלים אותו ב-/profile או ב-/guide.
- אם המשתמשת שאלה על מצב מסוים (למשל "האם להגיש?") — תמיד שילבי תוך התייחסות ל-targetRole, החוזקות מהדרכון, וההעדפות שלה.
- אם יש סתירות בין הצהרות המשתמשת לבין הנתונים בפרופיל — הני לטובתה את ההצהרה האחרונה בצ'אט.
`.trim();
}

// ─── Generate AI coaching response (Google Gemini) ───────────────────────────

async function callClaude(messages: Message[], systemPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "המאמן AI אינו זמין כרגע. אנא פני למנהלת המערכת.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  // Gemini requires strict alternating user/model turns, starting with "user"
  // Filter and fix the message sequence
  const rawContents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content || "..." }],
  }));

  // Ensure conversation starts with "user" and alternates properly
  const contents: typeof rawContents = [];
  let expectedRole: "user" | "model" = "user";
  for (const msg of rawContents) {
    if (msg.role === expectedRole) {
      contents.push(msg);
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
    // Skip messages that break the alternating pattern
  }
  // Must end with user turn
  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    return "אירעה שגיאה בעיבוד השיחה. נסי שנית.";
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
      error?: { message: string };
    };

    if (data.error) {
      console.error("Gemini API error:", data.error.message);
      return "אירעה שגיאה זמנית במאמן ה-AI. נסי שנית בעוד רגע.";
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "לא התקבלה תשובה. נסי שנית.";
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return "אירעה שגיאת רשת. נסי שנית.";
  }
}

// ─── Get or create coaching session ──────────────────────────────────────────

export async function getCoachingSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");
  const userId = session.user.id;

  let coaching = await prisma.coachingSession.findUnique({ where: { userId } });
  if (!coaching) {
    coaching = await prisma.coachingSession.create({
      data: { userId, messages: "[]" },
    });
  }

  const messages: Message[] = JSON.parse(coaching.messages);
  return { messages, lastAnalysis: coaching.lastAnalysis, analyzedAt: coaching.analyzedAt };
}

// ─── Send message to AI coach ─────────────────────────────────────────────────

export async function sendCoachingMessage(userMessage: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");
  const userId = session.user.id;

  const userContext = await buildUserContext(userId);

  const systemPrompt = `אתה מאמן קריירה אישי ומקצועי של "קריירה בפוקוס" — פלטפורמה ישראלית לחיפוש עבודה.

אתה מכיר את המשתמש לעומק ויש לך גישה לכל הנתונים שלו:

${userContext}

הנחיות:
- דבר בעברית, בגוף נקבה (את/שלך)
- היה קונקרטי, מעשי, ומעודד — לא גנרי
- הצע פעולות ספציפיות שהמשתמש יכול לעשות עכשיו
- השתמש בנתונים האמיתיים שלו (כמות בקשות, ניקוד מוכנות, וכו׳)
- שמור תשובות ממוקדות — עד 200 מילה
- אם המשתמש שואל על נושא לא קשור לקריירה, הפנה בחזרה בעדינות`;

  let coaching = await prisma.coachingSession.findUnique({ where: { userId } });
  if (!coaching) {
    coaching = await prisma.coachingSession.create({ data: { userId, messages: "[]" } });
  }

  const messages: Message[] = JSON.parse(coaching.messages);
  messages.push({ role: "user", content: userMessage });

  // Keep last 20 messages for context
  const contextMessages = messages.slice(-20);
  const aiReply = await callClaude(contextMessages, systemPrompt);

  messages.push({ role: "assistant", content: aiReply });

  // Keep stored messages at max 40
  const toStore = messages.slice(-40);
  await prisma.coachingSession.update({
    where: { userId },
    data: { messages: JSON.stringify(toStore) },
  });

  revalidatePath("/coaching");
  return aiReply;
}

// ─── Generate weekly analysis ─────────────────────────────────────────────────

export async function generateWeeklyAnalysis(userId: string) {
  const userContext = await buildUserContext(userId);

  const prompt = `בסס על הנתונים הבאים, צור ניתוח קצר (3-4 משפטים) ורשימת 3-4 משימות קונקרטיות לשבוע הקרוב.

${userContext}

החזר JSON בפורמט:
{
  "analysis": "ניתוח המצב...",
  "actionItems": ["משימה 1", "משימה 2", "משימה 3"]
}`;

  try {
    const text = await callClaude([{ role: "user", content: prompt }],
      "אתה מאמן קריירה ישראלי. ענה רק ב-JSON תקני בעברית.");
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean) as { analysis: string; actionItems: string[] };
  } catch {
    return {
      analysis: "המשך לשלוח בקשות ולעקוב אחר התקדמותך.",
      actionItems: ["שלחי 3 בקשות עבודה חדשות", "עדכני את הפרופיל שלך", "השתתפי באירוע הקרוב"],
    };
  }
}

// ─── Clear chat ───────────────────────────────────────────────────────────────

export async function clearCoachingChat() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");

  await prisma.coachingSession.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, messages: "[]" },
    update: { messages: "[]" },
  });

  revalidatePath("/coaching");
}
