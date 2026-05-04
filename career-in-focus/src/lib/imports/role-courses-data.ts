/**
 * Curated course catalog for four operational/finance career tracks
 * Coral coaches but the platform didn't yet cover:
 *
 *   - רכש (procurement / purchasing)
 *   - אנליסט פיננסי (financial analyst)
 *   - לוגיסטיקה (logistics / supply chain)
 *   - ייבוא ייצוא (import / export, customs, INCOTERMS)
 *
 * Each entry is shaped to match the existing Course model. Titles and
 * descriptions deliberately include the Hebrew role keywords (רכש,
 * אנליסט, לוגיסטיקה, ייבוא, ייצוא) so the matching engine in
 * lib/matching.ts will surface them on the dashboard for members
 * whose targetRole / desiredField mentions any of these.
 *
 * `ctaUrl` is currently a placeholder (#) — Coral can update each row
 * via /admin/courses/[id]/edit once she's chosen the actual content
 * partner. The structure is right; the URLs can be filled in later
 * without code changes.
 */

export interface RoleCourseSeed {
  title:       string;
  description: string;
  category:    string;
  formatType:  string;
  accessType:  "FREE" | "INCLUDED" | "DISCOUNTED" | "PAID";
  ctaText:     string;
  ctaUrl:      string;
  /** Stable role tag — only used by the importer to detect duplicates so
   *  re-running the seed is idempotent. Not stored on the Course row. */
  tag:         "procurement" | "financial-analyst" | "logistics" | "import-export";
}

const PLACEHOLDER_URL = "#";

export const ROLE_COURSES: RoleCourseSeed[] = [
  // ─── רכש (Procurement / Purchasing) ──────────────────────────────────
  {
    tag: "procurement",
    title: "יסודות הרכש — מבוא לתפקיד קניין/ית",
    category: "רכש",
    formatType: "וידאו + מצגת",
    accessType: "INCLUDED",
    description:
      "כל מה שצריך לדעת בכניסה לתפקיד רכש: תהליך הרכישה מקצה לקצה, מסמכי PR/PO, ניהול ספקים, מדדי ביצוע (KPIs) ומקומך בארגון. מתאים לקניינים/יות חדשים/ות וגם לאלה שעוברים מתפקיד אחר.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "procurement",
    title: "ניהול משא ומתן עם ספקים — Negotiation for Buyers",
    category: "רכש",
    formatType: "וידאו + תרגולים",
    accessType: "INCLUDED",
    description:
      "טכניקות מו״מ ספציפיות לתפקיד רכש: BATNA, מבני תמחור, סעיפי SLA, התמודדות עם מונופול ספק. כולל 6 case studies ותרגולי roleplay.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "procurement",
    title: "Strategic Sourcing — בחירת ספקים אסטרטגית",
    category: "רכש",
    formatType: "קורס חיצוני",
    accessType: "DISCOUNTED",
    description:
      "מתודולוגיית 7-step sourcing של McKinsey/CIPS — מיפוי קטגוריה, RFI/RFP/RFQ, ניתוח Total Cost of Ownership והערכת ספקים. חברי קהילה מקבלים 25% הנחה.",
    ctaText: "לקורס בהנחה",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "procurement",
    title: "SAP MM למתחילים — מודול הרכש",
    category: "רכש",
    formatType: "וידאו + סביבת תרגול",
    accessType: "DISCOUNTED",
    description:
      "מבוא ל-SAP Materials Management: יצירת PR, PO, אישורים, קבלת טובין, התאמת חשבונית. הקורס שמרבית המעסיקים מצפים שתכיר/י לפני יום ראשון. תעודה בסיום.",
    ctaText: "לקורס בהנחה",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "procurement",
    title: "ניהול ספקים וחוזים — Vendor Management",
    category: "רכש",
    formatType: "וידאו + תבניות",
    accessType: "INCLUDED",
    description:
      "איך מנהלים תיק ספקים: הערכת ביצועים תקופתית, ספקים אסטרטגיים מול ספקי-on-spot, סעיפי חוזה קריטיים, ניהול סיכוני שרשרת אספקה. כולל תבניות חוזה ו-SLA.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },

  // ─── אנליסט פיננסי (Financial Analyst) ────────────────────────────────
  {
    tag: "financial-analyst",
    title: "Excel לאנליסט פיננסי — מודלים פיננסיים בפועל",
    category: "אנליסט פיננסי",
    formatType: "וידאו + קבצי תרגול",
    accessType: "INCLUDED",
    description:
      "Pivot מתקדם, Power Query, INDEX/MATCH, פונקציות פיננסיות (NPV, IRR, XIRR), בניית 3-statement model מאפס. הכלי הכי קריטי לתפקיד אנליסט/ית פיננסי/ת. כולל 8 קבצי תרגול אמיתיים.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "financial-analyst",
    title: "ניתוח דוחות כספיים — Financial Statement Analysis",
    category: "אנליסט פיננסי",
    formatType: "וידאו + מצגת",
    accessType: "INCLUDED",
    description:
      "מאזן, רווח והפסד, תזרים מזומנים — איך לקרוא, להשוות שנים, לחשב יחסים פיננסיים מרכזיים (ROE, Current Ratio, EBITDA margin) ולהבין סיפור פיננסי של חברה. כולל ניתוח דוח של חברה ציבורית בישראל.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "financial-analyst",
    title: "Financial Modeling — מודל DCF ומודל תקציב",
    category: "אנליסט פיננסי",
    formatType: "וידאו + Excel templates",
    accessType: "DISCOUNTED",
    description:
      "מהבסיס לתפעולי: DCF valuation, sensitivity analysis, תקציב גלגל (rolling forecast), מודל cap table. הקורס שראיונות אנליסט/ית פיננסי/ת מתחילים ממנו. חברי קהילה — 30% הנחה.",
    ctaText: "לקורס בהנחה",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "financial-analyst",
    title: "Power BI לאנליסטים פיננסיים",
    category: "אנליסט פיננסי",
    formatType: "וידאו + dashboards",
    accessType: "INCLUDED",
    description:
      "מ-Excel ל-Power BI: חיבור למקורות נתונים, יחסי טבלאות, DAX בסיסי, בניית דשבורד הנהלה (P&L, KPIs, drill-down). מיומנות שמופיעה ב-70% ממשרות אנליסט/ית פיננסי/ת היום.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "financial-analyst",
    title: "הכנה לראיון אנליסט פיננסי — שאלות טכניות + מקרי חברה",
    category: "אנליסט פיננסי",
    formatType: "PDF + סימולציות",
    accessType: "INCLUDED",
    description:
      "30 שאלות טכניות אופייניות (Walk me through a DCF, Why does WACC matter, EBITDA vs Net Income), 3 case studies מלאים עם פתרונות, ושאלות התנהגותיות מותאמות לתפקיד אנליסט/ית פיננסי/ת.",
    ctaText: "התחל/י הכנה",
    ctaUrl: PLACEHOLDER_URL,
  },

  // ─── לוגיסטיקה (Logistics / Supply Chain) ─────────────────────────────
  {
    tag: "logistics",
    title: "ניהול שרשרת אספקה — Supply Chain Fundamentals",
    category: "לוגיסטיקה",
    formatType: "וידאו + מצגת",
    accessType: "INCLUDED",
    description:
      "תזרים החומרים והמידע מספק עד לקוח: planning, sourcing, making, delivering, returns. הקורס שמתחיל בו כל מי שנכנס/ת לתפקיד לוגיסטיקה או שרשרת אספקה. כולל מקרי בוחן ישראלים.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "logistics",
    title: "ניהול מלאי — Inventory Management",
    category: "לוגיסטיקה",
    formatType: "וידאו + Excel",
    accessType: "INCLUDED",
    description:
      "EOQ, safety stock, ABC analysis, FIFO/FEFO, מדדי דיוק מלאי וספירות מחזוריות. כולל קובץ Excel לחישוב מודל מלאי בעצמך עם נתונים שלך מהעבודה.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "logistics",
    title: "Warehouse Management — תפעול מחסן",
    category: "לוגיסטיקה",
    formatType: "וידאו + checklist",
    accessType: "INCLUDED",
    description:
      "מתודולוגיות אחסון (random/dedicated, slotting), פיקינג (zone, batch, wave), receiving ו-shipping, KPIs של מחסן ו-WMS. מתאים גם למעבר מתפעול לניהול לוגיסטי.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "logistics",
    title: "Lean ו-Six Sigma בלוגיסטיקה — Yellow Belt",
    category: "לוגיסטיקה",
    formatType: "קורס חיצוני",
    accessType: "DISCOUNTED",
    description:
      "DMAIC, value stream mapping, 5S, kaizen — שיטות שיפור תהליכים שמופיעות בכמעט כל תיאור משרה לוגיסטי בכיר. תעודת Yellow Belt בינלאומית בסיום. חברי קהילה — 20% הנחה.",
    ctaText: "לקורס בהנחה",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "logistics",
    title: "SAP WM/EWM — מודולי מחסן ושרשרת אספקה",
    category: "לוגיסטיקה",
    formatType: "וידאו + סביבת תרגול",
    accessType: "DISCOUNTED",
    description:
      "Warehouse Management ב-SAP: מבני אחסון, סוגי תנועות, transfer orders, הזמנות איסוף, הקצאות. הקורס המעשי הראשון שכל מנהל/ת לוגיסטיקה צריכ/ה לסיים לפני ראיון בארגון גדול.",
    ctaText: "לקורס בהנחה",
    ctaUrl: PLACEHOLDER_URL,
  },

  // ─── ייבוא ייצוא (Import / Export, Customs, Trade) ────────────────────
  {
    tag: "import-export",
    title: "INCOTERMS 2020 — תנאי סחר בינלאומיים",
    category: "ייבוא ייצוא",
    formatType: "וידאו + טבלת השוואה",
    accessType: "INCLUDED",
    description:
      "11 תנאי INCOTERMS לעומק: מי משלמ/ת על המשלוח, מתי עוברת הבעלות, מי אחראי לסיכון. כל ראיון לתפקיד ייבוא/ייצוא מתחיל מכאן. כולל טבלת השוואה להדפסה.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "import-export",
    title: "מכס ומיסוי בייבוא — מבוא לעמיל/ת מכס",
    category: "ייבוא ייצוא",
    formatType: "וידאו + מצגת",
    accessType: "INCLUDED",
    description:
      "סיווג מכס (HS Code), מסי קנייה, מע״מ ביבוא, סוגי הצהרות, פטורים והקלות, הסכמי סחר חופשי שישראל חתומה עליהם. הידע הבסיסי שכל מי שעוסק/ת בייבוא חייב/ת.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "import-export",
    title: "מסמכי משלוח בינלאומיים — B/L, AWB, CMR",
    category: "ייבוא ייצוא",
    formatType: "PDF + דוגמאות",
    accessType: "INCLUDED",
    description:
      "Bill of Lading, Air Waybill, CMR, Packing List, Certificate of Origin — איך נראה כל מסמך, מה לבדוק, היכן נופלות הטעויות שעולות כסף. כולל סט דוגמאות אמיתיות ערוכות.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "import-export",
    title: "ניהול ספקים בינלאומיים — מסין ועד אירופה",
    category: "ייבוא ייצוא",
    formatType: "וידאו + מקרי בוחן",
    accessType: "INCLUDED",
    description:
      "התקשרות עם ספקים מסין, סוגיות תרבותיות, ביקורת איכות במקור (QC), ניהול lead time, התמודדות עם תקלות באמצע משלוח. שמיש גם לתפקידי ייבוא וגם לתפקידי רכש בינלאומי.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
  {
    tag: "import-export",
    title: "אנגלית עסקית לסחר חוץ — Import/Export Communication",
    category: "ייבוא ייצוא",
    formatType: "וידאו + תבניות מיילים",
    accessType: "INCLUDED",
    description:
      "טרמינולוגיית סחר באנגלית, ניסוחי מיילים נפוצים (RFQ, follow-up, complaint), שיחות טלפון מקצועיות, שאלות בעיתיות בראיון בינלאומי. כולל 30 תבניות מייל מוכנות.",
    ctaText: "התחל/י את הקורס",
    ctaUrl: PLACEHOLDER_URL,
  },
];
