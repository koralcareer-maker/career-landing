/**
 * One-shot import data for Rachelli Zaari (racheli280296@gmail.com).
 * Parsed from her Drive folder — CV + LinkedIn photo + 56 job applications
 * tracked in the "מעקב מועמדות" spreadsheet.
 *
 * Used by /admin/import-rachelli to seed her account.
 */

// Inline-typed to avoid pulling in the generated Prisma client at edge.
// Mirrors the ApplicationStatus enum in prisma/schema.prisma.
type ApplicationStatus =
  | "SAVED"
  | "FIT_CHECKED"
  | "APPLIED"
  | "PROACTIVE_OUTREACH"
  | "FOLLOWUP_SENT"
  | "INTERVIEW_SCHEDULED"
  | "FIRST_INTERVIEW"
  | "ADVANCED_INTERVIEW"
  | "TASK_HOME"
  | "OFFER"
  | "REJECTED"
  | "FROZEN"
  | "ACCEPTED";

export const RACHELLI_EMAIL = "racheli280296@gmail.com";
export const RACHELLI_FULL_NAME = "רחלי זארי";
export const RACHELLI_PHONE = "050-2288371";
export const RACHELLI_TARGET_ROLE = "Customer Success Manager / Account Manager";

// Static assets (committed to /public/clients/rachelli/).
export const RACHELLI_PHOTO_URL  = "/clients/rachelli/photo.jpg";
export const RACHELLI_CV_URL     = "/clients/rachelli/cv.pdf";

interface AppRow {
  dateApplied: string;        // ISO YYYY-MM-DD
  source: string;
  company: string;
  role: string;
  jobLink?: string;
  notes?: string;
  status?: ApplicationStatus;  // defaults to APPLIED
}

// Parsed from the "מעקב מועמדות" spreadsheet.
// Skipped rows that had no company AND no role AND no link (3 such rows on
// 2026-04-30 — "פיירו", "יאנג מדיה" and an empty Onboard row).
export const RACHELLI_APPLICATIONS: AppRow[] = [
  { dateApplied: "2026-03-16", source: "לינקדין",       company: "Cloudinary",                                  role: "Technical Customer Success Manager",                            jobLink: "https://www.linkedin.com/jobs/view/4370214564" },
  { dateApplied: "2026-03-16", source: "לינקדין",       company: "מרטנס Mertens מקבוצת מלם תים",              role: "Project Management Officer",                                    jobLink: "https://www.linkedin.com/jobs/view/4386050842" },
  { dateApplied: "2026-03-16", source: "דרושים IL",     company: "ישראכרט",                                    role: "מתאמ.ת תיקי לקוחות לחטיבת עסקים",                              jobLink: "https://www.drushim.co.il/job/36453080/9d2f593c/" },
  { dateApplied: "2026-03-18", source: "CIVI",          company: "Digital Head Hunters",                       role: "מתאמת פרוייקטים",                                                jobLink: "https://app.civi.co.il/promo/id=835970&src=16379" },
  { dateApplied: "2026-03-18", source: "CIVI",          company: "Digital Head Hunters",                       role: "Customer Service & Operations Manager",                          notes: "דרישות של אנגלית כשפת אם", jobLink: "https://app.civi.co.il/promo/id=750300&src=16379" },
  { dateApplied: "2026-03-18", source: "וואטסאפ — Secret Project Managers Jobs", company: "KPMG",              role: "מנהלת פרוייקטים ומטמיעת תהליכים",                                jobLink: "https://kpmg.co.il/technologyconsulting/he/vacancies/technology-consulting/%D7%9E%D7%A0%D7%94%D7%9C%D7%AA-%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98%D7%99%D7%9D-%D7%95%D7%9E%D7%98%D7%9E%D7%99%D7%A2%D7%AA-%D7%AA%D7%94%D7%9C%D7%99%D7%9B%D7%99%D7%9D" },
  { dateApplied: "2026-03-19", source: "דרושים IL",     company: "משלוחה",                                     role: "מנהלת קשרי לקוחות",                                              notes: "משאבי אנוש שלחו לי הודעה בוואטסאפ. חזרו וזה נפל על שכר.", status: "REJECTED", jobLink: "https://www.drushim.co.il/job/36501948/69a5195d/" },
  { dateApplied: "2026-03-19", source: "נטוורקינג — ענת מעודד", company: "guildeline",                         role: "Customer Success Manager",                                       jobLink: "https://www.comeet.com/jobs/guideline/89.009/customer-success-manager/B8.641" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "AppSsociate",                                role: "Account Manager",                                                jobLink: "https://www.linkedin.com/jobs/view/4376645242/" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "כלמוביל",                                    role: "מנהל.ת אגף חווית עובד ופרוייקטים במשאבי אנוש (משרה מאומתת)",   jobLink: "https://www.linkedin.com/jobs/view/4383708014/" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "Publicis Groupe Israel",                     role: "Product Manager",                                                jobLink: "https://www.linkedin.com/jobs/view/4324507613" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "דיסקונט",                                    role: "Digital Project Manager",                                        jobLink: "https://www.linkedin.com/jobs/view/4368663805/" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "ManpowerGroup",                              role: "מנהל/ת פרוייקטים",                                              jobLink: "https://www.linkedin.com/jobs/view/4376375119" },
  { dateApplied: "2026-02-23", source: "לינקדין",       company: "Formally Ltd",                               role: "Technical Project Manager",                                      jobLink: "https://www.linkedin.com/jobs/view/4381529310" },
  { dateApplied: "2026-02-24", source: "פייסבוק",       company: "—",                                          role: "Customer Success",                                               notes: "שלחתי דרך המייל קורות חיים", jobLink: "https://www.facebook.com/share/p/17S7QTKjS7/" },
  { dateApplied: "2026-02-24", source: "דרושים IL",     company: "קוד אואזיס",                                 role: "מנהל פרוייקט טכנולוגי",                                          jobLink: "https://www.drushim.co.il/job/36497597/e4fc9526/" },
  { dateApplied: "2026-03-25", source: "לינקדין",       company: "Adcore (TSX: ADCO)",                         role: "Client Implementation & Success Manager",                       jobLink: "https://www.linkedin.com/jobs/view/4381517425" },
  { dateApplied: "2026-03-25", source: "לינקדין",       company: "צ׳ק פוינט",                                  role: "Revenue Operations Project Manager",                            notes: "יש סיכוי גבוה שצריך אנגלית למרות שלא כתוב", jobLink: "https://www.linkedin.com/jobs/view/4383691489" },
  { dateApplied: "2026-03-25", source: "טל בוכניק (קורל)", company: "ביימי",                                    role: "Junior Partner Success Manager",                                jobLink: "https://www.comeet.com/jobs/buyme/B2.008/junior-partner-success-manager/BA.561" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "STORENEXT",                                  role: "Junior Research Analyst",                                        jobLink: "https://www.linkedin.com/jobs/view/4376645242/" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "Moveo Source",                               role: "Project Manager — Maternity Leave",                              notes: "קורל אמרה שלא רלוונטי", status: "FROZEN", jobLink: "https://www.linkedin.com/jobs/view/4382448052" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "OKOORA",                                     role: "Account Manager" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "JobsSeek",                                   role: "Customer Success Manager",                                       jobLink: "https://www.linkedin.com/jobs/view/4386158812" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "ASUS",                                       role: "Account Manager",                                                jobLink: "https://www.linkedin.com/jobs/view/4386830913/" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "סודה סטרים",                                 role: "מנהל.ת תיקי לקוחות B2B",                                          jobLink: "https://www.linkedin.com/jobs/view/4353776703/" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "Autofleet",                                  role: "Head of Customer Success Management",                            jobLink: "https://www.linkedin.com/jobs/view/4387337060/" },
  { dateApplied: "2026-03-26", source: "לינקדין",       company: "Confidential",                               role: "AI Project Coordinator",                                         jobLink: "https://www.linkedin.com/jobs/view/4377841554/" },
  { dateApplied: "2026-04-15", source: "לינקדין",       company: "K LOGIC",                                    role: "Client Manager",                                                 jobLink: "https://www.linkedin.com/jobs/view/4392414707/" },
  { dateApplied: "2026-04-15", source: "לינקדין",       company: "Provision-ISR",                              role: "Sales Project Manager",                                          jobLink: "https://www.linkedin.com/jobs/view/4399384949/" },
  { dateApplied: "2026-04-20", source: "לינקדין",       company: "Guidde",                                     role: "SMB Customer Success Manager",                                   jobLink: "https://www.linkedin.com/jobs/view/4400208915/" },
  { dateApplied: "2026-04-20", source: "לינקדין",       company: "bagira",                                     role: "Project Manager",                                                jobLink: "https://www.linkedin.com/jobs/view/4399891799/" },
  { dateApplied: "2026-04-22", source: "לינקדין",       company: "פמה מימון בע״מ",                             role: "מנהל/ת פרויקטים Customer Success",                              notes: "הייתי שם בראיון לפקידת קבלה לפני מספר חודשים. התקשרתי לטל המגייסת ושלחתי לה קורות חיים גם בוואטסאפ.", jobLink: "https://www.drushim.co.il/job/36672340/1bd903d8/" },
  { dateApplied: "2026-04-23", source: "Mploy",         company: "—",                                          role: "Customer Success",                                               jobLink: "https://www.mploy.co.il/job/details/1900202" },
  { dateApplied: "2026-04-23", source: "Mploy",         company: "mećkano",                                    role: "מנהל תיק לקוחות",                                                jobLink: "https://www.mploy.co.il/job/details/1930019" },
  { dateApplied: "2026-04-23", source: "Mploy",         company: "Talent-HR",                                  role: "מנהל תיקי לקוחות",                                               jobLink: "https://www.mploy.co.il/job/details/1928655" },
  { dateApplied: "2026-04-23", source: "Mploy",         company: "שליש גן עדן",                                role: "מנהל/ת פרויקטים ופעילות — יד ימינו של המנכ״ל",                  notes: "נס ציונה", jobLink: "https://www.mploy.co.il/job/details/1932665" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "Proceed",                                    role: "מנתח מערכות ומנהל פרוייקטים",                                    jobLink: "https://drushim.co.il/job/36676938/4CFCFB67" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "רזאל מערכות",                                role: "מנתח מערכות ומנהל פרוייקטים",                                    jobLink: "https://www.drushim.co.il/job/36602002/F0CAA93D/" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "עידור מערכות",                               role: "קניין/ית רכש IT לחטיבת הטכנולוגיות בארגון גדול",                jobLink: "https://www.drushim.co.il/job/36763768/789B8EC4/" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "Ucl Group",                                  role: "מנהל/ת פרויקטים ומנתח/ת מערכות מוביל/ה",                       jobLink: "https://www.drushim.co.il/job/36778930/F3E7615D/" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "WORKI",                                      role: "PMO לחברה טכנולוגית ביהוד",                                      jobLink: "https://drushim.co.il/job/36789627/555E2162" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "JOB SPACE",                                  role: "מנהלת תיקי לקוחות עסקיים בבני ברק",                              jobLink: "https://www.drushim.co.il/job/36616556/F9FA584C/" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "—",                                          role: "מנהלי/ות תיקים לבית תוכנה בבורסה ברמת גן",                       jobLink: "https://www.drushim.co.il/job/36675475/EEC91B0F/" },
  { dateApplied: "2026-04-26", source: "דרושים IL",     company: "אומניטלקום",                                 role: "Customer Success Representative",                                jobLink: "https://www.drushim.co.il/job/36806081/22428B41/" },
  { dateApplied: "2026-04-28", source: "לינקדין",       company: "Apptimus",                                   role: "Junior Ad Operations Manager",                                   jobLink: "https://www.linkedin.com/jobs/view/4386727884" },
  { dateApplied: "2026-04-28", source: "לינקדין — נטוורקינג ענת מעודד", company: "guildeline",                   role: "Customer Success Manager",                                       jobLink: "https://www.comeet.com/jobs/guideline/89.009/customer-success-manager/4D.866" },
  { dateApplied: "2026-04-28", source: "לינקדין",       company: "Spiky",                                      role: "Client Manager",                                                 jobLink: "https://www.linkedin.com/jobs/view/4405531782" },
  { dateApplied: "2026-04-28", source: "קורל",          company: "civi",                                       role: "Customer Care Manager",                                          jobLink: "https://app.civi.co.il/promo/id=557342&src=5725" },
  { dateApplied: "2026-04-28", source: "קורל",          company: "ביימי",                                      role: "Junior SMB Success",                                             jobLink: "https://www.comeet.com/jobs/buyme/B2.008/junior-smb-success/FC.05C" },
  { dateApplied: "2026-04-28", source: "לינקדין",       company: "אלעד מערכות",                                role: "מנהל/ת פרויקטים ומנתח מערכות Salesforce",                       jobLink: "https://www.linkedin.com/jobs/view/4368940865" },
  { dateApplied: "2026-04-29", source: "לינקדין",       company: "REDIS",                                      role: "Customer Success Manager — Hebrew speaking",                     jobLink: "https://www.linkedin.com/jobs/view/4399071217/" },
  { dateApplied: "2026-04-30", source: "לינקדין",       company: "CBRE",                                       role: "Operations Coordinator",                                         jobLink: "https://www.linkedin.com/jobs/view/4407181191/" },
  { dateApplied: "2026-04-30", source: "לינקדין",       company: "Candex",                                     role: "Customer Success Manager",                                       jobLink: "https://www.linkedin.com/jobs/view/4383308880" },
  { dateApplied: "2026-04-30", source: "לינקדין",       company: "Extreme",                                    role: "Organizational Excellence Project Manager",                      jobLink: "https://www.linkedin.com/jobs/view/4404034761" },
  { dateApplied: "2026-04-30", source: "לינקדין",       company: "אלביט",                                      role: "פלנר.ית תפ״י ופרויקטים",                                          jobLink: "https://www.linkedin.com/jobs/view/4399942796" },
  { dateApplied: "2026-04-30", source: "ALL JOBS",      company: "IBI",                                        role: "Customer Success",                                               jobLink: "https://www.alljobs.co.il/Search/UploadSingle.aspx?JobID=8631538" },
  { dateApplied: "2026-05-03", source: "לינקדין",       company: "Onboard",                                    role: "Sales Operations Manager (Remote)",                              jobLink: "https://www.linkedin.com/jobs/view/4409573542" },
  { dateApplied: "2026-05-03", source: "קורל",          company: "DigitalHunters",                             role: "מנהל/ת לקוחות לסוכנות שיווק לאפליקציות | מובייל | רמת החייל",   jobLink: "https://app.civi.co.il/promo/id=599256" },
];

export type { AppRow };
