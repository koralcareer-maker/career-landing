"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { stringifyArray } from "@/lib/utils";

export async function saveProfile(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };

  const userId = session.user.id;
  const strengthsRaw = formData.get("strengths") as string;
  const missingSkillsRaw = formData.get("missingSkills") as string;

  const data = {
    fullName: formData.get("fullName") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    currentRole: formData.get("currentRole") as string || undefined,
    targetRole: formData.get("targetRole") as string || undefined,
    yearsExperience: formData.get("yearsExperience") ? parseInt(formData.get("yearsExperience") as string) : undefined,
    desiredField: formData.get("desiredField") as string || undefined,
    careerTransitionGoal: formData.get("careerTransitionGoal") as string || undefined,
    mainChallenge: formData.get("mainChallenge") as string || undefined,
    strengths: strengthsRaw ? stringifyArray(strengthsRaw.split(",").map(s => s.trim()).filter(Boolean)) : undefined,
    missingSkills: missingSkillsRaw ? stringifyArray(missingSkillsRaw.split(",").map(s => s.trim()).filter(Boolean)) : undefined,
    preferredSalaryMin: formData.get("preferredSalaryMin") ? parseInt(formData.get("preferredSalaryMin") as string) : undefined,
    preferredSalaryMax: formData.get("preferredSalaryMax") ? parseInt(formData.get("preferredSalaryMax") as string) : undefined,
    preferredCompanyType: formData.get("preferredCompanyType") as string || undefined,
    linkedinUrl: formData.get("linkedinUrl") as string || undefined,
  };

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  if (data.fullName) {
    await prisma.user.update({ where: { id: userId }, data: { name: data.fullName } });
  }

  revalidatePath("/profile");
  return { success: true };
}

// ─── CV Analysis — AI reads CV and suggests strengths/gaps ───────────────────

export interface CvAnalysisResult {
  currentRole: string;
  targetRole: string;
  yearsExperience: number;
  strengths: string[];
  skillGaps: string[];
  summary: string;
  marketSkills?: string[];  // hot skills employers want NOW for this role
  cvFeedback?: string[];    // actionable tips to improve the CV
  // Lightweight traffic-light ATS rating included on the free tier.
  // The full breakdown (per-system risk, rewrite suggestions, ...)
  // lives in /progress/cv-feedback (PRO+ only).
  atsLevel?: "green" | "yellow" | "red";
  atsReasons?: string[];    // 1-3 short Hebrew reasons
}

export async function analyzeCvContent(cvText: string): Promise<CvAnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      currentRole: "", targetRole: "", yearsExperience: 0,
      strengths: ["ניסיון מקצועי", "עבודת צוות", "יוזמה"],
      skillGaps: ["אנגלית מקצועית", "ניסיון בניהול", "כלים דיגיטליים"],
      summary: "מלא מפתח API לניתוח אמיתי",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const prompt = `אתה מומחה גיוס ישראלי. נתח את קורות החיים הבאים והחזר JSON בלבד (ללא markdown):

${cvText.slice(0, 6000)}

החזר JSON בפורמט הזה בדיוק:
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש",
  "yearsExperience": 5,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער/תחום לשיפור 1", "פער 2", "פער 3", "פער 4"],
  "summary": "סיכום קצר של הפרופיל המקצועי בעברית, משפט אחד"
}

חוזקות: דגש על מה שבולט בקורות החיים — ניסיון ספציפי, הישגים, מיומנויות מוכחות.
פערים: מה חסר לפרופיל הזה כדי להיות תחרותי יותר — לא להיות ביקורתי מדי אלא מציאותי ומועיל.
החזר JSON בלבד.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
      }),
    });
    const data = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }>; error?: { message: string } };
    if (data.error) throw new Error(data.error.message);
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean) as CvAnalysisResult;
  } catch {
    return {
      currentRole: "", targetRole: "", yearsExperience: 0,
      strengths: ["ניסיון רב שנים", "עבודת צוות", "יוזמה ויצירתיות"],
      skillGaps: ["אנגלית מקצועית", "כלים דיגיטליים", "ניהול פרויקטים"],
      summary: "לא ניתן לנתח — נסה שנית",
    };
  }
}

// ─── CV Analysis from FILE (PDF/DOC) ─────────────────────────────────────────

export async function analyzeCvFile(base64Data: string, mimeType: string): Promise<CvAnalysisResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      currentRole: "", targetRole: "", yearsExperience: 0,
      strengths: ["ניסיון מקצועי", "עבודת צוות", "יוזמה"],
      skillGaps: ["אנגלית מקצועית", "ניהול פרויקטים", "כלים דיגיטליים"],
      marketSkills: ["Excel מתקדם", "Python בסיס", "ניהול נתונים"],
      cvFeedback: ["הוסף מספרים והישגים לכל תפקיד", "הוסף מילות מפתח מהמקצוע"],
      summary: "הוסף מפתח API לניתוח אמיתי",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const prompt = `אתה מומחה גיוס ומיתוג מקצועי ישראלי עם ניסיון רב. אתה מנתח את קורות החיים המצורפים.

ענה אך ורק ב-JSON תקין (ללא markdown, ללא הסברים):
{
  "currentRole": "התפקיד הנוכחי/האחרון",
  "targetRole": "התפקיד המתאים ביותר שיחפש בהתבסס על הרקע",
  "yearsExperience": <מספר שנות ניסיון כולל>,
  "strengths": ["חוזקה 1", "חוזקה 2", "חוזקה 3", "חוזקה 4", "חוזקה 5"],
  "skillGaps": ["פער 1", "פער 2", "פער 3", "פער 4"],
  "marketSkills": ["מיומנות חמה 1 שמעסיקים מחפשים עכשיו", "מיומנות 2", "מיומנות 3"],
  "cvFeedback": [
    "פידבק ספציפי 1 לשיפור קורות החיים (כגון: הוסיפי נתונים כמותיים להישגים)",
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
cvFeedback: עצות ספציפיות ופרקטיות לשיפור קורות החיים — לא כלליות. כל פריט = פעולה אחת ברורה.
החזר JSON בלבד.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    });

    const data = await res.json() as {
      candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
      error?: { message: string };
    };
    if (data.error) throw new Error(data.error.message);
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(clean) as CvAnalysisResult;
  } catch (e) {
    console.error("analyzeCvFile error:", e);
    return {
      currentRole: "", targetRole: "", yearsExperience: 0,
      strengths: ["ניסיון רב שנים", "עבודת צוות", "יוזמה ויצירתיות"],
      skillGaps: ["אנגלית מקצועית", "כלים דיגיטליים", "ניהול פרויקטים"],
      marketSkills: [],
      cvFeedback: ["לא ניתן לנתח — נסה שנית"],
      summary: "לא ניתן לנתח — נסה שנית",
    };
  }
}

// ─── Mark CV as uploaded ──────────────────────────────────────────────────────
// The analyze-cv flow extracts fields but doesn't persist the file itself.
// We store the filename in `resumeUrl` so consumers (AI Coach, readiness score)
// can detect that the user has provided a CV.

export async function markCvUploaded(filename: string) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  const marker = filename.trim().slice(0, 200) || "uploaded";

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, resumeUrl: marker },
    update: { resumeUrl: marker },
  });

  revalidatePath("/profile");
  revalidatePath("/coaching");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Save CV analysis confirmed data ─────────────────────────────────────────

export async function saveCvAnalysis(data: {
  currentRole?: string; targetRole?: string; yearsExperience?: number;
  strengths: string[]; missingSkills: string[];
}) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      currentRole: data.currentRole,
      targetRole: data.targetRole,
      yearsExperience: data.yearsExperience,
      strengths: JSON.stringify(data.strengths),
      missingSkills: JSON.stringify(data.missingSkills),
    },
    update: {
      currentRole: data.currentRole || undefined,
      targetRole: data.targetRole || undefined,
      yearsExperience: data.yearsExperience || undefined,
      strengths: JSON.stringify(data.strengths),
      missingSkills: JSON.stringify(data.missingSkills),
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function saveQuestionnaire(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };

  const userId = session.user.id;
  const data = {
    q_workStyle: formData.get("q_workStyle") as string || undefined,
    q_teamOrSolo: formData.get("q_teamOrSolo") as string || undefined,
    q_motivators: formData.get("q_motivators") as string || undefined,
    q_biggestFear: formData.get("q_biggestFear") as string || undefined,
    q_idealDay: formData.get("q_idealDay") as string || undefined,
    q_pastAchievement: formData.get("q_pastAchievement") as string || undefined,
    q_learningStyle: formData.get("q_learningStyle") as string || undefined,
    q_shortTermGoal: formData.get("q_shortTermGoal") as string || undefined,
    q_longTermGoal: formData.get("q_longTermGoal") as string || undefined,
    q_networkingLevel: formData.get("q_networkingLevel") as string || undefined,
    q_remotePreference: formData.get("q_remotePreference") as string || undefined,
    q_valuesAtWork: formData.get("q_valuesAtWork") ? stringifyArray((formData.get("q_valuesAtWork") as string).split(",").map(s => s.trim()).filter(Boolean)) : undefined,
    q_industryInterests: formData.get("q_industryInterests") ? stringifyArray((formData.get("q_industryInterests") as string).split(",").map(s => s.trim()).filter(Boolean)) : undefined,
    questionnaireCompleted: true,
  };

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  revalidatePath("/profile");
  return { success: true };
}

// ─── Job-search wizard ───────────────────────────────────────────────────────
// Powers the new "הגדרת חיפוש העבודה שלך" 4-step experience under /profile.
// One server action per step keeps each form payload small + lets the wizard
// surface a "saved" tick after every step. completeWizard finalises and
// kicks off the career-passport generation in the background.

export interface WizardStep1 {
  targetRole: string;
  industries: string[];          // multi-select
  desiredField: string;          // primary industry (legacy field)
  region: string[];              // multi-select: צפון/חיפה/מרכז/שפלה/ירושלים/דרום/אילת
  workType: string[];            // multi-select: "remote" | "hybrid" | "office"
}
export interface WizardStep2 {
  currentRole: string;
  yearsExperience: number | null;
  strengths: string[];
}
export interface WizardStep3 {
  jsActively: string;             // "yes" | "no" | "passive"
  jsSearchWeeks: number | null;
  jsRecentInterviews: number | null;
  jsIsApplying: boolean | null;
}
export interface WizardStep4 {
  linkedinUrl: string;
  portfolioUrl: string;
  additionalLinks: Array<{ label: string; url: string }>;
}

export async function saveWizardStep1(data: WizardStep1) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  // Region + workType are now multi-select. Both store as JSON-stringified
  // arrays — q_remotePreference reuses its existing column (legacy single
  // values still round-trip cleanly through fmtField/parseJsonArray on the
  // read side), q_regions is a new column.
  const regionJson = data.region.length ? stringifyArray(data.region) : null;
  const workTypeJson = data.workType.length ? stringifyArray(data.workType) : null;

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      targetRole: data.targetRole || null,
      desiredField: data.desiredField || null,
      q_industryInterests: data.industries.length ? stringifyArray(data.industries) : null,
      q_remotePreference: workTypeJson,
      q_regions: regionJson,
    },
    update: {
      targetRole: data.targetRole || null,
      desiredField: data.desiredField || null,
      q_industryInterests: data.industries.length ? stringifyArray(data.industries) : null,
      q_remotePreference: workTypeJson,
      q_regions: regionJson,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function saveWizardStep2(data: WizardStep2) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      currentRole: data.currentRole || null,
      yearsExperience: data.yearsExperience ?? null,
      strengths: data.strengths.length ? stringifyArray(data.strengths) : null,
    },
    update: {
      currentRole: data.currentRole || null,
      yearsExperience: data.yearsExperience ?? null,
      strengths: data.strengths.length ? stringifyArray(data.strengths) : null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function saveWizardStep3(data: WizardStep3) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  const fields = {
    js_actively: data.jsActively || null,
    js_searchWeeks: data.jsSearchWeeks ?? null,
    js_recentInterviews: data.jsRecentInterviews ?? null,
    js_isApplying: data.jsIsApplying ?? null,
  };
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function saveWizardStep4(data: WizardStep4) {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  // Sanitize URLs minimally — strip whitespace, allow empty.
  const linkedin = data.linkedinUrl.trim();
  const portfolio = data.portfolioUrl.trim();
  const links = data.additionalLinks
    .filter((l) => l.url.trim().length > 0)
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));

  const fields = {
    linkedinUrl: linkedin || null,
    portfolioUrl: portfolio || null,
    additionalLinks: links.length ? JSON.stringify(links) : null,
  };
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function completeWizard() {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };
  const userId = session.user.id;

  await prisma.profile.update({
    where: { userId },
    data: { questionnaireCompleted: true },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Career Passport — Claude AI ─────────────────────────────────────────────

export async function generateCareerPassport() {
  try {
    const session = await auth();
    if (!session?.user) return { error: "נדרשת כניסה" };

    const userId = session.user.id;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return { error: "יש למלא פרופיל תחילה" };

    // Fetch completions so the passport reflects courses/skills the user
    // has marked as done since their last passport generation.
    const [courseCompletions, skillCompletions] = await Promise.all([
      prisma.userCourseCompletion.findMany({
        where: { userId },
        include: { course: { select: { title: true, category: true } } },
      }).catch(() => []),
      prisma.userSkillCompletion.findMany({
        where: { userId },
        select: { skillName: true },
      }).catch(() => []),
    ]);

    const completedCourseTitles = courseCompletions.map((c) => c.course?.title).filter(Boolean) as string[];
    const completedSkillNames = skillCompletions.map((s) => s.skillName);

    // The Gemini path can throw on quota / malformed-JSON / network — fall
    // back to the mock so the user always lands on a real passport rather
    // than the global error boundary.
    let result: CareerPassportResult;
    if (process.env.GEMINI_API_KEY) {
      try {
        result = await generateWithGemini(profile, completedCourseTitles, completedSkillNames);
      } catch (e) {
        console.error("[generateCareerPassport] Gemini failed, using mock:", e);
        result = generateMock(profile);
      }
    } else {
      result = generateMock(profile);
    }

    const passportData = {
      jobMatchScore: result.jobMatchScore,
      summary: result.summary,
      strengths: JSON.stringify(result.strengths),
      skillGaps: JSON.stringify(result.skillGaps),
      recommendations: JSON.stringify(result.recommendations),
      likelyFitRoles: JSON.stringify(result.likelyFitRoles),
      recommendedIndustries: JSON.stringify(result.recommendedIndustries),
      nextBestActions: JSON.stringify(result.nextBestActions),
    };

    await prisma.careerPassport.upsert({
      where: { userId },
      create: { userId, ...passportData },
      update: passportData,
    });

    revalidatePath("/profile");
    revalidatePath("/skills");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    // Any throw — Prisma, JSON.parse on a malformed profile field, anything
    // — gets converted to a structured error response so the client renders
    // its own retry UI instead of falling through to the global error page.
    console.error("[generateCareerPassport] unexpected failure:", e);
    return { error: e instanceof Error ? e.message : "שגיאה לא צפויה בעת יצירת הדרכון" };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareerPassportResult {
  jobMatchScore: number;
  summary: string;
  strengths: string[];
  skillGaps: string[];
  recommendations: string[];
  likelyFitRoles: string[];
  recommendedIndustries: string[];
  nextBestActions: string[];
}

// ─── Gemini API implementation ────────────────────────────────────────────────

type ProfileInput = {
  targetRole?: string | null;
  currentRole?: string | null;
  yearsExperience?: number | null;
  desiredField?: string | null;
  careerTransitionGoal?: string | null;
  mainChallenge?: string | null;
  strengths?: string | null;
  missingSkills?: string | null;
  preferredCompanyType?: string | null;
  questionnaireCompleted?: boolean;
  q_workStyle?: string | null;
  q_teamOrSolo?: string | null;
  q_motivators?: string | null;
  q_biggestFear?: string | null;
  q_idealDay?: string | null;
  q_pastAchievement?: string | null;
  q_learningStyle?: string | null;
  q_shortTermGoal?: string | null;
  q_longTermGoal?: string | null;
  q_networkingLevel?: string | null;
  q_remotePreference?: string | null;
  q_valuesAtWork?: string | null;
  q_industryInterests?: string | null;
};

async function generateWithGemini(
  profile: ProfileInput,
  completedCourseTitles: string[] = [],
  completedSkillNames: string[] = []
): Promise<CareerPassportResult> {
  // Some of the legacy questionnaire columns hold either a JSON-encoded
  // array OR a single plain string from an earlier schema. JSON.parse on
  // a plain string throws — fmtArray normalises both shapes into a comma
  // joined display string so we never blow up on the prompt assembly.
  const fmtArray = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).join(", ") || null;
    } catch { /* fall through — treat as plain string */ }
    return raw;
  };

  const profileSummary = [
    profile.targetRole && `תפקיד יעד: ${profile.targetRole}`,
    profile.currentRole && `תפקיד נוכחי: ${profile.currentRole}`,
    profile.yearsExperience != null && `שנות ניסיון: ${profile.yearsExperience}`,
    profile.desiredField && `תחום רצוי: ${profile.desiredField}`,
    profile.careerTransitionGoal && `מטרת מעבר: ${profile.careerTransitionGoal}`,
    profile.mainChallenge && `האתגר העיקרי: ${profile.mainChallenge}`,
    fmtArray(profile.strengths) && `חוזקות שצוינו: ${fmtArray(profile.strengths)}`,
    fmtArray(profile.missingSkills) && `מיומנויות חסרות שצוינו: ${fmtArray(profile.missingSkills)}`,
    profile.preferredCompanyType && `סוג חברה מועדף: ${profile.preferredCompanyType}`,
    profile.q_workStyle && `סגנון עבודה: ${profile.q_workStyle}`,
    profile.q_teamOrSolo && `עבודה בצוות / עצמאית: ${profile.q_teamOrSolo}`,
    profile.q_motivators && `מה מניע אותי: ${profile.q_motivators}`,
    profile.q_biggestFear && `הפחד הכי גדול: ${profile.q_biggestFear}`,
    profile.q_shortTermGoal && `מטרה קצרת טווח: ${profile.q_shortTermGoal}`,
    profile.q_longTermGoal && `מטרה ארוכת טווח: ${profile.q_longTermGoal}`,
    fmtArray(profile.q_valuesAtWork) && `ערכים בעבודה: ${fmtArray(profile.q_valuesAtWork)}`,
    fmtArray(profile.q_industryInterests) && `תחומי עניין: ${fmtArray(profile.q_industryInterests)}`,
    completedCourseTitles.length > 0 && `קורסים שהשלימה במערכת: ${completedCourseTitles.join(", ")}`,
    completedSkillNames.length > 0 && `מיומנויות שרכשה במערכת: ${completedSkillNames.join(", ")}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה יועץ קריירה בכיר בישראל עם 15 שנות ניסיון בגיוס בכיר. אתה מקפיד מאוד על דירוג מציאותי — לא מנפח, לא מפחית בצדק. דייק את הניתוח על בסיס הנתונים, ולא על "נכונות פוליטית".

פרטי המועמד/ת:
${profileSummary}

=== כללי דירוג ל-jobMatchScore (חובה לפעול לפיהם) ===
זהו ציון מוכנות לחיפוש עבודה ולא ציון "כמה אני מקצועית". הציון משקף אם המועמד/ת מוכן/ה היום למקסם הזדמנויות בשוק.

90–100 — מוכנ/ה מלא: ניסיון רלוונטי גבוה, אפס פערים מהותיים לתפקיד היעד, מבנה פרופיל ברור, נכסים דיגיטליים מסודרים. ציון זה נדיר.
75–89  — מוכנ/ה לרוב המשרות: נסיון רלוונטי, אולי פער 1 קטן, פרופיל מסודר. רוב המועמדים החזקים נופלים כאן.
60–74  — בבנייה: בסיס טוב אך 2-3 פערים מקצועיים שמשפיעים על שיעור התגובה של מגייסים.
45–59  — תחילת הדרך: או מעט ניסיון, או מספר פערים מהותיים, או פרופיל לא ממוקד.
25–44  — נדרשת השקעה משמעותית לפני חיפוש פעיל.

חוקים נוקשים:
- כל פער מקצועי משמעותי שמופיע ברשימה מוריד 5-8 נקודות. 5 פערים = הציון לא יכול לעבור 70.
- מועמד/ת בלי ניסיון רלוונטי כלל לתפקיד היעד = הציון לא יכול לעבור 65.
- שאלון לא מלא = הציון לא יכול לעבור 60.
- אם השלמת קורס/מיומנות שסוגר/ת פער ספציפי שהוגדר — הסר/י את הפער ועלה/י את הציון ב-3-5 נקודות.
- כל הקורסים/מיומנויות שרשומים כ"השלימה במערכת" הם חוזקות, אסור לרשום אותם כפערים.
- אם לא בטוח/ה — תור/י לכיוון הפחות. עדיף ציון מציאותי שהמשתמש/ת תוכל לראות עלייה ממשית, מאשר ציון מנופח שלא משאיר טווח לשיפור.

=== פורמט תשובה ===
החזר JSON בלבד, ללא markdown, ללא הסברים, ללא טקסט מסביב. הפורמט:
{
  "jobMatchScore": <מספר שלם 25-95 לפי הרוברק למעלה>,
  "summary": "<פסקה 2-3 משפטים — תיאור ענייני של איפה המועמד/ת עומד/ת היום ומה הפוטנציאל. בלי קלישאות, בלי כוכבים, רק עובדות.>",
  "strengths": ["<3-5 חוזקות קונקרטיות שמקדמות בתחום המקצועי הספציפי. לא 'אדם נהדר' — דברים שניתן להוכיח בקורות חיים.>"],
  "skillGaps": ["<2-4 פערים ממוקדים. ספציפיים לתפקיד היעד שצוין. לא 'ניסיון' — נסיון במה בדיוק.>"],
  "recommendations": ["<3-5 צעדים מעשיים שיש לבצע ב-30 הימים הקרובים. כל אחד מתחיל בפועל מעשי.>"],
  "likelyFitRoles": ["<3-5 תפקידים בישראל שמתאימים לפרופיל הנוכחי, כולל וריאציות junior/senior של תפקיד היעד>"],
  "recommendedIndustries": ["<3-4 תעשיות שמתאימות בישראל, לפי שילוב הניסיון והשאיפות>"],
  "nextBestActions": ["<3-4 פעולות מיידיות לשבוע הזה. ספציפי וכמותי — 'הגישי ל-X משרות', 'פנייה ל-Y אנשים', וכו'>"]
}

הכל בעברית. בלי קלישאות שיווקיות. כתוב/י כמו יועצ/ת מקצועי/ת אמיתי/ת לחבר/ה.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

  const data = await res.json() as { candidates?: Array<{ content: { parts: Array<{ text: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const clean = text.replace(/```json\n?|\n?```/g, "").trim();
  // Gemini occasionally wraps the JSON in stray text or returns a near-miss
  // shape. Throwing here surfaces an unhelpful error to the user — the
  // caller already catches and falls back to the mock generator on throw.
  const parsed = JSON.parse(clean) as CareerPassportResult;

  // Hard-cap the score at 92 even when Gemini returns 95/100. The number 100
  // is misleading — there's always room for polish — and over-inflated
  // scores were exactly Coral's complaint (Alex Manker at 95% despite real
  // skill gaps). The mock generator uses the same ceiling.
  parsed.jobMatchScore = Math.max(15, Math.min(92, Math.round(parsed.jobMatchScore || 50)));
  return parsed;
}

// ─── Mock fallback (no API key) ───────────────────────────────────────────────

function generateMock(profile: {
  targetRole?: string | null;
  yearsExperience?: number | null;
  desiredField?: string | null;
  strengths?: string | null;
  missingSkills?: string | null;
  questionnaireCompleted?: boolean;
}): CareerPassportResult {
  const targetRole = profile.targetRole ?? "תפקיד יעד";
  const experience = profile.yearsExperience ?? 0;

  // Parse helpers — tolerate both legacy single-string and JSON-array
  // storage formats so the mock never throws.
  const parseSafe = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p.filter(Boolean) : [raw];
    } catch {
      return [raw];
    }
  };
  const strengthsArr = parseSafe(profile.strengths);
  const gapsArr = parseSafe(profile.missingSkills);

  // ── Match score, properly calibrated ──────────────────────────────────────
  // The old formula was `45 + (experience * 5) + 20` and ignored skill gaps
  // entirely, so a senior with 5 gaps still hit 95. That made the score
  // meaningless. New rubric — additive with explicit caps, and gaps now
  // *reduce* the score:
  //   base 35
  //   + experience           up to +15  (caps at 10 yrs)
  //   + completed wizard     +15        (the data needed to evaluate exists)
  //   + target role declared +5         (you know what you're aiming for)
  //   + desired field        +5
  //   + strengths            up to +10  (2.5 each, caps at 4 strengths)
  //   − missing skills       up to −20  (3 each, caps at 7 gaps)
  // Theoretical max ≈ 85; we never declare anyone "100% match" — there's
  // always polish left to do, and inflated scores erode trust in the
  // platform.
  const yrs = Math.max(0, Math.min(10, experience));
  const stCount = Math.min(4, strengthsArr.length);
  const gapPenalty = Math.min(20, gapsArr.length * 3);
  const rawScore =
    35 +
    yrs * 1.5 +
    (profile.questionnaireCompleted ? 15 : 0) +
    (profile.targetRole ? 5 : 0) +
    (profile.desiredField ? 5 : 0) +
    stCount * 2.5 -
    gapPenalty;
  const jobMatchScore = Math.max(15, Math.min(92, Math.round(rawScore)));

  return {
    jobMatchScore,
    summary: `בהתבסס על ${experience} שנות הניסיון והיעד "${targetRole}", הפרופיל שלך ${
      jobMatchScore >= 75
        ? "במצב טוב לחיפוש פעיל"
        : jobMatchScore >= 55
        ? "בבנייה — יש בסיס מוצק וכמה פערים ממוקדים שכדאי לסגור"
        : "בתחילת הדרך — סגירת הפערים העיקריים תקפיץ את הציון משמעותית"
    }. ${profile.questionnaireCompleted ? "הדרכון מבוסס על המידע המלא שמילאת." : "השלמת השאלון תאפשר ניתוח מדויק יותר."}`,
    strengths: strengthsArr.length > 0 ? strengthsArr : ["תקשורת בינאישית", "פתרון בעיות", "למידה מהירה"],
    skillGaps: gapsArr.length > 0 ? gapsArr : [`ניסיון מעשי ב-${targetRole}`, "כלים דיגיטליים רלוונטיים לתחום"],
    recommendations: [
      `קורס מקצועי ב-${targetRole} לסגירת פערים טכניים`,
      "עדכון פרופיל LinkedIn עם מילות מפתח של תפקיד היעד",
      "פנייה יזומה ל-5 אנשים בתחום בכל שבוע",
      "התאמת קורות חיים נפרדת לכל תפקיד היעד",
    ],
    likelyFitRoles: [targetRole, `${targetRole} Junior`, `Specialist ב${profile.desiredField ?? "תחום"}`],
    recommendedIndustries: [profile.desiredField ?? "הייטק", "פינטק", "סטארטאפים", "תאגידים"],
    nextBestActions: [
      "השלמת 100% מפרטי הפרופיל",
      `הגשת 10 מועמדויות לתפקידי ${targetRole} השבוע`,
      "השתתפות באירוע נטוורקינג קרוב",
      "בקשת חיבור מקצועי ברשת לחברה ספציפית",
    ],
  };
}

// ─── Photo Upgrade ────────────────────────────────────────────────────────────

export async function requestPhotoUpgrade() {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };

  const userId = session.user.id;
  await prisma.user.update({
    where: { id: userId },
    data: { photoUpgradeStatus: "REQUESTED", photoUpgradeRequestedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "photo_upgrade",
      title: "בקשת שדרוג תמונת LinkedIn",
      message: "בקשתך לשדרוג תמונת LinkedIn נשלחה. נחזור אליך בהקדם.",
      link: "/profile",
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
