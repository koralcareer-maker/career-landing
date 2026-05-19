/**
 * Categories the auto-fetcher hunts for. Each entry is a tight Hebrew
 * search query passed to Gemini's Google-grounded search. We aim for
 * 100 management, 100 tech, 100 "other professional" per Coral's spec —
 * spread across these queries so we get diversity, not 50 results
 * for the same job title.
 *
 * Each query is intentionally narrow ("מנהל פרויקטים תל אביב" rather
 * than "ניהול") so Gemini returns specific listings, not generic
 * advice. We also restrict the recency in the prompt itself.
 */

export interface FetchCategory {
  /** Internal label, also used as the `field` on the Job row. */
  field: string;
  /** Hebrew search query — Gemini uses this to ground in Google search. */
  query: string;
  /** Target count per fetch cycle. */
  target: number;
  /** Coarse experience hint. Gemini fills the real one when known. */
  experienceLevel?: string;
}

// ── Management (target: ~100 jobs every cycle, spread across roles) ──
export const MANAGEMENT: FetchCategory[] = [
  { field: "ניהול",          query: "מנהל פרויקטים ישראל", target: 12 },
  { field: "ניהול",          query: "מנהל תפעול ישראל", target: 12 },
  { field: "משאבי אנוש",     query: "מנהל משאבי אנוש ישראל", target: 12 },
  { field: "תעשייה",         query: "מנהל ייצור ישראל", target: 10 },
  { field: "לוגיסטיקה",      query: "מנהל שרשרת אספקה ישראל", target: 10 },
  { field: "ניהול",          query: "ראש צוות ישראל", target: 12 },
  { field: "כספים",          query: "מנהל כספים CFO ישראל", target: 8 },
  { field: "שיווק",          query: "מנהל שיווק ישראל", target: 10 },
  { field: "מכירות",         query: "מנהל מכירות ישראל", target: 8 },
  { field: "מוצר",           query: "מנהל מוצר Product Manager ישראל", target: 12 },
];

// ── Tech (target: ~100) ───────────────────────────────────────────────
export const TECH: FetchCategory[] = [
  { field: "פיתוח",          query: "Fullstack Developer Israel", target: 12 },
  { field: "פיתוח",          query: "Backend Engineer Israel", target: 12 },
  { field: "פיתוח",          query: "Frontend React Israel", target: 12 },
  { field: "פיתוח",          query: "DevOps Engineer Israel", target: 10 },
  { field: "דאטה",           query: "Data Analyst Israel", target: 12 },
  { field: "דאטה",           query: "Data Scientist Israel", target: 10 },
  { field: "QA",             query: "QA Engineer Israel", target: 10 },
  { field: "Cyber",          query: "Cyber Security Engineer Israel", target: 8 },
  { field: "AI/ML",          query: "Machine Learning Engineer Israel", target: 8 },
  { field: "Mobile",         query: "Mobile Developer iOS Android Israel", target: 8 },
];

// ── Other professional (target: ~100) ─────────────────────────────────
export const PROFESSIONAL: FetchCategory[] = [
  { field: "שיווק",          query: "תוכן ושיווק דיגיטלי ישראל", target: 10 },
  { field: "שיווק",          query: "Performance Marketing Israel", target: 10 },
  { field: "Customer Success", query: "Customer Success Manager Israel", target: 12 },
  { field: "מכירות",         query: "Account Manager Israel", target: 12 },
  { field: "מכירות",         query: "BDR SDR sales development Israel", target: 8 },
  { field: "גיוס",           query: "רכז גיוס Talent Acquisition ישראל", target: 10 },
  { field: "כספים",          query: "חשב שכר ראש צוות הנהלת חשבונות ישראל", target: 8 },
  { field: "עיצוב",          query: "UX UI Designer Israel", target: 10 },
  { field: "שירות לקוחות",   query: "נציג שירות לקוחות ישראל", target: 10 },
  { field: "תפעול",          query: "Operations Manager startup Israel", target: 10 },
];

// ── Social & Community sector (target: ~45) ───────────────────────────
// Added 2026-05-19 per Coral. Members in this field were under-served
// by the tech/management-heavy default mix. Queries lean toward real
// Israeli employers: עמותות, מתנ"סים, רווחה, בריאות הנפש, חינוך
// בלתי-פורמלי, נוער בסיכון. Average yield is ~4-6 real listings per
// query, so 10 queries should land ~40-60 jobs per fetch cycle.
export const SOCIAL: FetchCategory[] = [
  { field: "חברתי קהילתי",   query: "עובד סוציאלי משרד הרווחה ישראל", target: 6 },
  { field: "חברתי קהילתי",   query: "עובדת סוציאלית עמותה ישראל", target: 5 },
  { field: "חברתי קהילתי",   query: "רכז קהילה מתנס ישראל", target: 5 },
  { field: "חברתי קהילתי",   query: "מנהל פרויקטים בעמותה ישראל", target: 5 },
  { field: "חברתי קהילתי",   query: "מדריך נוער בסיכון ישראל", target: 4 },
  { field: "חברתי קהילתי",   query: "מנחה קבוצות בריאות הנפש ישראל", target: 4 },
  { field: "חברתי קהילתי",   query: "רכזת חינוך בלתי פורמלי ישראל", target: 4 },
  { field: "חברתי קהילתי",   query: "מנהלת מרכז משפחה רווחה ישראל", target: 4 },
  { field: "חברתי קהילתי",   query: "מתאם תוכניות חברתיות עירייה ישראל", target: 4 },
  { field: "חברתי קהילתי",   query: "רכז גיוס תרומות עמותה ישראל", target: 4 },
];

export const ALL_CATEGORIES = [...MANAGEMENT, ...TECH, ...PROFESSIONAL, ...SOCIAL];
