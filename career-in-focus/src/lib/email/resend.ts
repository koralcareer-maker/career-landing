import { Resend } from "resend";

export const FROM = process.env.EMAIL_FROM ?? "קריירה בפוקוס <noreply@careerinfocus.co.il>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set — email sending is disabled");
  return new Resend(key);
}

// Safe email send — returns null instead of throwing when key is missing
async function safeSend(payload: Parameters<Resend["emails"]["send"]>[0]) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to", payload.to);
    return null;
  }
  return getResend().emails.send(payload);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#F5F1EB; font-family:'Arial',sans-serif; direction:rtl; }
    .wrap { max-width:560px; margin:32px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.08); }
    .header { background:#1C1C2E; padding:28px 32px; text-align:center; }
    .header img { height:48px; }
    .header h1 { color:#fff; margin:12px 0 0; font-size:18px; font-weight:800; }
    .body { padding:32px; color:#1C1C2E; }
    .body h2 { font-size:22px; font-weight:900; margin:0 0 8px; }
    .body p { font-size:15px; line-height:1.7; color:#444; margin:0 0 16px; }
    .btn { display:inline-block; background:#3ECFCF; color:#fff !important; font-weight:700; font-size:15px; padding:14px 28px; border-radius:14px; text-decoration:none; margin:8px 0 20px; }
    .card { background:#E8F9F9; border-radius:14px; padding:18px 20px; margin:16px 0; }
    .card h3 { margin:0 0 6px; font-size:15px; color:#1C1C2E; }
    .card p  { margin:0; font-size:13px; color:#555; }
    .footer { background:#F5F1EB; padding:20px 32px; text-align:center; color:#999; font-size:12px; }
    .footer a { color:#3ECFCF; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>קריירה בפוקוס</h1>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© 2026 קריירה בפוקוס · <a href="https://careerinfocus.co.il">careerinfocus.co.il</a></p>
      <p><a href="{{unsubscribe}}">הסרה מרשימת תפוצה</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Weekly coaching digest ───────────────────────────────────────────────────

export async function sendWeeklyDigest(opts: {
  to: string;
  name: string;
  analysis: string;
  actionItems: string[];
  appUrl: string;
}) {
  const items = opts.actionItems
    .map(a => `<div class="card"><p>✅ ${a}</p></div>`)
    .join("");

  const html = baseLayout(`
    <h2>שלום ${opts.name} 👋</h2>
    <p>הנה הניתוח השבועי שלי על מצב חיפוש העבודה שלך — ישירות מהמאמן האישי שלך:</p>
    <div class="card">
      <h3>📊 ניתוח המצב</h3>
      <p>${opts.analysis}</p>
    </div>
    <h3 style="margin:20px 0 8px;font-size:16px;">✅ המשימות שלך לשבוע הבא</h3>
    ${items}
    <a href="${opts.appUrl}/coaching" class="btn">פתחי את המאמן האישי שלי</a>
  `);

  return safeSend({
    from: FROM,
    to: opts.to,
    subject: `${opts.name}, הניתוח השבועי שלך מוכן 🎯`,
    html,
  });
}

// ─── Event reminder ───────────────────────────────────────────────────────────

export async function sendEventReminder(opts: {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  isOnline: boolean;
  location?: string;
  appUrl: string;
}) {
  const html = baseLayout(`
    <h2>תזכורת לאירוע מחר ⏰</h2>
    <p>שלום ${opts.name},</p>
    <p>רצינו להזכיר לך שמחר מתקיים:</p>
    <div class="card">
      <h3>${opts.eventTitle}</h3>
      <p>📅 ${opts.eventDate}</p>
      <p>${opts.isOnline ? "🎥 אונליין" : `📍 ${opts.location ?? ""}`}</p>
    </div>
    <a href="${opts.appUrl}/events" class="btn">לפרטי האירוע</a>
  `);

  return safeSend({
    from: FROM,
    to: opts.to,
    subject: `תזכורת: ${opts.eventTitle} — מחר!`,
    html,
  });
}

// ─── Network request notification to admin ────────────────────────────────────

export async function sendNetworkRequestToAdmin(opts: {
  userName: string;
  userEmail: string;
  targetRole: string;
  targetCompanies?: string;
  notes?: string;
  appUrl: string;
}) {
  const html = baseLayout(`
    <h2>בקשת רשת חדשה 🌐</h2>
    <p>חבר פרימיום הגיש בקשה להפעלת הקשרים שלך:</p>
    <div class="card">
      <h3>${opts.userName} (${opts.userEmail})</h3>
      <p>🎯 תפקיד מבוקש: ${opts.targetRole}</p>
      ${opts.targetCompanies ? `<p>🏢 חברות: ${opts.targetCompanies}</p>` : ""}
      ${opts.notes ? `<p>📝 הערות: ${opts.notes}</p>` : ""}
    </div>
    <a href="${opts.appUrl}/admin/network" class="btn">ניהול בקשות רשת</a>
  `);

  return safeSend({
    from: FROM,
    to: process.env.ADMIN_EMAIL ?? "koral@careerinfocus.co.il",
    subject: `בקשת רשת חדשה מ-${opts.userName}`,
    html,
  });
}

// ─── Premium Lead notification to admin ──────────────────────────────────────

export async function safeSendPremiumLeadNotification(opts: {
  fullName: string;
  email: string;
  phone: string;
  targetRole: string;
  description?: string;
  whyNow?: string;
  leadId: string;
  appUrl: string;
}) {
  const html = baseLayout(`
    <h2>ליד פרימיום חדש 👑</h2>
    <p>מועמד/ת חדש/ה הגיש/ה מועמדות למסלול "קורל תפעילי קשרים":</p>
    <div class="card">
      <h3>${opts.fullName}</h3>
      <p>📧 ${opts.email}</p>
      <p>📱 ${opts.phone}</p>
      <p>🎯 תפקיד יעד: ${opts.targetRole}</p>
      ${opts.description ? `<p>📝 מה מחפש/ת: ${opts.description}</p>` : ""}
      ${opts.whyNow ? `<p>⏰ למה עכשיו: ${opts.whyNow}</p>` : ""}
    </div>
    <a href="${opts.appUrl}/admin/premium-leads" class="btn">צפייה בכל הלידים</a>
  `);

  return safeSend({
    from: FROM,
    to: process.env.ADMIN_EMAIL ?? "koral@careerinfocus.co.il",
    subject: `ליד פרימיום חדש: ${opts.fullName} — ${opts.targetRole}`,
    html,
  });
}

// ─── Job match alert ──────────────────────────────────────────────────────────

export interface JobMatchAlertItem {
  title: string;
  company: string;
  location?: string | null;
  score: number;       // 0-100
  reasons: string[];   // up to 3 short Hebrew strings
  url: string;         // canonical app URL — /jobs/{id}
}

export async function sendJobMatchAlert(opts: {
  to: string;
  name: string;
  jobs: JobMatchAlertItem[];
  appUrl: string;
}) {
  if (opts.jobs.length === 0) return null;

  const cards = opts.jobs.map((j) => {
    const reasons = j.reasons.length
      ? `<p style="margin:8px 0 0;font-size:13px;color:#3ECFCF;">${j.reasons.map(r => `✓ ${r}`).join(" · ")}</p>`
      : "";
    return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <h3 style="flex:1;">${j.title}</h3>
        <span style="background:#3ECFCF;color:#fff;font-weight:800;font-size:13px;padding:4px 10px;border-radius:999px;white-space:nowrap;">${j.score}%</span>
      </div>
      <p style="margin:4px 0 0;font-size:13px;color:#1C1C2E;font-weight:600;">${j.company}${j.location ? ` · ${j.location}` : ""}</p>
      ${reasons}
      <a href="${j.url}" style="display:inline-block;margin-top:10px;color:#1C1C2E;font-weight:700;font-size:13px;text-decoration:underline;">למשרה המלאה ←</a>
    </div>`;
  }).join("");

  const headline = opts.jobs.length === 1
    ? "משרה חדשה שמתאימה לפרופיל שלך 🎯"
    : `${opts.jobs.length} משרות חדשות שמתאימות לפרופיל שלך 🎯`;

  const html = baseLayout(`
    <h2>${headline}</h2>
    <p>שלום ${opts.name}, סרקתי הבוקר את המשרות החדשות שעלו ומצאתי התאמות עם 60%+ לפרופיל שלך:</p>
    ${cards}
    <a href="${opts.appUrl}/jobs" class="btn">לכל המשרות במערכת</a>
    <p style="font-size:12px;color:#999;margin-top:16px;">לא רוצה לקבל את ההתראות האלו? אפשר לכבות מ<a href="${opts.appUrl}/profile" style="color:#3ECFCF;">הפרופיל שלך</a>.</p>
  `);

  return safeSend({
    from: FROM,
    to: opts.to,
    subject: opts.jobs.length === 1
      ? `משרה חדשה ${opts.jobs[0].score}% התאמה: ${opts.jobs[0].title}`
      : `${opts.jobs.length} משרות חדשות במערכת — התאמה לפרופיל שלך`,
    html,
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  appUrl: string;
}) {
  const html = baseLayout(`
    <h2>ברוכה הבאה לקהילה! 🎉</h2>
    <p>שלום ${opts.name},</p>
    <p>שמחה שהצטרפת לקריירה בפוקוס — הקהילה שתעזור לך למצוא את התפקיד הבא שלך חכם ומהיר יותר.</p>
    <div class="card">
      <h3>🚀 שלבים ראשונים</h3>
      <p>1. מלאי את הפרופיל שלך</p>
      <p>2. בני את דרכון הקריירה עם AI</p>
      <p>3. בדקי את המשרות המתאימות לך</p>
    </div>
    <a href="${opts.appUrl}/dashboard" class="btn">כניסה למערכת</a>
    <p style="font-size:13px;color:#999;">אני כאן לכל שאלה — קורל שלו</p>
  `);

  return safeSend({
    from: FROM,
    to: opts.to,
    subject: `ברוכה הבאה לקריירה בפוקוס, ${opts.name}! 🎯`,
    html,
  });
}
