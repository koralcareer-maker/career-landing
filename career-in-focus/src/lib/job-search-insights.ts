/**
 * Heuristic insights about a user's job search behaviour. Pure function
 * over the rows we already have — no AI cost, deterministic, instant.
 *
 * Each insight has:
 *  - severity: drives the colour of the card
 *  - title (one line)
 *  - body (1-2 sentences)
 *  - cta: optional href + label that suggests the next action
 *
 * The tone is coaching, not statistical. The wording references the
 * user's actual numbers so it doesn't feel generic.
 */

export interface InsightInput {
  applications: Array<{
    id: string;
    status: string;
    source: string | null;
    dateApplied: Date | null;
    createdAt: Date;
    updatedAt: Date;
    interviewDate: Date | null;
    archived: boolean;
  }>;
  /** Open reminders that are overdue. */
  overdueReminders: number;
}

export interface Insight {
  id: string;
  severity: "good" | "warn" | "info" | "alert";
  title: string;
  body: string;
  cta?: { href: string; label: string };
}

const ACTIVE_STATUSES = new Set([
  "APPLIED",
  "PROACTIVE_OUTREACH",
  "FOLLOWUP_SENT",
  "INTERVIEW_SCHEDULED",
  "FIRST_INTERVIEW",
  "ADVANCED_INTERVIEW",
  "TASK_HOME",
  "OFFER",
]);

const INTERVIEW_STATUSES = new Set([
  "FIRST_INTERVIEW",
  "ADVANCED_INTERVIEW",
  "INTERVIEW_SCHEDULED",
]);

function isActive(a: { status: string; archived: boolean }) {
  return !a.archived && ACTIVE_STATUSES.has(a.status);
}

function daysAgo(d: Date | null | undefined) {
  if (!d) return Infinity;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export function generateInsights(input: InsightInput): Insight[] {
  const { applications: apps, overdueReminders } = input;
  const out: Insight[] = [];

  const total = apps.length;
  const active = apps.filter(isActive);
  const interviews = apps.filter((a) => INTERVIEW_STATUSES.has(a.status));
  const offers = apps.filter((a) => a.status === "OFFER");
  const rejections = apps.filter((a) => a.status === "REJECTED");
  const outreach = apps.filter((a) => a.status === "PROACTIVE_OUTREACH");

  // Recent activity — applications added in the last 7 days
  const last7 = apps.filter((a) => daysAgo(a.createdAt) <= 7);

  // ─── 1. Stale activity ────────────────────────────────────────────────────
  if (active.length > 0) {
    const lastUpdate = Math.min(...active.map((a) => daysAgo(a.updatedAt)));
    if (lastUpdate >= 14) {
      out.push({
        id: "stale-activity",
        severity: "alert",
        title: `${lastUpdate} ימים לא הזזת מועמדות`,
        body: "כדאי לחזור לכל המשרות הפעילות ולעדכן סטטוס, להוסיף הערה או לתזמן follow-up. שקט יותר מ-14 יום מורגש כניתוק.",
        cta: { href: "/progress", label: "בואי נסקור משרות פעילות" },
      });
    }
  }

  // ─── 2. Heavy job-board reliance (low outreach) ───────────────────────────
  if (total >= 5) {
    const proactiveShare = outreach.length / total;
    if (proactiveShare < 0.15) {
      out.push({
        id: "low-outreach",
        severity: "warn",
        title: "כמעט כל ההגשות הן דרך לוחות משרות",
        body: `מתוך ${total} מועמדויות, רק ${outreach.length} בפנייה יזומה. סטטיסטית — פניות ישירות נותנות פי 3-5 שיחות. נסי לטרגט 2-3 חברות השבוע ולפנות ישירות לאנשי קשר.`,
        cta: { href: "/koral-connections", label: "להעצמת רשת קשרים" },
      });
    }
  }

  // ─── 3. Interviews but low conversion to offer ────────────────────────────
  if (interviews.length >= 3 && offers.length === 0 && rejections.length >= 2) {
    out.push({
      id: "low-interview-conversion",
      severity: "warn",
      title: "הגעת לראיונות אבל עדיין לא להצעה",
      body: `יש ${interviews.length} ראיונות ו-${rejections.length} דחיות. זה מצביע על פערים שצריך לחדד בראיון עצמו (סיפורי הצלחה, התאמה לערכי החברה, שאלות חוזרות).`,
      cta: { href: "/coaching", label: "תרגול שאלות ראיון עם המאמן" },
    });
  }

  // ─── 4. Overdue reminders ─────────────────────────────────────────────────
  if (overdueReminders > 0) {
    out.push({
      id: "overdue-reminders",
      severity: "alert",
      title: `${overdueReminders} תזכורות באיחור`,
      body: "תזכורות שעבר זמנן עלולות להחמיץ הזדמנויות (follow-up מאוחר נראה מאוחר). עברי עליהן ועדכני סטטוס או מחקי.",
      cta: { href: "/progress", label: "סקירת תזכורות" },
    });
  }

  // ─── 5. Pace check — too few applications this week ──────────────────────
  if (total >= 3 && last7.length === 0) {
    out.push({
      id: "slow-week",
      severity: "info",
      title: "השבוע ללא הגשות חדשות",
      body: "המומנטום חשוב יותר ממסה: 2-3 הגשות איכותיות בשבוע נשמר טוב יותר מ-15 פעם בחודש. תכנני להגיש לפחות אחת השבוע.",
      cta: { href: "/jobs", label: "לחיפוש משרות מתאימות" },
    });
  }

  // ─── 6. Healthy momentum — celebrate ──────────────────────────────────────
  if (last7.length >= 3 && interviews.length >= 1) {
    out.push({
      id: "healthy-momentum",
      severity: "good",
      title: "מומנטום מעולה השבוע 🚀",
      body: `הגשת ${last7.length} מועמדויות חדשות בשבוע + יש לך ${interviews.length} ראיונות פעילים. המשיכי בקצב הזה.`,
    });
  }

  // ─── 7. Applications with no follow-up scheduled ──────────────────────────
  const noFollowUp = apps.filter(
    (a) => a.status === "APPLIED" && daysAgo(a.dateApplied) >= 7 && daysAgo(a.dateApplied) <= 30
  );
  if (noFollowUp.length >= 2) {
    out.push({
      id: "schedule-followups",
      severity: "warn",
      title: `${noFollowUp.length} משרות מחכות ל-follow-up`,
      body: "הגשת לפני 1-4 שבועות ולא חזרת. follow-up קצר עכשיו (2-3 שורות, מציג עניין מתחדש) מעלה משמעותית את הסיכוי לקבל תגובה.",
      cta: { href: "/progress", label: "לתזמון follow-ups" },
    });
  }

  // If we generated nothing — soft starter.
  if (out.length === 0 && total < 3) {
    out.push({
      id: "starter",
      severity: "info",
      title: "ברוכה הבאה למעקב חיפוש העבודה",
      body: "התחילי לעקוב אחרי כל מועמדות שאת מגישה — חברה, תפקיד, תאריך, סטטוס. זו ההשקעה הקטנה עם ההחזר הכי גדול בתהליך החיפוש.",
      cta: { href: "/progress", label: "להוספת משרה ראשונה" },
    });
  }

  return out.slice(0, 6);
}

// ─── Interview preparation tips library ──────────────────────────────────────

export interface PrepStep {
  id: string;
  text: string;
  /** Time estimate in minutes. */
  minutes: number;
}

/**
 * Static prep checklists keyed by application status. Loaded by the
 * detail page when the application is in an interview-related stage.
 */
export const INTERVIEW_PREP: Record<string, { title: string; steps: PrepStep[] }> = {
  INTERVIEW_SCHEDULED: {
    title: "הכנה לפני הראיון",
    steps: [
      { id: "research-company", text: "מחקר על החברה: מודל עסקי, מוצר, חדשות מהחודש האחרון, תרבות ארגונית.", minutes: 30 },
      { id: "research-interviewer", text: "חיפוש המראיינ/ת בלינקדאין — תפקיד, רקע, נקודות חיבור אפשריות.", minutes: 15 },
      { id: "stories-3", text: "הכנת 3 סיפורי הצלחה לפי STAR (Situation, Task, Action, Result).", minutes: 45 },
      { id: "questions-ready", text: "5 שאלות מצוינות לשאול אותם — על תפקיד, צוות, אתגרים והצלחה.", minutes: 20 },
      { id: "outfit-tech", text: "בדיקת ביגוד / לוקיישן / זום / מצלמה / רעש רקע.", minutes: 10 },
    ],
  },
  FIRST_INTERVIEW: {
    title: "ראיון ראשון — מה חשוב",
    steps: [
      { id: "self-pitch", text: "פתיח של 60-90 שניות שמסביר מי את ולמה התפקיד הזה (תרגלי בקול רם).", minutes: 20 },
      { id: "why-them", text: "שתי סיבות אמיתיות וספציפיות למה את מתעניינת בחברה הזו דווקא.", minutes: 15 },
      { id: "salary-prep", text: "טווח שכר שמתאים לך + מה את עונה אם שואלים מוקדם מדי.", minutes: 20 },
      { id: "thank-you-ready", text: "הכיני מראש מסגרת לתודה תוך 24 שעות אחרי הראיון.", minutes: 5 },
    ],
  },
  ADVANCED_INTERVIEW: {
    title: "ראיון מתקדם — חברתי-טכני",
    steps: [
      { id: "deep-stories", text: "הוסיפי לסט הסיפורים גם 1-2 כשלים שלמדת מהם, ומה היית עושה אחרת.", minutes: 30 },
      { id: "leadership-examples", text: "אם רלוונטי לתפקיד: דוגמת מנהיגות / סבב משוב / קונפליקט בצוות.", minutes: 25 },
      { id: "industry-trends", text: "2 טרנדים בתעשייה שלהם וחיבור שלך אליהם — מראה גישה אסטרטגית.", minutes: 20 },
      { id: "team-fit-questions", text: "הכינו שאלות על מבנה הצוות, ניהול ועדיפויות — מסמן בגרות.", minutes: 15 },
    ],
  },
  TASK_HOME: {
    title: "משימת בית — הצלחה תחרותית",
    steps: [
      { id: "scope-clarify", text: "ודאי שאת מבינה מה התוצאה הצפויה: מצגת? מסמך? קוד? פגישה?", minutes: 10 },
      { id: "constraints", text: "תוך כמה זמן את אמורה להגיש — הקפידי להגיש קצת לפני הזמן.", minutes: 5 },
      { id: "draft", text: "טיוטה ראשונה מהירה — לא מושלם, לעבוד עם משוב עצמי.", minutes: 60 },
      { id: "polish", text: "עריכה: שגיאות הקלדה, עיצוב נקי, פתיח שמסביר את הגישה.", minutes: 30 },
      { id: "feedback", text: "אם אפשר — בקשי משוב מאחת מהקולגות שלך לפני שליחה.", minutes: 15 },
    ],
  },
  OFFER: {
    title: "התקבלת! מה עכשיו",
    steps: [
      { id: "celebrate", text: "תני לעצמך כבוד — זה ניצחון אמיתי. 🎉", minutes: 5 },
      { id: "review-offer", text: "עברי על ההצעה: שכר בסיס, בונוסים, אופציות, חופשה, הטבות.", minutes: 30 },
      { id: "negotiate", text: "תמיד יש מקום למו״מ נימוסי — שלחי בקשה ספציפית בכתב.", minutes: 30 },
      { id: "compare", text: "אם יש הצעה נוספת בצנרת — בקשי כמה ימים ובדקי איתה.", minutes: 20 },
      { id: "decision", text: "החלטה. הודעה מקצועית למעסיקות הנוספות שלא נבחרו.", minutes: 15 },
    ],
  },
};
