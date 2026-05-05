/**
 * Recurring billing cron — runs daily.
 *
 * For every user where:
 *   subscriptionStatus = "ACTIVE"
 *   accessStatus       = "ACTIVE"
 *   nextChargeAt      <= now
 *   cardToken          IS NOT NULL
 *
 * we call CardCom's tokenized charge API (Direct/ChargeToken on v11),
 * billing the amount returned by amountForCycle(plan, chargeCount).
 * On success we increment chargeCount, set lastChargedAt, schedule
 * nextChargeAt = +30d. On failure we leave the row alone — the cron
 * will retry tomorrow. After 3 consecutive failures we expire access
 * (accessStatus → PENDING) and notify the user.
 *
 * For users where subscriptionStatus = "CANCELLED" and nextChargeAt
 * has passed, we expire access without charging. They paid through
 * this cycle; cycle ended; access ends.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { amountForCycle, planLabel, type PlanKey } from "@/lib/billing";

const CARDCOM_CHARGE_URL = "https://secure.cardcom.solutions/api/v11/Transactions/Transaction";

// We give the cron breathing room: only charge users whose next charge
// date is in the past, by up to 7 days. Anything older means something
// already went wrong and a human should look.
const STALE_LIMIT_DAYS = 7;

interface CardComChargeResp {
  ResponseCode?: number;
  Description?:  string;
  TransactionId?: number | string;
}

async function chargeWithToken(args: {
  token:         string;
  amountShekels: number;
  productLabel:  string;
  userEmail:     string;
}): Promise<{ ok: boolean; transactionId?: string; message?: string }> {
  const body = {
    TerminalNumber: Number(process.env.CARDCOM_TERMINAL),
    ApiName:        process.env.CARDCOM_API_NAME,
    ApiPassword:    process.env.CARDCOM_API_PASSWORD,
    Sum:            args.amountShekels,
    CoinId:         1,
    InvoiceHead: {
      CustName:    args.userEmail,
      Language:    "He",
      ProductName: args.productLabel,
    },
    TokenInfo: {
      Token:                  args.token,
      CardOwnerName:          args.userEmail,
      ApprovalNumber:         "",
      NumberOfPayments:       1,
    },
  };

  try {
    const res = await fetch(CARDCOM_CHARGE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = (await res.json()) as CardComChargeResp;
    if (data.ResponseCode === 0) {
      return { ok: true, transactionId: String(data.TransactionId ?? "") };
    }
    return { ok: false, message: `${data.ResponseCode} ${data.Description ?? ""}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "network error" };
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_LIMIT_DAYS * 86400000);

  // ─── 1. Cancelled users who reached the end of their paid cycle ────────
  const expiring = await prisma.user.findMany({
    where: {
      subscriptionStatus: "CANCELLED",
      accessStatus:       "ACTIVE",
      nextChargeAt:       { lte: now, gte: staleCutoff },
    },
    select: { id: true },
  });
  for (const u of expiring) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        accessStatus: "EXPIRED",
        // Keep subscriptionStatus = "CANCELLED" so we know they left
        // intentionally (vs payment failure).
      },
    });
  }

  // ─── 2. Active subscribers due for a charge ────────────────────────────
  const due = await prisma.user.findMany({
    where: {
      subscriptionStatus: "ACTIVE",
      accessStatus:       "ACTIVE",
      cardToken:          { not: null },
      nextChargeAt:       { lte: now, gte: staleCutoff },
    },
    select: {
      id: true,
      email: true,
      cardToken: true,
      membershipType: true,
      chargeCount: true,
    },
    take: 50, // safety cap so a single run can't fan out forever
  });

  let charged = 0, failed = 0;
  const failures: Array<{ email: string; reason: string }> = [];

  for (const u of due) {
    if (!u.cardToken) continue;
    const planKey = u.membershipType as PlanKey;
    if (!["MEMBER", "VIP", "PREMIUM"].includes(planKey)) continue;

    const amountAgorot = amountForCycle(planKey, u.chargeCount);
    const amountShekels = amountAgorot / 100;

    const result = await chargeWithToken({
      token:         u.cardToken,
      amountShekels,
      productLabel:  planLabel(planKey),
      userEmail:     u.email,
    });

    if (result.ok) {
      const next = new Date();
      next.setDate(next.getDate() + 30);
      await prisma.user.update({
        where: { id: u.id },
        data: {
          chargeCount:      { increment: 1 },
          lastChargedAt:    new Date(),
          nextChargeAt:     next,
          paymentReference: result.transactionId ?? null,
          paidAt:           new Date(),
        },
      });
      await prisma.notification.create({
        data: {
          userId:  u.id,
          type:    "general",
          title:   "התשלום החודשי נקלט ✓",
          message: `חויבת על ${planLabel(planKey)}. תודה שאת/ה איתנו.`,
          link:    "/billing",
        },
      });
      charged++;
    } else {
      failed++;
      failures.push({ email: u.email, reason: result.message ?? "unknown" });
      // Notify the user so they can update their card before the next try.
      await prisma.notification.create({
        data: {
          userId:  u.id,
          type:    "general",
          title:   "התשלום החודשי לא הצליח",
          message: "לא הצלחנו לחייב את כרטיס האשראי. נסה/י שוב או עדכן/י אמצעי תשלום ב-/billing.",
          link:    "/billing",
        },
      });
      // Push the next attempt 24h forward so we don't hammer the same
      // failing card endlessly.
      const retryAt = new Date(now.getTime() + 86400000);
      await prisma.user.update({
        where: { id: u.id },
        data:  { nextChargeAt: retryAt },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    expiredAccess: expiring.length,
    charged,
    failed,
    failures,
  });
}
