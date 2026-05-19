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
  "חברה וקהילה",
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
  //
  // The list below was rewritten after Coral noticed most of the
  // imported jobs were ending up in "אחר" — the previous rules only
  // covered English / multi-word fields and missed common one-word
  // Hebrew fields like "פיתוח", "ניהול", "מוצר", "דאטה" used by the
  // Greenhouse / Lever importers.

  if (/אבטחת.*מידע|cyber|סייבר/i.test(field)) return "אבטחת מידע וסייבר";
  if (/אבטחה|שומר/i.test(field)) return "אבטחה";
  if (/ad.?tech/i.test(f)) return "Ad - Tech";
  if (/ppc|google.?ads/i.test(f)) return "PPC";
  if (/אלקטרוניק|חומרה|hardware|electron/i.test(field)) return "אלקטרוניקה וחומרה";
  if (/ביטוח/i.test(field)) return "ביטוח";
  if (/מנכ.?ל|סמנכ.?ל|בכיר|c.level|\bvp\b|director/i.test(field)) return "בכירים";
  if (/בנייה|נדל.?ן|נדלן|real.?estate|אדריכל/i.test(field)) return "בנייה ונדל\"ן";
  if (/דיגיטל|digital/i.test(field)) return "דיגיטל";
  if (/השמה|recruit|hr.recruit|talent.?acqu/i.test(field)) return "חברת השמה";
  if (/עו.?ד|חוק|משפט|legal|law/i.test(field)) return "חוק ומשפט";
  // Social-sector + community work. Catches the fetcher's
  // "חברתי קהילתי" field plus common Hebrew variants and the typical
  // NGO / mental-health / welfare phrasing. Sits BEFORE the education
  // rule because "חינוך בלתי-פורמלי" is community work in Coral's
  // taxonomy, not classroom training.
  if (/חברתי|קהילתי|סוציאל|רווחה|עמות|מתנ.?ס|בריאות.?הנפש|חינוך.?בלתי.?פורמלי|nonprofit|non.?profit|\bngo\b/i.test(field)) {
    return "חברה וקהילה";
  }
  if (/חינוך|הדרכה|מורה|trainer/i.test(field)) return "חינוך והדרכה";
  if (/חשמל|electric/i.test(field)) return "חשמל";
  // Finance / accounting umbrella — catches every legacy variant
  // ("כספים", "פיננסים", "חשבונאות ופיננסים", "כספים, חשבונאות וכלכלה").
  if (/כספים|חשבונאות|כלכלה|פיננס|הנהלת.?חשבונות|בקרה.?תקציבית|finance|accounting|payroll|controller|treasur|tax\b/i.test(field)) {
    return "כספים, חשבונאות וכלכלה";
  }
  if (/לוגיסטיק|מחסן|שרשרת.?אספקה|supply.?chain|logistics|warehouse/i.test(field)) return "לוגיסטיקה ומחסנים";
  if (/מזכיר|אדמיניסטר|administrat|office.?manager|executive.?assist/i.test(field)) return "מזכירות ואדמיניסטרציה";
  if (/מחשוב|תשתיות|infrastruct|system.?admin|devops|sre\b/i.test(field)) return "מחשוב";
  if (/מכונות|תעשייה|ייצור|industr|manufactur/i.test(field)) {
    return "מכונות, תעשייה וייצור";
  }
  // Marketing / sales umbrella — covers all the AdTech employer rows
  // ("שיווק", "שיווק דיגיטלי", "מכירות", "Customer Success", BDR/SDR).
  if (/מכירות|שיווק|sales|market|customer.?success|csm\b|\bbdr\b|\bsdr\b|account.?manager|account.?executive|growth/i.test(field)) {
    return "מכירות ושיווק";
  }
  if (/מסעדנות|מלונאות|תיירות|hospitality|tourism|chef|מלצר/i.test(field)) {
    return "מסעדנות, מלונאות ותיירות";
  }
  if (/משאבי.?אנוש|\bhr\b|human.?resource|גיוס|רכז.?גיוס/i.test(field)) return "משאבי אנוש";
  if (/נהג|תחבורה|רכב|driver|transport/i.test(field)) return "נהגים, רכב ותחבורה";
  if (/מוקד|טלפוני|call.?center/i.test(field)) return "ניהול מוקדים טלפונים";
  if (/ניהול.?פרויקט|project.?manag|\bpm\b|pmo/i.test(field)) return "ניהול פרויקטים";
  if (/עיצוב|\bux\b|\bui\b|design|graphic|קריאייטיב|פרסום/i.test(field)) return "עיצוב";
  if (/קמעונאות|רכש|אופנ|retail|fashion|procure/i.test(field)) return "קמעונאות ורכש";
  // The "data" family always lives under תוכנה in our taxonomy — there's
  // no dedicated "data" bucket. Same for AI/ML and product.
  if (/דאטה|data\s*(scien|ana|engin|analyst)|machine.?learning|ml.?engineer|\bai\b|\bllm\b|nlp/i.test(field)) {
    return "תוכנה";
  }
  if (/מוצר|product.?manag|product.?owner|product.?lead/i.test(field)) {
    return "ניהול פרויקטים";
  }
  if (/dynamics.?365|salesforce|sap\b|erp\b|מחלקת.?crm|מנהל.?crm|crm.?(developer|architect|consultant)|אינטגרצי|integrat/i.test(field)) {
    return "הייטק";
  }
  if (/הייטק|high.?tech|startup|סטארטאפ/i.test(field)) {
    return "הייטק";
  }
  // Catches the bare Hebrew "פיתוח" used by every Greenhouse import,
  // plus all the English variants and stack-specific titles.
  if (/פיתוח|תוכנה|מתכנת|software|develop|engineer|frontend|backend|full.?stack|qa\b|tester|mobile/i.test(field)) {
    return "תוכנה";
  }
  if (/בק.?אופיס|תפעול.*משרד|back.?office/i.test(field)) return "תפעול ובק אופיס";
  // Operations is broader than "service" — Greenhouse imports tag many
  // ops manager / business-ops roles as just "תפעול". Hebrew \b doesn't
  // fire on Hebrew letters reliably in JS regex, so we use explicit
  // start/end / whitespace anchors instead.
  if (/^תפעול$|^תפעול\s|\sתפעול$|\sתפעול\s|operations\b/i.test(field)) return "תפעול ובק אופיס";
  if (/שירות.?לקוחות|customer.?service|\bsupport\b|נציג/i.test(field)) {
    return "תפעול ושירות לקוחות";
  }
  if (/בנקאות|bank/i.test(field)) return "כספים, חשבונאות וכלכלה";
  if (/אינטרנט|internet|web/i.test(field)) return "אינטרנט";
  // Generic "ניהול" without a domain → senior-management bucket. Below
  // all the more-specific rules so "ניהול מוקדים" / "ניהול פרויקטים"
  // hit their own buckets first.
  if (/^ניהול$|ניהול\s*כללי|management/i.test(field)) return "בכירים";

  return "אחר";
}
