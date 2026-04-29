/**
 * Email sending utilities — powered by Resend
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://career-landing-tau.vercel.app";
const FROM    = process.env.EMAIL_FROM ?? "קריירה בפוקוס <noreply@careerinfocus.co.il>";

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

const PLAN_LABELS: Record<string, string> = {
  MEMBER:  "חבר",
  VIP:     "VIP",
  PREMIUM: "פרמיום — קורל מפעילה קשרים",
  NONE:    "חבר",
};

export async function sendWelcomeEmail({
  name,
  email,
  membershipType = "MEMBER",
  password,
}: {
  name: string;
  email: string;
  membershipType?: string;
  password?: string;   // only when admin creates user manually
}) {
  const planLabel = PLAN_LABELS[membershipType] ?? "חבר";
  const firstName = name?.split(" ")[0] ?? "חברה";

  const loginSection = password
    ? `
      <div style="background:#f0f9f8;border:1px solid #3ECFCF33;border-radius:16px;padding:20px 24px;margin:24px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#0A2540;font-size:15px;">פרטי הכניסה שלך:</p>
        <p style="margin:4px 0;color:#444;font-size:14px;">📧 <strong>אימייל:</strong> ${email}</p>
        <p style="margin:4px 0;color:#444;font-size:14px;">🔑 <strong>סיסמה:</strong> ${password}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#888;">מומלץ לשנות סיסמה לאחר הכניסה הראשונה</p>
      </div>`
    : `
      <div style="background:#f0f9f8;border:1px solid #3ECFCF33;border-radius:16px;padding:16px 24px;margin:24px 0;">
        <p style="margin:0;color:#444;font-size:14px;">📧 כניסה עם האימייל שלך: <strong>${email}</strong></p>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:Arial,sans-serif;direction:rtl;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0A2540 0%,#1a3a5c 100%);padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:36px;height:36px;background:#3ECFCF;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:16px;">ק</div>
        <span style="color:#fff;font-weight:900;font-size:16px;">קריירה בפוקוס</span>
      </div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;">ברוכה הבאה! 🎉</h1>
      <p style="color:#3ECFCF;margin:8px 0 0;font-size:14px;">חברות ${planLabel} מאושרת</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="font-size:17px;font-weight:700;color:#0A2540;margin:0 0 8px;">היי ${firstName},</p>
      <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 16px;">
        אנחנו שמחות שהצטרפת לקהילת <strong>קריירה בפוקוס</strong> — המקום שבו מחפשי עבודה לא מחפשים לבד. 💙
      </p>

      ${loginSection}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0;">
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#3ECFCF;color:#fff;font-weight:900;font-size:16px;padding:16px 40px;border-radius:14px;text-decoration:none;">
          כניסה לפלטפורמה ←
        </a>
      </div>

      <!-- Guide Steps -->
      <div style="border-top:1px solid #f0f0f0;padding-top:24px;margin-top:8px;">
        <p style="font-weight:800;color:#0A2540;margin:0 0 16px;font-size:15px;">🗺️ 5 הדברים הראשונים לעשות:</p>

        ${[
          ["👤", "מלאי את הפרופיל שלך", "/profile", "שם, תפקיד מבוקש, קישור לינקדאין"],
          ["🎯", "צרי את הדרכון הקריירה שלך", "/skills", "AI מנתח את הפרופיל שלך ומייצר תוכנית"],
          ["💼", "בדקי משרות שנבחרו בשבילך", "/jobs", "משרות שמתאימות לפרופיל שלך"],
          ["🛠️", "גלי את כלי חיפוש העבודה", "/tools", "קבוצות וואטסאפ, מגייסים, תבניות ועוד"],
          ["📅", "הצטרפי לאירוע הקרוב", "/events", "ווובינרים, אירועי רשת ומפגשי מגייסים"],
        ].map(([emoji, title, link, desc]) => `
        <a href="${APP_URL}${link}" style="text-decoration:none;display:block;margin-bottom:12px;">
          <div style="background:#fafafa;border:1px solid #eee;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:20px;width:32px;text-align:center;">${emoji}</span>
            <div>
              <div style="font-weight:700;color:#0A2540;font-size:14px;">${title}</div>
              <div style="color:#888;font-size:12px;margin-top:2px;">${desc}</div>
            </div>
          </div>
        </a>`).join("")}
      </div>

      <p style="font-size:14px;color:#666;line-height:1.7;margin:24px 0 0;">
        יש שאלות? תמיד אפשר לחזור ולשאול. אנחנו כאן כדי שתצליחי 💪<br/>
        <strong style="color:#0A2540;">קורל ♥</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #f0f0f0;">
      <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">
        © 2026 קריירה בפוקוס ·
        <a href="${APP_URL}" style="color:#3ECFCF;text-decoration:none;">careerinfocus.co.il</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: email,
    subject: `ברוכה הבאה לקריירה בפוקוס! 🎉 ${firstName}`,
    html,
  });
}
