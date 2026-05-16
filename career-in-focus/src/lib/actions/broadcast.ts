"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { FROM } from "@/lib/email/resend";
import { Resend } from "resend";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Pick an emoji for a feature card based on keywords in the title.
 * Lets Coral edit the bullet text freely — we still find a matching
 * visual. Falls back to ✨ when nothing matches.
 */
function iconFor(title: string): string {
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
 * Rich, designed renderer for the OLD_LEADS re-engagement email.
 * Parses Coral's body (which uses `•` bullets, `**bold**`, a launch-
 * price line, and the platform URL) into visually rich sections:
 *   - opening greeting + bold hook
 *   - intro paragraph
 *   - feature cards (one per bullet) with auto-picked emoji icons
 *   - amber launch-price banner
 *   - prominent teal CTA button
 *
 * Anything that doesn't match a pattern is rendered as a clean
 * paragraph, so the renderer degrades gracefully if Coral edits or
 * reorders the body.
 */
function renderOldLeadsContent(body: string): string {
  const APP_URL = "https://app.careerinfocus.co.il";
  const lines = body.split("\n");

  // First pass: classify each non-empty line
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

    // Feature bullet: "• **Title** — description"
    if (line.startsWith("•") || line.startsWith("-")) {
      const rest = line.replace(/^[•\-]\s*/, "");
      const m = rest.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (m) sections.push({ kind: "feature", title: m[1], desc: m[2] });
      else   sections.push({ kind: "feature", title: rest.replace(/\*\*/g, ""), desc: "" });
      continue;
    }

    // Launch-price line: "עכשיו במחיר השקה..." (with or without the
    // pointing emoji or trailing "מוזמן/ת לבדוק")
    if (/(מחיר.*השקה|השקה.*מחיר|זמן מוגבל)/.test(line)) {
      sections.push({ kind: "price", text: line.replace(/[👉]+/g, "").trim() });
      continue;
    }

    // CTA line: the bare URL (with or without a pointing emoji /
    // surrounding `**`). Coral writes it as `👉 **app.careerinfocus.co.il**`.
    const urlMatch = line.match(/(https?:\/\/[^\s*]+|app\.careerinfocus\.co\.il[^\s*]*)/);
    const cleaned = line.replace(/[👉➡️→]+/g, "").replace(/\*\*/g, "").trim();
    if (urlMatch && (cleaned === urlMatch[1] || /^\W*app\.careerinfocus\.co\.il\W*$/.test(cleaned))) {
      let url = urlMatch[1];
      if (!url.startsWith("http")) url = "https://" + url;
      sections.push({ kind: "cta", url });
      continue;
    }

    // Hook line — a standalone bold line, often phrased as a question.
    // Coral's template has "**איך מתקדם חיפוש העבודה שלך?**" on its own.
    const hookMatch = line.match(/^\*\*(.+?)\*\*[?!]?$/);
    if (hookMatch && line.length < 80) {
      sections.push({ kind: "hook", text: hookMatch[1] });
      continue;
    }

    // Anything else: regular paragraph. Convert **bold** inline.
    sections.push({
      kind: "paragraph",
      html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
    });
  }

  // If the body didn't include a CTA line, append a default one so
  // every re-engagement email still ends with a clear next step.
  if (!sections.some((s) => s.kind === "cta")) {
    sections.push({ kind: "cta", url: APP_URL });
  }

  // Second pass: render each section to email-safe HTML. We use plain
  // block-level elements (no flexbox/grid) for max client compatibility,
  // and inline styles only — no class selectors inside the content.
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
 * Render the broadcast HTML. The OLD_LEADS audience gets the rich
 * `renderOldLeadsContent` layout (feature cards + price banner + CTA
 * button + custom signature). Everyone else gets the simple text-based
 * layout that's worked fine for member broadcasts since launch.
 *
 * `recipientFirstName` is substituted into the body wherever the
 * sender wrote `{שם}` or `{name}` — the same mail-merge convention
 * Coral used in the draft.
 */
function buildHtml(
  subject: string,
  body: string,
  senderName: string,
  opts?: { audience?: string; recipientFirstName?: string },
) {
  // Per-recipient mail-merge: replace `{שם}` / `{name}` (case-insensitive)
  // with the recipient's first name. Falls back to "שלום" so we never
  // leave the literal placeholder visible in a real send.
  const first = (opts?.recipientFirstName ?? "").trim();
  const merged = body
    .replace(/\{שם\}/g, first || "שלום")
    .replace(/\{name\}/gi, first || "שלום");

  const isOldLeads = opts?.audience === "OLD_LEADS";

  // Tagline + signature + footer change for old-leads re-engagement.
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

  // For non-OLD_LEADS broadcasts keep the simple text rendering that's
  // been live since launch — bold/newlines only.
  const simpleContent = merged
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  // For OLD_LEADS, render the rich card-based layout. The h2 subject
  // is suppressed inside the content (since the body's own bold hook
  // line "איך מתקדם חיפוש העבודה שלך?" already serves that role),
  // so the email feels less like a corporate newsletter.
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
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1C1C2E 0%,#2A2A4A 100%);padding:32px 32px 30px;text-align:center;" dir="rtl">
                <div style="display:inline-block;background:rgba(62,207,207,0.18);border-radius:50px;padding:5px 14px;margin-bottom:10px;">
                  <span style="color:#7FE5E5;font-size:11px;font-weight:800;letter-spacing:1px;">${isOldLeads ? "✦ קריירה בפוקוס" : "קריירה בפוקוס"}</span>
                </div>
                <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;line-height:1.2;">קריירה בפוקוס</div>
                <div style="color:#3ECFCF;font-size:13px;margin-top:6px;font-weight:600;">${tagline}</div>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 30px 28px;" dir="rtl">
                ${contentHtml}
                ${signatureHtml}
              </td>
            </tr>
            <!-- Footer -->
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

export type BroadcastState = {
  error?: string;
  success?: boolean;
  sentCount?: number;
  skippedCount?: number;
  previewCount?: number;
  /** Echo the address(es) the test was actually sent to, so admins
   *  immediately see WHICH inbox to check. */
  sentTo?: string;
};

/**
 * Unified recipient shape — `firstName` drives the mail-merge into the
 * body. For platform users we derive it from the `name` field; for old
 * leads it's already split in the Lead source data.
 */
type Recipient = { email: string; firstName: string };

// Strip everything after the first whitespace — Hebrew/Israeli names
// almost always put the personal name first. "דניאל גולדשמידט" → "דניאל".
function firstNameOf(full: string | null | undefined): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

async function recipientsFor(audience: string): Promise<Recipient[]> {
  if (audience === "OLD_LEADS") {
    const leads = await prisma.lead.findMany({
      where: {
        source: { startsWith: "marketing-site" },
        email:  { not: null },
      },
      select: { name: true, email: true },
    });
    return leads
      .filter((l): l is { name: string; email: string } => Boolean(l.email))
      .map((l) => ({ email: l.email, firstName: firstNameOf(l.name) }));
  }
  const users = await prisma.user.findMany({
    where: buildWhere(audience),
    select: { email: true, name: true },
  });
  return users.map((u) => ({ email: u.email, firstName: firstNameOf(u.name) }));
}

// Count how many will receive based on filter — for preview
export async function previewBroadcast(prevState: unknown, formData: FormData): Promise<BroadcastState> {
  await requireAdmin();
  const audience = formData.get("audience") as string;
  const recipients = await recipientsFor(audience);
  return { previewCount: recipients.length };
}

/**
 * Send a single "test" copy of the broadcast to the calling admin's
 * own email. Uses the same renderer + mail-merge as a real send, but
 * with a dummy first name ("קורל") so Coral sees how `{שם}` resolves.
 * Lets her validate the actual designed email in her inbox before
 * triggering the full send.
 */
export async function sendBroadcastTest(prevState: unknown, formData: FormData): Promise<BroadcastState> {
  const admin = await requireAdmin();

  const subject  = (formData.get("subject")  as string)?.trim();
  const body     = (formData.get("body")     as string)?.trim();
  const audience = (formData.get("audience") as string) ?? "ALL";

  if (!subject || !body) {
    return { error: "נושא וגוף ההודעה הם שדות חובה" };
  }
  if (!admin.email) {
    return { error: "אין כתובת אימייל למנהל/ת — לא ניתן לשלוח דוגמה" };
  }
  if (!process.env.RESEND_API_KEY) {
    return { error: "RESEND_API_KEY לא מוגדר בסביבה" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const senderName = admin.name ?? "קורל שלו";
  const testFirstName = firstNameOf(admin.name) || "קורל";

  try {
    const html = buildHtml(subject, body, senderName, {
      audience,
      recipientFirstName: testFirstName,
    });
    const personalSubject = `[דוגמה] ` + subject
      .replace(/\{שם\}/g, testFirstName)
      .replace(/\{name\}/gi, testFirstName);
    // CRITICAL: Resend's SDK does NOT throw on API errors — it returns
    // { data, error }. We MUST inspect `.error` ourselves, otherwise a
    // silent quarantine (unverified-domain, invalid from-address, etc.)
    // looks like success and Coral has no idea why her inbox is empty.
    // Also: send to BOTH the logged-in admin's email AND Coral's known
    // Gmail. Earlier debugging showed that admin.email can be set to a
    // different address than the Gmail Coral actually reads, leading to
    // "test sent successfully" but nothing in her inbox. Hard-coding
    // the Gmail as a second recipient bypasses the mismatch.
    const CORAL_GMAIL = "koralcareer@gmail.com";
    const recipients = Array.from(new Set([admin.email, CORAL_GMAIL]));
    const result = await resend.emails.send({
      from:    FROM,
      to:      recipients,
      subject: personalSubject,
      html,
    });
    if (result.error) {
      const e = result.error as { message?: string; name?: string };
      return { error: `Resend דחה: ${e.name ?? ""} ${e.message ?? "שגיאה לא ידועה"}`.trim() };
    }
    return { success: true, sentCount: recipients.length, sentTo: recipients.join(", ") };
  } catch (err) {
    return { error: `שליחת הדוגמה נכשלה: ${String(err instanceof Error ? err.message : err).slice(0, 200)}` };
  }
}

// Actually send the broadcast
export async function sendBroadcast(prevState: unknown, formData: FormData): Promise<BroadcastState> {
  const admin = await requireAdmin();

  const subject  = (formData.get("subject")  as string)?.trim();
  const body     = (formData.get("body")     as string)?.trim();
  const audience = (formData.get("audience") as string) ?? "ALL";

  if (!subject || !body) {
    return { error: "נושא וגוף ההודעה הם שדות חובה" };
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "RESEND_API_KEY לא מוגדר בסביבה — לא ניתן לשלוח מיילים" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const recipients = await recipientsFor(audience);

  if (recipients.length === 0) {
    return { error: "לא נמצאו נמענים בפילטר שנבחר" };
  }

  const senderName = admin.name ?? "קורל שלו";
  let sent = 0;
  let skipped = 0;

  // Send in batches of 10 (Resend rate limit friendly). Each recipient
  // gets the same subject but a body that's been mail-merged with their
  // first name — so {שם} renders as "דניאל" for דניאל, "שירה" for שירה,
  // etc.
  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (r) => {
        try {
          // Personalise the subject too — Coral's draft starts with "{שם}, …"
          const personalSubject = subject
            .replace(/\{שם\}/g, r.firstName || "שלום")
            .replace(/\{name\}/gi, r.firstName || "שלום");
          const html = buildHtml(subject, body, senderName, {
            audience,
            recipientFirstName: r.firstName,
          });
          // Resend's SDK returns { data, error } and does NOT throw on
          // API errors. Inspect `.error` explicitly so silent quarantines
          // (unverified domain, malformed from-address, etc.) get counted
          // as failures instead of slipping into `sent`.
          const result = await resend.emails.send({
            from:    FROM,
            to:      r.email,
            subject: personalSubject,
            html,
          });
          if (result.error) {
            console.error(`Broadcast: Resend rejected ${r.email}:`, result.error);
            skipped++;
          } else {
            sent++;
          }
        } catch (err) {
          console.error(`Broadcast: failed to send to ${r.email}`, err);
          skipped++;
        }
      })
    );
    // Small pause between batches to avoid rate limits
    if (i + BATCH < recipients.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Save to broadcast log
  await prisma.broadcastLog.create({
    data: {
      subject,
      body,
      audience,
      sentCount:    sent,
      skippedCount: skipped,
      sentById:     admin.id,
    },
  });

  revalidatePath("/admin/broadcast");
  return { success: true, sentCount: sent, skippedCount: skipped };
}

function buildWhere(audience: string) {
  const base = { accessStatus: "ACTIVE" as const };
  switch (audience) {
    case "MEMBER":  return { ...base, membershipType: "MEMBER"  as const };
    case "VIP":     return { ...base, membershipType: "VIP"     as const };
    case "PREMIUM": return { ...base, membershipType: "PREMIUM" as const };
    case "PAYING":  return { ...base, membershipType: { in: ["MEMBER","VIP","PREMIUM"] as ("MEMBER"|"VIP"|"PREMIUM")[] } };
    default:        return { accessStatus: "ACTIVE" as const }; // ALL active
  }
}
