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

export async function POST(req: NextRequest) {
  try {
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
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessStatus:     "ACTIVE",
          membershipType:   plan,
          paymentProvider:  "CARDCOM",
          paymentReference: transactionId,
          paidAt:           new Date(),
          // Store card token for future recurring charges
          ...(token ? { cardToken: token, cardLast4: last4 } : {}),
        },
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

      console.log(`CardCom: user ${userId} activated as ${plan}, tx ${transactionId}`);
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
