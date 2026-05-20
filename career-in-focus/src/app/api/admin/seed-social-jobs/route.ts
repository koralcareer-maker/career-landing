/**
 * POST /api/admin/seed-social-jobs
 *
 * One-shot manual import for the חברה וקהילה category. Gemini's
 * auto-fetcher is currently 429-blocked on the project's free-tier
 * quota, so this seeds 35 curated entries pointing at:
 *   - Pre-filtered keyword searches on Drushim / AllJobs / JobMaster /
 *     LinkedIn — those URLs always have current openings and never go
 *     stale because the boards refresh them daily.
 *   - Stable career landing pages for major Israeli social-sector
 *     employers (Joint, WIZO, AKIM, Yad Sarah, Beit Issie Shapiro,
 *     Elem, Latet) where members can browse current vacancies.
 *
 * Idempotent — dedups on externalUrl, so re-hitting the endpoint
 * just no-ops for entries that already exist.
 *
 * Admin-only, POST. Hit it from /admin/jobs once.
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
  location?: string;
  region?: string;
  externalUrl: string;
}

const SOCIAL_JOBS: SeedJob[] = [
  // ── Drushim keyword searches (always fresh) ─────────────────────────
  {
    title: "עובד/ת סוציאלי/ת — משרות פעילות",
    company: "דרושים IL",
    description: "כל משרות העובד/ת סוציאלי/ת הפעילות ברחבי הארץ. הקליקי וצפי במשרות מ-30 הימים האחרונים.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%A2%D7%95%D7%91%D7%93+%D7%A1%D7%95%D7%A6%D7%99%D7%90%D7%9C%D7%99",
  },
  {
    title: "רכז/ת קהילה במתנ\"ס",
    company: "דרושים IL",
    description: "משרות רכז/ת קהילה במתנסים ומרכזים קהילתיים בכל הארץ.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%A8%D7%9B%D7%96+%D7%A7%D7%94%D7%99%D7%9C%D7%94+%D7%9E%D7%AA%D7%A0%D7%A1",
  },
  {
    title: "מדריך/ת נוער בסיכון",
    company: "דרושים IL",
    description: "תפקידי הדרכה לנוער בסיכון ונוער מנותק. דורש אהבה לנוער ויכולת חברתית גבוהה.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%9E%D7%93%D7%A8%D7%99%D7%9A+%D7%A0%D7%95%D7%A2%D7%A8+%D7%91%D7%A1%D7%99%D7%9B%D7%95%D7%9F",
  },
  {
    title: "מטפל/ת בבריאות הנפש",
    company: "דרושים IL",
    description: "משרות לעובדי בריאות הנפש בקהילה, מרפאות, ובתי חולים.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%91%D7%A8%D7%99%D7%90%D7%95%D7%AA+%D7%94%D7%A0%D7%A4%D7%A9",
  },
  {
    title: "עובד/ת שיקום",
    company: "דרושים IL",
    description: "תפקידי שיקום לאנשים עם מוגבלות וצרכים מיוחדים, ביתי וקהילתי.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%A2%D7%95%D7%91%D7%93+%D7%A9%D7%99%D7%A7%D7%95%D7%9D",
  },
  {
    title: "רכז/ת חינוך בלתי-פורמלי",
    company: "דרושים IL",
    description: "רכזי תכניות חינוכיות לאחר שעות הלימודים, תנועות נוער, קייטנות וקבוצות.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%97%D7%99%D7%A0%D7%95%D7%9A+%D7%91%D7%9C%D7%AA%D7%99+%D7%A4%D7%95%D7%A8%D7%9E%D7%9C%D7%99",
  },
  {
    title: "מנהל/ת פרויקטים בעמותה",
    company: "דרושים IL",
    description: "ניהול פרויקטים חברתיים בעמותות וארגונים ללא מטרת רווח.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%9E%D7%A0%D7%94%D7%9C+%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98%D7%99%D7%9D+%D7%A2%D7%9E%D7%95%D7%AA%D7%94",
  },
  {
    title: "מטפל/ת בילדים ובני נוער",
    company: "דרושים IL",
    description: "פסיכותרפיה ועבודה טיפולית עם ילדים, מתבגרים ומשפחותיהם.",
    region: "מרכז",
    externalUrl: "https://www.drushim.co.il/search?q=%D7%9E%D7%98%D7%A4%D7%9C+%D7%99%D7%9C%D7%93%D7%99%D7%9D",
  },

  // ── AllJobs keyword searches ────────────────────────────────────────
  {
    title: "עובד/ת סוציאלי/ת — חיפוש פעיל",
    company: "AllJobs",
    description: "כל משרות העובד/ת סוציאלי/ת המתפרסמות ב-AllJobs. עם פילטרים לפי מיקום וניסיון.",
    region: "מרכז",
    externalUrl: "https://www.alljobs.co.il/SearchResultsGuest.aspx?String=%D7%A2%D7%95%D7%91%D7%93%20%D7%A1%D7%95%D7%A6%D7%99%D7%90%D7%9C%D7%99",
  },
  {
    title: "רכז/ת בעמותה",
    company: "AllJobs",
    description: "תפקידי רכזת בעמותות וארגונים חברתיים בארץ.",
    region: "מרכז",
    externalUrl: "https://www.alljobs.co.il/SearchResultsGuest.aspx?String=%D7%A8%D7%9B%D7%96%20%D7%A2%D7%9E%D7%95%D7%AA%D7%94",
  },
  {
    title: "מנחה/ה קבוצות",
    company: "AllJobs",
    description: "הנחיית קבוצות טיפוליות, חינוכיות וחברתיות במגוון מסגרות.",
    region: "מרכז",
    externalUrl: "https://www.alljobs.co.il/SearchResultsGuest.aspx?String=%D7%9E%D7%A0%D7%97%D7%94%20%D7%A7%D7%91%D7%95%D7%A6%D7%95%D7%AA",
  },
  {
    title: "רכז/ת גיוס תרומות",
    company: "AllJobs",
    description: "פיתוח משאבים וגיוס תרומות לעמותות. דורש כתיבה מצוינת ויכולת מכירה.",
    region: "מרכז",
    externalUrl: "https://www.alljobs.co.il/SearchResultsGuest.aspx?String=%D7%92%D7%99%D7%95%D7%A1%20%D7%AA%D7%A8%D7%95%D7%9E%D7%95%D7%AA",
  },
  {
    title: "מטפל/ת בקבוצה תמיכה",
    company: "AllJobs",
    description: "טיפול קבוצתי בקבוצות תמיכה — פגיעה מינית, אבל, נכים, ועוד.",
    region: "מרכז",
    externalUrl: "https://www.alljobs.co.il/SearchResultsGuest.aspx?String=%D7%A7%D7%91%D7%95%D7%A6%D7%AA%20%D7%AA%D7%9E%D7%99%D7%9B%D7%94",
  },

  // ── JobMaster keyword searches ──────────────────────────────────────
  {
    title: "עובד/ת רווחה",
    company: "JobMaster",
    description: "משרות במחלקות רווחה ברשויות מקומיות, בארץ.",
    region: "מרכז",
    externalUrl: "https://www.jobmaster.co.il/jobs/?st=%D7%A2%D7%95%D7%91%D7%93%20%D7%A8%D7%95%D7%95%D7%97%D7%94",
  },
  {
    title: "עובד/ת קהילה",
    company: "JobMaster",
    description: "תפקידי עבודה קהילתית בפיתוח שכונות, פרויקטים חברתיים ומרכזים קהילתיים.",
    region: "מרכז",
    externalUrl: "https://www.jobmaster.co.il/jobs/?st=%D7%A2%D7%95%D7%91%D7%93%20%D7%A7%D7%94%D7%99%D7%9C%D7%94",
  },
  {
    title: "עובד/ת חינוכי/ת בפנימייה",
    company: "JobMaster",
    description: "תפקידי חינוך וטיפול בפנימיות לילדים ונוער.",
    region: "מרכז",
    externalUrl: "https://www.jobmaster.co.il/jobs/?st=%D7%A4%D7%A0%D7%99%D7%9E%D7%99%D7%99%D7%94",
  },

  // ── LinkedIn keyword searches (Israel-scoped) ───────────────────────
  {
    title: "Social Worker — LinkedIn",
    company: "LinkedIn Jobs",
    description: "All Social Worker openings in Israel posted on LinkedIn in the last 30 days.",
    region: "מרכז",
    externalUrl: "https://www.linkedin.com/jobs/search/?keywords=Social%20Worker&location=Israel",
  },
  {
    title: "Community Manager (Non-Profit) — LinkedIn",
    company: "LinkedIn Jobs",
    description: "Community management roles at Israeli non-profits and impact organizations.",
    region: "מרכז",
    externalUrl: "https://www.linkedin.com/jobs/search/?keywords=Community%20Manager%20Non%20Profit&location=Israel",
  },
  {
    title: "Mental Health Practitioner — LinkedIn",
    company: "LinkedIn Jobs",
    description: "Mental health roles at clinics, NGOs, and community-based programs in Israel.",
    region: "מרכז",
    externalUrl: "https://www.linkedin.com/jobs/search/?keywords=Mental%20Health&location=Israel",
  },
  {
    title: "Non-Profit Project Manager — LinkedIn",
    company: "LinkedIn Jobs",
    description: "Project / program management roles in Israeli non-profits.",
    region: "מרכז",
    externalUrl: "https://www.linkedin.com/jobs/search/?keywords=Non%20Profit%20Project%20Manager&location=Israel",
  },
  {
    title: "Youth Counselor — LinkedIn",
    company: "LinkedIn Jobs",
    description: "Youth counselor and youth-at-risk positions across Israeli NGOs and municipalities.",
    region: "מרכז",
    externalUrl: "https://www.linkedin.com/jobs/search/?keywords=Youth%20Counselor&location=Israel",
  },

  // ── Specific major Israeli social-sector employers ──────────────────
  {
    title: "ג'וינט ישראל — קריירה",
    company: "JDC ישראל",
    description: "ג'וינט ישראל פועלים לקדם רווחה, חינוך והעצמה כלכלית. דרושים לתכניות שירותי הגיל המבוגר, נוער, ועוד.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://www.jdc.org.il/about/career/",
  },
  {
    title: "ויצ\"ו — דרושים",
    company: "ויצ\"ו",
    description: "ארגון נשים גדול בישראל שמפעיל מעונות יום, פנימיות, ומרכזי טיפול. משרות במגוון רחב.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.wizo.org.il/",
  },
  {
    title: "אקים ישראל — דרושים",
    company: "אקים",
    description: "ארגון לאנשים עם מוגבלות שכלית. דרושים מדריכים, מטפלים ועובדי שירותי שיקום.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.akim.org.il/",
  },
  {
    title: "יד שרה — דרושים",
    company: "יד שרה",
    description: "ארגון התנדבותי עם 100+ סניפים. דרושים לתפקידי ניהול סניפים, מתאמי השאלות ופרויקטים.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://www.yadsarah.org.il/",
  },
  {
    title: "בית איזי שפירא — דרושים",
    company: "בית איזי שפירא",
    description: "מרכז מקיף לטיפול ושיקום אנשים עם מוגבלויות. דרושים מטפלים, פיזיותרפיסטים, רפואיים וניהוליים.",
    location: "רעננה",
    region: "מרכז",
    externalUrl: "https://www.beitissie.org.il/",
  },
  {
    title: "עמותת אל\"ם (Elem) — דרושים",
    company: "אל\"ם",
    description: "עמותה מובילה לנוער במצוקה. דרושים רכזים, מדריכים, ועובדי קליטה ברחבי הארץ.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.elem.org.il/",
  },
  {
    title: "עמותת לתת — דרושים",
    company: "לתת",
    description: "ארגון סיוע הומניטרי גדול בישראל. דרושים רכזים, מתאמי תכניות וגיוס תרומות.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.latet.org.il/",
  },
  {
    title: "מטה ההורים — דרושים",
    company: "מטה ההורים",
    description: "ארגון להורים לבני נוער. דרושים יועצי הורים, מנחי קבוצות ועובדי תמיכה.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.mateh.org.il/",
  },
  {
    title: "האגודה לזכויות האזרח — דרושים",
    company: "האגודה לזכויות האזרח",
    description: "עמותה לזכויות אדם. דרושים עורכי דין, חוקרי שטח ומתאמי קמפיינים.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://www.acri.org.il/he/",
  },
  {
    title: "ידיד — מרכזי זכויות בקהילה",
    company: "ידיד",
    description: "מרכזי זכויות בקהילה שעוזרים לאוכלוסיות חלשות. דרושים יועצי זכויות וקליניקאים.",
    location: "תל אביב",
    region: "מרכז",
    externalUrl: "https://www.yedid.org.il/",
  },
  {
    title: "משרד הרווחה — דרושים",
    company: "משרד הרווחה",
    description: "משרות במגוון אגפי משרד הרווחה — שירותי תפ\"ל, נוער, רווחה, נכים. דרך נציבות שירות המדינה.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://ecom.gov.il/Vacancies/PublicTender.aspx",
  },
  {
    title: "ביטוח לאומי — דרושים",
    company: "ביטוח לאומי",
    description: "משרות פקידי ביטוח לאומי, רכזים סוציאליים, ועובדי קהילה ב-19 הסניפים.",
    location: "ירושלים",
    region: "ירושלים",
    externalUrl: "https://www.btl.gov.il/About/Career/Pages/default.aspx",
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
          location: j.location ?? "ארצי",
          region: j.region ?? "מרכז",
          field: "חברה וקהילה",
          source: "סידור ידני — חברה וקהילה",
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
