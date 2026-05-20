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
