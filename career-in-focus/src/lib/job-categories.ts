/**
 * Canonical job category list — Coral's fixed taxonomy from civi.co.il.
 *
 * Used by:
 *   - /jobs page filter (shows all categories, even with 0 jobs)
 *   - Civi import routes (tags each scraped job with one category)
 *   - The future /api/cron/import-civi-by-category job
 *
 * 32 categories total. Sorted alphabetically using Hebrew locale rules
 * (English-prefixed entries like "Ad - Tech" and "PPC" appear at the
 * start because of Unicode ordering — that matches what civi.co.il
 * itself shows on its category nav).
 */

export const JOB_CATEGORIES = [
  "Ad - Tech",
  "PPC",
  "אבטחה",
  "אבטחת מידע וסייבר",
  "אחר",
  "אינטרנט",
  "אלקטרוניקה וחומרה",
  "ביטוח",
  "בכירים",
  "בנייה ונדל\"ן",
  "דיגיטל",
  "הייטק",
  "חברת השמה",
  "חוק ומשפט",
  "חינוך והדרכה",
  "חשמל",
  "כספים, חשבונאות וכלכלה",
  "לוגיסטיקה ומחסנים",
  "מזכירות ואדמיניסטרציה",
  "מחשוב",
  "מכונות, תעשייה וייצור",
  "מכירות ושיווק",
  "מסעדנות, מלונאות ותיירות",
  "משאבי אנוש",
  "משרות כלליות",
  "נהגים, רכב ותחבורה",
  "ניהול מוקדים טלפונים",
  "ניהול פרויקטים",
  "עיצוב",
  "קמעונאות ורכש",
  "תוכנה",
  "תפעול ובק אופיס",
  "תפעול ושירות לקוחות",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

/**
 * Map a free-form `field` string from the legacy data to a canonical
 * category. We keep this matching deliberately simple (substring
 * scan) — the goal is best-effort bucketing so existing jobs still
 * appear when the user filters by a category. New imports go through
 * /api/admin/import-civi-jobs-* and should set the category directly.
 *
 * Order of substring tests matters: more specific matches come first
 * so e.g. "אבטחת מידע" is caught before "אבטחה".
 */
export function mapFieldToCategory(field: string | null | undefined): JobCategory {
  if (!field) return "אחר";
  const f = field.toLowerCase();

  // Exact-match fast path — if the field IS already a canonical category.
  for (const c of JOB_CATEGORIES) {
    if (field === c) return c;
  }

  // Substring rules. Tighter ones first.
  if (/אבטחת.*מידע|cyber|סייבר/i.test(field)) return "אבטחת מידע וסייבר";
  if (/אבטחה|שומר/i.test(field)) return "אבטחה";
  if (/ad.?tech/i.test(f)) return "Ad - Tech";
  if (/ppc|google.?ads/i.test(f)) return "PPC";
  if (/אלקטרוניק|חומרה|hardware|electron/i.test(field)) return "אלקטרוניקה וחומרה";
  if (/ביטוח/i.test(field)) return "ביטוח";
  if (/מנכ.?ל|סמנכ.?ל|בכיר|c.level|vp|director/i.test(field)) return "בכירים";
  if (/בנייה|נדל.?ן|נדלן|real.?estate|אדריכל/i.test(field)) return "בנייה ונדל\"ן";
  if (/דיגיטל|digital/i.test(field)) return "דיגיטל";
  if (/השמה|recruit|hr.recruit/i.test(field)) return "חברת השמה";
  if (/עו.?ד|חוק|משפט|legal|law/i.test(field)) return "חוק ומשפט";
  if (/חינוך|הדרכה|מורה|trainer/i.test(field)) return "חינוך והדרכה";
  if (/חשמל|electric/i.test(field)) return "חשמל";
  if (/כספים|חשבונאות|כלכלה|הנהלת.?חשבונות|finance|accounting/i.test(field)) {
    return "כספים, חשבונאות וכלכלה";
  }
  if (/לוגיסטיק|מחסן|logistics|warehouse/i.test(field)) return "לוגיסטיקה ומחסנים";
  if (/מזכיר|אדמיניסטר|administrat/i.test(field)) return "מזכירות ואדמיניסטרציה";
  if (/מחשוב|תשתיות|infrastruct|system.?admin/i.test(field)) return "מחשוב";
  if (/מכונות|תעשייה|ייצור|industr|manufactur/i.test(field)) {
    return "מכונות, תעשייה וייצור";
  }
  if (/מכירות|שיווק|sales|market/i.test(field)) return "מכירות ושיווק";
  if (/מסעדנות|מלונאות|תיירות|hospitality|tourism|chef|מלצר/i.test(field)) {
    return "מסעדנות, מלונאות ותיירות";
  }
  if (/משאבי.?אנוש|hr\b|human.?resource/i.test(field)) return "משאבי אנוש";
  if (/נהג|תחבורה|רכב|driver|transport/i.test(field)) return "נהגים, רכב ותחבורה";
  if (/מוקד|טלפוני|call.?center/i.test(field)) return "ניהול מוקדים טלפונים";
  if (/ניהול.?פרויקט|project.?manag|pm\b/i.test(field)) return "ניהול פרויקטים";
  if (/עיצוב|ux|ui|design/i.test(field)) return "עיצוב";
  if (/קמעונאות|רכש|אופנ|retail|fashion|procure/i.test(field)) return "קמעונאות ורכש";
  if (/dynamics.?365|salesforce|sap\b|erp\b|מחלקת.?crm|מנהל.?crm|crm.?(developer|architect|consultant)|אינטגרצי|integrat/i.test(field)) {
    return "הייטק";
  }
  if (/הייטק|high.?tech|startup|סטארטאפ/i.test(field)) {
    return "הייטק";
  }
  if (/תוכנה|מתכנת|software|develop|frontend|backend|full.?stack/i.test(field)) {
    return "תוכנה";
  }
  if (/בק.?אופיס|תפעול.*משרד|back.?office/i.test(field)) return "תפעול ובק אופיס";
  if (/שירות.?לקוחות|customer.?service|service|תפעול/i.test(field)) {
    return "תפעול ושירות לקוחות";
  }
  if (/בנקאות|bank/i.test(field)) return "כספים, חשבונאות וכלכלה";
  if (/אינטרנט|internet|web/i.test(field)) return "אינטרנט";

  return "אחר";
}
