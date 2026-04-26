import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("he-IL", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "עכשיו";
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return formatDateShort(date);
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SAVED: "נשמרה משרה",
  FIT_CHECKED: "נבדקה התאמה",
  APPLIED: "הוגשה מועמדות",
  PROACTIVE_OUTREACH: "פנייה יזומה",
  FOLLOWUP_SENT: "נשלח פולואפ",
  INTERVIEW_SCHEDULED: "זימון לראיון",
  FIRST_INTERVIEW: "ראיון ראשון",
  ADVANCED_INTERVIEW: "ראיון מתקדם",
  TASK_HOME: "מטלה / בית",
  OFFER: "קיבלתי הצעה",
  REJECTED: "נדחיתי",
  FROZEN: "הוקפא",
  ACCEPTED: "התקבלתי",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WEBINAR: "וובינר",
  WORKSHOP: "סדנה",
  LIVE: "שידור חי",
  GUEST_RECRUITER: "מגייס אורח",
  JOB_DROP: "מקלחת משרות",
  LAUNCH: "השקה",
  NETWORKING: "נטוורקינג",
};

export const POST_CATEGORY_LABELS: Record<string, string> = {
  QUESTION: "שאלה",
  JOB: "משרה",
  WIN: "הצלחה",
  TIP: "טיפ",
};

export const TOOL_TYPE_LABELS: Record<string, string> = {
  AI_TOOL: "כלי AI",
  TEMPLATE: "תבנית",
  LINK: "לינק",
  FILE: "קובץ",
  COURSE_RESOURCE: "מקור קורס",
  QUESTIONNAIRE: "שאלון",
  JOB_SOURCE: "מקור משרות",
  WHATSAPP_GROUP: "קבוצת וואטסאפ",
  CV_TEMPLATE: "תבנית קורות חיים",
  OTHER: "אחר",
};

export const TOOL_CATEGORIES = [
  "כלי AI",
  "תבניות",
  "הכנה לראיון",
  "משאבי קורות חיים",
  "חיפוש עבודה",
  "לינקים",
  "שאלונים",
  "אחר",
];

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "התאמה גבוהה", color: "text-green-600 bg-green-100" };
  if (score >= 50) return { label: "התאמה בינונית", color: "text-yellow-700 bg-yellow-100" };
  return { label: "התאמה נמוכה", color: "text-gray-600 bg-gray-100" };
}

export function getReadinessScore(profile: {
  currentRole?: string | null;
  targetRole?: string | null;
  yearsExperience?: number | null;
  strengths?: string | null;
  missingSkills?: string | null;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  questionnaireCompleted?: boolean;
}): number {
  let score = 0;
  if (profile.currentRole) score += 10;
  if (profile.targetRole) score += 15;
  if (profile.yearsExperience) score += 10;
  if (profile.strengths && parseJsonArray(profile.strengths).length > 0) score += 15;
  if (profile.missingSkills) score += 10;
  if (profile.resumeUrl) score += 20;
  if (profile.linkedinUrl) score += 10;
  if (profile.questionnaireCompleted) score += 10;
  return score;
}
