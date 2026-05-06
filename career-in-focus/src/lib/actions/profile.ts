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
  region: string;                // צפון/חיפה/מרכז/שפלה/ירושלים/דרום/אילת
  workType: string;              // "remote" | "hybrid" | "office"
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

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      targetRole: data.targetRole || null,
      desiredField: data.desiredField || null,
      q_industryInterests: data.industries.length ? stringifyArray(data.industries) : null,
      q_remotePreference: data.workType || null,
    },
    update: {
      targetRole: data.targetRole || null,
      desiredField: data.desiredField || null,
      q_industryInterests: data.industries.length ? stringifyArray(data.industries) : null,
      q_remotePreference: data.workType || null,
    },
  });
  // region lives on User-side data (we already classify jobs into
  // regions; region isn't stored on Profile yet — leave for now,
  // surface it back to the wizard via the dropdown choice).

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

  await prisma.profile.upsert({
    where: { userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: {
      userId,
      js_actively: data.jsActively || null,
      js_searchWeeks: data.jsSearchWeeks ?? null,
      js_recentInterviews: data.jsRecentInterviews ?? null,
      js_isApplying: data.jsIsApplying ?? null,
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: {
      js_actively: data.jsActively || null,
      js_searchWeeks: data.jsSearchWeeks ?? null,
      js_recentInterviews: data.jsRecentInterviews ?? null,
      js_isApplying: data.jsIsApplying ?? null,
    } as any,
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

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      linkedinUrl: linkedin || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      portfolioUrl: portfolio || null,
      additionalLinks: links.length ? JSON.stringify(links) : null,
    } as any,
    update: {
      linkedinUrl: linkedin || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      portfolioUrl: portfolio || null,
      additionalLinks: links.length ? JSON.stringify(links) : null,
    } as any,
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

  let result: CareerPassportResult;

  if (process.env.GEMINI_API_KEY) {
    result = await generateWithGemini(profile, completedCourseTitles, completedSkillNames);
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
  const profileSummary = [
    profile.targetRole && `תפקיד יעד: ${profile.targetRole}`,
    profile.currentRole && `תפקיד נוכחי: ${profile.currentRole}`,
    profile.yearsExperience != null && `שנות ניסיון: ${profile.yearsExperience}`,
    profile.desiredField && `תחום רצוי: ${profile.desiredField}`,
    profile.careerTransitionGoal && `מטרת מעבר: ${profile.careerTransitionGoal}`,
    profile.mainChallenge && `האתגר העיקרי: ${profile.mainChallenge}`,
    profile.strengths && `חוזקות שצוינו: ${JSON.parse(profile.strengths).join(", ")}`,
    profile.missingSkills && `מיומנויות חסרות שצוינו: ${JSON.parse(profile.missingSkills).join(", ")}`,
    profile.preferredCompanyType && `סוג חברה מועדף: ${profile.preferredCompanyType}`,
    profile.q_workStyle && `סגנון עבודה: ${profile.q_workStyle}`,
    profile.q_teamOrSolo && `עבודה בצוות / עצמאית: ${profile.q_teamOrSolo}`,
    profile.q_motivators && `מה מניע אותי: ${profile.q_motivators}`,
    profile.q_biggestFear && `הפחד הכי גדול: ${profile.q_biggestFear}`,
    profile.q_shortTermGoal && `מטרה קצרת טווח: ${profile.q_shortTermGoal}`,
    profile.q_longTermGoal && `מטרה ארוכת טווח: ${profile.q_longTermGoal}`,
    profile.q_valuesAtWork && `ערכים בעבודה: ${JSON.parse(profile.q_valuesAtWork).join(", ")}`,
    profile.q_industryInterests && `תחומי עניין: ${JSON.parse(profile.q_industryInterests).join(", ")}`,
    completedCourseTitles.length > 0 && `קורסים שהשלימה במערכת: ${completedCourseTitles.join(", ")}`,
    completedSkillNames.length > 0 && `מיומנויות שרכשה במערכת: ${completedSkillNames.join(", ")}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה יועץ קריירה מקצועי בישראל. על בסיס המידע הבא על מחפש עבודה, צור דרכון קריירה מפורט ומותאם אישית.

פרטי המועמד:
${profileSummary}

הוראות חשובות לגבי מיומנויות וקורסים שהשלימה:
- אם רשומים "קורסים שהשלימה במערכת" או "מיומנויות שרכשה במערכת" — אסור לרשום אותם בעצמם כפערים. הם כבר חוזקות.
- אם הקורסים/מיומנויות מצליחים לסגור פער קודם — הסר אותו או שדרג אותו.
- ה-jobMatchScore צריך לעלות בכל פעם שהמשתמשת מסיימת קורס או רוכשת מיומנות חדשה.
- הכלל את הקורסים/מיומנויות שרכשה כחוזקות חדשות.

החזר JSON בלבד (ללא markdown, ללא הסברים) בפורמט הבא:
{
  "jobMatchScore": <מספר 0-100 המייצג מוכנות לחיפוש עבודה>,
  "summary": "<פסקה קצרה 2-3 משפטים בעברית המסכמת את פרופיל המועמד והפוטנציאל שלו>",
  "strengths": ["<חוזק 1>", "<חוזק 2>", "<חוזק 3>", "<חוזק 4>"],
  "skillGaps": ["<פער 1>", "<פער 2>", "<פער 3>"],
  "recommendations": ["<המלצה 1>", "<המלצה 2>", "<המלצה 3>", "<המלצה 4>"],
  "likelyFitRoles": ["<תפקיד 1>", "<תפקיד 2>", "<תפקיד 3>", "<תפקיד 4>"],
  "recommendedIndustries": ["<תעשייה 1>", "<תעשייה 2>", "<תעשייה 3>"],
  "nextBestActions": ["<פעולה 1>", "<פעולה 2>", "<פעולה 3>", "<פעולה 4>"]
}

כל התשובות חייבות להיות בעברית. היה ספציפי ומעשי. התאם לשוק העבודה הישראלי.`;

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
  const parsed = JSON.parse(clean) as CareerPassportResult;

  parsed.jobMatchScore = Math.max(0, Math.min(100, parsed.jobMatchScore || 50));
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
  const experience = profile.yearsExperience ?? 3;

  return {
    jobMatchScore: Math.min(95, 45 + (experience * 5) + (profile.questionnaireCompleted ? 20 : 0)),
    summary: `בהתבסס על הניסיון שלך (${experience} שנים) והיעד שהגדרת (${targetRole}), יש לך בסיס טוב לביצוע מעבר קריירה. ${profile.questionnaireCompleted ? "הדרכון שלך מלא ומאפשר ניתוח מדויק יותר." : "מלא את שאלון הדרכון לניתוח מלא."} הצעדים הקרובים המומלצים מפורטים למטה.`,
    strengths: profile.strengths ? JSON.parse(profile.strengths) : ["תקשורת בינאישית", "פתרון בעיות יצירתי", "למידה מהירה"],
    skillGaps: profile.missingSkills ? JSON.parse(profile.missingSkills) : [`ניסיון ב-${targetRole}`, "ניהול פרויקטים", "כלים דיגיטליים רלוונטיים"],
    recommendations: [
      `השלם קורס ב-${targetRole} כדי לסגור פערים טכניים`,
      "עדכן את פרופיל ה-LinkedIn שלך עם מילות מפתח רלוונטיות",
      "צור רשת קשרים בתחום היעד — שלח 5 הודעות השבוע",
      "הכן גרסת קורות חיים ממוקדת לתפקיד היעד",
    ],
    likelyFitRoles: [targetRole, `${targetRole} Junior`, `Specialist ב${profile.desiredField ?? "התחום"}`, "תפקיד מעבר רלוונטי"],
    recommendedIndustries: [profile.desiredField ?? "הייטק", "פינטק", "חברות startup", "תאגידים גדולים"],
    nextBestActions: [
      "מלא את פרטי הפרופיל שלך במלואם (100%)",
      `שלח 10 בקשות לתפקידי ${targetRole} השבוע`,
      "השתתף באירוע הנטוורקינג הקרוב",
      "בקש ממישהו ברשת שלך חיבור לחברה שמעניינת אותך",
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
