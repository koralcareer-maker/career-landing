/**
 * Shared broadcast email renderer.
 *
 * Lives in its own module (NOT marked "use server") so it can be
 * imported by both:
 *   - lib/actions/broadcast.ts  — the manual admin-driven send
 *   - app/api/cron/scheduled-broadcast — the one-off scheduled send
 *
 * If we left these helpers inside broadcast.ts (which has the
 * "use server" directive), every non-exported helper would be private
 * to that module and every exported one would be wrapped as a server-
 * action RPC. Neither is what we want for the cron — it needs to call
 * the renderer directly, server-to-server.
 *
 * The OLD_LEADS audience gets the rich card-based layout (feature
 * cards + price banner + CTA button + custom signature). Everyone
 * else gets the simple text-based layout.
 */

export interface BuildHtmlOpts {
  audience?: string;
  recipientFirstName?: string;
}

/**
 * Strip everything after the first whitespace — Hebrew/Israeli names
 * almost always put the personal name first. "דניאל גולדשמידט" → "דניאל".
 */
export function firstNameOf(full: string | null | undefined): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

/**
 * Pick an emoji for a feature card based on keywords in the title.
 * Lets Coral edit the bullet text freely — we still find a matching
 * visual. Falls back to ✨ when nothing matches.
 */
export function iconFor(title: string): string {
  const t = title.toLowerCase();
  if (/משרות|משרה|דרושים/.test(t)) return "💼";
  if (/דרכון|ניתוח/.test(t)) return "🎯";
  if (/ai|מאמן|בינה/.test(t)) return "🤖";
  if (/סדנא|קורס|מקצועי|הדרכה/.test(t)) return "🎓";
  if (/קהיל|רשת|נטוורק/.test(t)) return "🤝";
  if (/מגייס|ראיון|פנייה/.test(t)) return "📞";
  return "✨";
}

/**
 * Rich card-based renderer for the OLD_LEADS re-engagement email.
 * Parses the body line-by-line and maps each pattern to a designed
 * section: bullet cards with emoji icons, an amber launch-price
 * banner, and a teal CTA button.
 */
export function renderOldLeadsContent(body: string): string {
  const APP_URL = "https://app.careerinfocus.co.il";
  const lines = body.split("\n");

  type Section =
    | { kind: "hook"; text: string }
    | { kind: "paragraph"; html: string }
    | { kind: "feature"; title: string; desc: string }
    | { kind: "price"; text: string }
    | { kind: "cta"; url: string };

  const sections: Section[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("•") || line.startsWith("-")) {
      const rest = line.replace(/^[•\-]\s*/, "");
      const m = rest.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (m) sections.push({ kind: "feature", title: m[1], desc: m[2] });
      else   sections.push({ kind: "feature", title: rest.replace(/\*\*/g, ""), desc: "" });
      continue;
    }

    if (/(מחיר.*השקה|השקה.*מחיר|זמן מוגבל)/.test(line)) {
      sections.push({ kind: "price", text: line.replace(/[👉]+/g, "").trim() });
      continue;
    }

    const urlMatch = line.match(/(https?:\/\/[^\s*]+|app\.careerinfocus\.co\.il[^\s*]*)/);
    const cleaned = line.replace(/[👉➡️→]+/g, "").replace(/\*\*/g, "").trim();
    if (urlMatch && (cleaned === urlMatch[1] || /^\W*app\.careerinfocus\.co\.il\W*$/.test(cleaned))) {
      let url = urlMatch[1];
      if (!url.startsWith("http")) url = "https://" + url;
      sections.push({ kind: "cta", url });
      continue;
    }

    const hookMatch = line.match(/^\*\*(.+?)\*\*[?!]?$/);
    if (hookMatch && line.length < 80) {
      sections.push({ kind: "hook", text: hookMatch[1] });
      continue;
    }

    sections.push({
      kind: "paragraph",
      html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
    });
  }

  if (!sections.some((s) => s.kind === "cta")) {
    sections.push({ kind: "cta", url: APP_URL });
  }

  const parts: string[] = [];
  for (const s of sections) {
    switch (s.kind) {
      case "hook":
        parts.push(
          `<h2 style="font-size:24px;font-weight:900;color:#1C1C2E;margin:0 0 18px;line-height:1.35;">${s.text}</h2>`,
        );
        break;
      case "paragraph":
        parts.push(
          `<p style="font-size:15px;line-height:1.8;color:#374151;margin:0 0 16px;">${s.html}</p>`,
        );
        break;
      case "feature": {
        const icon = iconFor(s.title);
        parts.push(`
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px;">
            <tr>
              <td style="background:#FFFBF5;border:1px solid #F4E8D6;border-radius:14px;padding:14px 16px;" dir="rtl">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td valign="top" style="width:40px;font-size:22px;line-height:1;padding-left:12px;">${icon}</td>
                    <td valign="top">
                      <div style="font-weight:800;color:#1C1C2E;font-size:15px;margin-bottom:2px;">${s.title}</div>
                      ${s.desc ? `<div style="color:#64748b;font-size:13.5px;line-height:1.6;">${s.desc}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `);
        break;
      }
      case "price":
        parts.push(`
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 16px;">
            <tr>
              <td style="background:linear-gradient(135deg,#FEF3C7 0%,#FDE68A 100%);border:1.5px solid #F59E0B;border-radius:14px;padding:14px 18px;text-align:center;" dir="rtl">
                <div style="font-size:13px;color:#92400E;font-weight:700;letter-spacing:0.3px;margin-bottom:2px;">🎁 הצעת השקה · לזמן מוגבל</div>
                <div style="font-size:15px;color:#78350F;font-weight:800;">${s.text}</div>
              </td>
            </tr>
          </table>
        `);
        break;
      case "cta":
        parts.push(`
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 4px;">
            <tr>
              <td align="center">
                <a href="${s.url}"
                   style="display:inline-block;background:#3ECFCF;color:#ffffff !important;font-weight:800;
                          font-size:16px;padding:16px 40px;border-radius:14px;text-decoration:none;
                          box-shadow:0 4px 14px rgba(62,207,207,0.35);letter-spacing:0.2px;">
                  כניסה לפלטפורמה ←
                </a>
              </td>
            </tr>
          </table>
        `);
        break;
    }
  }

  return parts.join("\n");
}

/**
 * Build the full broadcast HTML. For OLD_LEADS audience uses the rich
 * card-based layout; for everyone else uses the simple text layout.
 * Performs per-recipient mail-merge: {שם} / {name} get replaced with
 * the recipient's first name.
 */
export function buildHtml(
  subject: string,
  body: string,
  senderName: string,
  opts?: BuildHtmlOpts,
): string {
  const first = (opts?.recipientFirstName ?? "").trim();
  const merged = body
    .replace(/\{שם\}/g, first || "שלום")
    .replace(/\{name\}/gi, first || "שלום");

  const isOldLeads = opts?.audience === "OLD_LEADS";

  const tagline = isOldLeads
    ? "המערכת שעוזרת לך להגיע לתפקיד הבא"
    : "הקהילה לחיפוש עבודה חכם";

  const signatureHtml = isOldLeads
    ? `<div style="margin-top:24px;padding:18px 20px;background:#FAFAF7;border-radius:14px;border-right:3px solid #3ECFCF;" dir="rtl">
         <div style="font-size:14px;color:#6b7280;margin-bottom:4px;">בהצלחה,</div>
         <div style="font-size:17px;font-weight:900;color:#1C1C2E;">קורל קריירה</div>
         <div style="font-size:12px;color:#9ca3af;margin-top:2px;">מייסדת · קריירה בפוקוס</div>
       </div>`
    : `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0f0f0;font-size:13px;color:#888;">
         בברכה,<br /><strong>${senderName}</strong><br />קריירה בפוקוס
       </div>`;

  const footerNote = isOldLeads
    ? "קיבלת את המייל הזה כי פנית אליי בעבר דרך האתר. אם זה כבר לא רלוונטי — פשוט תעני/ה לי כאן."
    : "קיבלת מייל זה כי את/ה חבר/ה בקהילה.";

  const simpleContent = merged
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  const contentHtml = isOldLeads
    ? renderOldLeadsContent(merged)
    : `<h2 style="font-size:22px;font-weight:900;color:#1C1C2E;margin:0 0 16px;">${subject}</h2>
       <div style="color:#374151;">${simpleContent}</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
  <div dir="rtl" style="background:#F5F1EB;padding:24px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(28,28,46,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#1C1C2E 0%,#2A2A4A 100%);padding:32px 32px 30px;text-align:center;" dir="rtl">
                <div style="display:inline-block;background:rgba(62,207,207,0.18);border-radius:50px;padding:5px 14px;margin-bottom:10px;">
                  <span style="color:#7FE5E5;font-size:11px;font-weight:800;letter-spacing:1px;">${isOldLeads ? "✦ קריירה בפוקוס" : "קריירה בפוקוס"}</span>
                </div>
                <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;line-height:1.2;">קריירה בפוקוס</div>
                <div style="color:#3ECFCF;font-size:13px;margin-top:6px;font-weight:600;">${tagline}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px 28px;" dir="rtl">
                ${contentHtml}
                ${signatureHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#FAF7F1;padding:18px 32px;text-align:center;border-top:1px solid #EEE7DA;" dir="rtl">
                <div style="font-size:11.5px;color:#9ca3af;line-height:1.7;">
                  ${footerNote}<br />
                  © 2026 קריירה בפוקוס · <a href="https://careerinfocus.co.il" style="color:#3ECFCF;text-decoration:none;">careerinfocus.co.il</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Pre-approved "איך מתקדם חיפוש העבודה?" re-engagement template Coral
 * signed off on (subject + body). The body uses `{שם}` for mail-merge
 * and `•` bullets that the OLD_LEADS renderer turns into feature cards.
 * The closing signature ("בהצלחה, קורל קריירה") is added by buildHtml
 * when audience === OLD_LEADS, so it's NOT in the body text here.
 */
export const OLD_LEADS_BROADCAST_TEMPLATE = {
  subject: "{שם}, איך מתקדם חיפוש העבודה?",
  body: `היי {שם},

**איך מתקדם חיפוש העבודה שלך?**

רציתי לספר לך שהשקתי את **קהילת קריירה בפוקוס** — מערכת שעוזרת לאנשים כמוך להגיע לתוצאות בזמן קצר לתפקיד הבא!

• **משרות פעילות וסמויות** — גם ממאגרים פרטיים שלא נגישים לרוב המחפשים
• **דרכון קריירה אישי** — ניתוח חכם שמראה לך איפה את/ה עומד/ת ובמה להתמקד
• **מאמן AI אישי 24/7** — תשובות מקצועיות על ראיונות, קו"ח, משא ומתן
• **סדנאות וקורסים מקצועיים** — לגישור פערים ולמקסום הפוטנציאל שלך כמועמד/ת

עכשיו במחיר השקה מצחיק לזמן מוגבל — מוזמן/ת לבדוק:
👉 **app.careerinfocus.co.il**`,
};
