import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql as PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/qwrlslw/Documents/Claude/קוד/career-in-focus/.env" });

// PrismaLibSQL (PrismaLibSqlAdapterFactory) accepts a config object {url} directly
const DB_URL = process.env.DATABASE_URL ?? "file:/Users/qwrlslw/Documents/Claude/קוד/career-in-focus/dev.db";
const adapter = new PrismaLibSQL({ url: DB_URL });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding Career In Focus database...");

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("Admin@123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@career-in-focus.co.il" },
    update: {},
    create: {
      name: "מנהל ראשי",
      email: "admin@career-in-focus.co.il",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      accessStatus: "ACTIVE",
      membershipType: "VIP",
      paymentProvider: "MANUAL",
      paidAt: new Date(),
    },
  });

  // ── Demo member ────────────────────────────────────────────────────────
  const memberHash = await bcrypt.hash("Demo@123!", 12);
  const member = await prisma.user.upsert({
    where: { email: "demo@career-in-focus.co.il" },
    update: {},
    create: {
      name: "ליאור כהן",
      email: "demo@career-in-focus.co.il",
      passwordHash: memberHash,
      role: "MEMBER",
      accessStatus: "ACTIVE",
      membershipType: "MEMBER",
      paymentProvider: "CARDCOM",
      paidAt: new Date(),
    },
  });

  // ── Demo profile ──────────────────────────────────────────────────────
  await prisma.profile.upsert({
    where: { userId: member.id },
    update: {},
    create: {
      userId: member.id,
      fullName: "ליאור כהן",
      phone: "052-3456789",
      currentRole: "מפתח Full Stack",
      targetRole: "Product Manager",
      yearsExperience: 5,
      desiredField: "הייטק, פינטק",
      careerTransitionGoal: "מעבר מפיתוח לניהול מוצר תוך שנה",
      mainChallenge: "חוסר ניסיון רשמי בניהול מוצר — רוב הניסיון שלי טכני",
      strengths: JSON.stringify(["הבנה טכנית מעמיקה", "חשיבה מוצרית", "עבודת צוות", "פתרון בעיות"]),
      missingSkills: JSON.stringify(["PRD כתיבה", "מחקר משתמשים", "OKR ניהול", "A/B testing"]),
      preferredSalaryMin: 20000,
      preferredSalaryMax: 30000,
      preferredCompanyType: "startup",
      linkedinUrl: "https://linkedin.com/in/lior-cohen-demo",
      questionnaireCompleted: true,
      q_workStyle: "autonomous",
      q_teamOrSolo: "mixed",
      q_motivators: "יצירת מוצרים שמשפיעים על חיי אנשים. אני מונע מ-impact ומפתרון בעיות אמיתיות.",
      q_biggestFear: "לא להיות רלוונטי בשוק שמשתנה מהר",
      q_shortTermGoal: "לקבל תפקיד Product Manager בסטארטאפ גדל תוך 6 חודשים",
      q_longTermGoal: "להיות VP Product בחברה מוצלחת תוך 5 שנים",
      q_networkingLevel: "medium",
      q_remotePreference: "hybrid",
      q_valuesAtWork: JSON.stringify(["אתגר", "השפעה", "למידה", "גמישות"]),
      q_industryInterests: JSON.stringify(["הייטק", "פינטק", "בריאות דיגיטלית"]),
    },
  });

  // ── Career Passport ─────────────────────────────────────────────────────
  await prisma.careerPassport.upsert({
    where: { userId: member.id },
    update: {},
    create: {
      userId: member.id,
      jobMatchScore: 78,
      strengths: JSON.stringify(["הבנה טכנית מעמיקה — יתרון משמעותי בתפקיד PM", "חשיבה סיסטמית ופתרון בעיות", "ניסיון עם Agile וצוותי פיתוח", "יכולת לתרגם דרישות עסקיות לפתרונות טכניים"]),
      skillGaps: JSON.stringify(["ניסיון בניהול stakeholders בכירים", "כתיבת PRD מלא ומפורט", "מחקר משתמשים (User Research)", "ניהול מפת דרכים (Roadmap)"]),
      recommendations: JSON.stringify(["השלם קורס Product Management מוכר (Product School / Reforge)", "בנה 2-3 case studies של מוצרים דמה בתיק העבודות", "הצע לנהל feature אחד בחברה הנוכחית כדי לבנות ניסיון", "השתתף בכנסי PM (Product Management) בישראל"]),
      likelyFitRoles: JSON.stringify(["Associate Product Manager", "Technical Product Manager", "Product Manager (B2B SaaS)", "Product Owner"]),
      recommendedIndustries: JSON.stringify(["SaaS B2B", "פינטק", "DevTools", "חברות הייטק עם מוצר טכני"]),
      nextBestActions: JSON.stringify(["עדכן LinkedIn עם כותרת 'Product Manager | Technical Background'", "שלח 10 בקשות לתפקידי APM/PM השבוע", "צור קשר עם 3 PM-ים ב-LinkedIn לשיחת ייעוץ", "השלם את שאלון הדרכון לניתוח מלא"]),
      summary: "ליאור, יש לך בסיס טכני מצוין שהוא יתרון אדיר בתפקיד PM. המעבר ריאלי ומהיר יחסית אם תתמקד בבניית ניסיון מוצרי מוכח.",
    },
  });

  // ── Job Applications ────────────────────────────────────────────────────
  const jobApps = [
    { company: "WalkMe", role: "Technical Product Manager", status: "FIRST_INTERVIEW" as const, dateApplied: "2026-03-15", source: "LinkedIn", responseReceived: true, interviewStage: "ראיון ראשון עם HR" },
    { company: "monday.com", role: "Associate PM", status: "APPLIED" as const, dateApplied: "2026-03-20", source: "אתר החברה", responseReceived: false },
    { company: "Fiverr", role: "Product Manager", status: "FOLLOWUP_SENT" as const, dateApplied: "2026-03-18", source: "LinkedIn", responseReceived: false },
    { company: "Wix", role: "Product Manager B2B", status: "REJECTED" as const, dateApplied: "2026-03-10", source: "רפרל", responseReceived: true },
    { company: "eToro", role: "Product Owner", status: "INTERVIEW_SCHEDULED" as const, dateApplied: "2026-03-22", source: "LinkedIn", responseReceived: true, interviewStage: "ראיון שני עם מנהל" },
  ];

  for (const app of jobApps) {
    await prisma.jobApplication.create({
      data: {
        userId: member.id,
        company: app.company,
        role: app.role,
        status: app.status,
        dateApplied: new Date(app.dateApplied),
        source: app.source,
        responseReceived: app.responseReceived ?? false,
        interviewStage: app.interviewStage,
        nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ── Hot Jobs ─────────────────────────────────────────────────────────────
  const jobs = [
    { title: "Product Manager — Fintech", company: "Payoneer", location: "תל אביב / היברידי", field: "פינטק", experienceLevel: "mid", summary: "מחפשים PM לצוות ה-Payments. ניסיון ב-B2B SaaS דרוש. שכר מצוין.", source: "Payoneer Careers", externalUrl: "https://payoneer.com/careers", isHot: true },
    { title: "Associate Product Manager", company: "monday.com", location: "תל אביב", field: "SaaS", experienceLevel: "junior", summary: "APM Program — תוכנית מעולה לכניסה לעולם ה-PM. 18 חודשים.", source: "monday Careers", externalUrl: "https://monday.com/careers", isHot: true },
    { title: "Technical Product Manager", company: "Wix", location: "תל אביב / ריחוק חלקי", field: "SaaS", experienceLevel: "mid", summary: "PM טכני לצוות Platform. רקע טכני — יתרון גדול.", source: "Wix Careers", externalUrl: "https://wix.com/careers", isHot: true },
    { title: "Product Owner — B2C", company: "Fiverr", location: "תל אביב", field: "Marketplace", experienceLevel: "mid", summary: "PO לצוות ה-Buyer Experience. ניסיון בניהול Agile.", source: "Fiverr Careers", externalUrl: "https://fiverr.com/careers", isHot: false },
    { title: "Product Manager — Data", company: "ironSource", location: "תל אביב", field: "AdTech", experienceLevel: "senior", summary: "PM לצוות ה-Data Products. ניסיון ב-analytics.", source: "ironSource Careers", externalUrl: "https://unity.com/careers", isHot: false },
    { title: "Product Manager — SaaS", company: "HiBob", location: "תל אביב / גלובלי", field: "HR Tech", experienceLevel: "mid", summary: "PM לפיצ'רים חדשים במערכת ה-HR. סביבה בינלאומית.", source: "LinkedIn", externalUrl: "https://linkedin.com/company/hibob", isHot: true },
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: { ...job, isPublished: true, createdById: admin.id } });
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  const courses = [
    { title: "כיצד לעבור לניהול מוצר", category: "מעבר קריירה", formatType: "וידאו + PDF", accessType: "INCLUDED" as const, description: "קורס מקיף לכניסה לעולם ה-Product Management — מה לומדים, כיצד מתמודדים עם ראיונות ומה מצפה לך.", ctaText: "התחל קורס", ctaUrl: "https://example.com" },
    { title: "לכתוב קורות חיים שעוברים ATS", category: "קורות חיים", formatType: "וידאו + תבנית", accessType: "INCLUDED" as const, description: "כיצד לכתוב קורות חיים שמעבירים את מסנן ה-ATS ומגיעים אל שולחן המגייס. כולל תבנית ל-Word.", ctaText: "צפה עכשיו", ctaUrl: "https://example.com" },
    { title: "ראיון עבודה — 30 שאלות ותשובות", category: "ראיונות", formatType: "וידאו + PDF", accessType: "INCLUDED" as const, description: "הכנה מלאה לראיון — 30 שאלות נפוצות עם תשובות לדוגמה, שיטת STAR, ועצות לשיפור ביצועים.", ctaText: "הכנה לראיון", ctaUrl: "https://example.com" },
    { title: "LinkedIn — אופטימיזציה מלאה", category: "LinkedIn", formatType: "וידאו + checklist", accessType: "INCLUDED" as const, description: "מדריך שלב אחר שלב לבניית פרופיל LinkedIn שמושך מגייסים. כולל 50 מילות מפתח רלוונטיות.", ctaText: "שפר LinkedIn", ctaUrl: "https://example.com" },
    { title: "Product Management Fundamentals", category: "ניהול מוצר", formatType: "קורס חיצוני", accessType: "DISCOUNTED" as const, description: "קורס Product School המוכר — 8 שבועות אונליין. חברי קהילה מקבלים 20% הנחה.", ctaText: "לקורס בהנחה", ctaUrl: "https://productschool.com" },
  ];

  for (const c of courses) {
    await prisma.course.create({ data: { ...c, isPublished: true, createdById: admin.id } });
  }

  // ── Tools ────────────────────────────────────────────────────────────────
  const tools = [
    { title: "ChatGPT לכתיבת קורות חיים", category: "כלי AI", type: "AI_TOOL" as const, description: "השתמש ב-ChatGPT כדי לכתוב ולשפר קורות חיים, מכתב מקדים ופרופיל LinkedIn.", externalUrl: "https://chat.openai.com", adminTip: "השתמש בפרומפט: 'כתוב עבורי קורות חיים בעברית לתפקיד [X] על בסיס הניסיון הזה: [פרטים]'" },
    { title: "Canva — תבניות קורות חיים", category: "תבניות", type: "CV_TEMPLATE" as const, description: "מאות תבניות קורות חיים מעוצבות שניתן לערוך ולהוריד.", externalUrl: "https://canva.com/resumes/templates", adminTip: "בחר תבנית עם עיצוב נקי ולא צבעוני מדי — ATS לא אוהב עיצובים מורכבים" },
    { title: "LinkedIn Job Search", category: "חיפוש עבודה", type: "JOB_SOURCE" as const, description: "מנוע החיפוש הגדול ביותר למשרות בישראל ובעולם. הגדר Job Alerts.", externalUrl: "https://linkedin.com/jobs", adminTip: "הגדר Easy Apply Alert לתפקיד היעד שלך — תקבל התראה ביום שמשרה עולה" },
    { title: "Indeed ישראל", category: "חיפוש עבודה", type: "JOB_SOURCE" as const, description: "אחד הבורסות הגדולות למשרות בישראל.", externalUrl: "https://il.indeed.com", adminTip: "Indeed מציג גם משרות ישנות — תמיד בדוק תאריך פרסום" },
    { title: "גוגל קריירה — Google Sheets לפולואפ", category: "תבניות", type: "TEMPLATE" as const, description: "תבנית Google Sheets מוכנה למעקב אחרי בקשות עבודה ופולואפ.", externalUrl: "https://docs.google.com/spreadsheets", adminTip: "עדכן את הגיליון לפחות פעמיים בשבוע — הרגל קריטי לחיפוש עבודה מוצלח" },
    { title: "JobMaster — ישראל", category: "חיפוש עבודה", type: "JOB_SOURCE" as const, description: "מנוע חיפוש משרות ישראלי עם אינדקס גדול.", externalUrl: "https://jobmaster.co.il", adminTip: "" },
    { title: "Huntr — מנהל מעקב בקשות", category: "כלי AI", type: "AI_TOOL" as const, description: "כלי מעקב בקשות עבודה חזותי עם Kanban board ותזכורות.", externalUrl: "https://huntr.co", adminTip: "Huntr מסנכרן עם LinkedIn — כשאתה שומר משרה היא נכנסת אוטומטית" },
    { title: "שאלון הכנה לראיון — קריירה בפוקוס", category: "הכנה לראיון", type: "QUESTIONNAIRE" as const, description: "שאלון מקיף שיעזור לך להתכונן לכל שאלה בראיון. 30 שאלות עם הנחיות.", adminTip: "מלא את השאלון יום לפני הראיון — זה יעשה הבדל עצום" },
  ];

  for (const t of tools) {
    await prisma.tool.create({ data: { ...t, isPublished: true, createdById: admin.id } });
  }

  // ── Events ────────────────────────────────────────────────────────────────
  const now = new Date();
  const events = [
    { title: "וובינר: כיצד לעבור לניהול מוצר ב-2026", type: "WEBINAR" as const, startAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), description: "שיחה עם PM ותיק על המעבר לניהול מוצר. שאלות ותשובות חיות. מיועד למפתחים, מעצבים ואנשי תפקידים טכניים.", isOnline: true, meetingUrl: "https://zoom.us/j/demo", registerUrl: "https://forms.gle/demo" },
    { title: "סדנה: כתיבת קורות חיים שמכניסים לראיונות", type: "WORKSHOP" as const, startAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), description: "סדנה מעשית — נכתוב ביחד קורות חיים, נשדרג LinkedIn ונתרגל פנייה ראשונה.", isOnline: true, meetingUrl: "https://zoom.us/j/demo2" },
    { title: "מגייסת אורחת — Wix", type: "GUEST_RECRUITER" as const, startAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), description: "שרי לוי, מגייסת ב-Wix, תדבר על מה היא מחפשת במועמדים לתפקידי PM. שאלות ישירות — מוזמנים!", isOnline: true, registerUrl: "https://forms.gle/demo3" },
    { title: "מקלחת משרות — אפריל 2026", type: "JOB_DROP" as const, startAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), description: "שיתוף של 50+ משרות חמות שנאספו השבוע — כולל קישורים, שמות מגייסים ועצות התאמה.", isOnline: true },
    { title: "מפגש נטוורקינג — תל אביב", type: "NETWORKING" as const, startAt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), description: "מפגש בלתי רשמי לחברי הקהילה בתל אביב. שתו קפה, החליפו רזומות, בנו קשרים.", isOnline: false, location: "קפה לנדוור, RotschildBLVD, תל אביב" },
  ];

  for (const e of events) {
    await prisma.event.create({ data: { ...e, isPublished: true, createdById: admin.id } });
  }

  // ── Updates ───────────────────────────────────────────────────────────────
  const updates = [
    { title: "שוק הייטק — אפריל 2026: אתחול גיוס", category: "market", content: "לאחר האטה בגיוס בתחילת 2026, אנחנו רואים התאוששות בגיוסים. חברות כמו monday, Wix, Fiverr וחברות פינטק מגייסות בצורה אקטיבית. כדאי לנצל את המומנטום ולשלוח בקשות עכשיו.", isPinned: true },
    { title: "🚀 השקנו את תכונת דרכון הקריירה AI!", category: "launch", content: "אנחנו שמחים להכריז על השקת הדרכון הקריירה המונע ב-AI! מלאו את הפרופיל והשאלון ותקבלו ניתוח מעמיק של חוזקות, פערים ותפקידים מומלצים — ממוקד אישית עליכם.", isPinned: false },
    { title: "חוקי המשחק בראיון עבודה — 5 דברים שמגייסים לא יגידו לך", category: "general", content: "ריכזנו עבורכם 5 דברים שרוב המגייסים לא אומרים בפה מלא, אבל קריטיים לדעת: (1) ה-Vibe Check חשוב לפחות כמו הכישורים (2) מחקר על החברה לפני — חובה, לא אופציה (3) שאלות בסוף הראיון = עניין אמיתי (4) Follow-up email תוך 24 שעות (5) 'לא מתאים' לא אומר 'לא טוב' — זה אומר 'לא עכשיו, לא כאן'.", isPinned: false },
    { title: "📅 אירועי מאי 2026 — לוח אירועים מלא", category: "event", content: "פרסמנו את לוח האירועים למאי: 3 וובינרים, 2 סדנאות, מגייסת אורחת מ-Wix ומקלחת משרות מיוחדת. הירשמו מוקדם — המקומות מוגבלים!", isPinned: false },
  ];

  for (const u of updates) {
    await prisma.update.create({ data: { ...u, isPublished: true, createdById: admin.id } });
  }

  // ── Community Posts ───────────────────────────────────────────────────────
  const posts = [
    { category: "WIN" as const, content: "🎉 קיבלתי הצעה! אחרי 4 חודשים של חיפוש, קיבלתי הצעה לתפקיד Product Manager ב-monday.com! השאלון והדרכון עזרו לי להבין מה מחפשים. תודה לכולם על התמיכה בקהילה!" },
    { category: "TIP" as const, content: "💡 טיפ שעזר לי: בכל ראיון, עשיתי מחקר על 3 competitor עיקריים של החברה ואיך המוצר שלהם שונה. זה הוציא אותי מהמגרש ב-100%. ממליץ לכולם!" },
    { category: "QUESTION" as const, content: "שאלה לקהילה — מישהו עבר ממפתח ל-PM? כמה זמן לקח? מה הכי עזר? אני בתהליך מעבר ומרגיש שחברות מחפשות PM עם ניסיון ב-PM... catch 22..." },
    { category: "TIP" as const, content: "📝 הדבר הכי שיפר לי את שיעור התשובות: עדכנתי את ה-LinkedIn Headline מ-'Software Developer' ל-'Product Manager | Technical Background | 5y'. פתאום פי 3 פניות ממגייסים." },
    { category: "WIN" as const, content: "השלמתי את הדרכון AI שלי וקיבלתי ניתוח מעולה. הדגיש לי שאני צריך לחזק את ה-data side שלי — שמחתי לשמוע כי זה גם מה שהרגשתי. הולך לעשות SQL קורס השבוע." },
  ];

  for (const p of posts) {
    await prisma.post.create({ data: { ...p, authorId: member.id } });
  }

  // ── Featured Candidate ────────────────────────────────────────────────────
  await prisma.featuredCandidate.create({
    data: {
      name: "מיכל אברהם",
      targetRole: "UX Designer",
      summary: "מעצבת UI/UX עם 4 שנות ניסיון במוצרי B2C. מומחית ב-Figma, Design Systems ומחקר משתמשים. עברה מפסיכולוגיה לעיצוב ומביאה פרספקטיבה אנושית ייחודית.",
      strengths: JSON.stringify(["Figma מתקדם", "מחקר משתמשים", "Design Systems", "UX Writing"]),
      lookingFor: "תפקיד UX Designer בחברת SaaS B2B. פתוחה לעמדות hybrid או remote. מעדיפה חברות עם culture של growth.",
      linkedinUrl: "https://linkedin.com/in/michal-demo",
      isActive: true,
      weekOf: new Date(),
      createdById: admin.id,
    },
  });

  // ── Notifications for demo member ────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: member.id, type: "general", title: "ברוך הבא לקהילה!", message: "אנחנו שמחים שהצטרפת. מלא את הפרופיל שלך כדי לקבל ניתוח אישי.", link: "/profile", isRead: false },
      { userId: member.id, type: "event", title: "וובינר קרוב: מעבר לניהול מוצר", message: "נרשמת לוובינר. הוא מתחיל בעוד 3 ימים.", link: "/events", isRead: false },
      { userId: member.id, type: "job_match", title: "משרה חדשה מתאימה לך", message: "monday.com — Associate PM — התאמה 82%", link: "/jobs", isRead: true },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin:  admin@career-in-focus.co.il  /  Admin@123!");
  console.log("   Member: demo@career-in-focus.co.il   /  Demo@123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
