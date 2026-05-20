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
