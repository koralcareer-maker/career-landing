/**
 * Monthly Toolbox content.
 *
 * Coral's positioning (2026-05-19): the platform shouldn't feel
 * static, and the old "personal analysis" feature wasn't moving the
 * needle. So we replaced it with a curated set of career tools that
 * refreshes every month. Each month gets its own short list (5 to
 * 10 items), surfaced on /toolbox.
 *
 * Until we wire up an admin CRUD for this, the list lives in code
 * and Coral updates it via a code edit each month. That's fine for
 * the first few months while we see if the feature sticks.
 *
 * Each `MonthlyToolset` keys off the YYYY-MM month string. The
 * /toolbox page picks the current month's set, falling back to the
 * most recent if nothing's defined for the current month yet.
 */

export type ToolboxCategory =
  | "ai"           // AI-powered tools / GPT / Claude / Gemini integrations
  | "jobs"         // Job sources / boards
  | "networking"   // Networking / community / chat groups
  | "cv"           // CV / resume templates / writing aids
  | "interview"    // Interview prep
  | "trend"        // Market trends / data / reports
  | "skill"        // Courses / learning / certifications
  | "tool";        // Generic productivity tool

export interface ToolboxItem {
  id: string;
  category: ToolboxCategory;
  title: string;
  /** One-sentence "what this is" — keep under ~80 chars. */
  blurb: string;
  /** Why it matters THIS month. The freshness hook. */
  whyNow: string;
  /** External URL the user clicks through to. */
  url: string;
  /** Optional small label like "חדש", "מומלץ ביותר", "חינמי". */
  badge?: string;
}

export interface MonthlyToolset {
  /** YYYY-MM, e.g. "2026-05". */
  month: string;
  /** Hebrew display label, e.g. "מאי 2026". */
  label: string;
  /** Short intro shown above the tools. */
  intro: string;
  items: ToolboxItem[];
}

export const MONTHLY_TOOLBOX: MonthlyToolset[] = [
  {
    month: "2026-05",
    label: "מאי 2026",
    intro:
      "ארגז הכלים החודשי שלך לחיפוש עבודה. כל חודש אני בודקת מה השתנה בשטח (כלים חדשים, מקורות שעובדים, טכניקות שמשתנות) ומעדכנת לך פה את 6 הדברים שכל אחת בקריירה בפוקוס חייבת להכיר השבוע הזה.",
    items: [
      {
        id: "may-2026-claude-cv",
        category: "ai",
        title: "Claude 4 לעריכת קו\"ח",
        blurb: "אנתרופיק שחררה גרסה חדשה שיודעת לסרוק קו\"ח ולהציע ניסוחים מותאמים אישית.",
        whyNow: "ההבדל מ-ChatGPT: מבין הקשר עברי טוב יותר ולא ממציא הישגים שלא קיימים.",
        url: "https://claude.ai",
        badge: "חדש",
      },
      {
        id: "may-2026-linkedin-easy-apply",
        category: "jobs",
        title: "מסנן Easy Apply מתקדם בלינקדאין",
        blurb: "סינון מהיר של משרות שמאפשרות הגשה ישירה בלי לעבור לאתר חיצוני.",
        whyNow: "חוסך כ-40% מזמן ההגשה. מתאים מאוד למחפשות עם 50+ הגשות בשבוע.",
        url: "https://www.linkedin.com/jobs/search/?f_AL=true",
      },
      {
        id: "may-2026-cv-template-2026",
        category: "cv",
        title: "תבנית קו\"ח 2026 (פורמט שלי)",
        blurb: "התבנית שאני משתמשת בה אצל כל המתאמנות. ATS-friendly, ללא טבלאות.",
        whyNow: "עודכנה החודש: שורת \"AI literacy\" חדשה בקטע הכישורים, סדר עדכני של הסעיפים.",
        url: "/cv-template-2026",
        badge: "התבנית של קורל",
      },
      {
        id: "may-2026-secret-jobs-wa",
        category: "networking",
        title: "קבוצת WhatsApp \"משרות סמויות במרכז\"",
        blurb: "קבוצה פרטית של מגייסות פנימיות שמשתפות משרות לפני שמתפרסמות בלוחות.",
        whyNow: "החודש נפתחו 14 משרות סמויות, רובן בהייטק ובסטארטאפים בתל אביב.",
        url: "/community-rooms",
        badge: "סמוי",
      },
      {
        id: "may-2026-mock-interviews",
        category: "interview",
        title: "תרגול ראיון עם מאמן ה-AI",
        blurb: "סימולציית ראיון אינטראקטיבית. את עונה, המאמן נותן פידבק על כל תשובה.",
        whyNow: "השקתי החודש סטים חדשים של שאלות לתפקידי CSM, מנהלי פרויקטים ומש\"א.",
        url: "/coaching",
      },
      {
        id: "may-2026-market-report",
        category: "trend",
        title: "דו\"ח שכר ומגמות Q2 2026",
        blurb: "השוואת שכר עדכנית לפי תפקיד ותחום מתוך נתוני 200+ משרות בחודש האחרון.",
        whyNow: "המספר שמפתיע: שכר ה-Customer Success עלה ב-12% מתחילת השנה.",
        url: "/market-intel",
        badge: "Q2 2026",
      },
    ],
  },
];

/**
 * Pick the active month: prefer the toolset with month equal to
 * today's YYYY-MM; otherwise return the most recent one. Lets us add
 * future months in advance (e.g. drop June 2026 in early May) and
 * have them light up on the 1st automatically.
 */
export function currentToolset(now: Date = new Date()): MonthlyToolset | null {
  if (MONTHLY_TOOLBOX.length === 0) return null;
  const ymd = now.toISOString().slice(0, 7); // YYYY-MM
  const exact = MONTHLY_TOOLBOX.find((t) => t.month === ymd);
  if (exact) return exact;
  // Fall back to the latest available month (sorted descending).
  return [...MONTHLY_TOOLBOX].sort((a, b) => (a.month < b.month ? 1 : -1))[0];
}
