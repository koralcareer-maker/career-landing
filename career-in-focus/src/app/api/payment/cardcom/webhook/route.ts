/**
 * CardCom Webhook Handler
 *
 * CardCom sends a POST request to this endpoint when payment is confirmed.
 * Verify the webhook signature, then activate the user.
 *
 * TODO: Implement signature verification using CARDCOM_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    // TODO: Verify CardCom signature
    // const signature = req.headers.get("x-cardcom-signature");
    // if (!verifySignature(body, signature, process.env.CARDCOM_WEBHOOK_SECRET!)) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const userId = params.get("UniqueID");
    const responseCode = params.get("ResponseCode");
    const transactionId = params.get("TransactionID");

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    if (responseCode === "0") {
      // Payment successful
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessStatus: "ACTIVE",
          membershipType: "MEMBER",
          paymentProvider: "CARDCOM",
          paymentReference: transactionId ?? undefined,
          paidAt: new Date(),
        },
      });

      // Create welcome notification
      await prisma.notification.create({
        data: {
          userId,
          type: "general",
          title: "ברוך הבא לקהילה!",
          message: "התשלום אושר. יש לך עכשיו גישה מלאה לפלטפורמה.",
          link: "/dashboard",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CardCom webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
