/**
 * CardCom Webhook Handler
 *
 * CardCom POSTs to this endpoint when payment is confirmed.
 * We parse the ReturnValue (userId|plan), activate the user, and return 200.
 *
 * CardCom webhook fields (form-encoded):
 *   ReturnValue  — our custom value set during LowProfile Create
 *   ResponseCode — "000" = success
 *   Operation    — 1 = charge
 *   TransactionID
 *   Token        — card token for future recurring charges
 *   Last4Digits
 *   CardExpiration
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, sendPurchaseNotification } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // ── Optional shared-secret authentication ───────────────────────────
    // The webhook is internet-reachable and CardCom does not send an HMAC
    // signature, so by default anyone who knows a userId could POST a fake
    // "payment succeeded". To close that, set CARDCOM_WEBHOOK_SECRET in the
    // environment and append ?key=<secret> to the webhook URL registered in
    // CardCom (or send it as the x-webhook-secret header). While the env var
    // is UNSET this check is a no-op, so it can never break live signups —
    // it only starts enforcing once you opt in by configuring the secret.
    const webhookSecret = process.env.CARDCOM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const provided =
        req.nextUrl.searchParams.get("key") ??
        req.headers.get("x-webhook-secret") ??
        "";
      if (provided !== webhookSecret) {
        console.warn("CardCom webhook: rejected — missing/invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const contentType = req.headers.get("content-type") ?? "";
    let params: URLSearchParams;

    if (contentType.includes("application/json")) {
      const json = await req.json();
      params = new URLSearchParams(
        Object.entries(json).map(([k, v]) => [k, String(v)])
      );
    } else {
      const body = await req.text();
      params = new URLSearchParams(body);
    }

    const returnValue  = params.get("ReturnValue")  ?? "";
    const responseCode = params.get("ResponseCode") ?? "";
    const transactionId= params.get("TransactionID") ?? undefined;
    const token        = params.get("Token") ?? undefined;
    const last4        = params.get("Last4Digits") ?? undefined;
    // CardCom sends the charged amount in agorot under "Sum" (or
    // sometimes "SumAmount" depending on the integration mode).
    // Best-effort parse — falls back to plan defaults in the admin
    // notification email if missing.
    const amountAgorotRaw = params.get("Sum") ?? params.get("SumAmount") ?? "";
    const amountIls = amountAgorotRaw ? Number(amountAgorotRaw) / 100 : undefined;

    // ReturnValue format: "userId|PLAN"
    const [userId, planRaw] = returnValue.split("|");
    const plan = (["MEMBER", "VIP", "PREMIUM"].includes(planRaw) ? planRaw : "MEMBER") as
      "MEMBER" | "VIP" | "PREMIUM";

    if (!userId) {
      console.error("CardCom webhook: missing userId in ReturnValue", returnValue);
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // CardCom sends "000" or "0" for success
    const isSuccess = responseCode === "000" || responseCode === "0";

    if (isSuccess) {
      // Schedule first recurring charge ~30 days out — gives the launch
      // promo (₪29 for first 2 cycles on Member) a clear timeline.
      const next = new Date();
      next.setDate(next.getDate() + 30);

      // Read current state BEFORE updating. chargeCount tells us
      // new-customer vs recurring; paymentReference + subscriptionStatus
      // let us reject replayed/duplicate deliveries (see guards below).
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { chargeCount: true, paymentReference: true, subscriptionStatus: true },
      });

      // Unknown user (e.g. deleted account). Acknowledge so CardCom stops
      // retrying, but never recreate or charge anything.
      if (!existing) {
        console.warn(`CardCom webhook: success for unknown user ${userId} — ignoring`);
        return NextResponse.json({ ok: true });
      }

      // ── Idempotency / replay guard ──────────────────────────────────
      // CardCom legitimately RE-DELIVERS ("retries") webhooks, and a
      // replayed success notification still carries a reusable recurring
      // Token. Without this guard a duplicate delivery of an old signup
      // notification would flip a cancelled customer back to ACTIVE and
      // RESTORE the card token we deliberately wiped on cancellation —
      // silently re-arming billing on someone we already cancelled.
      //
      // A genuine new payment always carries a NEW TransactionID, so this
      // never blocks a real signup or re-subscription; it only drops an
      // exact re-delivery of a transaction we already applied to this user
      // (admin cancellation leaves paymentReference intact, so the original
      // signup transaction stays recorded and its replays are caught).
      if (transactionId && existing.paymentReference === transactionId) {
        console.warn(
          `CardCom webhook: duplicate transaction ${transactionId} for user ${userId} ` +
          `(subscriptionStatus=${existing.subscriptionStatus}) — ignoring replay, not re-arming billing`
        );
        return NextResponse.json({ ok: true, duplicate: true });
      }

      const isFirstPurchase = (existing.chargeCount ?? 0) === 0;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          accessStatus:        "ACTIVE",
          membershipType:      plan,
          paymentProvider:     "CARDCOM",
          paymentReference:    transactionId,
          paidAt:              new Date(),
          // Subscription state
          subscriptionStatus:  "ACTIVE",
          chargeCount:         { increment: 1 },
          lastChargedAt:       new Date(),
          nextChargeAt:        next,
          // Clear any previous cancellation if user re-subscribes
          cancelledAt:         null,
          cancellationReason:  null,
          cancellationNote:    null,
          ...(token ? { cardToken: token, cardLast4: last4 } : {}),
        },
        select: { name: true, email: true, gender: true },
      });

      await prisma.notification.create({
        data: {
          userId,
          type:    "general",
          title:   "ברוכה הבאה לקהילה! 🎉",
          message: "התשלום אושר. יש לך עכשיו גישה מלאה לכל הפלטפורמה.",
          link:    "/dashboard",
        },
      });

      // Send welcome email to the user (non-blocking)
      sendWelcomeEmail({
        name:           user.name ?? user.email,
        email:          user.email,
        membershipType: plan,
        gender:         user.gender === "m" ? "m" : "f",
      }).catch(console.error);

      // Notify Coral that a new customer just purchased — separate
      // copy for "new customer" vs "recurring renewal" so she can
      // prioritise reaching out to first-timers personally. Also
      // fire-and-forget; activation is already saved.
      sendPurchaseNotification({
        userId,
        name:            user.name,
        email:           user.email,
        plan,
        transactionId,
        amountIls,
        isFirstPurchase,
      }).catch(console.error);

      // Referral reward — when this is the new user's FIRST successful
      // charge AND they were referred by someone, credit the referrer
      // with a free month (push nextChargeAt out by 30 days). Avoids
      // gifting months for spam signups that never paid.
      if (isFirstPurchase) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newUserRow = await (prisma.user as any).findUnique({
            where: { id: userId },
            select: { referredById: true },
          });
          if (newUserRow?.referredById) {
            const referrerId: string = newUserRow.referredById;
            const fortyDays = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.user as any).update({
              where: { id: referrerId },
              data: {
                referralCount: { increment: 1 },
                // Push next-charge out 30 days — gift a free cycle.
                nextChargeAt: fortyDays,
              },
            });
            await prisma.notification.create({
              data: {
                userId: referrerId,
                type:    "general",
                title:   "🎁 חודש חינם על חשבון חבר/ה שהפנית!",
                message: "ההפניה שלך הצטרפה לקהילה ושילמה. החיוב הבא שלך נדחה בחודש.",
                link:    "/dashboard",
              },
            });
            console.log(`Referral credited — user ${userId} → referrer ${referrerId}`);
          }
        } catch (e) {
          console.warn("[cardcom] referral credit failed:", e);
        }
      }

      console.log(`CardCom: user ${userId} activated as ${plan}, tx ${transactionId}, firstPurchase=${isFirstPurchase}`);
    } else {
      console.warn(`CardCom webhook: payment failed for user ${userId}, code ${responseCode}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CardCom webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// CardCom sometimes sends GET to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ ok: true });
}
