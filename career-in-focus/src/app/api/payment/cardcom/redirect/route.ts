/**
 * CardCom Payment Redirect
 *
 * TODO: Wire up real CardCom integration.
 *
 * CardCom API docs: https://cardcom.solutions/api
 *
 * Required env vars:
 *   CARDCOM_TERMINAL_NUMBER
 *   CARDCOM_USERNAME
 *   CARDCOM_SUCCESS_URL
 *   CARDCOM_FAILURE_URL
 *
 * Flow:
 *   1. User clicks "Pay" → hits this route
 *   2. This route creates a CardCom payment page request
 *   3. User is redirected to CardCom hosted page
 *   4. On success, CardCom redirects to /api/payment/cardcom/callback
 *   5. Webhook confirms payment at /api/payment/cardcom/webhook
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
  }

  // ── Temporary manual approval flow ──────────────────────────────────────
  // Remove this block when CardCom is wired up.
  // For now, mark user as ACTIVE immediately (development/demo only).
  if (process.env.NODE_ENV === "development") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        accessStatus: "ACTIVE",
        membershipType: "MEMBER",
        paymentProvider: "MANUAL",
        paidAt: new Date(),
      },
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "general",
        title: "ברוך הבא לקהילה!",
        message: "החברות שלך אושרה. יש לך עכשיו גישה מלאה לכל הפלטפורמה.",
        link: "/dashboard",
      },
    });

    return NextResponse.redirect(new URL("/payment/success", process.env.NEXTAUTH_URL!));
  }
  // ── End temporary block ──────────────────────────────────────────────────

  // TODO: Real CardCom implementation:
  // const CARDCOM_URL = "https://secure.cardcom.solutions/...";
  // const params = new URLSearchParams({
  //   TerminalNumber: process.env.CARDCOM_TERMINAL_NUMBER!,
  //   UserName: process.env.CARDCOM_USERNAME!,
  //   SumToBill: "149",
  //   CoinID: "1",
  //   MaxNumOfPayments: "1",
  //   ProductName: "קריירה בפוקוס — חברות חודשית",
  //   SuccessRedirectUrl: process.env.CARDCOM_SUCCESS_URL!,
  //   ErrorRedirectUrl: process.env.CARDCOM_FAILURE_URL!,
  //   NotificationUrl: `${process.env.NEXTAUTH_URL}/api/payment/cardcom/webhook`,
  //   UniqueID: session.user.id,
  // });
  // return NextResponse.redirect(`${CARDCOM_URL}?${params}`);

  return NextResponse.json({ error: "CardCom not configured" }, { status: 503 });
}
