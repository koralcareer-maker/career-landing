import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * One-shot admin endpoint that seeds 11 new vetted job listings from
 * civi.co.il into the Job table (third batch — Coral provided the URLs
 * on 2026-05-11). Idempotent: re-running it skips jobs whose
 * externalUrl already exists.
 *
 * Trigger from a logged-in admin browser tab via DevTools console:
 *   await fetch("/api/admin/import-civi-jobs-batch3", { method: "POST" })
 *     .then(r => r.json())
 *
 * Same shape as /api/admin/import-civi-jobs and
 * /api/admin/import-civi-jobs-batch2 — kept consistent so the admin
 * mental model stays simple ("batch3 = the third Civi URL dump").
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
    externalUrl: "https://app.civi.co.il/promo/id=657403&hid=WGXGZCJLKY",
    title: "בנקאי/ת טלפוני/ת",
    company: "בנק מוביל",
    location: "חיפה",
    summary:
      "מתן שירות מקצועי ללקוחות הבנק בנושאים פיננסיים, ביצוע פעולות בנקאיות ושיווק מוצרי הבנק. הכשרה מלאה, שכר + עמלות + קרן השתלמות + פנסיה.",
    field: "בנקאות / שירות לקוחות",
    experienceLevel: "סטודנט/ית או בעל/ת תואר ראשון — חובה. ניסיון בשירות לקוחות / מכירות — יתרון משמעותי.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=848345&hid=WGXGZCJLKY",
    title: "איש/ת מכירות — רשת הלבשה תחתונה יוקרתית",
    company: "רשת הלבשה תחתונה (אחת מהגדולות בישראל)",
    location: "ארצי (לפי סניפים)",
    summary:
      "עבודה פרונטלית מול לקוחות באחת מרשתות ההלבשה התחתונה הגדולות בישראל. התאמת פריטים, ייעוץ ועמידה ביעדי מכירה. ניתן משרה מלאה או חלקית במשמרות נוחות.",
    field: "קמעונאות / אופנה",
    experienceLevel: "ניסיון קודם בחנויות אופנה — חובה.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=764107&hid=WGXGZCJLKY",
    title: "בנקאי/ת אישי/ת",
    company: "בנק מוביל",
    location: "ארצי",
    summary:
      "תפקיד בנקאי/ת אישי/ת בבנק מוביל. שירות ללקוחות פרטיים, ביצוע פעולות בנקאיות, ייעוץ ועמידה ביעדים. לא נדרש ניסיון בנקאי קודם.",
    field: "בנקאות ושירותים פיננסיים",
    experienceLevel: "ללא ניסיון בנקאי קודם. יתרון: שירות לקוחות / מכירות.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=569028&hid=WGXGZCJLKY",
    title: "מנהל/ת סניף — רשת הלבשה תחתונה",
    company: "רשת הלבשה תחתונה יוקרתית",
    location: "ארצי (לפי סניפים)",
    summary:
      "ניהול שוטף של סניף, צוות העובדות, מלאי וגיוס. שכר 9,500₪ + בונוסים + הנחת עובד 30%.",
    field: "קמעונאות / ניהול חנות",
    experienceLevel: "שנתיים+ ניהול חנות — חובה.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=605314&hid=WGXGZCJLKY",
    title: "מנהל/ת מחלקת משכנתאות",
    company: "בנק מוביל",
    location: "בני ברק",
    summary:
      "ניהול מלא של תחום המשכנתאות בסניף — פיתוח עסקי, ניהול צוות, אחריות על בקרה, איכות וליווי עסקאות מורכבות עם ממשקים פנימיים בבנק.",
    field: "בנקאות / משכנתאות",
    experienceLevel: "3+ שנים בתחום המשכנתאות + ניסיון ניהולי או תפקיד בכיר.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=927476&hid=WGXGZCJLKY",
    title: "רפרנט/ית תפעול אשראי ומשכנתאות",
    company: "בנק גדול",
    location: "ירושלים",
    summary:
      "תפעול תחום המשכנתאות והאשראי — ניהול הלוואות משכנתה, ביטוחי חיים ונכס, וטיפול בבקשות שינויים בתנאי ההלוואה.",
    field: "בנקאות / שירותים פיננסיים",
    experienceLevel: "יתרון: היכרות עם המערכת הבנקאית ו/או תחום המשכנתאות.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=532000&src=16379",
    title: "סוכן/ת מכירות שטח — מוצרי מתכת ואלומיניום",
    company: "חברה בתחום מוצרי מתכת ואלומיניום",
    location: "ארצי (השרון – דרום)",
    summary:
      "ניהול פגישות מכירה לחברה בתחום המתכת והאלומיניום, עמידה ביעדים וניהול קשרי לקוחות. שכר בסיס בתקופת הכשרה (חודשיים) ולאחריה עמלות גבוהות בלבד.",
    field: "מכירות שטח / בנייה",
    experienceLevel: "ניסיון במכירות שטח חובה (יתרון: בנייה/אלומיניום). רישיון נהיגה בתוקף.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=536905&src=16379",
    title: "מנהל/ת חשבונות יחיד/ה — עד מאזן",
    company: "חברה משפחתית בייבוא מזון",
    location: "אזור נתניה",
    summary:
      "ניהול כלל מערך החשבונות עד מאזן בחברת ייבוא מזון יציבה — דיווחים לרשויות, תזרים מזומנים, התאמות בנקים וספקים.",
    field: "כספים / הנהלת חשבונות",
    experienceLevel: "ניסיון מוכח כמנהל/ת חשבונות עצמאית עד מאזן + תעודת הנה\"ח סוג 1+2 + ידע בחשבשבת.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=680218&src=16379",
    title: "עוזר/ת יבוא ורכש — צמודה למנכ״ל",
    company: "יבואנית חומרי גלם יוקרתיים לתעשיית המזון והאפייה",
    location: "בני דרור",
    summary:
      "עבודה צמודה עם המנכ״ל בניהול רכש מחו\"ל, קשר יומיומי עם ספקים וחברות שילוח בעולם, מעקב הזמנות ועבודת Excel.",
    field: "יבוא ורכש / שילוח",
    experienceLevel: "אנגלית גבוהה + Excel שוטף — חובה. יבוא/רכש/שילוח — יתרון משמעותי.",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=936901&src=16379",
    title: "ראש/ת צוות מחסן",
    company: "חברה גלובלית בתחום המחשוב התעשייתי",
    location: "כפר סבא",
    summary:
      "תיאום פעילויות מלאי וניהול צוות של 3-4 עובדים, שמירה על דיוק המלאי וגיבוי בעלי תפקידים פנימיים.",
    field: "לוגיסטיקה / ניהול מחסן",
    experienceLevel: "ניסיון חובה בניהול צוות + Priority + Excel מתקדם + אנגלית גבוהה (יתרון: תעשיית ייצור).",
  },
  {
    externalUrl: "https://app.civi.co.il/promo/id=654241&src=16379",
    title: "מנהל/ת תיקי לקוחות — אזור הדרום",
    company: "חברה קמעונאית מובילה",
    location: "אזור הדרום + משרדים בחולון",
    summary:
      "תפקיד דינמי המשלב עבודה משרדית עם ניהול לקוחות בשטח — ניהול תיקי לקוחות בשוק הפרטי, עבודה מול סיטונאים, שימור והעמקת קשרים מסחריים. 14.5K בסיס + בונוסים.",
    field: "מכירות / ניהול לקוחות",
    experienceLevel: "ניסיון כמנהל/ת תיקי לקוחות / מכירות שטח + ניסיון מול סיטונאים — חובה.",
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
      console.error("[import-civi-jobs-batch3] failed for", seed.title, msg);
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
