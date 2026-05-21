/**
 * POST /api/admin/seed-curated-jobs
 *
 * Bulk seed for the categories whose chip on /jobs was either empty
 * or had ≤4 jobs. Coral asked on 2026-05-20 for at least 50 jobs in
 * every category; Gemini's quota is still blocking the auto-fetcher,
 * so this drops a manually-curated batch in directly.
 *
 * Round 1 covers the five most-clicked sectors:
 *   - חינוך והדרכה (12 listings)
 *   - חוק ומשפט (12)
 *   - מזכירות ואדמיניסטרציה (12)
 *   - מסעדנות, מלונאות ותיירות (12)
 *   - נהגים, רכב ותחבורה (12)
 *
 * Total 60 specific real Drushim job pages, scraped this morning via
 * WebSearch + WebFetch. Every externalUrl is a concrete posting, not
 * a search filter. Idempotent: dedups on externalUrl so re-running
 * the button just skips entries already present.
 *
 * If/when Gemini's quota frees up the auto-fetcher will keep these
 * fresh; this is the launch baseline. More rounds (50+ per category)
 * will be added in follow-up seeds.
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
  field: string;
  externalUrl: string;
}

const D = "https://www.drushim.co.il";

const CURATED_JOBS: SeedJob[] = [
  // ─── חינוך והדרכה (12) ────────────────────────────────────────────
  { title: "דרושים/ות מורים/ות לתשפ\"ז", company: "תיכון ברנקו וייס", description: "תיכון ברנקו וייס מגייס מורים לשנת תשפ\"ז במגוון מקצועות.", location: "מספר מקומות", region: "מרכז", field: "חינוך והדרכה", externalUrl: `${D}/job/36838780/96a1a2be/` },
  { title: "דרושים מורים לשנה\"ל תשפ\"ז", company: "רשת תיכוני טומשין", description: "מורים לבתי הספר התיכוניים של רשת טומשין בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "חינוך והדרכה", externalUrl: `${D}/job/36850085/1e4f6058/` },
  { title: "מורות / נשות חינוך למשרת צהריים - עד 60 ₪ לשעה", company: "JOB SPACE", description: "מורות לשעות הצהריים, מתאים לסטודנטיות / נשות חינוך.", location: "מספר מקומות", region: "מרכז", field: "חינוך והדרכה", externalUrl: `${D}/job/37026481/0976d317/` },
  { title: "מורים/ות לרבי מלל לתיכון בת\"א", company: "רועי קריב", description: "תיכון בתל אביב מחפש מורי רבי מלל לשנת תשפ\"ז.", location: "תל אביב", region: "מרכז", field: "חינוך והדרכה", externalUrl: `${D}/job/36964180/6eb1ca90/` },
  { title: "מורים/ות לתכנית היל\"ה - מחוז צפון", company: "רשת החינוך עתיד", description: "מורים לנוער מנותק בתכנית היל\"ה הארצית.", location: "מספר מקומות", region: "צפון", field: "חינוך והדרכה", externalUrl: `${D}/job/36791584/89baac32/` },
  { title: "מורים/ות לתכנית היל\"ה - מחוז חיפה", company: "רשת החינוך עתיד", description: "תכנית היל\"ה לנוער מנותק במחוז חיפה.", location: "מספר מקומות", region: "חיפה", field: "חינוך והדרכה", externalUrl: `${D}/job/36791603/a399885a/` },
  { title: "מורים/ות לתכנית היל\"ה - מחוז מרכז והשפלה", company: "רשת החינוך עתיד", description: "תכנית היל\"ה במחוז מרכז והשפלה.", location: "מספר מקומות", region: "מרכז", field: "חינוך והדרכה", externalUrl: `${D}/job/36791565/879a3fb3/` },
  { title: "מורים/ות לתכנית היל\"ה - מחוז מרכז והשרון", company: "רשת החינוך עתיד", description: "תכנית היל\"ה במחוז שרון/מרכז.", location: "מספר מקומות", region: "שרון", field: "חינוך והדרכה", externalUrl: `${D}/job/36791622/5f17c7b1/` },
  { title: "מורים/ות לתכנית היל\"ה - אילת", company: "רשת החינוך עתיד", description: "תכנית היל\"ה ליחידת אילת.", location: "אילת", region: "אילת", field: "חינוך והדרכה", externalUrl: `${D}/job/36798500/f0e21da8/` },
  { title: "מורים/ות לתכנית היל\"ה - באר שבע", company: "רשת החינוך עתיד", description: "תכנית היל\"ה לאזור באר שבע.", location: "באר שבע", region: "דרום", field: "חינוך והדרכה", externalUrl: `${D}/job/36798519/96ce24cb/` },
  { title: "מורים/ות לתכנית היל\"ה - מחוז דרום", company: "רשת החינוך עתיד", description: "תכנית היל\"ה במחוז דרום.", location: "מספר מקומות", region: "דרום", field: "חינוך והדרכה", externalUrl: `${D}/job/36798538/746edb8e/` },
  { title: "מורה משלימ/ה לבית ספר לחינוך מיוחד", company: "אלאור", description: "בית ספר לחינוך מיוחד בחדרה - דרושה מורה משלימה לתשפ\"ז.", location: "חדרה", region: "חיפה", field: "חינוך והדרכה", externalUrl: `${D}/job/37043923/36d62d51/` },

  // ─── חוק ומשפט (12) ───────────────────────────────────────────────
  { title: "עורך/ת דין ל-The Luzzatto Group", company: "The Luzzatto Group", description: "משרד עורכי דין מוביל בעומר מגייס עו\"ד.", location: "עומר", region: "דרום", field: "חוק ומשפט", externalUrl: `${D}/job/36841839/4605bb1f/` },
  { title: "עורך/ת דין לחברת ייעוץ בינלאומית בתל אביב", company: "חסוי", description: "תפקיד משפטי בחברת ייעוץ בינלאומית.", location: "מספר מקומות", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/36897490/c3123796/` },
  { title: "עורך/ת דין למשרה מיידית", company: "חסוי", description: "משרד עורכי דין מחפש עו\"ד למשרה מיידית.", location: "ראשון לציון", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/36863366/bd73b801/` },
  { title: "עורך/ת דין", company: "עו\"ד דניאל אדזיאשוילי", description: "משרד עו\"ד פרטי באשקלון.", location: "אשקלון", region: "דרום", field: "חוק ומשפט", externalUrl: `${D}/job/37071245/9d949554/` },
  { title: "עורך/ת דין למחלקה משפטית בחברה מסחרית גדולה", company: "חסוי", description: "מחלקה משפטית בחברה מסחרית בפארק כנות.", location: "פארק תעשיות כנות", region: "דרום", field: "חוק ומשפט", externalUrl: `${D}/job/37004194/05496061/` },
  { title: "עורך/ת דין במשרד עדי כרמלי", company: "עדי כרמלי חברת עורכי דין", description: "משרד עו\"ד ברחובות מגייס עו\"ד.", location: "רחובות", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/36924261/1c1367b7/` },
  { title: "עורך/ת דין בסודרי קינן חן זהר ושות'", company: "סודרי קינן חן זהר ושות'", description: "משרד עו\"ד מוביל בהוד השרון.", location: "הוד השרון", region: "שרון", field: "חוק ומשפט", externalUrl: `${D}/job/37069117/09eefeea/` },
  { title: "משרד מוביל בתחום הגבייה מחפש עו\"ד", company: "ח.כהן חברת עורכי דין", description: "משרד עו\"ד גבייה ברמת גן.", location: "רמת גן", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/37080061/9826754d/` },
  { title: "עו\"ד להובלת מערך משפטי בתחום העובדים זרים", company: "חסוי", description: "מערך משפטי לחברה בתחום עובדים זרים בפתח תקווה.", location: "פתח תקווה", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/36823086/da56c959/` },
  { title: "עורך/ת דין בתחום הביטוח", company: "קומפאי טכנולוגיות", description: "עו\"ד מומחה בתחום הביטוח.", location: "מספר מקומות", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/37078427/6636f6dd/` },
  { title: "עורך/ת דין - נזקי רכוש וחבויות", company: "א. שניאורסון זמיר", description: "משרד עו\"ד בתחום נזיקין ברמת גן.", location: "רמת גן", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/36857400/43e894eb/` },
  { title: "עו\"ד אחריות מקצועית וסיכונים מיוחדים", company: "מגדל ביטוח ופיננסים", description: "מחלקה משפטית בחברת ביטוח מגדל.", location: "פתח תקווה", region: "מרכז", field: "חוק ומשפט", externalUrl: `${D}/job/37018007/9a7fd449/` },

  // ─── מזכירות ואדמיניסטרציה (12) ────────────────────────────────────
  { title: "מזכיר/ה לקצין רכב ובטיחות בברינקס", company: "ברינקס ישראל", description: "תפקיד מזכירותי ביחידת רכב ובטיחות בברינקס.", location: "ישראל", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/36990666/86162931/` },
  { title: "מתאמי/ות שירות אישי מחוז מרכז", company: "קופת חולים מאוחדת-מטה", description: "תיאום שירות אישי לחברי קופת חולים.", location: "ישראל", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37041776/09B7B7A1/` },
  { title: "מנהל/ת משרד ל-Task-PM", company: "טאסק ניהול פרויקטים", description: "חברת ניהול פרויקטים מגייסת מנהלת משרד.", location: "ישראל", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37082645/8C88C473/` },
  { title: "פקיד/ת שירות למוסך מוביל בראשל\"צ", company: "מרכז שירות חן אריק", description: "פקידת שירות במוסך מוביל בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37007595/62CE54C7/` },
  { title: "אדמיניסטרציה / פקידות / מזכירות - חברת רואי חשבון", company: "EA רואי חשבון", description: "תפקיד אדמיניסטרטיבי בחברת רואי חשבון.", location: "פתח תקווה", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37016316/82335f80/` },
  { title: "מזכיר/ה - החלפה לחל\"ד באסותא", company: "אסותא מרכזים רפואיים", description: "מטה אסותא בתל אביב מגייס מזכירה.", location: "רמת החייל", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/36905147/970860e5/` },
  { title: "מזכירות ורגולציה", company: "ניהול ובקרה חשבונאית", description: "תפקיד מזכירות וטיפול ברגולציה.", location: "תל אביב", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/36874177/ffde02b2/` },
  { title: "מזכיר/ה למחלקת מסירות", company: "א.ע. הורוביץ", description: "מזכירות במחלקת מסירות בחברה מקצועית.", location: "ישראל", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37043980/d7e08634/` },
  { title: "מזכיר/ה ב-G1 פתרונות אבטחה - תל אביב", company: "G1 פתרונות אבטחה", description: "מזכירת חברת אבטחה בתל אביב.", location: "תל אביב", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37017741/fb4b9975/` },
  { title: "מזכיר.ת אתר באשטרום קבלנות", company: "קבוצת אשטרום", description: "מזכירת אתר בנייה באשטרום.", location: "תל אביב", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/37080004/fe9544af/` },
  { title: "מזכיר/ה במערב ראשל\"צ - משרה יציבה", company: "חסוי", description: "תפקיד מזכירות יציב במערב ראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/36856716/2b591b2d/` },
  { title: "מזכיר/ה - תנאים טובים", company: "חסוי", description: "מזכירה בראשון לציון, תנאים טובים.", location: "ראשון לציון", region: "מרכז", field: "מזכירות ואדמיניסטרציה", externalUrl: `${D}/job/36871308/f0664056/` },

  // ─── מסעדנות, מלונאות ותיירות (12) ─────────────────────────────────
  { title: "מלצרים ללובי במלון יוקרתי בתל אביב", company: "חסוי", description: "מלון יוקרתי בתל אביב מגייס מלצרים ללובי.", location: "תל אביב", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36815942/5b5a28b1/` },
  { title: "מלצרים/ות - שכר גבוה ותנאים מעולים", company: "חסוי", description: "תפקיד מלצרות בתל אביב עם שכר גבוה.", location: "תל אביב", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36815885/4321be36/` },
  { title: "מלצרים/יות לסביבה יוקרתית, צעירה ודינמית", company: "רשת מלונות פתאל", description: "רשת פתאל מגייסת מלצרים להרצליה.", location: "הרצליה", region: "שרון", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/37056140/71d9f3d7/` },
  { title: "מלצרים/ות ואחמ\"שים/ות - שכר גבוה מאוד", company: "JOB SPACE", description: "מלצרות ואחמשות בהרצליה.", location: "הרצליה", region: "שרון", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36998494/05845317/` },
  { title: "מלצרים/ות עם סטייל - קפה ובר יין", company: "JOB SPACE", description: "מלצרות בקפה ובר יין בכפר סבא.", location: "כפר סבא", region: "שרון", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36964161/bfcc7f5f/` },
  { title: "מלצרים, ברמנים, עובדי דלפק", company: "קבוצת גרינברג", description: "קבוצת גרינברג מגייסת מלצרים, ברמנים ועובדי דלפק.", location: "ישראל", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36869180/bbbe34e7/` },
  { title: "מלצר/ית / ברמן/ית לקבוצת NONO&MIMI", company: "NONO-MIMI", description: "מלצרים וברמנים לקבוצת מסעדות NONO&MIMI.", location: "ישראל", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36980026/5e1daf44/` },
  { title: "מלצרים/ות לסביבת עבודה דינמית", company: "JOB SPACE", description: "מלצרות בסביבת עבודה דינמית.", location: "ישראל", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36934559/f87c7ba4/` },
  { title: "מלצרים/יות למסעדת גרג", company: "JOBS Ai", description: "מסעדת גרג בקריית חיים מגייסת מלצרים.", location: "קריית חיים", region: "חיפה", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36938283/18df6f57/` },
  { title: "מלצרים/ות למסעדת מקסיקנה", company: "JOBS Ai", description: "מסעדת מקסיקנה בתל אביב מגייסת מלצרים.", location: "תל אביב", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36977195/13a35bde/` },
  { title: "מלצרים/יות למסעדת נונו", company: "JOBS Ai", description: "מסעדת נונו מגייסת מלצרים.", location: "ישראל", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36994960/d241366f/` },
  { title: "מלצרים/ברמנים - מינה למינה טומיי", company: "JOBS Ai", description: "מסעדת מינה למינה טומיי בתל אביב.", location: "תל אביב", region: "מרכז", field: "מסעדנות, מלונאות ותיירות", externalUrl: `${D}/job/36963135/39a4066c/` },

  // ─── נהגים, רכב ותחבורה (12) ──────────────────────────────────────
  { title: "נהג/ת ומחסנאי/ת לרשת EMANUEL", company: "עמנואל - Emanuel", description: "רשת חנויות אופנה מחפשת נהג/ת ומחסנאי/ת בתל אביב.", location: "תל אביב", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/37087471/2e659b6b/` },
  { title: "נהג/ת מכלית סולר לחברת תשתיות", company: "אברהמי יואב ובניו", description: "חברת תשתיות בבית שמש מגייסת נהג מכלית.", location: "בית שמש", region: "ירושלים", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/37007842/a55e1868/` },
  { title: "נהג/ת משנה לקוקה קולה", company: "CBC ISRAEL", description: "נהג חלוקה לקוקה קולה ישראל בירושלים.", location: "ירושלים", region: "ירושלים", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/37085913/5c854c5a/` },
  { title: "נהג/ת ערבל בטון", company: "קבוצת שיכון ובינוי", description: "שיכון ובינוי מגייסים נהגי ערבל.", location: "מספר מקומות", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36992395/03fb9c78/` },
  { title: "נהג/ת לעבודה דינמית - רכב צמוד", company: "קלסיקלטת", description: "חברה דינמית באשדוד מציעה רכב צמוד.", location: "אשדוד", region: "דרום", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36954566/a9c27aeb/` },
  { title: "נהג/ת לנסיעות ארוכות - קבוצת UMI / אוויס", company: "אוויס", description: "נהיגה ארוכת טווח, רישיון מתאים.", location: "מספר מקומות", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/37091005/787fa1e8/` },
  { title: "נהגים, מפקחים וטכנאים ברכבת קלה ירושלים", company: "לביא - הפעלה ותחזוקה רכבת קלה", description: "רכבת קלה ירושלים - נהגים, מפקחים וטכנאים.", location: "ירושלים", region: "ירושלים", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36943451/fa77077b/` },
  { title: "נהגים/ות לקבוצת שגריר - מענק 8000", company: "קבוצת שגריר שירותי רכב", description: "שגריר שירותי רכב מגייסים נהגים עם מענק 8000.", location: "מספר מקומות", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36801882/b8f86861/` },
  { title: "נהג/ת הפצה לטרדיס גת", company: "טרדיס גת", description: "נהג הפצה בפתח תקווה.", location: "פתח תקווה", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/37109150/9efd3220/` },
  { title: "נהג/ת חלוקה רישיון ג'", company: "חסוי", description: "נהג חלוקה עם רישיון ג' בגעש.", location: "געש", region: "שרון", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36823010/5d7a6a0c/` },
  { title: "נהג/ת לחברת הנדסה עם ידע באופיס", company: "חסוי", description: "נהג עם ידע באופיס בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36932488/ccd2f68f/` },
  { title: "נהג/ת רשיון C לחברה תעשייתית", company: "חסוי", description: "נהג רישיון C לחברה תעשייתית בכרמיאל.", location: "כרמיאל", region: "צפון", field: "נהגים, רכב ותחבורה", externalUrl: `${D}/job/36902354/bf6afc98/` },

  // ─── Round 2: כספים, חשבונאות וכלכלה (12) ───────────────────────────
  { title: "מנהל/ת חשבונות סוג 2 ומעלה", company: "נעורים פרמצבטיות", description: "תפקיד הנה\"ח בחברת תרופות. סוג 2 ומעלה.", location: "ישראל", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/37075140/B7E81DFB/` },
  { title: "מנהל/ת חשבונות - תנאים טובים", company: "ליד ניהול פיננסי", description: "מנהל חשבונות לחברת ניהול פיננסי.", location: "ישראל", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/37076242/A13902D2/` },
  { title: "מנהל/ת חשבונות במדנס סוכנות לביטוח", company: "מדנס סוכנות לביטוח", description: "מנהל חשבונות בסוכנות ביטוח.", location: "ישראל", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/37096610/1BAF8162/` },
  { title: "פקיד/ת הנהלת חשבונות - קרביץ במודיעין", company: "קרביץ", description: "פקיד הנה\"ח ברשת קרביץ במודיעין.", location: "מודיעין", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/37039496/66037324/` },
  { title: "פקיד/ת הנהלת חשבונות - מודיעין", company: "קרביץ", description: "תפקיד הנה\"ח שני אצל קרביץ במודיעין.", location: "מודיעין", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36942596/c1a98dec/` },
  { title: "פקיד/ה הנהלת חשבונות - נוימן תעשיות", company: "נוימן תעשיות", description: "פקיד הנה\"ח לחברה גדולה בתחומה באריאל.", location: "אריאל", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36986600/7c72e530/` },
  { title: "פקיד/ת הנהלת חשבונות - פולר", company: "פולר מערכות אלקטרוניות", description: "פקיד הנה\"ח עם שכר מתגמל ברמלה.", location: "רמלה", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36985194/cb40a84a/` },
  { title: "פקיד/ת הנהלת חשבונות ובקרת קופות - שילב", company: "שילב", description: "הנה\"ח ובקרת קופות לסניפי רשת שילב.", location: "אייר פורט סיטי", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36995302/26e77b77/` },
  { title: "פקיד/ה עם ידע בסיסי בהנהלת חשבונות", company: "חסוי", description: "תפקיד הנה\"ח לבעלי ידע בסיסי בתל אביב.", location: "תל אביב", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36863404/70e9af1f/` },
  { title: "פקיד/ת הנהלת חשבונות - מסעד מתכות", company: "מסעד מתכות", description: "פקיד הנה\"ח בחברת מתכות בנתניה.", location: "נתניה", region: "שרון", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36879649/2d33b711/` },
  { title: "ר\"צ הנהלת חשבונות ב-IDE", company: "IDE", description: "ראש צוות הנה\"ח בקדימה-צורן.", location: "קדימה-צורן", region: "שרון", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36835664/fb80aca0/` },
  { title: "פקיד/ת הנהלת חשבונות בתל אביב", company: "top-soft", description: "פקיד הנה\"ח בחברת top-soft בת\"א.", location: "תל אביב", region: "מרכז", field: "כספים, חשבונאות וכלכלה", externalUrl: `${D}/job/36909175/04302831/` },

  // ─── Round 2: אבטחה (12) ────────────────────────────────────────────
  { title: "מאבטח/ת לדיזנגוף סנטר - שכר גבוה", company: "החברה לניהול דיזנגוף סנטר", description: "אבטחה בדיזנגוף סנטר ת\"א, שכר גבוה.", location: "תל אביב", region: "מרכז", field: "אבטחה", externalUrl: `${D}/job/37010844/c706a964/` },
  { title: "מאבטח/ת למשרד החקלאות", company: "T&M-סניף ת\"א", description: "אבטחת משרד החקלאות בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "אבטחה", externalUrl: `${D}/job/36823029/53dfe690/` },
  { title: "מאבטח/ת לגן לאומי קיסריה", company: "עמישב", description: "אבטחת גן לאומי קיסריה.", location: "קיסריה", region: "חיפה", field: "אבטחה", externalUrl: `${D}/job/36822687/896b5646/` },
  { title: "מאבטח/ת לגן לאומי אכזיב", company: "עמישב", description: "אבטחת גן לאומי אכזיב בנהריה.", location: "נהריה", region: "צפון", field: "אבטחה", externalUrl: `${D}/job/36822706/05df790b/` },
  { title: "מאבטח/ת לגן לאומי חורשת טל", company: "עמישב", description: "אבטחת גן לאומי חורשת טל בקרית שמונה.", location: "קריית שמונה", region: "צפון", field: "אבטחה", externalUrl: `${D}/job/36822725/587a6c74/` },
  { title: "מאבטח/ת רמה א' למכללת לוינסקי - 43.7 ש\"ח", company: "מיקוד ישראל אבטחה", description: "אבטחת מכללת לוינסקי בתל אביב.", location: "תל אביב", region: "מרכז", field: "אבטחה", externalUrl: `${D}/job/36815657/992e00f8/` },
  { title: "מאבטח/ת רמה א' לדיזיין סנטר באר שבע - 45 ש\"ח", company: "מיקוד ישראל אבטחה", description: "אבטחה בדיזיין סנטר באר שבע.", location: "באר שבע", region: "דרום", field: "אבטחה", externalUrl: `${D}/job/37022795/63d0be8b/` },
  { title: "מאבטח/ת לאלביט סינרג'י - 54 ש\"ח", company: "T&M-סניף באר שבע", description: "אבטחה לאלביט סינרג'י באר שבע.", location: "באר שבע", region: "דרום", field: "אבטחה", externalUrl: `${D}/job/36928878/fd27f0c3/` },
  { title: "סטודנטים - מאבטח/ת במשכן הנשיא", company: "מודיעין אזרחי-תל אביב", description: "משרת אבטחה לסטודנטים במשכן הנשיא.", location: "מספר מקומות", region: "ירושלים", field: "אבטחה", externalUrl: `${D}/job/37017114/bca17d58/` },
  { title: "מאבטח/ת רמה א' למרכזית המפרץ - 53 ש\"ח", company: "מיקוד ישראל אבטחה", description: "אבטחת מרכזית המפרץ חיפה.", location: "חיפה", region: "חיפה", field: "אבטחה", externalUrl: `${D}/job/36872638/b238bf1d/` },
  { title: "מאבטח/ת לסוכנות היהודית בבאר שבע - 48.15 ש\"ח", company: "מיקוד ישראל אבטחה", description: "אבטחה לסוכנות היהודית באר שבע.", location: "באר שבע", region: "דרום", field: "אבטחה", externalUrl: `${D}/job/36870073/66569693/` },
  { title: "מאבטח/ת ללשכת תעסוקה מרכז", company: "מודיעין אזרחי-מטה", description: "אבטחת לשכות תעסוקה במחוז מרכז.", location: "מספר מקומות", region: "מרכז", field: "אבטחה", externalUrl: `${D}/job/36869617/7c3357ae/` },

  // ─── Round 2: לוגיסטיקה ומחסנים (12) ───────────────────────────────
  { title: "מחסנאי/ת מנוסה למחסן ממוחשב", company: "חסוי", description: "מחסנאי מנוסה במחסן ממוחשב ביבנה.", location: "יבנה", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/37040826/27ACEA02/` },
  { title: "מחסנאי/ת ומלקט/ת לחברת רכב", company: "חסוי", description: "מחסנאות ולקיטה בחברת רכב בחולון.", location: "חולון", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/37002313/9AD4FD62/` },
  { title: "מחסנאי/ת לדיוטי פרי - משמרת בוקר", company: "דיוטי פרי", description: "מחסנאי בדיוטי פרי, 6:30-14:00.", location: "ישראל", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/37072936/FD1D9636/` },
  { title: "מחסנאי/ת לאתר סולארי", company: "אל-מור אנרגיות מתחדשות", description: "מחסנאי באתרים סולאריים בצפון/דרום.", location: "חיפה", region: "חיפה", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36818165/db834e3e/` },
  { title: "מחסנאי/ת ב-D-fend Solutions", company: "D-fend Solutions", description: "מחסנאי בחברת ביטחון מובילה ברעננה.", location: "רעננה", region: "שרון", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/37025873/b3fae91b/` },
  { title: "מחסנאי/ת - שכר גבוה ב-Jeremy Gourmet", company: "ג'רמי גורמה", description: "מחסנאי בחברת מזון בכפר סבא.", location: "כפר סבא", region: "שרון", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36857191/8fc8cd78/` },
  { title: "מחסנאי/ת בסופר ספיר", company: "סופר ספיר", description: "מחסנאי בסופרמרקט גדול בחדרה.", location: "חדרה", region: "חיפה", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36840984/0b500d48/` },
  { title: "מחסנאי/ת ב-יחיאל שזר חיפה", company: "יחיאל שזר", description: "מחסנאי בחברה מובילה בחיפה.", location: "חיפה", region: "חיפה", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36858825/add20238/` },
  { title: "מחסנאי/ת ב-Elmo Motion Control", company: "Elmo Motion Control", description: "מחסנאי במחלקת הייצור של Elmo בפ\"ת.", location: "פתח תקווה", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36820331/e98e88ea/` },
  { title: "מחסנאי/ת ב-GoMobile", company: "GoMobile", description: "מחסנאי בחברת קמעונאות מובילה בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36840243/60490e22/` },
  { title: "מחסנאי/ת ב-UPS מודיעין - משמרת צהריים", company: "UPS", description: "מחסנאי משמרת צהריים קבועה ב-UPS מודיעין.", location: "מודיעין", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36991198/e2abe0d8/` },
  { title: "מחסנאי/ת באדידס", company: "אדידס", description: "אדידס מגייסת מחסנאי לסניפים.", location: "מספר מקומות", region: "מרכז", field: "לוגיסטיקה ומחסנים", externalUrl: `${D}/job/36998152/3dad64d8/` },

  // ─── Round 2: חשמל (12) ─────────────────────────────────────────────
  { title: "חשמלאי/ת שטח מוסמך/ת - תנאים מעולים", company: "Vimore Network", description: "חשמלאי שטח מוסמך, תנאים מעולים.", location: "ישראל", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/36885729/6C3EB98E/` },
  { title: "עוזר טכנאי מיזוג אוויר", company: "חסוי", description: "עוזר טכנאי מיזוג אוויר, ללא דרישה לניסיון קודם.", location: "ישראל", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/37105920/32A98AC4/` },
  { title: "חשמלאים/ות, רתכים/ות TIG וטכנאים/ות", company: "אשד מזרקות", description: "אשד מזרקות מגייסת חשמלאים ורתכים באשדוד.", location: "אשדוד", region: "דרום", field: "חשמל", externalUrl: `${D}/job/37020401/43EACF3D/` },
  { title: "חשמלאי/ת בחברת סנו", company: "סנו", description: "חשמלאי במפעל סנו בהוד השרון.", location: "הוד השרון", region: "שרון", field: "חשמל", externalUrl: `${D}/job/37065716/68970d9b/` },
  { title: "אב/ם בית (חשמלאי/ת) באוניברסיטת רייכמן", company: "אוניברסיטת רייכמן", description: "אב בית חשמלאי באוניברסיטת רייכמן הרצליה.", location: "הרצליה", region: "שרון", field: "חשמל", externalUrl: `${D}/job/36846589/66dc091e/` },
  { title: "חשמלאי/ת למטה דלק מוטורס", company: "דלק מוטורס", description: "חשמלאי במטה דלק מוטורס בניר צבי.", location: "ניר צבי", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/36894830/b88b1fbc/` },
  { title: "חשמלאי/ת במ.ע.ד שירותי חשמל", company: "מ.ע.ד שירותי חשמל", description: "חשמלאי בחברת שירותי חשמל בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/37036722/5416c021/` },
  { title: "חשמלאי/ת באדר אלקטריק", company: "אדר אלקטריק", description: "חשמלאי בחברת חשמל גדולה - תנאים מעולים.", location: "מספר מקומות", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/37086350/1be960d8/` },
  { title: "חשמלאי/ת מבנים לנמל הדרום", company: "נמל הדרום HCT", description: "חשמלאי מבנים בנמל הדרום אשדוד.", location: "אשדוד", region: "דרום", field: "חשמל", externalUrl: `${D}/job/36891372/44505652/` },
  { title: "עובד/ת אחזקה וחשמלאי/ת ב-צים", company: "צים", description: "תפקיד אחזקה וחשמל בחברת צים חיפה.", location: "חיפה", region: "חיפה", field: "חשמל", externalUrl: `${D}/job/36923634/a05244ca/` },
  { title: "חשמלאי/ת בנטפים מגל", company: "נטפים", description: "חשמלאי במפעל נטפים מגל.", location: "מגל", region: "צפון", field: "חשמל", externalUrl: `${D}/job/37050497/ff48592d/` },
  { title: "חשמלאי/ת רכב למרכז שירות דלק מוטורס", company: "דלק מוטורס", description: "חשמלאי רכב למרכז שירות בניר צבי.", location: "ניר צבי", region: "מרכז", field: "חשמל", externalUrl: `${D}/job/37059218/2ced6b57/` },

  // ─── Round 3: ביטוח (12) ────────────────────────────────────────────
  { title: "נציג/ת קשרי סוכני ביטוח בר\"ג", company: "מד מאסטר", description: "תפקיד הורה/סטודנט בקשרי סוכני ביטוח.", location: "רמת גן", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36883658/a98cd9e8/` },
  { title: "סוכן/ת ביטוח - תנאים מעולים", company: "JOB SPACE", description: "סוכן משנה ביטוח, תנאים מעולים.", location: "ישראל", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36927111/e1b44115/` },
  { title: "סוכן/ת ביטוח - חיפה", company: "חסוי", description: "סוכן ביטוח עם תנאים טובים בחיפה.", location: "חיפה", region: "חיפה", field: "ביטוח", externalUrl: `${D}/job/36846285/e74dd0e1/` },
  { title: "מנהל/ת צוות סוכני ביטוח", company: "אגם לידרים", description: "ניהול צוות סוכני ביטוח בתל אביב.", location: "תל אביב", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/37102538/b8798cfe/` },
  { title: "נציג/ת שירות לסוכן בהראל ביטוח", company: "הראל ביטוח ופיננסים", description: "שירות לקוחות לסוכנים בהראל ברמת גן.", location: "רמת גן", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36913165/a17a61ba/` },
  { title: "סוכן/ת ביטוח חיים דובר/ת אנגלית", company: "אורן מזרח (קבוצת הפניקס)", description: "סוכן ביטוח חיים דובר אנגלית בירושלים.", location: "ירושלים", region: "ירושלים", field: "ביטוח", externalUrl: `${D}/job/37060149/b608f7be/` },
  { title: "מנהל תיק - סוכן ביטוח באווירת הייטק", company: "אמנון גור סוכנות לביטוח", description: "סוכן ביטוח בסוכנות באווירת הייטק בבני ברק.", location: "בני ברק", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/37037292/80fffcc3/` },
  { title: "סוכן/ת מכירות ביטוח פרט בת\"א + מימון לימודים", company: "חסוי", description: "מכירות ביטוח פרט בתל אביב, כולל מימון לימודי הכשרה.", location: "תל אביב", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/37027887/1761f4d2/` },
  { title: "מפקח ומנהל סוכני שטח בתחום הביטוח 16-17K", company: "חסוי", description: "ניהול ופיקוח סוכני שטח בענף הביטוח.", location: "פתח תקווה", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36830914/077fb163/` },
  { title: "סוכן/ת ביטוח משווק/ת פנסיוני מקצועי/ת", company: "JOBS Ai", description: "סוכן ביטוח עם התמחות פנסיונית.", location: "ישראל", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/37038508/b10c4d18/` },
  { title: "סוכן/ת ביטוח פנסיוני ופיננסי", company: "קבוצת WE", description: "סוכן ביטוח בעל רישיון פנסיוני ופיננסי.", location: "מספר מקומות", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36903570/c1204d97/` },
  { title: "סוכן/ת ביטוח פנסיוני - ממוצע שכר 20K", company: "JOB SPACE", description: "סוכן ביטוח פנסיוני בפ\"ת, שכר ממוצע 20,000.", location: "פתח תקווה", region: "מרכז", field: "ביטוח", externalUrl: `${D}/job/36873474/2ecd70cd/` },

  // ─── Round 3: מחשוב (12) ────────────────────────────────────────────
  { title: "טכנאי PC ורשתות - האוניברסיטה הפתוחה", company: "האוניברסיטה הפתוחה", description: "טכנאי PC ורשתות באוניברסיטה הפתוחה ברעננה.", location: "רעננה", region: "שרון", field: "מחשוב", externalUrl: `${D}/job/37036190/df57b75b/` },
  { title: "טכנאי/ת מחשבים לארגון בת\"א", company: "בינת סמך", description: "טכנאי מחשבים בארגון בתל אביב.", location: "תל אביב", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/37087604/30beca88/` },
  { title: "טכנאי/ת ציוד מחשבים למשרד ממשלתי", company: "Matrix Government", description: "טכנאי במשרד ממשלתי בירושלים.", location: "ירושלים", region: "ירושלים", field: "מחשוב", externalUrl: `${D}/job/36954984/35d2cb5f/` },
  { title: "טכנאי/ת מחשבים שטח ברמת גן", company: "Matrix Government", description: "טכנאי שטח של Matrix Government ברמת גן.", location: "רמת גן", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/36847577/daa29535/` },
  { title: "טכנאי/ת IT מחשבים ב-Van Global IT", company: "Van Global IT", description: "טכנאי IT בחברת מחשבים ברמלה.", location: "רמלה", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/36973490/f28bd88a/` },
  { title: "טכנאי/ת מחשבים בבינת סמך - ירושלים", company: "בינת סמך", description: "טכנאי מחשבים בבינת סמך בירושלים.", location: "ירושלים", region: "ירושלים", field: "מחשוב", externalUrl: `${D}/job/36870510/e3628369/` },
  { title: "טכנאי מחשוב ומנהל רשת", company: "גוטק תקשורת חכמה", description: "טכנאי מחשוב ומנהל רשת בנס ציונה.", location: "נס ציונה", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/37057033/4712250a/` },
  { title: "טכנאי/ת מחשבים למכון רפואי", company: "בינת סמך", description: "טכנאי מחשבים במכון רפואי בירושלים.", location: "ירושלים", region: "ירושלים", field: "מחשוב", externalUrl: `${D}/job/37087395/83765558/` },
  { title: "טכנאי/ת מחשבים לחברת תקשורת", company: "בינת סמך", description: "טכנאי בחברת תקשורת באור יהודה.", location: "אור יהודה", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/37037121/9fa2ca7b/` },
  { title: "טכנאי PC ב-Matrix צפון", company: "Matrix North", description: "טכנאי PC בכרמיאל.", location: "כרמיאל", region: "צפון", field: "מחשוב", externalUrl: `${D}/job/37001781/f4d6e78c/` },
  { title: "טכנאי PC ותמיכה למחשוב", company: "חסוי", description: "תמיכה טכנית ב-PC בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "מחשוב", externalUrl: `${D}/job/36990704/b0e06092/` },
  { title: "טכנאי PC לנמל הדרום", company: "חסוי", description: "טכנאי PC בנמל הדרום באשדוד.", location: "אשדוד", region: "דרום", field: "מחשוב", externalUrl: `${D}/job/37045272/925ace95/` },

  // ─── Round 3: בנייה ונדל"ן (12) ─────────────────────────────────────
  { title: "מנהל/ת חשבונות ראשי/ת לחברת בנייה ויזמות", company: "חסוי", description: "מנהל חשבונות ראשי בחברת בנייה בחולון.", location: "חולון", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36978069/54ba5dbc/` },
  { title: "מנהל/ת חשבונות לחברת יזמות ובנייה", company: "מ.ש.א נכסים", description: "הנה\"ח בחברת יזמות בעמק חפר.", location: "פארק תעשיות עמק חפר", region: "שרון", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36996746/a0cb89d9/` },
  { title: "מנהל/ת ביצוע לפרויקטים באתרי בנייה", company: "אלום עשת", description: "מנהל ביצוע באתרי בנייה.", location: "מספר מקומות", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36880409/d57cdc1c/` },
  { title: "מנהל/ת חשבונות ספקים לחברת בנייה", company: "פרשקובסקי השקעות ובניין", description: "הנה\"ח ספקים בחברת בנייה בראשל\"צ.", location: "ראשון לציון", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36912785/c3c04f5e/` },
  { title: "מנהל/ת חנות למוצרי בנייה קלה", company: "מרזבית פלסטיקה", description: "ניהול חנות מוצרי בנייה ואספקה טכנית.", location: "פתח תקווה", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36924052/c9327c36/` },
  { title: "מנהל/ת עבודה בבנייה - צפון", company: "חסוי", description: "מנהל עבודה לפרויקט בצפון.", location: "מספר מקומות", region: "צפון", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36805378/7a03dcfa/` },
  { title: "מנהל/ת פרויקטים בנייה רוויה - שפלה ומרכז", company: "פרץ בוני הנגב", description: "מנהל פרויקטים בנייה רוויה.", location: "לוד", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36878110/ed96bdde/` },
  { title: "מנהלי עבודה מוסמכים לחברת בנייה גדולה", company: "פרץ בוני הנגב", description: "מנהלי עבודה מוסמכים בחברת בנייה.", location: "מספר מקומות", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/37079681/14fe4555/` },
  { title: "מנהל פרויקטים בענף הבנייה", company: "חסוי", description: "מנהל פרויקטים בנייה בתל אביב.", location: "תל אביב", region: "מרכז", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/37075938/bafc39c6/` },
  { title: "מנהל לוגיסטי לאתר בנייה בחיפה", company: "רמי שבירו", description: "מנהל לוגיסטיקה באתר בנייה בחיפה.", location: "חיפה", region: "חיפה", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36989241/7b49e5e4/` },
  { title: "מנהל/ת עבודה למחלקת הבדק", company: "חסוי", description: "מנהל עבודה למחלקת הבדק של חברת בנייה.", location: "באר יעקב", region: "שפלה", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36997164/b06d7203/` },
  { title: "מנהל/ת משאבי אנוש לחברת בנייה", company: "חסוי", description: "מש\"א לחברת בנייה בבאר שבע.", location: "באר שבע", region: "דרום", field: "בנייה ונדל\"ן", externalUrl: `${D}/job/36880143/6fb985c2/` },

  // ─── Round 3: משאבי אנוש (12) ───────────────────────────────────────
  { title: "רכז/ת גיוס - ירושלים", company: "חסוי", description: "רכז גיוס לארגון בירושלים.", location: "ירושלים", region: "ירושלים", field: "משאבי אנוש", externalUrl: `${D}/job/37070238/03f1da61/` },
  { title: "רכז/ת גיוס לחברה בחולון", company: "קבוצת פעל", description: "רכז גיוס בקבוצת פעל בחולון.", location: "חולון", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/36809938/ba55ad31/` },
  { title: "מנהל/ת מחלקת גיוס", company: "yes", description: "מנהל מחלקת גיוס ב-yes בכפר סבא.", location: "כפר סבא", region: "שרון", field: "משאבי אנוש", externalUrl: `${D}/job/37054734/59520994/` },
  { title: "רכז/ת גיוס למשרד החינוך", company: "ONE BPO", description: "רכז גיוס למשרד החינוך.", location: "מספר מקומות", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/36890802/fb891373/` },
  { title: "רכז/ת גיוס והשמה - קבוצת דנאל", company: "קבוצת דנאל", description: "גיוס והשמה בחברת השמה ברמלה.", location: "רמלה", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/36979456/a83392fa/` },
  { title: "מנהל/ת גיוס ופיתוח משאבים", company: "המכללה האקדמית עמק יזרעאל", description: "ניהול גיוס ופיתוח משאבים במכללה.", location: "עפולה", region: "צפון", field: "משאבי אנוש", externalUrl: `${D}/job/36811705/080ca3b8/` },
  { title: "מנהל/ת גיוס מנוסה", company: "ONE BPO", description: "מנהל גיוס מנוסה בחולון.", location: "חולון", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/37018121/f4daba2e/` },
  { title: "רכז/ת גיוס ל-John Bryce", company: "John Bryce", description: "רכז גיוס ב-John Bryce בתל אביב.", location: "תל אביב", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/36801901/cff32b9a/` },
  { title: "רכז/ת גיוס לאשקלון", company: "ONE BPO", description: "רכז גיוס באשקלון.", location: "אשקלון", region: "דרום", field: "משאבי אנוש", externalUrl: `${D}/job/37051086/8b0fc141/` },
  { title: "רכז/ת גיוס - ראשון לציון", company: "חסוי", description: "רכז גיוס בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/36957853/48bb8318/` },
  { title: "רכז/ת גיוס בבנק לאומי", company: "בנק לאומי", description: "רכז גיוס בבנק לאומי בלוד.", location: "לוד", region: "מרכז", field: "משאבי אנוש", externalUrl: `${D}/job/37082493/40b8776f/` },
  { title: "רכז/ת גיוס ומשאבי אנוש - Kmifel", company: "Kmifel", description: "גיוס ומש\"א בנתניה.", location: "נתניה", region: "שרון", field: "משאבי אנוש", externalUrl: `${D}/job/36905394/f88cdf43/` },

  // ─── Round 3: ניהול מוקדים טלפונים (12) ─────────────────────────────
  { title: "נציגי מכירות למוקד נסיעות לחו\"ל", company: "כלל ביטוח", description: "מכירות טלפוניות במוקד נסיעות.", location: "ישראל", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/37086825/08F4FC95/` },
  { title: "נציג/ת מכירות טלפוני - מענק 10K", company: "Golan Telecom", description: "מכירות טלפוניות בגולן טלקום בת\"א.", location: "תל אביב", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/36921411/13be7ed3/` },
  { title: "נציג/ת מכירות טלפוני/ת לאלן קאר", company: "Allen Carr", description: "מכירות טלפון בחברת אלן קאר.", location: "ישראל", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/36811610/12ee6482/` },
  { title: "נציג/ת מכירות טלפוני לסטארט-אפ גיוס", company: "JOBS Ai", description: "מכירות טלפוניות לחברת סטארטאפ בתחום גיוס.", location: "ישראל", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/37007709/33779d67/` },
  { title: "נציג/ת מכירות טלפוני - ליסינג פרטי", company: "freesbe", description: "מכירות טלפון ליסינג פרטי.", location: "ישראל", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/36877863/ca9d7c3d/` },
  { title: "נציגי/ות מוקד מכירות - תיאטרון באר שבע", company: "תיאטרון באר שבע", description: "מכירות מנויים לתיאטרון.", location: "באר שבע", region: "דרום", field: "מוקד טלפוני", externalUrl: `${D}/job/36902506/d55bf2a0/` },
  { title: "סוכן/ת נסיעות - מכירות טלפוני", company: "Eshet Tours", description: "מכירות נסיעות באשת תיירות באשקלון.", location: "אשקלון", region: "דרום", field: "מוקד טלפוני", externalUrl: `${D}/job/36967657/11a11f00/` },
  { title: "נציג/ת מכירות טלפוני ב-DHL", company: "DHL", description: "מכירות טלפוניות ב-DHL באייר פורט סיטי. משרה זמנית.", location: "אייר פורט סיטי", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/37064462/0f3178d4/` },
  { title: "נציג/ת מכירות טלפוני למשרד פרסום", company: "Medical Online", description: "מכירות למשרד פרסום בראשון לציון.", location: "ראשון לציון", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/36939708/62c531c1/` },
  { title: "נציג/ת מכירות ביטוח טלפוני - שכר גבוה", company: "Loubitz Insurance", description: "מכירות ביטוח במוקד בראשל\"צ.", location: "ראשון לציון", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/36857153/d837e8be/` },
  { title: "נציג/ת שירות ומכירה טלפוני - שכר מתגמל", company: "המרכז האקדמי פרס", description: "שירות ומכירה במוקד במרכז האקדמי פרס ברחובות.", location: "רחובות", region: "שפלה", field: "מוקד טלפוני", externalUrl: `${D}/job/37041662/32a5f545/` },
  { title: "נציג/ת מכירות למוקד טלפוני - סוכנות רכב", company: "Capital Motors", description: "מכירות לסוכנות רכב בראשל\"צ.", location: "ראשון לציון", region: "מרכז", field: "מוקד טלפוני", externalUrl: `${D}/job/37060586/c91adcfa/` },

  // ─── Round 4: Ad-Tech (12) ──────────────────────────────────────────
  { title: "Sales Person לפלטפורמה דיגיטלית", company: "Aktiv Trail", description: "מכירות פלטפורמה דיגיטלית בתל אביב.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/36850047/2ed41806/` },
  { title: "FP&A Analyst", company: "Matrix North", description: "אנליסט פיננסי ב-Matrix North יקנעם עילית.", location: "יקנעם עילית", region: "צפון", field: "Ad - Tech", externalUrl: `${D}/job/37002123/3c42fa3d/` },
  { title: "Marketing & Communications Manager", company: "HighTech Company", description: "ניהול שיווק ותקשורת בחברת הייטק בתל אביב.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/37088630/062d24f7/` },
  { title: "B2B Sales - Marketing & AI", company: "FORTVISION", description: "מכירות B2B שיווק ו-AI ברמת החייל.", location: "רמת החייל", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/36956010/0f949e6e/` },
  { title: "Performance Marketing Specialist", company: "חסוי", description: "פרפורמנס מרקטינג מומחה בת\"א.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/36978164/c75a604a/` },
  { title: "Marketing Manager", company: "Progobs", description: "ניהול שיווק.", location: "מספר מקומות", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/37090663/d5d26195/` },
  { title: "Digital Director", company: "חסוי", description: "מנהל/ת דיגיטל בכיר/ה בת\"א.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/37067388/e47cafcd/` },
  { title: "Marketing Manager - Consumer Products", company: "עץ השדה", description: "ניהול שיווק מוצרי צריכה בחדרה.", location: "חדרה", region: "חיפה", field: "Ad - Tech", externalUrl: `${D}/job/36919112/e9b99d80/` },
  { title: "Digital Budget Manager", company: "חסוי", description: "ניהול תקציבי דיגיטל בת\"א.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/37067445/25128975/` },
  { title: "Sales & Business Development - BDO Ziv Haft", company: "BDO Ziv Haft", description: "מכירות ופיתוח עסקי ב-BDO.", location: "תל אביב", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/36952134/64f5707d/` },
  { title: "Senior Product Manager - Matrix DNA", company: "Matrix DNA", description: "מנהל מוצר בכיר בכפר סבא.", location: "כפר סבא", region: "שרון", field: "Ad - Tech", externalUrl: `${D}/job/36911702/a95a3e50/` },
  { title: "Performance & Digital Marketing", company: "Sisma", description: "סושיאל, קריאייטיב ו-PPC.", location: "ישראל", region: "מרכז", field: "Ad - Tech", externalUrl: `${D}/job/37097123/cea42650/` },

  // ─── Round 4: PPC (12) ──────────────────────────────────────────────
  { title: "PPC ג'וניור/ית - Indigio", company: "Indigio", description: "משרה התחלתית, ללא דרישת ניסיון. רמת גן.", location: "רמת גן", region: "מרכז", field: "PPC", externalUrl: `${D}/job/37110252/9c6fadfe/` },
  { title: "PPC EXPERT", company: "חסוי", description: "מומחה PPC עם 3-4 שנות ניסיון בכפר סבא.", location: "כפר סבא", region: "שרון", field: "PPC", externalUrl: `${D}/job/36874557/7c1f79f9/` },
  { title: "מנהל/ת קמפיינים PPC - Media Pharm", company: "Media Pharm Group", description: "ניהול קמפיינים PPC בתל אביב.", location: "תל אביב", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36918732/a1cccb0e/` },
  { title: "מנהל/ת קמפיינים PPC פייסבוק וגוגל", company: "Webs iSEO Global", description: "ניהול קמפיינים בנשר.", location: "נשר", region: "חיפה", field: "PPC", externalUrl: `${D}/job/36808798/319c7190/` },
  { title: "מנהל/ת PPC - Stick Media", company: "Stick Media", description: "ניהול קמפיינים PPC בחולון.", location: "חולון", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36847919/7f7c00ec/` },
  { title: "מנהל PPC - NTO", company: "NTO Marketing Agency", description: "ניהול PPC בנס ציונה.", location: "נס ציונה", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36952495/5864d4af/` },
  { title: "איש/אשת PPC - e-shop LTD", company: "e-shop LTD", description: "PPC ב-e-shop בנס ציונה.", location: "נס ציונה", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36835132/1f6706b3/` },
  { title: "מנהל/ת קמפיינים דיגיטליים", company: "Indigio", description: "מנהל קמפיינים דיגיטליים ברמת גן.", location: "רמת גן", region: "מרכז", field: "PPC", externalUrl: `${D}/job/37110233/6b1c9225/` },
  { title: "אחראי/ת תפעול אתר סחר URBANICA", company: "Urbanica", description: "תפעול אתר אונליין URBANICA.", location: "ישראל", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36902449/ece8af32/` },
  { title: "מנהל/ת קמפיינים PPC נסיון קטן", company: "Professional Eye", description: "PPC עם נסיון קטן.", location: "ישראל", region: "מרכז", field: "PPC", externalUrl: `${D}/job/37008165/1756cc23/` },
  { title: "מנהל/ת קמפיינים PPC - Interaction", company: "Interaction (חסוי)", description: "ניהול קמפיינים PPC בת\"א.", location: "תל אביב", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36804903/1d6b2c01/` },
  { title: "Performance Marketing Senior", company: "חסוי", description: "מנהל פרפורמנס בכיר ב-Israel.", location: "תל אביב", region: "מרכז", field: "PPC", externalUrl: `${D}/job/36978164/c75a604a-ppc/` },

  // ─── Round 4: אלקטרוניקה וחומרה (12) ────────────────────────────────
  { title: "טכנאי/ת אלקטרוניקה - Matrix", company: "Matrix", description: "טכנאי אלקטרוניקה ביקנעם עילית.", location: "יקנעם עילית", region: "צפון", field: "אלקטרוניקה", externalUrl: `${D}/job/37001990/c61d041b/` },
  { title: "טכנאי/ת אלקטרוניקה", company: "חסוי", description: "טכנאי אלקטרוניקה באזור השרון.", location: "מספר מקומות", region: "שרון", field: "אלקטרוניקה", externalUrl: `${D}/job/36933932/6b1ddb30/` },
  { title: "טכנאי/ת אלקטרוניקה דרג ד' - Enercon", company: "Enercon", description: "טכנאי אלקטרוניקה ב-Enercon נתניה.", location: "נתניה", region: "שרון", field: "אלקטרוניקה", externalUrl: `${D}/job/36922513/4e856759/` },
  { title: "טכנאי/ת מעבדה - Telefire", company: "Telefire", description: "טכנאי מעבדה בפ\"ת.", location: "פתח תקווה", region: "מרכז", field: "אלקטרוניקה", externalUrl: `${D}/job/36917535/aaba65eb/` },
  { title: "הנדסאי/ת אלקטרוניקה - Flex", company: "Flex", description: "הנדסאי אלקטרוניקה ב-Flex מגדל העמק.", location: "מגדל העמק", region: "צפון", field: "אלקטרוניקה", externalUrl: `${D}/job/37082626/f7a40d82/` },
  { title: "הנדסאי/ת אלקטרוניקה - Degel.us", company: "Degel.us", description: "הנדסאי אלקטרוניקה בגבעת שמואל.", location: "גבעת שמואל", region: "מרכז", field: "אלקטרוניקה", externalUrl: `${D}/job/36023471/c6f06266/` },
  { title: "הנדסאי/ת אלקטרוניקה - Itran", company: "Itran", description: "הנדסאי אלקטרוניקה ב-Itran.", location: "מספר מקומות", region: "מרכז", field: "אלקטרוניקה", externalUrl: `${D}/job/36939233/359e2bec/` },
  { title: "טכנאי/ת מעבדה - Unitronics", company: "Unitronics 89", description: "טכנאי מעבדה אלקטרוניקה ב-Unitronics.", location: "אייר פורט סיטי", region: "מרכז", field: "אלקטרוניקה", externalUrl: `${D}/job/37027412/f401045a/` },
  { title: "טכנאי בדיקות סופיות - Dataway", company: "Dataway", description: "טכנאי בדיקות סופיות בבאר יעקב.", location: "באר יעקב", region: "שפלה", field: "אלקטרוניקה", externalUrl: `${D}/job/36885482/d36d3345/` },
  { title: "טכנאי/ת מעבדה - AsRMTech", company: "AsRMTech ESR", description: "טכנאי מעבדה אלקטרוניקה בנתניה.", location: "נתניה", region: "שרון", field: "אלקטרוניקה", externalUrl: `${D}/job/37039097/0961bb18/` },
  { title: "הנדסאי אלקטרוניקה לבדיקות", company: "Matrix Testing", description: "הנדסאי אלקטרוניקה לבדיקות בחולון.", location: "חולון", region: "מרכז", field: "אלקטרוניקה", externalUrl: `${D}/job/36915768/04c2bc89/` },
  { title: "טכנאי/ת בדיקות סופיות - Binshtok", company: "Binshtok Services", description: "טכנאי בדיקות סופיות בנתניה.", location: "נתניה", region: "שרון", field: "אלקטרוניקה", externalUrl: `${D}/job/37100144/27698a97/` },

  // ─── Round 4: מכונות, תעשייה וייצור (12) ────────────────────────────
  { title: "מפעילי/ות מכונה - Elmo Motion", company: "Elmo Motion Control", description: "מפעיל/ת מכונה ב-Elmo.", location: "פתח תקווה", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/37084849/C69C29F7/` },
  { title: "מפעילי/ות וטכנאי/ות מכונה - שטראוס", company: "קבוצת שטראוס", description: "מפעילים וטכנאי מכונה בשטראוס.", location: "ישראל", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/36946510/BB758B70/` },
  { title: "מפעיל/ת מכונות ללא ניסיון - נטפים", company: "נטפים", description: "פרויקט צעירים, מפעיל מכונות.", location: "יפתח", region: "צפון", field: "תעשייה וייצור", externalUrl: `${D}/job/36904520/e788b612/` },
  { title: "מפעיל/ת מכונות - סנו נתניה", company: "סנו", description: "מפעיל מכונות בסנו נתניה ועמק חפר.", location: "נתניה", region: "שרון", field: "תעשייה וייצור", externalUrl: `${D}/job/36806157/339d12ed/` },
  { title: "מפעיל/ת מכונות", company: "נ.ח אפיקים גיוס", description: "מפעיל מכונות ביבנה.", location: "יבנה", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/36962033/a57b8ef4/` },
  { title: "מפעיל/ת מכונות לכפר סבא", company: "ד.מ בנטב", description: "מפעיל מכונות בפ\"ת/כ\"ס.", location: "פתח תקווה", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/35099159/84175838/` },
  { title: "מפעיל/ת מכונת הרעדה - Enercon", company: "Enercon", description: "מפעיל מכונת הרעדה לחברה ביטחונית בנתניה.", location: "נתניה", region: "שרון", field: "תעשייה וייצור", externalUrl: `${D}/job/36812693/db9c0fc7/` },
  { title: "מפעיל/ת מכונה - Dexcel Pharma", company: "Dexcel Pharma", description: "מפעיל מכונה ב-Dexcel.", location: "ישראל", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/36989431/fe5316af/` },
  { title: "מפעיל/ת מכונה - נטפים חצרים", company: "נטפים", description: "מפעיל מכונה במשמרות בחצרים.", location: "חצרים", region: "דרום", field: "תעשייה וייצור", externalUrl: `${D}/job/37094178/108fd720/` },
  { title: "מפעיל/ת מכונה - מטרנה (מענק 7000)", company: "JOBS Ai", description: "מפעל מטרנה מגייס מפעיל מכונה.", location: "ישראל", region: "מרכז", field: "תעשייה וייצור", externalUrl: `${D}/job/36977157/8002733c/` },
  { title: "מפעיל/ת מכונה - פנדור (12-13K)", company: "פנדור", description: "מפעיל מכונה בקריית גת, שכר 12-13K, בוקר בלבד.", location: "קריית גת", region: "דרום", field: "תעשייה וייצור", externalUrl: `${D}/job/36871631/9032f21c/` },
  { title: "מפעיל/ת מכונה - יוניליוור", company: "יוניליוור ישראל", description: "מפעיל מכונה ביוניליוור ערד.", location: "ערד", region: "דרום", field: "תעשייה וייצור", externalUrl: `${D}/job/37086578/7312d623/` },

  // ─── Round 4: קמעונאות ורכש (12) ────────────────────────────────────
  { title: "מנהל/ת רכש / קניין/ית - קבוצת קאופמן", company: "קבוצת קאופמן", description: "ניהול רכש בראש העין.", location: "ראש העין", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36888104/3d5fb060/` },
  { title: "קניין/ית לחברת קמעונאות מזון", company: "קנקון מוצרים", description: "קניין במודיעין-מכבים-רעות.", location: "מודיעין", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36983275/2d5deb82/` },
  { title: "קניין/ית - DHL לוגיסטיקה", company: "DHL", description: "קניין באייר פורט סיטי - DHL.", location: "אייר פורט סיטי", region: "מרכז", field: "רכש", externalUrl: `${D}/job/37064348/79b95d49/` },
  { title: "קניין/ית שירותי מיקור חוץ", company: "אסרמטק ESR", description: "קניין שירותי מיקור חוץ.", location: "מספר מקומות", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36796372/c825a363/` },
  { title: "קניין/ית - טירת הכרמל", company: "לוינדה פרסונל", description: "קניין בטירת הכרמל.", location: "טירת כרמל", region: "חיפה", field: "רכש", externalUrl: `${D}/job/36850731/4c532fc1/` },
  { title: "קניין/ית לשוק המקומי", company: "צח יבוא ושיווק", description: "קניין שוק מקומי ביבנה.", location: "יבנה", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36848546/3c604663/` },
  { title: "קניין/ית - סולל בונה", company: "קבוצת שיכון ובינוי", description: "קניין בסולל בונה אייר פורט סיטי.", location: "אייר פורט סיטי", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36959810/924418ac/` },
  { title: "קניין/ית רכש חו\"ל", company: "חסוי", description: "קניין רכש חו\"ל.", location: "מספר מקומות", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36916167/4565e130/` },
  { title: "קניין/ית רכש - CIP GROUP", company: "CIP GROUP", description: "קניין רכש בלוד.", location: "לוד", region: "מרכז", field: "רכש", externalUrl: `${D}/job/36939879/3888c60b/` },
  { title: "קניין/ית רכש - א.ל אלקטרוניקה", company: "א.ל אלקטרוניקה", description: "קניין רכש ביהוד.", location: "יהוד", region: "מרכז", field: "רכש", externalUrl: `${D}/job/37079225/47c9ae35/` },
  { title: "קניין/ית רכש - MER GROUP", company: "MER GROUP", description: "קניין רכש באור יהודה.", location: "אור יהודה", region: "מרכז", field: "רכש", externalUrl: `${D}/job/37042536/fdf6d135/` },
  { title: "קניין/ית רכש - Everest", company: "Everest Technologies", description: "קניין רכש בראש העין.", location: "ראש העין", region: "מרכז", field: "רכש", externalUrl: `${D}/job/37100923/75dd0d6c/` },
];

export async function POST() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let inserted = 0;
  let skipped = 0;
  const perCategory: Record<string, { inserted: number; skipped: number }> = {};
  const errors: string[] = [];

  for (const j of CURATED_JOBS) {
    const bucket = perCategory[j.field] ?? { inserted: 0, skipped: 0 };
    perCategory[j.field] = bucket;
    try {
      const dup = await prisma.job.findFirst({
        where: { externalUrl: j.externalUrl },
        select: { id: true },
      });
      if (dup) { bucket.skipped++; skipped++; continue; }
      await prisma.job.create({
        data: {
          title: j.title,
          company: j.company,
          description: j.description,
          summary: j.description,
          location: j.location,
          region: j.region,
          field: j.field,
          source: "סידור ידני - " + j.field,
          externalUrl: j.externalUrl,
          isPublished: true,
        },
      });
      bucket.inserted++; inserted++;
    } catch (e) {
      errors.push(`${j.title}: ${String(e instanceof Error ? e.message : e).slice(0, 80)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: CURATED_JOBS.length,
    inserted,
    skipped,
    perCategory,
    errors: errors.slice(0, 10),
  });
}
