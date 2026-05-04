/**
 * Email sending utilities — powered by Resend
 */

// Hardcoded — the NEXT_PUBLIC_APP_URL env var in Vercel was set to a
// custom domain (app.careerinfocus.co.il) that doesn't resolve in DNS yet,
// which broke every link in welcome emails. Hardcoding to the working
// Vercel URL until the custom domain's DNS is configured. When that
// happens, switch this to the new domain (or restore the env var read).
const APP_URL = "https://career-landing-tau.vercel.app";
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
