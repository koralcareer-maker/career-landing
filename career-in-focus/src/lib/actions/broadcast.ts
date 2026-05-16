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
 * Render the broadcast HTML. The OLD_LEADS audience gets a slightly
 * different footer ("you contacted us via the marketing site") and
 * a custom inline signature ("בהצלחה, קורל קריירה") instead of the
 * platform's standard "בברכה, [name], קריירה בפוקוס" — matches what
 * Coral approved for the re-engagement email.
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

  // Convert newlines to <br> and basic markdown-like bold (**text**)
  const html = merged
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  const isOldLeads = opts?.audience === "OLD_LEADS";

  // Tagline + signature + footer change for old-leads re-engagement.
  // Active members get the standard "הקהילה לחיפוש עבודה חכם" header
  // and a "you're a community member" footer line. Old leads get a
  // softer header + a "you contacted us in the past" line.
  const tagline = isOldLeads
    ? "המערכת שעוזרת לך להגיע לתפקיד הבא"
    : "הקהילה לחיפוש עבודה חכם";

  const signatureHtml = isOldLeads
    ? `בהצלחה,<br /><strong>קורל קריירה</strong>`
    : `בברכה,<br /><strong>${senderName}</strong><br />קריירה בפוקוס`;

  const footerNote = isOldLeads
    ? "קיבלת את המייל הזה כי פנית אליי בעבר דרך האתר. אם זה כבר לא רלוונטי — פשוט תעני/ה לי כאן."
    : "קיבלת מייל זה כי את/ה חבר/ה בקהילה.";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#F5F1EB; font-family:Arial,sans-serif; direction:rtl; }
    .wrap { max-width:580px; margin:32px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.08); }
    .header { background:#1C1C2E; padding:28px 32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:20px; font-weight:900; letter-spacing:-0.3px; }
    .header p  { color:#3ECFCF; margin:6px 0 0; font-size:13px; }
    .body { padding:36px 32px; color:#1C1C2E; font-size:15px; line-height:1.75; }
    .body h2 { font-size:22px; font-weight:900; margin:0 0 16px; }
    .content { color:#374151; }
    .btn { display:inline-block; background:#3ECFCF; color:#fff !important; font-weight:700;
           font-size:15px; padding:14px 32px; border-radius:14px; text-decoration:none; margin:24px 0 0; }
    .sig { margin-top:32px; padding-top:20px; border-top:1px solid #f0f0f0; font-size:13px; color:#888; }
    .footer { background:#F5F1EB; padding:18px 32px; text-align:center; color:#aaa; font-size:12px; }
    .footer a { color:#3ECFCF; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>קריירה בפוקוס</h1>
      <p>${tagline}</p>
    </div>
    <div class="body">
      <h2>${subject}</h2>
      <div class="content">${html}</div>
      <div class="sig">${signatureHtml}</div>
    </div>
    <div class="footer">
      <p>© 2026 קריירה בפוקוס · <a href="https://careerinfocus.co.il">careerinfocus.co.il</a></p>
      <p>${footerNote}</p>
    </div>
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
          await resend.emails.send({
            from:    FROM,
            to:      r.email,
            subject: personalSubject,
            html,
          });
          sent++;
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
