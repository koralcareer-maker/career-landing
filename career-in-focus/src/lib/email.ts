/**
 * Email sending utilities — powered by Resend
 */

// app.careerinfocus.co.il is now live (DNS pointed at Vercel + the domain
// re-attached to the career-landing project), so all login/welcome links
// in emails go to the branded URL. Falls back to the env var if anyone
// changes it, then to the Vercel preview URL as last resort.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://app.careerinfocus.co.il";
const FROM    = process.env.EMAIL_FROM ?? "קורל מקריירה בפוקוס <noreply@careerinfocus.co.il>";

// ─── Resend helper ────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email to", to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────
// Sent automatically after a successful purchase (and when admin creates a
// user manually). Goal: a warm personal welcome from Coral that makes the new
// member feel they joined something real, with a single clear next step.

// Plan label is gender-aware: "חבר/ה" vs "חברה" matters when the recipient
// is a man, otherwise the bracket text reads as if the system thinks he's
// a woman.
const PLAN_LABELS: Record<string, { f: string; m: string }> = {
  MEMBER:  { f: "חברה",                            m: "חבר"                            },
  VIP:     { f: "VIP",                             m: "VIP"                            },
  PREMIUM: { f: "פרמיום • קורל מפעילה קשרים",       m: "פרמיום • קורל מפעילה קשרים"      },
  NONE:    { f: "חברה",                            m: "חבר"                            },
};

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/BbBAf0p0R01GrNgf5GQjMg";

export type Gender = "f" | "m";

export async function sendWelcomeEmail({
  name,
  email,
  membershipType = "MEMBER",
  password,
  gender = "f",
}: {
  name: string;
  email: string;
  membershipType?: string;
  password?: string;   // only when admin creates user manually
  gender?: Gender;     // defaults to feminine — the brand audience is women
}) {
  // _f / _m chooses the right gendered phrase. Feminine remains the default
  // tone of the email (warmer, matches Coral's existing brand voice); when
  // the recipient is a man we swap individual phrases so the message reads
  // naturally to him without us having to maintain two whole templates.
  const T = (f: string, m: string) => (gender === "m" ? m : f);

  const planLabel = (PLAN_LABELS[membershipType] ?? PLAN_LABELS.NONE)[gender];
  const firstName = name?.split(" ")[0] ?? T("חברה", "חבר");

  // Login section is only shown when an admin created the account with a
  // temp password. Self-service signups already know their password.
  const loginSection = password
    ? `
      <div style="background:linear-gradient(135deg,#E8F9F9 0%,#F5F1EB 100%);border:1px solid #3ECFCF55;border-radius:16px;padding:18px 22px;margin:24px 0;">
        <p style="margin:0 0 10px;font-weight:800;color:#1C1C2E;font-size:14px;">פרטי הכניסה שלך:</p>
        <p style="margin:5px 0;color:#1C1C2E;font-size:14px;">📧 <strong>אימייל:</strong> <span style="font-family:monospace;">${email}</span></p>
        <p style="margin:5px 0;color:#1C1C2E;font-size:14px;">🔑 <strong>סיסמה זמנית:</strong> <code style="background:#fff;padding:3px 9px;border-radius:6px;font-size:13px;">${password}</code></p>
        <p style="margin:12px 0 0;font-size:12px;color:#888;">אחרי הכניסה הראשונה — מומלץ לשנות את הסיסמה דרך הפרופיל בסרגל העליון</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${T("ברוכה הבאה לקריירה בפוקוס", "ברוך הבא לקריירה בפוקוס")}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Rubik','Arial',sans-serif;direction:rtl;color:#1C1C2E;">

  <!-- Preheader (preview text in inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;">
    התקבלת. עכשיו ${T("בואי", "בוא")} נתחיל יחד את הצעד הראשון של הקריירה הבאה שלך.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">

          <!-- ─── Hero header ─── -->
          <tr>
            <td style="position:relative;background:linear-gradient(135deg,#1C1C2E 0%,#23233D 50%,#1C1C2E 100%);padding:40px 40px 32px;">
              <!-- Brand -->
              <div style="display:inline-block;background:rgba(62,207,207,0.15);border:1px solid rgba(62,207,207,0.4);border-radius:999px;padding:5px 12px;margin-bottom:18px;">
                <span style="color:#3ECFCF;font-weight:800;font-size:11px;letter-spacing:0.5px;">✨ ${planLabel.toUpperCase()}</span>
              </div>
              <h1 style="color:#fff;margin:0 0 12px;font-size:30px;font-weight:900;line-height:1.15;letter-spacing:-0.5px;">
                ${firstName},<br/>
                <span style="background:linear-gradient(90deg,#3ECFCF 0%,#7FE7E7 100%);-webkit-background-clip:text;background-clip:text;color:transparent;">${T("ברוכה הבאה הביתה", "ברוך הבא הביתה")} ✨</span>
              </h1>
              <p style="color:rgba(255,255,255,0.75);margin:0;font-size:15px;line-height:1.6;max-width:440px;">
                התקבלת לקהילת קריירה בפוקוס. אני קורל, וזאת ההתחלה של משהו טוב.
              </p>
            </td>
          </tr>

          <!-- ─── Personal note ─── -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <p style="font-size:15px;color:#1C1C2E;line-height:1.75;margin:0 0 16px;">
                לפני ${T("שתמשיכי", "שתמשיך")} הלאה — אני רוצה להגיד לך משהו אישי.
              </p>
              <p style="font-size:15px;color:#1C1C2E;line-height:1.75;margin:0 0 16px;">
                המקום הזה נבנה מהמקום שאני הייתי רוצה לקבל בעצמי כשהתחלתי את הדרך — ${T("קהילה אמיתית של נשים שמבינות את התסכול", "קהילה אמיתית שמבינה את התסכול")}, כלים מעשיים שחוסכים שעות, וליווי שמרגיש כמו חברה ולא כמו מערכת.
              </p>
              <p style="font-size:15px;color:#1C1C2E;line-height:1.75;margin:0 0 4px;">
                <strong>זה לא עוד אתר משרות. זה הצוות שלך לקריירה הבאה.</strong>
              </p>
            </td>
          </tr>

          ${loginSection ? `<tr><td style="padding:0 40px;">${loginSection}</td></tr>` : ""}

          <!-- ─── ONE big primary CTA ─── -->
          <tr>
            <td style="padding:24px 40px 8px;text-align:center;">
              <a href="${APP_URL}/dashboard?tour=1" style="display:inline-block;background:linear-gradient(135deg,#3ECFCF 0%,#2BAAAA 100%);color:#fff;font-weight:900;font-size:16px;padding:16px 44px;border-radius:14px;text-decoration:none;box-shadow:0 6px 20px rgba(62,207,207,0.35);">
                ${T("בואי", "בוא")} נתחיל את הסיור ←
              </a>
              <p style="font-size:12px;color:#888;margin:14px 0 0;">
                60 שניות, אני אעבור איתך על כל מה שחשוב
              </p>
            </td>
          </tr>

          <!-- ─── First step — single, clear ─── -->
          <tr>
            <td style="padding:32px 40px 16px;">
              <div style="background:linear-gradient(135deg,#FFF8F1 0%,#FFE4D6 100%);border:1px solid #FFB08840;border-radius:18px;padding:22px 24px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:#C2410C;letter-spacing:0.5px;text-transform:uppercase;">🎯 הצעד הראשון</p>
                <p style="margin:0 0 10px;font-size:18px;font-weight:900;color:#1C1C2E;">${T("מלאי", "מלא")} את דרכון הקריירה</p>
                <p style="margin:0 0 14px;font-size:14px;color:#444;line-height:1.6;">
                  זה לוקח 5 דקות וזה הבסיס לכל מה שיקרה אצלך כאן. בלי דרכון — ה-AI לא ידע איזה משרות להציע, אילו קורסים מתאימים לך, ואיך להתאים לך את החוויה. <strong>זה אחד הצעדים הכי משפיעים ${T("שתעשי", "שתעשה")} במערכת.</strong>
                </p>
                <a href="${APP_URL}/profile" style="display:inline-block;background:#1C1C2E;color:#fff;font-weight:800;font-size:14px;padding:11px 22px;border-radius:10px;text-decoration:none;">
                  למילוי הדרכון ←
                </a>
              </div>
            </td>
          </tr>

          <!-- ─── 3 quick wins after step 1 ─── -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <p style="margin:0 0 16px;font-size:13px;font-weight:800;color:#1C1C2E;letter-spacing:0.3px;">⚡ ואחרי זה</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${[
                  { emoji: "🤖", title: "מאמן AI אישי", desc: "תשובות לכל שאלה — מהכנה לראיון ועד התלבטות אם להגיש", link: "/coaching" },
                  { emoji: "💼", title: "משרות שנבחרו לך", desc: "התאמות אמיתיות לפי הפרופיל שלך, לא רק ׳כל המשרות׳", link: "/jobs" },
                  { emoji: "🛠️", title: "כלי AI ייחודיים", desc: "מחולל תמונת לינקדאין, נטוורקינג, קבוצות וואטסאפ סודיות", link: "/tools" },
                ].map((x) => `
                <tr>
                  <td style="padding:8px 0;">
                    <a href="${APP_URL}${x.link}" style="display:block;text-decoration:none;background:#FAFAFA;border:1px solid #EFEFEF;border-radius:14px;padding:14px 18px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" valign="top" style="font-size:22px;line-height:1;padding-top:2px;">${x.emoji}</td>
                          <td>
                            <div style="font-weight:800;color:#1C1C2E;font-size:14px;line-height:1.4;">${x.title}</div>
                            <div style="color:#666;font-size:13px;margin-top:2px;line-height:1.5;">${x.desc}</div>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>

          <!-- ─── Community CTA — WhatsApp ─── -->
          <tr>
            <td style="padding:24px 40px 8px;">
              <div style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);border-radius:18px;padding:22px 24px;text-align:center;">
                <p style="margin:0 0 6px;font-size:18px;font-weight:900;color:#fff;">לא לבד 💛</p>
                <p style="margin:0 0 14px;font-size:13px;color:rgba(255,255,255,0.92);line-height:1.6;">
                  ${T("הצטרפי", "הצטרף")} לקבוצת הוואטסאפ שלנו — שם אני משתפת טיפים שבועיים, מגייסים שמחפשים, ומשרות שעוד לא פורסמו.
                </p>
                <a href="${WHATSAPP_GROUP_URL}" style="display:inline-block;background:#fff;color:#128C7E;font-weight:900;font-size:14px;padding:11px 26px;border-radius:10px;text-decoration:none;">
                  ${T("הצטרפי", "הצטרף")} לקבוצה ←
                </a>
              </div>
            </td>
          </tr>

          <!-- ─── Personal sign-off ─── -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0;font-size:14px;color:#1C1C2E;line-height:1.7;">
                אם משהו לא ברור או לא עובד — אני זמינה. ${T("תשלחי", "תשלח")} לי הודעה ב<a href="${WHATSAPP_GROUP_URL}" style="color:#2BAAAA;font-weight:800;text-decoration:none;">וואטסאפ</a> או <a href="https://www.instagram.com/koral_shalev/" style="color:#2BAAAA;font-weight:800;text-decoration:none;">באינסטגרם</a>, אני בן אדם ולא בוט. 💌
              </p>
              <p style="margin:18px 0 0;font-size:14px;color:#1C1C2E;">
                ${T("שתצליחי", "שתצליח")},<br/>
                <strong style="font-size:16px;">קורל</strong><br/>
                <span style="color:#888;font-size:12px;">מייסדת קריירה בפוקוס</span>
              </p>
            </td>
          </tr>

          <!-- ─── Footer ─── -->
          <tr>
            <td style="background:#F5F1EB;padding:18px 40px;border-top:1px solid #EDE9E2;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="right" style="font-size:11px;color:#888;line-height:1.6;">
                    © 2026 קריירה בפוקוס · <a href="${APP_URL}" style="color:#888;text-decoration:none;">careerinfocus.co.il</a><br/>
                    <a href="${APP_URL}/privacy" style="color:#888;text-decoration:none;">פרטיות</a> · <a href="${APP_URL}/terms" style="color:#888;text-decoration:none;">תנאי שימוש</a>
                  </td>
                  <td align="left" style="font-size:11px;">
                    <a href="https://www.instagram.com/koral_shalev/" style="color:#888;text-decoration:none;margin-left:8px;">Instagram</a>
                    <a href="https://www.tiktok.com/@koralshalev" style="color:#888;text-decoration:none;margin-left:8px;">TikTok</a>
                    <a href="https://www.linkedin.com/in/koral-shalev-29430816a/" style="color:#888;text-decoration:none;">LinkedIn</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail({
    to: email,
    subject: `${firstName}, ${T("ברוכה הבאה הביתה", "ברוך הבא הביתה")} ✨ הצעד הראשון מחכה לך`,
    html,
  });
}

// ─── VIP CV Writing Confirmation (customer) ───────────────────────────────────
// Sent immediately after a user submits a "קורל תכין לי קוח" request.
// Sets expectations clearly: process, timeline, what happens next.

export async function sendCvWritingRequestEmail({
  name, email, gender = "f",
}: { name: string; email: string; gender?: Gender }) {
  const firstName = name.split(" ")[0];
  const T = (f: string, m: string) => (gender === "m" ? m : f);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>קיבלנו את הבקשה</title></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;direction:rtl;">
<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background:#f6f7fb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" cellspacing="0" cellpadding="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(28,28,46,0.08);">
<tr><td style="background:linear-gradient(135deg,#1C1C2E 0%,#2A2A45 100%);padding:36px 32px;text-align:center;">
  <p style="margin:0 0 6px 0;color:#3ECFCF;font-size:13px;font-weight:700;letter-spacing:1px;">CAREER IN FOCUS · VIP</p>
  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.3;">${firstName}, קיבלנו את הבקשה שלך 🎯</h1>
</td></tr>

<tr><td style="padding:32px;">
  <p style="margin:0 0 16px 0;color:#1C1C2E;font-size:16px;line-height:1.7;">
    ${T("שמחה", "שמח")} שבחרת בליווי האישי שלי לכתיבת קורות החיים. ${T("את", "אתה")} בידיים מקצועיות.
  </p>

  <div style="background:#f0fafa;border-right:4px solid #3ECFCF;padding:18px 20px;border-radius:8px;margin:20px 0;">
    <p style="margin:0 0 8px 0;color:#1C1C2E;font-size:14px;font-weight:700;">איך התהליך עובד:</p>
    <ol style="margin:0;padding-right:20px;color:#1C1C2E;font-size:14px;line-height:1.8;">
      <li><strong>תוך 1-2 ימי עסקים</strong> — אצור איתך קשר טלפוני לתיאום שיחה</li>
      <li><strong>שיחת אבחון של 30 דקות</strong> — נדייק את כיוון הקריירה, החוזקות, ותפקידי היעד</li>
      <li><strong>תוך 7 ימי עסקים מהשיחה</strong> — תקבל${T("י", "")} קורות חיים מקצועיים מותאמים אישית</li>
      <li><strong>הקובץ יישלח אלי${T("יך", "ך")}</strong> — גם במייל וגם דרך המערכת</li>
    </ol>
  </div>

  <p style="margin:20px 0 0 0;color:#666;font-size:14px;line-height:1.7;">
    ${T("אם את רוצה", "אם אתה רוצה")} לזרז את התהליך, ${T("תוכלי", "תוכל")} לכתוב לי בוואטסאפ ישירות.
    אני זמינה לכל שאלה לאורך הדרך.
  </p>

  <p style="margin:24px 0 0 0;color:#1C1C2E;font-size:15px;line-height:1.7;">
    מחכה לדבר${T("", "")} ${T("איתך", "איתך")},<br/>
    <strong>קורל</strong>
  </p>
</td></tr>

<tr><td style="background:#f6f7fb;padding:18px 32px;text-align:center;border-top:1px solid #eee;">
  <p style="margin:0;color:#999;font-size:12px;">קריירה בפוקוס · ${APP_URL.replace("https://","")}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  await sendEmail({
    to: email,
    subject: "קיבלנו את הבקשה שלך לכתיבת קורות חיים — קורל תיצור איתך קשר",
    html,
  });
}

// ─── VIP CV Writing — Admin notification ──────────────────────────────────────
// Sent to Coral whenever a new request comes in. Simple text so it
// reads cleanly on phone notifications.

export async function notifyAdminOfCvRequest({
  to, userName, userEmail, userPhone, targetRole,
}: {
  to: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  targetRole: string | null;
}) {
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<body style="font-family:-apple-system,sans-serif;direction:rtl;background:#f6f7fb;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 4px 16px rgba(0,0,0,.06);">
    <h2 style="margin:0 0 12px 0;color:#1C1C2E;font-size:20px;">📋 בקשה חדשה לכתיבת קורות חיים</h2>
    <p style="margin:0 0 18px 0;color:#666;font-size:14px;">בקשה חדשה ממשתמש/ת VIP להכנת קורות חיים.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#888;">שם:</td><td style="padding:6px 0;font-weight:600;">${userName}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">אימייל:</td><td style="padding:6px 0;direction:ltr;">${userEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">טלפון:</td><td style="padding:6px 0;direction:ltr;">${userPhone ?? "(לא צוין)"}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">תפקיד יעד:</td><td style="padding:6px 0;">${targetRole ?? "(לא צוין)"}</td></tr>
    </table>
    <a href="${APP_URL}/admin/cv-requests" style="display:inline-block;margin-top:20px;background:#3ECFCF;color:#fff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">לפאנל הבקשות ←</a>
  </div>
</body></html>`;

  await sendEmail({
    to,
    subject: `📋 בקשת VIP חדשה: ${userName} (כתיבת קוח)`,
    html,
  });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
// Sent when a user requests a password reset from /forgot-password.
// Contains a one-click link with a single-use token (24h expiry).
// Gender-aware copy so the recipient doesn't get a feminine email when
// they're a man (or vice versa).

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
  gender = "f",
}: {
  to: string;
  name: string;
  resetUrl: string;
  gender?: Gender;
}) {
  const T = (f: string, m: string) => (gender === "m" ? m : f);
  const firstName = name?.split(" ")[0] ?? T("חברה", "חבר");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>איפוס סיסמה — קריירה בפוקוס</title>
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Rubik','Arial',sans-serif;direction:rtl;color:#1C1C2E;">
  <div style="display:none;max-height:0;overflow:hidden;">
    קישור לאיפוס סיסמה — תקף ל-24 שעות
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">

          <tr>
            <td style="background:linear-gradient(135deg,#1C1C2E 0%,#23233D 100%);padding:32px 40px 28px;">
              <div style="display:inline-block;background:rgba(62,207,207,0.15);border:1px solid rgba(62,207,207,0.4);border-radius:999px;padding:5px 12px;margin-bottom:14px;">
                <span style="color:#3ECFCF;font-weight:800;font-size:11px;letter-spacing:0.5px;">🔐 איפוס סיסמה</span>
              </div>
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;line-height:1.2;">
                ${firstName}, ${T("ביקשת לאפס את הסיסמה", "ביקשת לאפס את הסיסמה")}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="font-size:15px;color:#1C1C2E;line-height:1.7;margin:0 0 14px;">
                קיבלנו בקשה לאפס את הסיסמה לחשבון שלך.
                ${T("לחצי על הכפתור למטה", "לחץ על הכפתור למטה")} כדי לבחור סיסמה חדשה.
              </p>
              <p style="font-size:13px;color:#888;line-height:1.6;margin:0 0 24px;">
                הקישור תקף ל-24 שעות בלבד.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 40px 28px;">
              <a href="${resetUrl}" style="display:inline-block;background:#3ECFCF;color:#fff;font-weight:800;font-size:15px;padding:14px 36px;border-radius:14px;text-decoration:none;box-shadow:0 4px 12px rgba(62,207,207,0.3);">
                בחירת סיסמה חדשה ←
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <div style="background:#FBFAF7;border:1px solid #EFEAE0;border-radius:12px;padding:14px 18px;">
                <p style="margin:0 0 6px;font-size:12px;color:#888;font-weight:700;">לא ביקשת איפוס?</p>
                <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
                  ${T("את יכולה להתעלם מהמייל הזה — הסיסמה שלך לא תשונה.", "אתה יכול להתעלם מהמייל הזה — הסיסמה שלך לא תשונה.")}
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;word-break:break-all;direction:ltr;text-align:left;">
                אם הכפתור לא עובד — העתק את הקישור הבא לדפדפן:<br/>
                <span style="color:#3ECFCF;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#FBFAF7;padding:18px 40px;text-align:center;border-top:1px solid #EFEAE0;">
              <p style="margin:0;color:#888;font-size:12px;">
                קריירה בפוקוס · ${T("המקום של נשים שמחפשות עבודה אחרת", "המקום של מי שמחפש עבודה אחרת")}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body></html>`;

  await sendEmail({
    to,
    subject: "🔐 איפוס סיסמה — קריירה בפוקוס",
    html,
  });
}

// ─── Cancellation Confirmation ────────────────────────────────────────────────
// Sent immediately when a user cancels their subscription. Confirms the
// cancellation, tells them when access ends, and offers a single one-click
// reactivation in case they regret it. Warm tone — Coral wants ex-members
// to feel respected, not punished.

export async function sendCancellationEmail({
  to,
  name,
  endsAt,
  gender = "f",
}: {
  to: string;
  name: string;
  /** When the user's access actually expires — typically the end of the paid cycle. */
  endsAt: Date | null;
  gender?: Gender;
}) {
  const T = (f: string, m: string) => (gender === "m" ? m : f);
  const firstName = name?.split(" ")[0] ?? T("חברה", "חבר");
  const endsAtLabel = endsAt
    ? endsAt.toLocaleDateString("he-IL", { day: "2-digit", month: "long", year: "numeric" })
    : T("סוף תקופת המנוי הנוכחית", "סוף תקופת המנוי הנוכחית");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>אישור ביטול מנוי</title></head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Rubik','Arial',sans-serif;direction:rtl;color:#1C1C2E;">
  <div style="display:none;max-height:0;overflow:hidden;">המנוי שלך בוטל — הגישה ממשיכה עד ${endsAtLabel}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EB;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1C1C2E 0%,#23233D 100%);padding:32px 40px;">
          <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:999px;padding:5px 12px;margin-bottom:14px;">
            <span style="color:#fff;font-weight:800;font-size:11px;letter-spacing:0.5px;">אישור ביטול</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;">${firstName}, ${T("קיבלנו את הבקשה שלך", "קיבלנו את הבקשה שלך")}</h1>
        </td></tr>

        <tr><td style="padding:28px 40px 8px;">
          <p style="font-size:15px;color:#1C1C2E;line-height:1.7;margin:0 0 16px;">
            ${T("המנוי שלך בוטל כפי שביקשת.", "המנוי שלך בוטל כפי שביקשת.")}
            ${T("את ממשיכה ליהנות מהגישה המלאה עד", "אתה ממשיך ליהנות מהגישה המלאה עד")}
            <strong style="color:#1C1C2E;">${endsAtLabel}</strong> —
            ${T("בלי הפרעה ובלי חיובים נוספים.", "בלי הפרעה ובלי חיובים נוספים.")}
          </p>
          <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 8px;">
            ${T("רוצה לבדוק שוב לפני שאת הולכת? תמיד אפשר להפעיל מחדש בלחיצה אחת:", "רוצה לבדוק שוב לפני שאתה הולך? תמיד אפשר להפעיל מחדש בלחיצה אחת:")}
          </p>
        </td></tr>

        <tr><td align="center" style="padding:0 40px 28px;">
          <a href="${APP_URL}/billing" style="display:inline-block;background:#3ECFCF;color:#fff;font-weight:800;font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(62,207,207,0.25);">
            הפעלה מחדש של המנוי
          </a>
        </td></tr>

        <tr><td style="padding:0 40px 28px;">
          <div style="background:#FBFAF7;border:1px solid #EFEAE0;border-radius:12px;padding:16px 18px;">
            <p style="margin:0 0 6px;font-size:12px;color:#666;font-weight:700;">${T("רגע לפני שאת הולכת —", "רגע לפני שאתה הולך —")}</p>
            <p style="margin:0;font-size:12px;color:#666;line-height:1.6;">
              ${T("גם בלי המנוי, את חלק מהקהילה. תוכלי להישאר מעודכנת בקבוצת הוואטסאפ ובאינסטגרם של קריירה בפוקוס.", "גם בלי המנוי, אתה חלק מהקהילה. תוכל להישאר מעודכן בקבוצת הוואטסאפ ובאינסטגרם של קריירה בפוקוס.")}
            </p>
          </div>
        </td></tr>

        <tr><td style="background:#FBFAF7;padding:18px 40px;text-align:center;border-top:1px solid #EFEAE0;">
          <p style="margin:0;color:#888;font-size:12px;">קריירה בפוקוס · תודה על הזמן שהיית איתנו 🤍</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await sendEmail({
    to,
    subject: `אישור ביטול מנוי — קריירה בפוקוס`,
    html,
  });
}

// ─── Event Registration Confirmation ──────────────────────────────────────────
// Sent right after a user registers for an event. Confirms registration,
// includes date/time + zoom or location + add-to-calendar tip. The
// existing reminder cron sends a follow-up 24h before — this is the
// immediate confirmation users expect right after they click "register".

export async function sendEventRegistrationEmail({
  to,
  name,
  eventTitle,
  eventStartAt,
  eventLocation,
  isOnline,
  zoomLink,
  gender = "f",
}: {
  to: string;
  name: string;
  eventTitle: string;
  eventStartAt: Date;
  eventLocation: string | null;
  isOnline: boolean;
  zoomLink?: string | null;
  gender?: Gender;
}) {
  const T = (f: string, m: string) => (gender === "m" ? m : f);
  const firstName = name?.split(" ")[0] ?? T("חברה", "חבר");
  const dateLabel = eventStartAt.toLocaleDateString("he-IL", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const timeLabel = eventStartAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const locationLabel = isOnline
    ? "ZOOM (קישור יישלח לפני האירוע)"
    : eventLocation ?? "פרטים יישלחו לפני האירוע";

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>אישור הרשמה — ${eventTitle}</title></head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Rubik','Arial',sans-serif;direction:rtl;color:#1C1C2E;">
  <div style="display:none;max-height:0;overflow:hidden;">נרשמת לאירוע — ${dateLabel} בשעה ${timeLabel}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EB;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1C1C2E 0%,#23233D 50%,#1C1C2E 100%);padding:36px 40px 30px;">
          <div style="display:inline-block;background:rgba(62,207,207,0.15);border:1px solid rgba(62,207,207,0.4);border-radius:999px;padding:5px 12px;margin-bottom:14px;">
            <span style="color:#3ECFCF;font-weight:800;font-size:11px;letter-spacing:0.5px;">✅ ההרשמה אושרה</span>
          </div>
          <h1 style="color:#fff;margin:0 0 6px;font-size:24px;font-weight:900;line-height:1.2;">${firstName}, ${T("שמורה לך מקום!", "שמור לך מקום!")} ✨</h1>
          <p style="color:rgba(255,255,255,0.75);margin:0;font-size:14px;">${eventTitle}</p>
        </td></tr>

        <tr><td style="padding:28px 40px 8px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;border:1px solid #EFEAE0;border-radius:14px;">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0 0 12px;font-size:12px;color:#888;font-weight:700;letter-spacing:0.3px;">פרטי האירוע</p>
              <p style="margin:0 0 6px;font-size:14px;color:#1C1C2E;"><strong>📅 תאריך:</strong> ${dateLabel}</p>
              <p style="margin:0 0 6px;font-size:14px;color:#1C1C2E;"><strong>🕐 שעה:</strong> ${timeLabel}</p>
              <p style="margin:0;font-size:14px;color:#1C1C2E;"><strong>📍 מיקום:</strong> ${locationLabel}</p>
            </td></tr>
          </table>
        </td></tr>

        ${zoomLink ? `
        <tr><td align="center" style="padding:20px 40px 8px;">
          <a href="${zoomLink}" style="display:inline-block;background:#3ECFCF;color:#fff;font-weight:800;font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none;">
            פתחי קישור Zoom
          </a>
        </td></tr>` : ""}

        <tr><td style="padding:8px 40px 24px;">
          <p style="font-size:13px;color:#666;line-height:1.6;margin:0;">
            💡 <strong>טיפ:</strong> ${T("הוסיפי את האירוע ליומן עכשיו, לא תתחרטי.", "הוסף את האירוע ליומן עכשיו, לא תתחרט.")}
            ${T("נשלח לך תזכורת יום לפני וקצת לפני שמתחילים.", "נשלח לך תזכורת יום לפני וקצת לפני שמתחילים.")}
          </p>
        </td></tr>

        <tr><td align="center" style="padding:0 40px 28px;">
          <a href="${APP_URL}/events" style="color:#3ECFCF;font-weight:700;font-size:13px;text-decoration:none;">לכל האירועים שלי ←</a>
        </td></tr>

        <tr><td style="background:#FBFAF7;padding:18px 40px;text-align:center;border-top:1px solid #EFEAE0;">
          <p style="margin:0;color:#888;font-size:12px;">קריירה בפוקוס · נתראה באירוע 🤍</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await sendEmail({
    to,
    subject: `✅ נרשמת ל-${eventTitle}`,
    html,
  });
}

// ─── New Document From Coral ──────────────────────────────────────────────────
// Sent when Coral uploads a document into a member's folder from
// /admin/users/<id>/documents. Highlights that this is a personal,
// hand-prepared deliverable from Coral (not a system email) — same
// premium tone as the welcome email so it reads like a small gift.

const DOC_TYPE_LABELS_FOR_EMAIL: Record<string, string> = {
  cv: "קורות חיים",
  "cover-letter": "מכתב מקדים",
  certificate: "תעודה / הסמכה",
  recommendation: "מכתב המלצה",
  portfolio: "תיק עבודות",
  other: "מסמך",
};

export async function sendNewDocumentFromCoralEmail({
  to,
  name,
  docTypeLabel,
  filename,
  gender = "f",
}: {
  to: string;
  name: string;
  /** Either the canonical DOC_TYPE_LABELS value or one of our keys ("cv" etc.). */
  docTypeLabel: string;
  filename: string;
  gender?: Gender;
}) {
  const T = (f: string, m: string) => (gender === "m" ? m : f);
  const firstName = name?.split(" ")[0] ?? T("חברה", "חבר");
  // If the caller passed a key like "cv", look up the Hebrew label.
  const docLabel = DOC_TYPE_LABELS_FOR_EMAIL[docTypeLabel] ?? docTypeLabel;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>קורל הכינה לך משהו</title>
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Rubik','Arial',sans-serif;direction:rtl;color:#1C1C2E;">
  <div style="display:none;max-height:0;overflow:hidden;">
    קורל הכינה לך ${docLabel} חדש — מחכה לך במערכת
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F1EB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">

          <!-- Hero -->
          <tr>
            <td style="position:relative;background:linear-gradient(135deg,#1C1C2E 0%,#23233D 50%,#1C1C2E 100%);padding:40px 40px 32px;">
              <div style="display:inline-block;background:rgba(62,207,207,0.15);border:1px solid rgba(62,207,207,0.4);border-radius:999px;padding:5px 12px;margin-bottom:18px;">
                <span style="color:#3ECFCF;font-weight:800;font-size:11px;letter-spacing:0.5px;">📎 מסמך חדש בשבילך</span>
              </div>
              <h1 style="color:#fff;margin:0 0 10px;font-size:26px;font-weight:900;line-height:1.2;">
                ${firstName}, ${T("הכנתי לך משהו", "הכנתי לך משהו")} ✨
              </h1>
              <p style="color:rgba(255,255,255,0.78);margin:0;font-size:15px;line-height:1.55;">
                ${T("העלית לי בקשה ועבדתי עליה — ה", "העלית לי בקשה ועבדתי עליה — ה")}${docLabel}
                ${T("מוכן ומחכה לך במערכת.", "מוכן ומחכה לך במערכת.")}
              </p>
            </td>
          </tr>

          <!-- Document card -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;border:1px solid #EFEAE0;border-radius:14px;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0 0 4px;font-size:11px;color:#888;font-weight:700;letter-spacing:0.5px;">סוג המסמך</p>
                  <p style="margin:0 0 12px;font-size:16px;color:#1C1C2E;font-weight:800;">${docLabel}</p>
                  <p style="margin:0 0 4px;font-size:11px;color:#888;font-weight:700;letter-spacing:0.5px;">שם הקובץ</p>
                  <p style="margin:0;font-size:13px;color:#1C1C2E;direction:ltr;text-align:right;word-break:break-all;">${filename}</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 40px 14px;">
              <a href="${APP_URL}/profile/documents" style="display:inline-block;background:#3ECFCF;color:#fff;font-weight:800;font-size:15px;padding:14px 36px;border-radius:14px;text-decoration:none;box-shadow:0 4px 12px rgba(62,207,207,0.3);">
                לצפייה / הורדה ←
              </a>
            </td>
          </tr>

          <!-- Personal note -->
          <tr>
            <td style="padding:8px 40px 28px;">
              <p style="font-size:14px;color:#444;line-height:1.7;margin:0;">
                ${T("כל המסמכים שלך תמיד יחכו לך ב'המסמכים שלי' בעמוד הפרופיל. תוכלי להוריד, לשתף ולעדכן בכל זמן.", "כל המסמכים שלך תמיד יחכו לך ב'המסמכים שלי' בעמוד הפרופיל. תוכל להוריד, לשתף ולעדכן בכל זמן.")}
              </p>
              <p style="font-size:13px;color:#888;line-height:1.6;margin:14px 0 0;">
                ${T("בהצלחה 💪", "בהצלחה 💪")}<br/>
                <strong style="color:#1C1C2E;">קורל</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FBFAF7;padding:18px 40px;text-align:center;border-top:1px solid #EFEAE0;">
              <p style="margin:0;color:#888;font-size:12px;">
                קריירה בפוקוס · ${T("כאן בשבילך", "כאן בשבילך")} 🤍
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body></html>`;

  await sendEmail({
    to,
    subject: `📎 ${firstName}, קורל הכינה לך ${docLabel}`,
    html,
  });
}
