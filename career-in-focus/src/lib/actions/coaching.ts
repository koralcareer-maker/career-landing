"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReadinessScore } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export type Message = { role: "user" | "assistant"; content: string };

// ─── Build rich context about the user for Claude ─────────────────────────────

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

  return `
=== פרופיל המשתמש ===
שם: ${user?.name ?? "לא ידוע"}
ימים מאז הצטרפות: ${daysSinceJoin}
ניקוד מוכנות: ${readiness}%
קורות חיים: ${profile?.resumeUrl ? "✅ הועלו" : "❌ חסרים"}
דרכון קריירה: ${passport ? "✅ נוצר" : "❌ לא נוצר"}

=== פרופיל קריירה ===
תפקיד נוכחי: ${profile?.currentRole ?? "לא הוגדר"}
תפקיד מבוקש: ${profile?.targetRole ?? "לא הוגדר"}
ניסיון: ${profile?.yearsExperience ?? 0} שנים
תחום עניין: ${profile?.q_industryInterests ?? "לא הוגדר"}
${profile?.q_industryInterests ? `תחומי עניין: ${profile.q_industryInterests}` : ""}

=== מצב חיפוש עבודה ===
סה"כ בקשות: ${apps.length}
${Object.entries(statusCounts).map(([s, n]) => `${s}: ${n}`).join(" | ")}

=== דרכון קריירה ===
${passport ? `
חוזקות: ${passport.strengths ?? "לא הוגדרו"}
תפקידים מתאימים: ${passport.likelyFitRoles ?? "לא הוגדרו"}
פערי מיומנויות: ${passport.skillGaps ?? "לא הוגדרו"}
` : "לא נוצר עדיין"}

=== אירועים קרובים ===
${events.map(e => `• ${e.title} — ${new Date(e.startAt).toLocaleDateString("he-IL")}`).join("\n") || "אין"}
`.trim();
}

// ─── Generate AI coaching response ───────────────────────────────────────────

async function callClaude(messages: Message[], systemPrompt: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "המאמן AI אינו זמין כרגע. יש להוסיף ANTHROPIC_API_KEY.";
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
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
