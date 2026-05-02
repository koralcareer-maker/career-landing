import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * One-shot admin endpoint that seeds 11 vetted job listings from civi.co.il
 * into the Job table. Idempotent: re-running it skips jobs whose externalUrl
 * already exists, so it's safe to call multiple times.
 *
 * Trigger from a logged-in admin browser tab via the DevTools console:
 *   await fetch("/api/admin/import-civi-jobs", { method: "POST" }).then(r=>r.json())
 *
 * Or via curl with the auth cookie. After the import is done it can be
 * deleted, but it's also fine to leave it as a reusable bulk-import shim.
 */

interface CiviJobSeed {
  externalUrl: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  field: string;
  experienceLevel: string | null;
}

const JOBS: CiviJobSeed[] = [
  {
    externalUrl: "https://app.civi.co.il/promo/id=906883&src=16379",
    title: "אנשי/ות מכירות שטח — מוצרי מתכת ואלומיניום",
    company: "חברת מתכת ואלומיניום",
    location: "ארצי (השרון - דרום)",
    summary:
      "משרה מלאה במכירות שטח של מוצרי מתכת — מעקות, פרגולות, שערים חכמים, פתרונות הצללה וחיפויים. שכר בסיס בתקופת הכשרה ועמלות גבוהות מאוד.",
    field: "מכירות שטח",
    experienceLevel: "ניסיון מוכח במכירות שטח (חובה), עדיפות לתחום הבנייה/אלומיניום",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=599256&src=16379",
    title: "מנהל/ת לקוחות לסוכנות שיווק לאפליקציות",
    company: "סוכנות שיווק דיגיטלי",
    location: "רמת החייל",
    summary:
      "הובלת תחום הלקוחות בחברה המתמחה בשיווק דיגיטלי מבוסס דאטה, כולל ניהול צוות, פיתוח אסטרטגיות שיווקיות והנהלת קשרים עם לקוחות בכירים.",
    field: "שיווק דיגיטלי",
    experienceLevel: "ניסיון של שנתיים לפחות",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=911365&src=16379",
    title: "מנהל/ת משרד",
    company: "חברת היי-טק בתחום AI ו-Computer Vision",
    location: "ראש העין",
    summary:
      "ניהול משרד שירותי ומלא אנרגיה: ניהול יומנים, תפעול משרד, יצירת אווירה חיובית והובלת היום-יום של החברה.",
    field: "ניהול משרד / היי-טק",
    experienceLevel: "ניסיון בניהול משרד — חובה",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=514809&src=16379",
    title: "רפרנט/ית קשרי לקוחות",
    company: "חברת תקשורת מובילה",
    location: "פתח תקווה",
    summary:
      "תפקיד פיננסי משמעותי: קשר שוטף עם מעסיקים ועובדים זרים וטיפול בפניות בנושא כרטיסי שכר. משרת אם זמינה (8:00/8:30-15:00/15:30).",
    field: "תקשורת / פיננסים",
    experienceLevel: null,
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=905301&src=16379",
    title: "System Administrator — צוות תשתיות בכיר",
    company: "DigitalHunters",
    location: "ירושלים",
    summary:
      "ניהול מערכות ליבה ארגוניות בארגון גדול: שרתים, SharePoint ו-Microsoft 365. עבודה בצוות תשתיות מוביל בירושלים.",
    field: "מערכות מידע / תשתיות",
    experienceLevel: "מינימום 4 שנות ניסיון בארגון 500+ משתמשים",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=973790&src=16379",
    title: "טכנאי/ת סלולר עם אוריינטציה מכירתית",
    company: "DigitalHunters",
    location: "רעננה",
    summary:
      "תפקיד משולב: תיקוני מכשירים סלולריים + מכירת מוצרים ושירותים. אבחון תקלות, שירות לקוחות ועמידה ביעדי מכירה.",
    field: "טכנאות סלולר / מכירות",
    experienceLevel: "שנת ניסיון בתיקוני סלולר (חובה)",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=898495&src=16379",
    title: "מנהל/ת משאבי אנוש לרשת קמעונאית",
    company: "רשת קמעונאית מובילה",
    location: "מודיעין",
    summary:
      "ניהול משאבי אנוש ומערך גיוס בדגש על פרויקטים נרחבים. ממשק ישיר עם מנהלי אזורים וסניפים בפריסה ארצית.",
    field: "משאבי אנוש וגיוס",
    experienceLevel: "ניסיון מוכח בגיוס ומשאבי אנוש; ניסיון בקמעונאות יתרון",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=813497&src=16379",
    title: "חשב/ת שכר בכיר/ה",
    company: "DigitalHunters",
    location: "מודיעין",
    summary:
      "טיפול בתהליכי שכר מקצה לקצה: קליטה, שינויים, דיווחים לרשויות וניהול מחזור חיי העובד בארגון בעל היקף עובדים משמעותי.",
    field: "משאבי אנוש / שכר",
    experienceLevel: "בכיר",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=897295&src=16379",
    title: 'סמנכ"ל/ית קריאייטיב',
    company: "סוכנות פרסום בוטיקית",
    location: "תל אביב",
    summary:
      "הובלת מחלקת הקריאייטיב, ניהול צוותי קופי וארט, פיתוח קונספטים קריאייטיביים לקמפיינים ומותגים, ועבודה ישירה מול לקוחות בכירים.",
    field: "פרסום / קריאייטיב",
    experienceLevel: "בכיר",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=605068&src=16379",
    title: "סגן/ית מנהל מפעל ברזל",
    company: "חברה מובילה בתעשיית הברזל והבנייה",
    location: "קריית גת",
    summary:
      'יד ימינו של מנהל המפעל: ניהול צוותי ייצור, אחריות על בטיחות ויעדים, ייעול תהליכים ולוגיסטיקה.',
    field: "הנדסה / ניהול תעשייתי",
    experienceLevel: "ניסיון בניהול עובדים בתעשייה + הכשרה הנדסית",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=959899&src=16379",
    title: "תותח/ית SEO",
    company: "DigitalHunters",
    location: "רמת גן",
    summary:
      'בניית אסטרטגיות SEO מקצה לקצה, ניהול audits וקמפייני Digital PR — במשרד בוטיקי המשרת לקוחות מישראל, ארה"ב ואירופה.',
    field: "Digital Marketing / SEO",
    experienceLevel: "2+ שנות ניסיון",
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  const created: { title: string; id: string }[] = [];
  const skipped: { title: string; reason: string }[] = [];

  for (const seed of JOBS) {
    try {
      // Idempotency — skip if a job with this externalUrl already exists.
      const existing = await prisma.job.findFirst({
        where: { externalUrl: seed.externalUrl },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ title: seed.title, reason: "already-imported" });
        continue;
      }

      const job = await prisma.job.create({
        data: {
          title: seed.title,
          company: seed.company,
          location: seed.location,
          summary: seed.summary,
          field: seed.field,
          experienceLevel: seed.experienceLevel ?? undefined,
          externalUrl: seed.externalUrl,
          source: "civi.co.il",
          isPublished: true,
          createdById: session.user.id,
        },
        select: { id: true },
      });
      created.push({ title: seed.title, id: job.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[import-civi-jobs] failed for", seed.title, msg);
      skipped.push({ title: seed.title, reason: msg.slice(0, 200) });
    }
  }

  return NextResponse.json({
    total: JOBS.length,
    createdCount: created.length,
    skippedCount: skipped.length,
    created,
    skipped,
  });
}
