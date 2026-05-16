/**
 * GET /api/cron/scheduled-broadcast
 *
 * One-shot scheduled re-engagement broadcast to the OLD_LEADS audience
 * (people who filled the old marketing-site forms but never registered).
 *
 * Coral's request: "תתזמן את זה לשליחה לכולם מחר ה-8:00 / תדאג אתה
 * לשלוח להם". Scheduled for 2026-05-18 08:00 Israel = 05:00 UTC.
 *
 * The Vercel cron entry runs daily at 05:00 UTC — this handler gates
 * everything behind two checks so re-firing is harmless:
 *
 *   1. Date gate: today's UTC date must equal `TRIGGER_DATE_UTC`.
 *      Earlier and later runs early-exit.
 *   2. Idempotency gate: a Setting row `SCHEDULED_SETTING_KEY` is
 *      written after a successful send. Re-firing finds the row and
 *      bails. This survives the date gate in case Vercel double-fires
 *      a single day (rare but documented).
 *
 * Auth: CRON_SECRET bearer (same pattern as all other crons here).
 *
 * Recipients: every Lead row with source starting "marketing-site" and
 * a non-null email. Mail-merged subject + body per recipient. Each send
 * also Resend-checks `.error` and logs failures separately.
 *
 * Body: imported from @/lib/email/broadcast-render so the cron sends
 * the exact text Coral approved in the form preview.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FROM } from "@/lib/email/resend";
import { buildHtml, firstNameOf, OLD_LEADS_BROADCAST_TEMPLATE } from "@/lib/email/broadcast-render";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 2026-05-18 (May 18, 2026) in UTC. Cron runs at 05:00 UTC = 08:00 IDT.
const TRIGGER_DATE_UTC = "2026-05-18";
const SCHEDULED_SETTING_KEY = "scheduled-broadcast-old-leads-2026-05-18";

// Tag the BroadcastLog with this sender ID. There's no admin user
// behind the cron, so we look up the SUPER_ADMIN to attribute it to
// Coral. Falls back to the first ADMIN if no super admin exists.
async function findAttribuableAdminId(): Promise<string | null> {
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" }, select: { id: true },
  });
  if (superAdmin) return superAdmin.id;
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" }, select: { id: true },
  });
  return admin?.id ?? null;
}

export async function GET(req: NextRequest) {
  // ─── 1. Cron auth ────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── 2. Date gate ────────────────────────────────────────────────
  // Compare UTC date strings ("YYYY-MM-DD"). Anything that's not the
  // trigger day is a no-op.
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (todayUTC !== TRIGGER_DATE_UTC) {
    return NextResponse.json({
      ok: true,
      skipped: "not-trigger-date",
      todayUTC,
      triggerDate: TRIGGER_DATE_UTC,
    });
  }

  // ─── 3. Idempotency gate ─────────────────────────────────────────
  // If we already wrote the "sent" marker on this date, bail.
  const existing = await prisma.setting.findUnique({
    where: { key: SCHEDULED_SETTING_KEY },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: "already-sent",
      sentAt: existing.value,
    });
  }

  // ─── 4. Resend setup ─────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY missing" },
      { status: 500 },
    );
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ─── 5. Fetch recipients ─────────────────────────────────────────
  const leads = await prisma.lead.findMany({
    where: {
      source: { startsWith: "marketing-site" },
      email:  { not: null },
    },
    select: { name: true, email: true },
  });
  const recipients = leads
    .filter((l): l is { name: string; email: string } => Boolean(l.email))
    .map((l) => ({ email: l.email, firstName: firstNameOf(l.name) }));

  if (recipients.length === 0) {
    return NextResponse.json({ ok: false, error: "no-recipients" });
  }

  // ─── 6. Send batch with mail merge ───────────────────────────────
  const { subject, body } = OLD_LEADS_BROADCAST_TEMPLATE;
  const senderName = "קורל קריירה";
  const audience = "OLD_LEADS";
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const personalSubject = subject
            .replace(/\{שם\}/g, r.firstName || "שלום")
            .replace(/\{name\}/gi, r.firstName || "שלום");
          const html = buildHtml(subject, body, senderName, {
            audience,
            recipientFirstName: r.firstName,
          });
          const result = await resend.emails.send({
            from:    FROM,
            to:      r.email,
            subject: personalSubject,
            html,
          });
          if (result.error) {
            const e = result.error as { message?: string };
            errors.push(`${r.email}: ${e.message ?? "unknown"}`);
            skipped++;
          } else {
            sent++;
          }
        } catch (err) {
          errors.push(`${r.email}: ${String(err instanceof Error ? err.message : err).slice(0, 100)}`);
          skipped++;
        }
      })
    );
    if (i + BATCH < recipients.length) {
      await new Promise((res) => setTimeout(res, 200));
    }
  }

  // ─── 7. Mark as sent + log ───────────────────────────────────────
  // Setting marker first — if BroadcastLog fails, we still don't want
  // to re-fire the send on a later cron tick today.
  const nowIso = new Date().toISOString();
  await prisma.setting.upsert({
    where:  { key: SCHEDULED_SETTING_KEY },
    create: { key: SCHEDULED_SETTING_KEY, value: `sent_at:${nowIso}` },
    update: { value: `sent_at:${nowIso}` },
  });

  const attribTo = await findAttribuableAdminId();
  if (attribTo) {
    await prisma.broadcastLog.create({
      data: {
        subject,
        body,
        audience,
        sentCount:    sent,
        skippedCount: skipped,
        sentById:     attribTo,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    triggered: TRIGGER_DATE_UTC,
    total: recipients.length,
    sent,
    skipped,
    errors: errors.slice(0, 10),
  });
}
