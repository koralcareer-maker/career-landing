/**
 * POST /api/admin/seed-featured-jobs
 *
 * Curated "featured" job list. Coral pastes URLs into chat that she
 * wants to surface above everything else on /jobs (recruiter network
 * picks, manually-vetted roles, etc.). This endpoint imports them
 * with isHot=true so the existing /jobs query sorts them first
 * (orderBy: [{ isHot: "desc" }, { createdAt: "desc" }]).
 *
 * Idempotent + non-destructive: if the URL is already in the DB
 * (e.g. picked up by the auto-fetcher), we PROMOTE that existing
 * row to isHot=true instead of skipping — that way Coral's pick is
 * still featured even if the catalogue had it first.
 *
 * Admin-only. Triggered manually from /admin/jobs via the new
 * SeedFeaturedJobsButton component each time Coral drops a batch
 * of URLs.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface FeaturedJob {
  title: string;
  company: string;
  description: string;
  location: string;
  region: string;
  field: string;
  externalUrl: string;
}

const C = "https://app.civi.co.il/promo";

const FEATURED_JOBS: FeaturedJob[] = [
  { title: "מנהל/ת חנות קצביה גדולה", company: "קצביה גדולה ומובילה", description: "מנהל/ת חנות עם אנרגיות גבוהות, ניסיון ניהולי עשיר ויחסי אנוש מעולים בקצביה בבאר טוביה.", location: "באר טוביה", region: "דרום", field: "קמעונאות ורכש", externalUrl: `${C}/id=634443&src=16379` },
  { title: "מנהל/ת ייצור למפעל בשר", company: "מפעל בשר מוביל", description: "מעקב הדוק אחר תהליכי הייצור בתוך מספר מחלקות, פיקוח וארגון של עובדי הייצור.", location: "באר טוביה", region: "דרום", field: "מכונות, תעשייה וייצור", externalUrl: `${C}/id=534430&src=16379` },
  { title: "עובד/ת שירות ומכירה למותג הנעלה ישראלי", company: "מותג הנעלה ישראלי", description: "תפקיד מכירה ושירות במותג הנעלה ישראלי, סניפי הרצליה וכפר סבא.", location: "הרצליה וכפר סבא", region: "שרון", field: "מכירות ושיווק", externalUrl: `${C}/id=871844&src=16379` },
  { title: "Technical Product Manager & Project Lead", company: "Civi", description: "תפקיד hands-on להגדרת דרישות לקוח, הובלת פרויקטים מולטי-דיסציפלינריים בעולמות AI ו-Computer Vision.", location: "ראש העין", region: "מרכז", field: "ניהול פרויקטים", externalUrl: `${C}/id=555159&src=16379` },
  { title: "COO לרשת חללי עבודה פרימיום", company: "חסוי", description: "ניהול תפעול ברשת חללי עבודה גמישים פרימיום. שם החברה ייחשף בשלב המיון.", location: "גוש דן", region: "מרכז", field: "בכירים", externalUrl: `${C}/id=829969&src=16379` },
  { title: "PPC Team Manager", company: "סטארטאפ AdTech ישראלי", description: "ניהול צוות PPC, Account Managers ושימור לקוחות בסטארטאפ AdTech צומח.", location: "יקנעם עילית", region: "צפון", field: "PPC", externalUrl: `${C}/id=675547&src=16379` },
  { title: "מתאם/ת אולם תצוגה", company: "רשת יבואני רכב מהגדולות בארץ", description: "תפקיד פרונטלי מול לקוחות באולם תצוגה דינמי וצעיר. אפשרויות קידום.", location: "נתניה", region: "שרון", field: "נהגים, רכב ותחבורה", externalUrl: `${C}/id=533993&src=16379` },
  { title: "איש/ת אחזקה למפעל מזון - חשמל ומכונות", company: "מפעל מזון מוביל", description: "תחזוקה שוטפת וטיפול בתקלות במפעל מזון. דרוש רקע בחשמל ומכונות. 8:00-17:00.", location: "באר טוביה", region: "דרום", field: "חשמל", externalUrl: `${C}/id=662420&src=16379` },
  { title: "מנהל/ת עבודה ותפעול למפעל ייצור אוטומטי", company: "חברת מזון מובילה", description: "ניהול קו הייצור והאריזה האוטומטי מקצה לקצה. צוות קטן, בקרת איכות. רכב חברה.", location: "באר טוביה", region: "דרום", field: "מכונות, תעשייה וייצור", externalUrl: `${C}/id=735717&src=16379` },
  { title: "מנהל/ת חשבונות עד מאזן", company: "חברה גלובלית במיקור חוץ פיננסי", description: "הנהלת חשבונות עד מאזן לחברה בינלאומית, עבודה עם ספקים וביקורות. יום מהבית.", location: "תל אביב (קו רכבת)", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${C}/id=574846&src=16379` },
  { title: "חשב/ת שכר לחברה גלובלית", company: "חברה גלובלית בשירותים פיננסיים", description: "חשב שכר בחברה בינלאומית, תהליכי שכר מקצה לקצה. יום מהבית, סביבה איכותית.", location: "תל אביב (קו רכבת)", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${C}/id=541683&src=16379` },
  { title: "מנהל/ת מכירות ארצי לקבלנים וחברות בנייה", company: "חברה מובילה ביבוא חומרי בנייה", description: "תפקיד שטח בכיר, ניהול קשרים עם קבלנים גדולים, הובלת תהליכי מכירה מורכבים בתעשיית הבנייה.", location: "ארצי", region: "מרכז", field: "מכירות ושיווק", externalUrl: `${C}/id=875139&src=16379` },
  { title: "מנהל/ת אזור לרשת מעונות בצמיחה", company: "רשת מעונות בצמיחה", description: "ניהול אזור ברשת מעונות, חניכת מנהלים, בקרת איכות, ניהול תקציב. 70% שטח, 30% מטה.", location: "שרון/מרכז", region: "שרון", field: "חינוך והדרכה", externalUrl: `${C}/id=666408&src=16379` },
  { title: "איש/ת אחזקה למפעל פלדה", company: "חברה מובילה בתעשיית הפלדה", description: "טיפול, שיקום וחידוש מכונות מפעל. דרוש ניסיון בהידראוליקה, פנאומטיקה ועבודת רצפת ייצור.", location: "פארק התעשייה קריית גת", region: "דרום", field: "חשמל", externalUrl: `${C}/id=590183&src=16379` },
  { title: "מנהל/ת PPC Performance לאיקומרס גלובלי", company: "משרד פרסום מוביל", description: "ניהול קמפיינים פרפורמנס למותגי איקומרס בינלאומיים: Google, Meta, Instagram, TikTok.", location: "אזור השרון", region: "שרון", field: "PPC", externalUrl: `${C}/id=831467&src=16379` },
  { title: "נציג/ת מכירות ביטוח רכב ודירה", company: "סוכנות ביטוח מובילה", description: "מכירות ביטוח רכב ודירה, בסיס 7-8K + עמלות גבוהות. נדרש ניסיון במכירות ביטוח.", location: "ראשון לציון (ליד הרכבת)", region: "מרכז", field: "ביטוח", externalUrl: `${C}/id=521891&src=16379` },
  { title: "מזכיר/ת סמנכ\"לית", company: "חברה גדולה ברמת השרון", description: "ניהול יומן סמנכ\"ל ומנהלי אגפים, תיאום פגישות, תמיכה אדמיניסטרטיבית. נדרש Office + אנגלית + AI.", location: "ראשל\"צ", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${C}/id=615871&src=16379` },
  { title: "מבקר/ת איכות למוצרים אלקטרוניים", company: "חברה גלובלית בטכנולוגיה", description: "ביקורת איכות למוצרים אלקטרוניים, תהליכי אינטגרציה. נדרש רקע הנדסת אלקטרוניקה + אנגלית מתקדמת.", location: "כפר סבא", region: "שרון", field: "אלקטרוניקה וחומרה", externalUrl: `${C}/id=863469&src=16379` },
  { title: "Junior Product Specialist בתחום הרכב", company: "חברת רכב גדולה", description: "עבודה מול רשת המכירות, ניהול מלאי רכבים, ביצוע הזמנות לפי דרישות שוק.", location: "ראשל\"צ", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${C}/id=980884&src=16379` },
  { title: "טכנאי בקרת איכות לפרויקט תשתיות", company: "חברה בינלאומית", description: "בדיקות מכניות וויזואליות ליחידות רכבת, ניהול חוסרים, פיקוח קבלני משנה, תיעוד דיגיטלי. כולל אתר ירושלים לפי הצורך.", location: "תל אביב-יהוד", region: "מרכז", field: "אלקטרוניקה וחומרה", externalUrl: `${C}/id=760636&src=16379` },
  { title: "מנהל/ת מחלקת CRM - Dynamics 365", company: "חסוי", description: "ניהול מחלקת CRM Dynamics 365, פרויקטים מורכבים, צוותים מקצועיים ותהליכים עסקיים בחטיבה.", location: "מספר מקומות", region: "מרכז", field: "מערכות מידע", externalUrl: "https://app.civi.co.il/promo/id=589586&hid=WGXGZCJLKY" },
];

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let inserted = 0;
  let promoted = 0; // existing rows whose isHot got flipped to true
  const errors: string[] = [];

  for (const j of FEATURED_JOBS) {
    try {
      const existing = await prisma.job.findFirst({
        where: { externalUrl: j.externalUrl },
        select: { id: true, isHot: true },
      });
      if (existing) {
        // Promote an already-fetched row to featured. Always — even if
        // it's already isHot=true — so the operation is fully idempotent.
        await prisma.job.update({
          where: { id: existing.id },
          data: { isHot: true },
        });
        if (!existing.isHot) promoted++;
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
          field: j.field,
          source: "מועדף - קורל בחרה",
          externalUrl: j.externalUrl,
          isPublished: true,
          isHot: true,
        },
      });
      inserted++;
    } catch (e) {
      errors.push(`${j.title}: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: FEATURED_JOBS.length,
    inserted,
    promoted,
    errors: errors.slice(0, 10),
  });
}
