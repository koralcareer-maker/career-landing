"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { FROM } from "@/lib/email/resend";
import { buildHtml, firstNameOf } from "@/lib/email/broadcast-render";
import { Resend } from "resend";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Note: the email-rendering helpers (iconFor, renderOldLeadsContent,
// buildHtml, firstNameOf) live in @/lib/email/broadcast-render — they're
// imported here AND by the scheduled-broadcast cron route so both code
// paths produce identical output.

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
