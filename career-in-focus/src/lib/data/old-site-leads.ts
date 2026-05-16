/**
 * Historical leads from the old marketing site (careerinfocus.co.il).
 *
 * These are people who filled out one of the 5 contact forms on the
 * old static site between June 2025 and January 2026, before the new
 * platform launched. The old site only delivered them as email
 * notifications to Coral's Gmail — no DB. We extracted them by
 * scanning her inbox and de-duplicating.
 *
 * We import these into the new platform's Lead table on a one-time
 * basis (see /api/admin/import-old-leads) so Coral can:
 *   1. See them all in /admin/leads
 *   2. Send a single re-engagement broadcast (the "איך מתקדם החיפוש?"
 *      email — see lib/actions/broadcast.ts when audience = OLD_LEADS).
 *
 * Source values:
 *   "marketing-site:contact"          → generic contact form
 *   "marketing-site:job-application"  → applied to a specific role
 *   "marketing-site:workshop"         → workshop interest form
 *
 * Each entry includes the *original* createdAt timestamp from Gmail
 * so the dashboard timeline doesn't show them all as "today".
 */

export interface OldSiteLead {
  name: string;
  firstName: string;   // first token of `name`, used for "{name}" template
  email: string | null;
  phone: string | null;
  source: string;
  message: string | null;
  createdAt: string;   // ISO 8601
}

export const OLD_SITE_LEADS: OldSiteLead[] = [
  // ─── Contact form (59 unique) ────────────────────────────────────────
  { name: "דניאל גולדשמידט",  firstName: "דניאל",   email: "dgold904@gmail.com",         phone: "0524017848",   source: "marketing-site:contact", message: null, createdAt: "2026-01-31T19:27:32Z" },
  { name: "שירה מנגן",         firstName: "שירה",    email: "mngnsrh@gmail.com",          phone: "0537608362",   source: "marketing-site:contact", message: null, createdAt: "2026-01-15T15:49:36Z" },
  { name: "גיל ברוכים",        firstName: "גיל",     email: "gilbrucim@gmail.com",        phone: "0502629903",   source: "marketing-site:contact", message: null, createdAt: "2026-01-11T11:51:31Z" },
  { name: "אלכס מנקר",          firstName: "אלכס",    email: "alexmanker1@gmail.com",      phone: "0502995992",   source: "marketing-site:contact", message: null, createdAt: "2025-12-25T11:13:47Z" },
  { name: "דנה דיין",            firstName: "דנה",     email: "ayelethd1@gmail.com",        phone: "0587124770",   source: "marketing-site:contact", message: null, createdAt: "2025-12-25T08:29:42Z" },
  { name: "בתאל",                firstName: "בתאל",    email: "batelcohel@gmail.com",       phone: "0506315425",   source: "marketing-site:contact", message: null, createdAt: "2025-12-23T17:55:37Z" },
  { name: "טל סולימני",         firstName: "טל",      email: "tal.sulimani25@gmail.com",   phone: "0528647779",   source: "marketing-site:contact", message: null, createdAt: "2025-12-23T06:36:25Z" },
  { name: "אמונה",               firstName: "אמונה",   email: "emunafrid13@gmail.com",      phone: "0507737769",   source: "marketing-site:contact", message: "פנתה גם דרך הגשת מועמדות לתפקיד תפעול בינואר 2026", createdAt: "2025-12-22T13:11:56Z" },
  { name: "אלמוג שחר",          firstName: "אלמוג",   email: "almog@wecommunity.co.il",    phone: "0509928993",   source: "marketing-site:contact", message: null, createdAt: "2025-12-21T16:46:16Z" },
  { name: "לאון שמיר",          firstName: "לאון",    email: "rambamprinting@bezeqint.net",phone: "0508224585",   source: "marketing-site:contact", message: null, createdAt: "2025-12-21T08:46:39Z" },
  { name: "בר פלדמן",            firstName: "בר",      email: "baravital0102@gmail.com",    phone: "0547998893",   source: "marketing-site:contact", message: null, createdAt: "2025-12-15T20:29:50Z" },
  { name: "ורד אוכבד",          firstName: "ורד",     email: "vered.ochvad@gmail.com",     phone: "0524659632",   source: "marketing-site:contact", message: "פנתה פעמיים — 08/12 ו-11/12/2025", createdAt: "2025-12-11T08:13:05Z" },
  { name: "לירון כהן",           firstName: "לירון",   email: "liron.kleinman@gmail.com",   phone: "0585869730",   source: "marketing-site:contact", message: null, createdAt: "2025-12-10T10:23:54Z" },
  { name: "יונתן אבירם",        firstName: "יונתן",   email: "truth62@gmail.com",          phone: "0508544545",   source: "marketing-site:contact", message: null, createdAt: "2025-12-09T13:45:35Z" },
  { name: "נטלי בן נון",         firstName: "נטלי",    email: "nataliben1010@gmail.com",    phone: "0549497917",   source: "marketing-site:contact", message: null, createdAt: "2025-12-08T21:24:27Z" },
  { name: "תום יערי",            firstName: "תום",     email: "tomyaari135@gmail.com",      phone: "0523062726",   source: "marketing-site:contact", message: null, createdAt: "2025-12-08T13:19:20Z" },
  { name: "מיטל לאון לוי",      firstName: "מיטל",    email: "meytalleon@gmail.com",       phone: null,           source: "marketing-site:contact", message: "טופס מלא חלקית — בעמודת טלפון נכתב 'לאון לוי'", createdAt: "2025-12-03T08:15:53Z" },
  { name: "שיר",                  firstName: "שיר",     email: "sahir4548@gmail.com",        phone: "0546605592",   source: "marketing-site:contact", message: "פנתה גם ב-30/07/2025", createdAt: "2025-09-21T07:44:54Z" },
  { name: "אורנה ראוכר",        firstName: "אורנה",   email: "orna.raucher@gmail.com",     phone: "0523619409",   source: "marketing-site:contact", message: null, createdAt: "2025-09-21T07:41:13Z" },
  { name: "עדן אבוקסיס",        firstName: "עדן",     email: "eden.ab3110@gmail.com",      phone: "0503677564",   source: "marketing-site:contact", message: "פנתה פעמיים", createdAt: "2025-09-17T10:56:13Z" },
  { name: "יעל כהן",              firstName: "יעל",     email: "yaelcohen1345@gmail.com",    phone: "053-8253501",  source: "marketing-site:contact", message: null, createdAt: "2025-09-16T18:34:23Z" },
  { name: "קטיה בלביץ",          firstName: "קטיה",    email: "katiabel94@gmail.com",       phone: "0526830543",   source: "marketing-site:contact", message: null, createdAt: "2025-09-16T15:59:55Z" },
  { name: "סיון ברון",            firstName: "סיון",    email: "sivang7@gmail.com",          phone: "0544348581",   source: "marketing-site:contact", message: null, createdAt: "2025-09-14T17:45:57Z" },
  { name: "רוזה מולצ׳יניוק",    firstName: "רוזה",    email: "rozamolchaniyuk@gmail.com",  phone: "0542039234",   source: "marketing-site:contact", message: "הגישה גם מועמדות למש\"א", createdAt: "2025-09-14T10:14:56Z" },
  { name: "אנה ריי",              firstName: "אנה",     email: "annarey081992@gmail.com",    phone: "0547560991",   source: "marketing-site:contact", message: "שלחה פעמיים אותו יום", createdAt: "2025-09-10T11:09:46Z" },
  { name: "נועה דרעי",            firstName: "נועה",    email: "noaderi1601@icloud.com",     phone: "0504410607",   source: "marketing-site:contact", message: null, createdAt: "2025-09-09T13:29:27Z" },
  { name: "דניאל לוי",            firstName: "דניאל",   email: "daniellevi6003@gmail.com",   phone: "0522227830",   source: "marketing-site:contact", message: "המייל המקורי הוקלד עם .con — תוקן ל-.com", createdAt: "2025-09-04T15:02:27Z" },
  { name: "נועה דוד",              firstName: "נועה",    email: "noadavid1000102@gmail.com",  phone: "0509880023",   source: "marketing-site:contact", message: "הגישה גם מועמדות למזכירות", createdAt: "2025-09-04T07:31:28Z" },
  { name: "מור רבה",              firstName: "מור",     email: "morraba13@gmail.com",        phone: "0505806459",   source: "marketing-site:contact", message: null, createdAt: "2025-09-03T14:28:24Z" },
  { name: "ליאת יפה",              firstName: "ליאת",    email: "liat.yaffe1@gmail.com",      phone: "0525655649",   source: "marketing-site:contact", message: null, createdAt: "2025-09-02T17:05:47Z" },
  { name: "רחלי סבאג",            firstName: "רחלי",    email: "sbgmyrym@gmail.com",         phone: "0538699971",   source: "marketing-site:contact", message: null, createdAt: "2025-08-28T10:34:20Z" },
  { name: "אלי לוי",                firstName: "אלי",     email: "elilevy111@gmail.com",       phone: "0542634708",   source: "marketing-site:contact", message: null, createdAt: "2025-08-27T12:23:55Z" },
  { name: "שיראל יראי",            firstName: "שיראל",   email: "shirelyaray16@gmail.com",    phone: "0548852169",   source: "marketing-site:contact", message: null, createdAt: "2025-08-27T10:23:33Z" },
  { name: "גניפר",                  firstName: "גניפר",   email: "Jeniferelimalch78@gmail.com",phone: "0543139885",   source: "marketing-site:contact", message: null, createdAt: "2025-08-26T12:13:14Z" },
  { name: "יונס מוחמד",            firstName: "יונס",    email: "hamudacyber10@gmail.com",    phone: "0527361893",   source: "marketing-site:contact", message: null, createdAt: "2025-08-24T10:59:50Z" },
  { name: "לורין קובטי",          firstName: "לורין",   email: "lorinkob11@gmail.com",       phone: "0545653235",   source: "marketing-site:contact", message: null, createdAt: "2025-08-23T08:11:26Z" },
  { name: "אושר ישראלי",          firstName: "אושר",    email: "osherisrael16@gmail.com",    phone: "0502768830",   source: "marketing-site:contact", message: null, createdAt: "2025-08-18T22:10:53Z" },
  { name: "בתאל כהן",              firstName: "בתאל",    email: "batelc4@icloud.com",         phone: "0549816530",   source: "marketing-site:contact", message: null, createdAt: "2025-08-18T08:54:09Z" },
  { name: "תמר",                    firstName: "תמר",     email: "tamarerera@gmail.com",       phone: "0533777611",   source: "marketing-site:contact", message: null, createdAt: "2025-08-18T00:54:12Z" },
  { name: "עמיעד ליברמן",          firstName: "עמיעד",   email: "lieberman.ami@gmail.com",    phone: "0505333427",   source: "marketing-site:contact", message: null, createdAt: "2025-08-16T17:12:30Z" },
  { name: "יובל כהן",                firstName: "יובל",    email: "Yuval210298@gmail.com",      phone: "050-6840229",  source: "marketing-site:contact", message: null, createdAt: "2025-08-13T17:22:48Z" },
  { name: "אילן סלה",                firstName: "אילן",    email: "ilansella@gmail.com",        phone: "0543170824",   source: "marketing-site:contact", message: "שלח פעמיים", createdAt: "2025-08-10T08:06:33Z" },
  { name: "רותם",                    firstName: "רותם",    email: "rotemstrash@gmail.com",      phone: "0508511949",   source: "marketing-site:contact", message: null, createdAt: "2025-08-06T13:10:05Z" },
  { name: "הודיה בסון",              firstName: "הודיה",   email: "Hodaya01110@gmail.com",      phone: "0539280832",   source: "marketing-site:contact", message: null, createdAt: "2025-08-03T13:15:28Z" },
  { name: "עידית",                    firstName: "עידית",   email: "harriseidit@gmail.com",      phone: "0506242447",   source: "marketing-site:contact", message: null, createdAt: "2025-08-03T10:56:54Z" },
  { name: "שירה וסולי",              firstName: "שירה",    email: "shira.vasoli@gmail.com",     phone: "0548116581",   source: "marketing-site:contact", message: null, createdAt: "2025-08-01T05:15:14Z" },
  { name: "חנה יעקובוב",            firstName: "חנה",     email: "hanay8258@gmail.com",        phone: "0533334329",   source: "marketing-site:contact", message: null, createdAt: "2025-07-29T08:32:40Z" },
  { name: "אביב עלמו",                firstName: "אביב",    email: "avivalamo2245@gmail.com",    phone: "0535291497",   source: "marketing-site:contact", message: null, createdAt: "2025-07-28T09:18:06Z" },
  { name: "מור לוי",                  firstName: "מור",     email: "Morbh13@gmail.com",          phone: "0508616157",   source: "marketing-site:contact", message: null, createdAt: "2025-07-22T11:01:00Z" },
  { name: "ויקי עמרני",              firstName: "ויקי",    email: "vikiamrani1960@gmail.com",   phone: "0542072154",   source: "marketing-site:contact", message: null, createdAt: "2025-07-21T11:48:51Z" },
  { name: "רויטל יוסופוב",          firstName: "רויטל",   email: "revital2409@gmail.com",      phone: "0546727722",   source: "marketing-site:contact", message: null, createdAt: "2025-07-20T15:18:08Z" },
  { name: "ודים ניסנוב",              firstName: "ודים",    email: "vadimnisanov27@gmail.com",   phone: "0537243260",   source: "marketing-site:contact", message: null, createdAt: "2025-07-16T19:31:26Z" },
  { name: "רשא",                      firstName: "רשא",     email: "rashanashef0@gmail.com",     phone: "0528153315",   source: "marketing-site:contact", message: null, createdAt: "2025-07-13T12:33:08Z" },
  { name: "מירי סיבוני",              firstName: "מירי",    email: "sibonimiri@gmail.com",       phone: "0523089588",   source: "marketing-site:contact", message: null, createdAt: "2025-07-09T12:04:05Z" },
  { name: "נטלי לויץ",                firstName: "נטלי",    email: "natalie.levich12@gmail.com", phone: "0538294824",   source: "marketing-site:contact", message: "שלחה פעמיים אותו יום", createdAt: "2025-07-06T09:14:02Z" },
  { name: "בת חן דהן",                firstName: "בת חן",   email: "dahanbathen@gmail.com",      phone: "0502207818",   source: "marketing-site:contact", message: null, createdAt: "2025-06-30T08:08:16Z" },
  { name: "מיתר בן שמחון",            firstName: "מיתר",    email: "metar630@gmail.com",         phone: "054-5832837",  source: "marketing-site:contact", message: null, createdAt: "2025-06-26T15:41:30Z" },
  { name: "ורד כהנר",                  firstName: "ורד",     email: "vered1209@gmail.com",        phone: "0502209161",   source: "marketing-site:contact", message: "הגישה גם מועמדות למש\"א באותו יום", createdAt: "2025-06-26T08:09:53Z" },

  // ─── Workshops (1 unique, non-test) ──────────────────────────────────
  { name: "מריאנה גבלין",            firstName: "מריאנה",  email: "marianag@migdal-haemeq.muni.il", phone: "052-2357734",  source: "marketing-site:workshop", message: "מרכז קהילתי — הכנה לראיונות עבודה",  createdAt: "2025-08-07T09:16:14Z" },

  // ─── Job applications (25 unique) ────────────────────────────────────
  { name: "לינור מרזייב",            firstName: "לינור",   email: null,  phone: "052-3475966",  source: "marketing-site:job-application", message: "תפקיד מבוקש: שירות לקוחות · קו\"ח במייל",          createdAt: "2026-01-26T16:52:55Z" },
  { name: "אמונה פריד",                firstName: "אמונה",   email: null,  phone: "0507737769",   source: "marketing-site:job-application", message: "תפקיד מבוקש: תפעול · קו\"ח במייל",                  createdAt: "2026-01-26T13:33:18Z" },
  { name: "יובל חביב",                  firstName: "יובל",    email: null,  phone: "0524548089",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל · שלחה פעמיים", createdAt: "2026-01-04T15:50:21Z" },
  { name: "עמית פלד",                    firstName: "עמית",    email: null,  phone: "0522747944",   source: "marketing-site:job-application", message: "תפקיד מבוקש: ניהול אתר אינטרנט · קו\"ח במייל",       createdAt: "2026-01-04T09:38:43Z" },
  { name: "מאי גוזמן",                    firstName: "מאי",     email: null,  phone: "0544270744",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל",              createdAt: "2025-12-29T21:51:21Z" },
  { name: "יעל דרור",                      firstName: "יעל",     email: null,  phone: "0534447172",   source: "marketing-site:job-application", message: "תפקיד מבוקש: אדמיניסטרציה ובק אופיס · קו\"ח במייל", createdAt: "2025-09-18T17:17:16Z" },
  { name: "דוד טאוב",                      firstName: "דוד",     email: null,  phone: "0544942815",   source: "marketing-site:job-application", message: "תפקיד מבוקש: בודק תוכנה · קו\"ח במייל",             createdAt: "2025-09-17T09:04:16Z" },
  { name: "רוזה מולצ׳יניוק (תפקיד)",  firstName: "רוזה",    email: null,  phone: "0542039234",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל",              createdAt: "2025-09-14T10:15:26Z" },
  { name: "שיר אנטין בלטה",              firstName: "שיר",     email: null,  phone: "0548742654",   source: "marketing-site:job-application", message: "תפקיד מבוקש: בריאות ורווחה / תפעול / מש\"א · קו\"ח במייל", createdAt: "2025-09-11T11:33:59Z" },
  { name: "נועה דוד (תפקיד)",            firstName: "נועה",    email: null,  phone: "0509880023",   source: "marketing-site:job-application", message: "תפקיד מבוקש: מזכירות · קו\"ח במייל",                createdAt: "2025-09-04T07:30:24Z" },
  { name: "אורין",                          firstName: "אורין",   email: null,  phone: "0509585441",   source: "marketing-site:job-application", message: "תפקיד מבוקש: בק אופיס ללא טלפונים · קו\"ח במייל",   createdAt: "2025-08-25T18:46:16Z" },
  { name: "אגם אדרי",                      firstName: "אגם",     email: null,  phone: "0535280206",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משרדי · קו\"ח במייל",                  createdAt: "2025-08-25T15:09:57Z" },
  { name: "טופז כהן-צמח",                  firstName: "טופז",    email: null,  phone: "050-728-0553", source: "marketing-site:job-application", message: "תפקיד מבוקש: כספים · קו\"ח במייל",                  createdAt: "2025-08-19T19:34:45Z" },
  { name: "נועה (עורכת דין)",              firstName: "נועה",    email: null,  phone: "0503088640",   source: "marketing-site:job-application", message: "תפקיד מבוקש: עורכת דין · קו\"ח במייל · אתן בקשר",   createdAt: "2025-08-16T17:08:47Z" },
  { name: "נוי כהן",                        firstName: "נוי",     email: null,  phone: "0548180748",   source: "marketing-site:job-application", message: "תפקיד מבוקש: הדרכה מקצועית — מדיקל · קו\"ח במייל", createdAt: "2025-08-06T11:05:23Z" },
  { name: "מיכאל חו",                      firstName: "מיכאל",   email: null,  phone: "0542585863",   source: "marketing-site:job-application", message: "תפקיד מבוקש: מכירות · קו\"ח במייל · ניסית להתקשר",  createdAt: "2025-07-24T11:35:01Z" },
  { name: "זהבית בראי",                    firstName: "זהבית",   email: null,  phone: "0543157771",   source: "marketing-site:job-application", message: "תפקיד מבוקש: תפעול · קו\"ח במייל",                  createdAt: "2025-07-18T09:47:29Z" },
  { name: "שרון ונטורה",                    firstName: "שרון",    email: null,  phone: "0544384056",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל",              createdAt: "2025-07-16T14:25:34Z" },
  { name: "גילי גבאי",                      firstName: "גילי",    email: null,  phone: "0544714333",   source: "marketing-site:job-application", message: "תפקיד מבוקש: אדמיניסטרציה / בק אופיס / מזכירות · קו\"ח במייל", createdAt: "2025-07-13T11:37:12Z" },
  { name: "מוחמד מנסור",                    firstName: "מוחמד",   email: null,  phone: "0522121173",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל",              createdAt: "2025-07-12T23:56:01Z" },
  { name: "שחר פרידמן",                      firstName: "שחר",     email: null,  phone: "0524888516",   source: "marketing-site:job-application", message: "תפקיד מבוקש: עיצוב פנים / נדל\"ן / בנייה · קו\"ח במייל", createdAt: "2025-07-09T07:17:54Z" },
  { name: "ורד כהנר (תפקיד)",                firstName: "ורד",     email: null,  phone: "0502209161",   source: "marketing-site:job-application", message: "תפקיד מבוקש: משאבי אנוש · קו\"ח במייל",              createdAt: "2025-06-26T08:12:16Z" },
];

/**
 * Helper: return only leads we can actually email (have a valid email).
 * Used by the OLD_LEADS broadcast audience.
 */
export function emailableOldLeads(): OldSiteLead[] {
  return OLD_SITE_LEADS.filter((l) => l.email && l.email.includes("@"));
}
