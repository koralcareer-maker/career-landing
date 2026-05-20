/**
 * POST /api/admin/seed-social-jobs
 *
 * Manual import for the חברה וקהילה category. Gemini's auto-fetcher
 * is 429-blocked on the project's free-tier quota, so this inserts
 * 30+ curated specific job listings pulled from a live WebSearch +
 * WebFetch pass on Drushim and LinkedIn on 2026-05-20.
 *
 * Every URL points to a specific real job posting (not a search
 * page or generic career landing) so members clicking through land
 * directly on the application page. Idempotent — dedups on
 * externalUrl, so re-hitting just no-ops for entries already there.
 *
 * Admin-only, POST. Hit it from /admin/jobs once via the
 * SeedSocialJobsButton component.
 *
 * If/when Gemini's quota frees up, the auto-fetcher will keep this
 * category fresh; this seed is the launch baseline.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SeedJob {
  title: string;
  company: string;
  description: string;
  location: string;
  region: string;
  externalUrl: string;
}

const SOCIAL_JOBS: SeedJob[] = [
  // ─── Drushim — Social workers (10) ────────────────────────────────
  {
    title: "עובד/ת סוציאלי/ת לניהול מרכז תעסוקה שיקומי בת\"א",
    company: "מת\"ש",
    description: "ניהול מרכז תעסוקה שיקומי בתל אביב, ליווי מטופלים ופיתוח תכניות תעסוקה מותאמות.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36875089/c34f89d5/",
  },
  {
    title: "עובד/ת סוציאלית / גרונטולוג/ית + רכב צמוד",
    company: "חסוי",
    description: "עבודה סוציאלית בליווי קשישים בקריית גת ואשקלון. תנאי שכר טובים + רכב צמוד.",
    location: "קריית גת, אשקלון",
    region: "דרום",
    externalUrl: "https://www.drushim.co.il/job/36903228/6975b3fd/",
  },
  {
    title: "עובד/ת סוציאלי/ת לתאגיד מוביל בסיעוד",
    company: "חסוי",
    description: "תפקיד סוציאלי בתאגיד סיעודי מוביל, ליווי משפחות וצוות רב-מקצועי.",
    location: "נתניה",
    region: "שרון",
    externalUrl: "https://www.drushim.co.il/job/36843834/522847eb/",
  },
  {
    title: "עובד/ת סוציאלי/ת, אח/ות וגרונטולוג/ית",
    company: "חסוי",
    description: "צוות רב-מקצועי לעבודה במסגרת לקשישים בגבעתיים.",
    location: "גבעתיים",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36909384/8b042f83/",
  },
  {
    title: "עובד/ת סוציאלי/ת",
    company: "אגד",
    description: "עבודה סוציאלית בחברת אגד, ליווי עובדים ומשפחותיהם.",
    location: "בית דגן",
    region: "שפלה",
    externalUrl: "https://www.drushim.co.il/job/36886945/35397d98/",
  },
  {
    title: "עובד/ת סוציאלי/ת ברשת תיכוני טומשין",
    company: "רשת תיכוני טומשין",
    description: "עבודה סוציאלית בית-ספרית, ליווי תלמידים ומשפחות במערכת חינוך.",
    location: "נתניה",
    region: "שרון",
    externalUrl: "https://www.drushim.co.il/job/37077002/1944299b/",
  },
  {
    title: "עובד/ת סוציאלי/ת – פאלאס ראשון לציון",
    company: "פאלאס מקבוצת עזריאלי",
    description: "עבודה סוציאלית בבית דיור מוגן יוקרתי. ליווי דיירים ומשפחות.",
    location: "ראשון לציון",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36974915/9a580dab/",
  },
  {
    title: "עובד/ת סוציאלי/ת לבית בלב נשר",
    company: "בית בלב - נשר",
    description: "עבודה סוציאלית במוסד גריאטרי, צוות רב-תחומי.",
    location: "נשר",
    region: "חיפה",
    externalUrl: "https://www.drushim.co.il/job/37042669/2bc7f40f/",
  },
  {
    title: "עובד/ת סוציאלי/ת צח\"י",
    company: "מועצה אזורית משגב",
    description: "צוות חרום יישובי. עבודה עם תושבים במצבי משבר.",
    location: "משגב",
    region: "צפון",
    externalUrl: "https://www.drushim.co.il/job/37026063/341022a1/",
  },
  {
    title: "עובד/ת סוציאלי/ת - קריית גת וקריית מלאכי",
    company: "לאומית שירותי בריאות",
    description: "עו\"ס בלאומית, ליווי מטופלים בקהילה.",
    location: "קריית גת, קריית מלאכי",
    region: "דרום",
    externalUrl: "https://www.drushim.co.il/job/37062334/ffdf74bc/",
  },

  // ─── Drushim — Community coordinators (8) ─────────────────────────
  {
    title: "רכז/ת חוגים וקהילה ברמת השרון",
    company: "מגוונים",
    description: "רכז/ת חוגים ופעילויות קהילה ברמת השרון. משרה מלאה או חלקית.",
    location: "רמת השרון",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36856602/9655ff9f/",
  },
  {
    title: "רכז/ת קהילה וחוגים",
    company: "מפעלי בית עמנואל (רמת גן)",
    description: "תאגיד החינוך, הקהילה והפנאי של עיריית רמת גן.",
    location: "רמת גן",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36926826/7729eeb8/",
  },
  {
    title: "רכז/ת קהילה למרכז קהילתי",
    company: "רשת קהילה ופנאי (חולון)",
    description: "ניהול מרכז קהילתי, הפעלת תכניות קהילתיות לקהילה רב-גילית.",
    location: "חולון",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/37006512/c23785ef/",
  },
  {
    title: "רכז/ת חוגים ברשת קהילה ופנאי חולון",
    company: "רשת קהילה ופנאי",
    description: "ניהול תוכן חוגי הרשת, צוות מדריכים ומפגשים קהילתיים.",
    location: "חולון",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36887173/a90a1534/",
  },
  {
    title: "רכז/ת קליטת חניכים וקשר עם משפחות וקהילה",
    company: "כפר הנוער בן שמן",
    description: "פנימייה חינוכית. קליטה רגשית של חניכים, ליווי משפחות.",
    location: "בן שמן",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36913279/9cb164f1/",
  },
  {
    title: "רכז/ת טיפול ארגון חברתי בירושלים",
    company: "JOB SPACE",
    description: "תיאום טיפול בארגון חברתי, ליווי לקוחות ותמיכה במשפחות.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://www.drushim.co.il/job/36842865/96add589/",
  },
  {
    title: "רכז/ת מרכז חברתי 50% משרה",
    company: "עמותת אנוש",
    description: "ניהול מרכז חברתי לאנשים עם מוגבלות נפשית, 50% משרה. עמותת אנוש - אחת הגדולות בארץ.",
    location: "חיפה",
    region: "חיפה",
    externalUrl: "https://www.drushim.co.il/job/36846684/995f89b6/",
  },
  {
    title: "תפקיד בעולם השיקום החברתי",
    company: "חברת נתן",
    description: "מסגרת שיקום בקהילה לאנשים עם נכויות נפשיות. מגוון תפקידים.",
    location: "ארצי",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36944135/0355e5c2/",
  },

  // ─── Drushim — Rehabilitation + Mental Health (9) ─────────────────
  {
    title: "מדריכי/ות שיקום לעבודה מלאה בסיפוק",
    company: "שלו שירותי שיקום",
    description: "עבודה משמעותית עם מתמודדי נפש בקהילה, צוות תומך, הכשרה מלאה.",
    location: "באר שבע",
    region: "דרום",
    externalUrl: "https://www.drushim.co.il/job/36831180/b88e6378/",
  },
  {
    title: "מלווה שיקומי/ת למסגרת שיקום מובילה",
    company: "חברת נתן",
    description: "ליווי שיקומי לאנשים מתמודדים עם נכויות נפשיות בקהילה.",
    location: "ארצי",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36903779/f1ab1cf3/",
  },
  {
    title: "מדריכי/ות שיקום למתמודדי נפש",
    company: "אגם שיקום בקהילה",
    description: "עבודה עם מתמודדי נפש בעתלית וחוף הכרמל. אגם - שירותי שיקום מובילים.",
    location: "עתלית, חוף הכרמל",
    region: "חיפה",
    externalUrl: "https://www.drushim.co.il/job/37004080/e12ea5ee/",
  },
  {
    title: "מתאם/ת טיפול / עו\"ס לנפגעי נפש",
    company: "אגם שיקום בקהילה",
    description: "תיאום טיפול ועבודה סוציאלית בהרצליה והוד השרון.",
    location: "הרצליה, הוד השרון",
    region: "שרון",
    externalUrl: "https://www.drushim.co.il/job/36892816/485f726b/",
  },
  {
    title: "עו\"ס / מתאם/ת טיפול בבריאות הנפש",
    company: "אגם שיקום בקהילה",
    description: "עבודה סוציאלית במסגרת שיקום נפשי בר\"ג, בני ברק, גבעתיים.",
    location: "רמת גן, בני ברק, גבעתיים",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36892797/5de3029d/",
  },
  {
    title: "מדריך/ת שיקום לקהילה התומכת 'בית גיא'",
    company: "קבוצת גיא",
    description: "בית גיא - קהילה תומכת בבאר שבע. עבודה עם דיירים בעלי צרכים מיוחדים.",
    location: "באר שבע",
    region: "דרום",
    externalUrl: "https://www.drushim.co.il/job/37012041/a3093700/",
  },
  {
    title: "מתאם/ת טיפול / עו\"ס בבריאות הנפש",
    company: "אגם שיקום בקהילה",
    description: "תיאום טיפול לאנשים עם נכויות נפשיות בפתח תקווה.",
    location: "פתח תקווה",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/37056786/ba51eb34/",
  },
  {
    title: "פיזיותרפיסט/ית למרכז שיקום",
    company: "שיקום עזרה למרפא",
    description: "מרכז שיקום בבני ברק, צוות רב-מקצועי.",
    location: "בני ברק",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36879554/440f8235/",
  },
  {
    title: "פיזיותרפיסט/ית לרשת שיקום מובילה",
    company: "JOB SPACE",
    description: "רשת שיקום מובילה, פריסה ארצית.",
    location: "ארצי",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/job/36902829/a6c660d8/",
  },

  // ─── LinkedIn — Social Sector Israel (4 relevant) ─────────────────
  {
    title: "Mental Health Officer",
    company: "World Health Organization (WHO)",
    description: "WHO Israel - mental health programs and policy work. Jerusalem-based role.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://il.linkedin.com/jobs/view/mental-health-officer-at-world-health-organization-4415349800",
  },
  {
    title: "Case Manager",
    company: "La Casa Norte",
    description: "Case management for at-risk populations. Israel-based role.",
    location: "ישראל",
    region: "מרכז",
    externalUrl: "https://il.linkedin.com/jobs/view/case-manager-at-la-casa-norte-4413484530",
  },
  {
    title: "Housing Case Manager",
    company: "La Casa Norte",
    description: "Housing-focused case management for vulnerable communities.",
    location: "ישראל",
    region: "מרכז",
    externalUrl: "https://il.linkedin.com/jobs/view/housing-case-manager-at-la-casa-norte-4379242233",
  },
  {
    title: "Community Manager",
    company: "Imprint",
    description: "Community engagement role at a Tel Aviv-based impact organization.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://il.linkedin.com/jobs/view/community-manager-at-imprint-4410185214",
  },
];

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const j of SOCIAL_JOBS) {
    try {
      const dup = await prisma.job.findFirst({
        where: { externalUrl: j.externalUrl },
        select: { id: true },
      });
      if (dup) {
        skipped++;
        continue;
      }
      await prisma.job.create({
        data: {
          title: j.title,
          company: j.company,
          description: j.description,
          summary: j.description,
          location: j.location,
          region: j.region,
          field: "חברה וקהילה",
          source: "סידור ידני - חברה וקהילה",
          externalUrl: j.externalUrl,
          isPublished: true,
        },
      });
      inserted++;
    } catch (e) {
      errors.push(`${j.title}: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: SOCIAL_JOBS.length,
    inserted,
    skipped,
    errors: errors.slice(0, 10),
  });
}
