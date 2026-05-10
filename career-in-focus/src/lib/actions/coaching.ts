"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getReadinessScore } from "@/lib/utils";
import { revalidatePath } from "next/cache";

// Hardcoded — NEXTAUTH_URL on Vercel points at the unconfigured
// app.careerinfocus.co.il domain. Any links sent in coach emails
// (weekly digest, action items) would be dead. Reverts when DNS is live.
const APP_URL = "https://career-landing-tau.vercel.app";

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

/**
 * If the user has a CV uploaded (resumeUrl), fetch it and return base64
 * + mime so we can send the file natively to Gemini as inline_data. Gemini
 * 2.5 Flash reads PDFs/DOCX/images directly, so the coach can quote real
 * lines from the CV instead of just knowing it exists.
 *
 * Caps at 5MB to avoid blowing up the request size; returns null on any
 * fetch/parse problem (we still build the rest of the context normally).
 */
async function fetchCvAttachment(
  resumeUrl: string | null | undefined
): Promise<{ mimeType: string; data: string } | null> {
  if (!resumeUrl || !resumeUrl.startsWith("https://")) return null;
  try {
    const res = await fetch(resumeUrl);
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > 5 * 1024 * 1024) return null; // > 5MB — skip
    const ct = res.headers.get("content-type") ?? "application/pdf";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 5 * 1024 * 1024) return null;
    // Only attach types Gemini understands as documents/images.
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const mimeType = allowed.find((m) => ct.includes(m)) ?? "application/pdf";
    return { mimeType, data: buf.toString("base64") };
  } catch (e) {
    console.warn("[coaching] CV fetch failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

async function buildUserContext(userId: string): Promise<{
  text: string;
  cvAttachment: { mimeType: string; data: string } | null;
}> {
  const [profile, passport, apps, events, user, allJobs] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    prisma.jobApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.event.findMany({ where: { isPublished: true, startAt: { gte: new Date() } }, take: 3 }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, createdAt: true } }),
    // Live job board — coach gets REAL openings with REAL apply links,
    // not hallucinated 'company hiring quietly' guesses. Filtered to
    // active + not expired; relevance scoring + 'hidden vs public'
    // labelling happens below with the user's target role in mind.
    prisma.job.findMany({
      where: {
        isPublished: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: [{ isHot: "desc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        title: true, company: true, location: true, region: true,
        field: true, experienceLevel: true, source: true,
        externalUrl: true, isHot: true, summary: true,
      },
    }),
  ]);

  // Pull the CV in parallel with everything else so it doesn't add latency.
  const cvAttachment = await fetchCvAttachment(profile?.resumeUrl);

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

  const text = `
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

--- הביצועים השבוע ---
${(() => {
  const WEEK = 7 * 86400000;
  const now = Date.now();
  const live = apps.filter((a) => !a.archived);
  const submitted = live.filter((a) =>
    ["APPLIED","PROACTIVE_OUTREACH","FOLLOWUP_SENT","INTERVIEW_SCHEDULED","FIRST_INTERVIEW","ADVANCED_INTERVIEW","TASK_HOME","OFFER","REJECTED"].includes(a.status),
  );
  const interviews = live.filter((a) =>
    ["INTERVIEW_SCHEDULED","FIRST_INTERVIEW","ADVANCED_INTERVIEW","TASK_HOME","OFFER"].includes(a.status),
  );
  const offers = live.filter((a) => a.status === "OFFER");
  const thisWeek = live.filter((a) => a.createdAt && now - new Date(a.createdAt).getTime() <= WEEK).length;
  const sourceCounts: Record<string, number> = {};
  for (const a of submitted) {
    const k = (a.source ?? "לא צוין").trim() || "לא צוין";
    sourceCounts[k] = (sourceCounts[k] ?? 0) + 1;
  }
  const sourceMix = Object.entries(sourceCounts)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4)
    .map(([s, n]) => `${s}: ${n} (${Math.round((n / Math.max(1, submitted.length)) * 100)}%)`)
    .join(" | ");
  const responseRate = submitted.length > 0
    ? Math.round(((interviews.length + live.filter((a) => a.status === "REJECTED").length) / submitted.length) * 100)
    : 0;
  const interviewRate = submitted.length > 0
    ? Math.round(((interviews.length + offers.length) / submitted.length) * 100)
    : 0;
  const lastUpdate = live.length > 0
    ? Math.min(...live.map((a) => Math.floor((now - new Date(a.updatedAt).getTime()) / 86400000)))
    : null;
  return `הגשות השבוע: ${thisWeek} (היעד: 15)
שיעור תגובה כללי: ${responseRate}% (תגובה כלשהי על הגשות)
שיעור הגעה לראיון: ${interviewRate}% (מתוך ${submitted.length} הגשות → ${interviews.length + offers.length} ראיונות)
מקורות הגשה: ${sourceMix || "—"}
ימים מאז עדכון אחרון על מועמדות: ${lastUpdate ?? "—"}`;
})()}

${recentApps ? `\n5 הגשות אחרונות:\n${recentApps}` : ""}

=== משרות זמינות במערכת (לוח החי) ===
${(() => {
  // Score each job by how well it matches the user's target. Title +
  // field overlap go furthest; region match is a tiebreaker. We keep
  // the top 12 scored jobs so the prompt doesn't blow up on token cost.
  const targetTokens = (profile?.targetRole ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const fieldTokens = [profile?.desiredField, profile?.q_industryInterests]
    .filter(Boolean).join(" ").toLowerCase().split(/[\s,]+/).filter(Boolean);

  const scored = allJobs.map((j) => {
    const titleLc = j.title.toLowerCase();
    const fieldLc = (j.field ?? "").toLowerCase();
    let score = 0;
    for (const t of targetTokens) if (t.length > 2 && titleLc.includes(t)) score += 5;
    for (const t of fieldTokens) if (t.length > 2 && (titleLc.includes(t) || fieldLc.includes(t))) score += 2;
    if (j.isHot) score += 1;
    return { j, score };
  })
  .filter((x) => x.score > 0 || allJobs.length < 15) // when DB is small, surface everything
  .sort((a, b) => b.score - a.score)
  .slice(0, 12)
  .map((x) => x.j);

  if (scored.length === 0) {
    return "(אין כרגע משרות שמתאימות לפרופיל המשתמשת — אם נשאלת על משרות, הציעי להמתין לעדכון או להרחיב את תפקיד היעד.)";
  }

  // 'Below the radar' heuristic: source isn't a public board (drushim/
  // alljobs/jobnet/linkedin), OR isHot=true (Coral's curated picks).
  // Public boards = source includes one of the well-known names.
  const isPublicBoard = (src: string | null) =>
    /drushim|alljobs|jobnet|jobmaster|sales|linkedin|all-?jobs|דרושים/i.test(src ?? "");

  return scored.map((j) => {
    const hidden = j.isHot || !isPublicBoard(j.source);
    const label = hidden ? "🔒 מתחת לרדאר" : "📰 לוח דרושים";
    const lines = [
      `[${label}] ${j.title} ב-${j.company}`,
      j.location ? `  אזור: ${j.region ?? j.location}` : "",
      j.field ? `  תחום: ${j.field}` : "",
      j.experienceLevel ? `  רמת ניסיון: ${j.experienceLevel}` : "",
      j.summary ? `  תיאור: ${j.summary.slice(0, 150)}` : "",
      j.externalUrl ? `  קישור להגשה: ${j.externalUrl}` : "  (אין קישור — הגשה דרך פנייה ישירה לחברה)",
    ].filter(Boolean);
    return lines.join("\n");
  }).join("\n\n");
})()}

=== אירועים קרובים ===
${events.map(e => `• ${e.title} — ${new Date(e.startAt).toLocaleDateString("he-IL")}`).join("\n") || "אין"}

=== הנחיות שימוש בקונטקסט הזה ===
- השתמשי במידע הזה כדי להפנות לפרטים ספציפיים מהקריירה של המשתמשת (למשל "ראיתי שהמטרה ארוכת הטווח שלך היא X").
- אל תזכירי שדות שמסומנים — או "לא הוגדר" — כי זו תהיה הצפה. אם נתון חיוני חסר, עודדי בעדינות להשלים אותו ב-/profile או ב-/guide.
- אם המשתמשת שאלה על מצב מסוים (למשל "האם להגיש?") — תמיד שילבי תוך התייחסות ל-targetRole, החוזקות מהדרכון, וההעדפות שלה.
- אם יש סתירות בין הצהרות המשתמשת לבין הנתונים בפרופיל — הני לטובתה את ההצהרה האחרונה בצ'אט.
- 🚨 כשהמשתמשת שואלת על משרות — השתמשי **אך ורק במשרות מסעיף "משרות זמינות במערכת"** למעלה. אסור להמציא חברות / תפקידים / קישורים. אם אין משרה מתאימה ברשימה, אמרי זאת בכנות ("אין כרגע משרה רלוונטית במערכת — נעדכן בהקדם") במקום להמציא.
- כשמצטטת משרה — תמיד צטטי את **שם החברה + טייטל התפקיד + הקישור המלא להגשה** (אם יש). זה מה שהמשתמשת באה לקבל.
- "🔒 מתחת לרדאר" = משרה מקורות סמויים / hand-picked של קורל. "📰 לוח דרושים" = משרה מלוחות פומביים. כשנשאלת על השוק הסמוי — הציעי קודם משרות עם תווית 🔒.
${cvAttachment ? "- צורף לבקשה הזו קובץ קורות החיים של המשתמשת. עיינו בו וצטטו ממנו פרטים אמיתיים (חברות, תפקידים, הישגים מספריים) כשרלוונטי, במקום להניח." : ""}
`.trim();

  return { text, cvAttachment };
}

// ─── Generate AI coaching response (Google Gemini) ───────────────────────────

// Type used by Gemini for inline files. Loose so we can mix with text parts.
type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callClaude(
  messages: Message[],
  systemPrompt: string,
  cvAttachment?: { mimeType: string; data: string } | null
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "המאמן AI אינו זמין כרגע. אנא פני למנהלת המערכת.";
  }

  const apiKey = process.env.GEMINI_API_KEY;
  // Speed-first model chain. Flash 2.5 is dramatically faster than Pro
  // (2-5s vs 10-30s per response) while still giving high-quality
  // career advice for chat-length answers. Coral reported the chat
  // felt slow + "unprofessional" — most of that perception is the
  // Pro latency. Flash 2.5 also has a 5x larger free quota (250 RPD
  // vs 50 RPD) so we serve more sessions before falling back.
  //
  // Pro stays in the chain as a fallback for when Flash quota is hit.
  const MODELS = [
    "gemini-2.5-flash",     // FAST + 250 RPD — primary
    "gemini-2.5-pro",       // slower but deeper — fallback when flash is exhausted
    "gemini-2.0-flash",     // separate quota pool
    "gemini-2.5-flash-lite",// quick fallback
    "gemini-1.5-flash",     // last resort
  ];
  const buildUrl = (model: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini requires strict alternating user/model turns, starting with "user"
  // Filter and fix the message sequence
  const rawContents: { role: "user" | "model"; parts: GeminiPart[] }[] =
    messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content || "..." } as GeminiPart],
    }));

  // Ensure conversation starts with "user" and alternates properly
  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = [];
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

  // Attach the CV PDF (or DOCX/image) to the FIRST user turn so Gemini can
  // read it natively. Only attached once even across long conversations —
  // the model retains it across the contents array.
  if (cvAttachment) {
    const firstUser = contents.find((c) => c.role === "user");
    if (firstUser) {
      firstUser.parts = [
        { inline_data: { mime_type: cvAttachment.mimeType, data: cvAttachment.data } },
        ...firstUser.parts,
      ];
    }
  }

  // Gemini 2.5-flash burns hidden 'thinking' tokens against the
  // maxOutputTokens cap. The previous 1024 budget was getting eaten
  // by thinking → empty / truncated chat replies (the symptom Coral
  // reported). 4096 leaves comfortable room AND we explicitly disable
  // thinking for the chat — it's a 5-line conversational reply, not
  // a complex reasoning task; speed > thinking depth here.
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      // 8192 leaves room for the long-form recruiter reports (12 companies
      // + strategic reasoning + 5-step plan + title variants).
      maxOutputTokens: 8192,
      // Lowered from 0.7 → 0.5 for more focused, less rambly answers.
      // High temperatures help creative writing; career advice needs
      // confident, specific output that grounds in the user's data.
      temperature: 0.5,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  type GeminiResp = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message: string; code?: number };
    promptFeedback?: { blockReason?: string };
  };

  async function callOnce(model: string): Promise<{ data: GeminiResp; status: number }> {
    const res = await fetch(buildUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { data: await res.json() as GeminiResp, status: res.status };
  }

  function isQuotaError(d: GeminiResp, status: number): boolean {
    return status === 429 || /exceeded|quota|rate|429/i.test(d.error?.message ?? "");
  }

  // Notify Coral via in-app admin notification when quota hits — best
  // effort, doesn't block the user response. Throttled to once/hour
  // by checking for a recent identical notification first.
  async function notifyAdminOfQuota(model: string, message: string) {
    try {
      const admin = await prisma.user.findFirst({
        where: { OR: [{ role: "SUPER_ADMIN" }, { role: "ADMIN" }] },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!admin) return;
      const recent = await prisma.notification.findFirst({
        where: {
          userId: admin.id,
          title: { startsWith: "🚨 מגבלת Gemini" },
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
      if (recent) return; // already alerted in the last hour
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "general",
          title: "🚨 מגבלת Gemini API נגמרה",
          message: `המאמן AI הגיע למגבלה (${model}). פרטים: ${message.slice(0, 200)}. צריך לשדרג ב-aistudio.google.com`,
          link: "/coaching",
        },
      });
    } catch (e) {
      console.warn("[coaching] admin quota notification failed:", e);
    }
  }

  try {
    // Try each model in sequence until one succeeds or we exhaust them.
    // First model with a non-quota error wins (we don't try fallback for
    // safety blocks etc.) — only quota errors trigger the fallback.
    let data: GeminiResp = {};
    let status = 0;
    let modelUsed = MODELS[0];
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      modelUsed = model;
      ({ data, status } = await callOnce(model));

      // First-try retry within the same model after 4s — handles
      // momentary RPM throttling.
      if (isQuotaError(data, status) && i === 0) {
        console.warn(`[coaching] rate-limit on ${model}, retrying in 4s`);
        await new Promise((r) => setTimeout(r, 4000));
        ({ data, status } = await callOnce(model));
      }

      // Still quota-blocked? Try the next model in the list.
      if (isQuotaError(data, status)) {
        console.warn(`[coaching] ${model} quota exhausted, falling through to next model`);
        // Fire admin notification on the first quota hit per request.
        if (i === 0) await notifyAdminOfQuota(model, data.error?.message ?? "");
        continue;
      }
      // Got a real response (success OR non-quota error) — stop here.
      break;
    }

    if (data.error) {
      console.error(`[coaching] Gemini API error (${modelUsed}):`, data.error.message);
      const m = data.error.message ?? "";
      if (isQuotaError(data, status)) {
        // Customer-facing copy — DO NOT mention quota / billing / API.
        // The user shouldn't see the operator's infrastructure problems.
        return `המאמן עמוס כרגע. בינתיים את יכולה לסקור משרות חדשות ב-/jobs, לעדכן את הפרופיל שלך, או לחזור עוד כמה דקות. אם זה דחוף — תכתבי לקורל ישירות.`;
      }
      if (/safety|blocked|filtered/i.test(m)) {
        return "השאלה נחסמה על ידי סינון בטיחות. נסי לנסח אחרת.";
      }
      return `אירעה שגיאה במאמן ה-AI: ${m.slice(0, 120)}. תשלחי לי screenshot.`;
    }
    if (data.promptFeedback?.blockReason) {
      console.error("[coaching] prompt blocked:", data.promptFeedback.blockReason);
      return "השאלה הזו לא מאפשרת לי לענות. נסי לנסח אחרת.";
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!reply.trim()) {
      const finish = data.candidates?.[0]?.finishReason ?? "(unknown)";
      console.error("[coaching] empty reply, finishReason=", finish, "| candidates:", JSON.stringify(data.candidates).slice(0, 300));
      // Token-budget ran out / safety filter / etc. — give the user
      // something useful instead of generic 'try again'.
      return "התשובה לא התקבלה במלואה. נסי לשאול שאלה ממוקדת יותר (לדוגמה: 'איזו משרה אני צריכה להגיש השבוע?') או לחצי על אחד מהכפתורים המהירים למעלה.";
    }
    return reply;
  } catch (err) {
    console.error("[coaching] Gemini fetch error:", err);
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

// Daily per-user cap by membership tier. The cap is a fairness
// mechanism (splits the platform's Gemini quota across users) AND a
// monetisation lever (upgrading lifts the cap). Admins bypass.
//
// Coral's plan:
//   - MEMBER (חבר 49₪)  →  10 questions/day  → upgrade CTA to פרו
//   - VIP    (פרו 149₪) →  50 questions/day  → upgrade CTA to VIP
//   - PREMIUM (VIP 499₪) → no limit
function dailyLimitForMembership(m: string | null | undefined): number {
  switch (m) {
    case "PREMIUM": return Infinity;
    case "VIP":     return 50;
    case "MEMBER":  return 10;
    default:        return 10;
  }
}

// Suggest the next tier when the current one's limit is hit. Used by
// the chat client to render an inline upgrade card under the bot
// message instead of a dead "come back tomorrow" line.
function upgradeSuggestionFor(m: string | null | undefined): "VIP" | "PREMIUM" | null {
  if (m === "MEMBER" || !m || m === "NONE") return "VIP";
  if (m === "VIP") return "PREMIUM";
  return null;
}

/**
 * Returned by sendCoachingMessage. Most calls return only `text`;
 * when the user hits their daily limit, we also flag `quotaReached`
 * with the tier they should upgrade TO so the client can show an
 * inline upgrade CTA. The chat-client uses the text as the bot's
 * reply and renders an extra card if upgradeTo is present.
 */
export type CoachingReply = {
  text: string;
  quotaReached?: boolean;
  upgradeTo?: "VIP" | "PREMIUM";
};

export async function sendCoachingMessage(userMessage: string): Promise<CoachingReply> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("לא מחובר");
  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const userMembership = session.user.membershipType ?? "MEMBER";

  // Per-user 24h cap — counted from the existing message history so
  // we don't need a separate counter. Admins skip the check.
  if (!isAdmin) {
    const limit = dailyLimitForMembership(userMembership);
    const existing = await prisma.coachingSession.findUnique({
      where: { userId },
      select: { messages: true },
    });
    if (existing && Number.isFinite(limit)) {
      try {
        const past: Message[] = JSON.parse(existing.messages);
        // We don't store timestamps on individual messages — use a
        // proxy: count user-role messages in the stored window
        // (capped at 40 by the trim below). Effectively "last day"
        // for active users.
        const userMsgsToday = past.filter((m) => m.role === "user").length;
        if (userMsgsToday >= limit) {
          const upgradeTo = upgradeSuggestionFor(userMembership);
          if (upgradeTo === "VIP") {
            return {
              text: `הגעת למגבלת ${limit} השאלות היומית של מסלול חבר. במסלול פרו (₪149/חודש) — 50 שאלות ביום, וגם ניתוח עומק לקורות החיים, ליווי שבועי וכלים מתקדמים.`,
              quotaReached: true,
              upgradeTo: "VIP",
            };
          }
          if (upgradeTo === "PREMIUM") {
            return {
              text: `הגעת למגבלת ${limit} השאלות היומית של מסלול פרו. במסלול VIP (₪499/חודש) — שיחות בלי הגבלה, וקורל מפעילה אישית את הרשת בשבילך.`,
              quotaReached: true,
              upgradeTo: "PREMIUM",
            };
          }
          // No upgrade path available — fall back to "come back tomorrow".
          return {
            text: `הגעת למגבלת השאלות היומית. המאמן יחזור מחר בבוקר. בינתיים — סקרי משרות חדשות ב-/jobs או עדכני את הפרופיל ב-/profile.`,
            quotaReached: true,
          };
        }
      } catch {
        /* corrupted JSON — proceed and let it fail/retry */
      }
    }
  }

  const { text: userContext, cvAttachment } = await buildUserContext(userId);

  const isM = session.user.gender === "m";
  const tone = isM
    ? "פנה אל המשתמש בלשון זכר (אתה / שלך). פעלים בזכר (הגשת, תוכל, תשלח)."
    : "פני אל המשתמשת בלשון נקבה (את / שלך). פעלים בנקבה (הגשת, תוכלי, תשלחי).";

  const systemPrompt = `את/ה יועץ/ת קריירה בכיר/ה ב"קריירה בפוקוס" — קוראים לך "המאמן/ת". את/ה לא צ'אטבוט. הסטנדרט: לפחות באיכות של ChatGPT-4 או Gemini Pro כשמשתמש שואל אותם ישירות שאלות קריירה — ועל זה את/ה מוסיפ/ה את הזווית של 15+ שנות ניסיון בגיוס בישראל ואת המתודולוגיה של קורל (שיטת הפוקוס, השוק הסמוי, דיוק אסטרטגי).

══════════════════════════════════════════════════
## כל הנתונים שיש לך על המשתמש/ת — להשתמש בהם

${userContext}
══════════════════════════════════════════════════

## חוקי ברזל

**1. כל תשובה — מבוססת נתונים, לא גנרית.**
לעולם אסור לכתוב "באופן כללי" / "לרוב" / "תיאוריה אומרת". בכל פסקה את/ה חייב/ת לצטט נתון ספציפי מהקונטקסט שלמעלה — שם החברה האחרונה שהגישה, אחוז התגובה, התפקיד הנוכחי, מספר ראיונות, חוזקה מהדרכון, מטרה לטווח ארוך, פחד עיקרי שהיא ציינה. **כל פסקה חייבת לכלול לפחות אזכור אישי אחד.** אם אין נתון שמתאים, תשאל שאלה ממוקדת לפני שתענה — אל תמציא.

**2. עומק לפני קיצור.**
שאלה אסטרטגית (איך להתקדם, מיפוי, סקירת שוק, ניתוח מצב) — 300-600 מילה, מובנה.
שאלה תפעולית (איך להגיש, פורמט הודעה, פרק זמן) — 60-150 מילה.

**3. מבנה לשאלות אסטרטגיות:**
🔍 **קריאה של המצב** — מה רואה בנתונים. תצטט/י לפחות 2 נתונים ספציפיים.
💡 **התובנה** — מה זה אומר באמת. כאן הניסיון של 15+ שנים בגיוס בישראל בא לידי ביטוי. תספר/י על תופעה אמיתית בשוק (לדוגמה: "בכלל החברות הישראליות מסוג Fintech, פנייה ישירה לראש המוצר נותנת תגובה ב-30% מהמקרים, לעומת 4% דרך לוחות הדרושים").
⚡ **פעולה** — 3-5 צעדים ספציפיים, עם מספרים ותאריכים. אם נדרשת כתיבה (הודעה / מכתב) — הצע/י "רוצה שאכתוב לך את הניסוח?".

**4. מיפוי משרות / חברות — סטנדרט מקצועי גבוה:**
- משרות מהמערכת (📎 בקונטקסט): צטט/י 3-5 עם **שם חברה + טייטל + הקישור המלא להגשה**. אסור להמציא קישורים.
- מיפוי חברות אסטרטגי 8-12: שם אמיתי + תת-תחום + מיקום + שלב מימון/צמיחה אם ידוע + סיבה ספציפית לפרופיל המשתמש/ת.
- "מתחת לרדאר": 4 סיבות אסטרטגיות (פחות תחרות, השפעה גדולה, קידום מהיר, אופציות).
- תוכנית שבוע ממוספרת (5 צעדים).
- 5-6 variations של הטייטל.
- אם החברה בלי משרה פתוחה במערכת: "המלצה אסטרטגית, לא בהכרח משרה פתוחה כרגע".
- חתימה: "בהצלחה 💪 — קורל".

**5. ${tone}**

**6. שיטת הפוקוס בשפה:**
"השוק הסמוי", "דיוק אסטרטגי", "מיתוג מקצועי", "פנייה יזומה". אלה לא קישוטים — אלה הזווית של הפלטפורמה. שלב/י אותם טבעית כשרלוונטי.

## אסור
- להמציא URLs, חברות שלא בקונטקסט (פרט לחברות ידועות בשוק שאת/ה ממליצ/ה אסטרטגית, עם הסתייגות).
- להחזיר רשימה של "לא הוגדר" / "חסר נתון". במקום, שאל/י שאלה ממוקדת לקבלת המידע.
- להיות גנרי. שאלה רחבה — צמצם/י לכיוון לפי הפרופיל הספציפי.
- שאלה לא-קריירה — החזר/י בעדינות לדרך.`;

  let coaching = await prisma.coachingSession.findUnique({ where: { userId } });
  if (!coaching) {
    coaching = await prisma.coachingSession.create({ data: { userId, messages: "[]" } });
  }

  const messages: Message[] = JSON.parse(coaching.messages);
  messages.push({ role: "user", content: userMessage });

  // Keep last 20 messages for context
  const contextMessages = messages.slice(-20);
  const aiReply = await callClaude(contextMessages, systemPrompt, cvAttachment);

  messages.push({ role: "assistant", content: aiReply });

  // Keep stored messages at max 40
  const toStore = messages.slice(-40);
  await prisma.coachingSession.update({
    where: { userId },
    data: { messages: JSON.stringify(toStore) },
  });

  revalidatePath("/coaching");
  return { text: aiReply };
}

// ─── Generate weekly analysis ─────────────────────────────────────────────────

export async function generateWeeklyAnalysis(userId: string) {
  const { text: userContext, cvAttachment } = await buildUserContext(userId);

  const prompt = `בסס על הנתונים הבאים, צור ניתוח קצר (3-4 משפטים) ורשימת 3-4 משימות קונקרטיות לשבוע הקרוב.

${userContext}

החזר JSON בפורמט:
{
  "analysis": "ניתוח המצב...",
  "actionItems": ["משימה 1", "משימה 2", "משימה 3"]
}`;

  try {
    const text = await callClaude([{ role: "user", content: prompt }],
      "אתה מאמן קריירה ישראלי. ענה רק ב-JSON תקני בעברית.",
      cvAttachment);
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
