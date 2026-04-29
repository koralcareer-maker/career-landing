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

// ─── Career Passport — Claude AI ─────────────────────────────────────────────

export async function generateCareerPassport() {
  const session = await auth();
  if (!session?.user) return { error: "נדרשת כניסה" };

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return { error: "יש למלא פרופיל תחילה" };

  let result: CareerPassportResult;

  if (process.env.GEMINI_API_KEY) {
    result = await generateWithGemini(profile);
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

async function generateWithGemini(profile: ProfileInput): Promise<CareerPassportResult> {
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
  ].filter(Boolean).join("\n");

  const prompt = `אתה יועץ קריירה מקצועי בישראל. על בסיס המידע הבא על מחפש עבודה, צור דרכון קריירה מפורט ומותאם אישית.

פרטי המועמד:
${profileSummary}

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
