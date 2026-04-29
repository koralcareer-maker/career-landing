/**
 * CardCom Low Profile Redirect
 *
 * Creates a CardCom v11 Low Profile payment page and redirects the user to it.
 * On success, CardCom calls our webhook and then redirects to /payment/success.
 *
 * Flow:
 *  1. GET /api/payment/cardcom/redirect?plan=member|vip|premium
 *  2. We call CardCom API to create a payment page
 *  3. Redirect user to CardCom's hosted page
 *  4. CardCom webhook → /api/payment/cardcom/webhook (activates user)
 *  5. CardCom redirects → /payment/success
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const CARDCOM_API = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";

const PLAN_CONFIG = {
  MEMBER:  { amount: 49,  label: "חברות חודשית — קריירה בפוקוס" },
  VIP:     { amount: 149, label: "חברות VIP חודשית — קריירה בפוקוס" },
  PREMIUM: { amount: 449, label: "קורל תפעילי קשרים — קריירה בפוקוס" },
} as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session.user.accessStatus === "ACTIVE") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://career-landing-tau.vercel.app";

  // Determine plan from query param, then from user's stored membershipType
  const planParam = (req.nextUrl.searchParams.get("plan") ?? "").toUpperCase();
  const planKey = (["MEMBER", "VIP", "PREMIUM"].includes(planParam)
    ? planParam
    : (session.user.membershipType ?? "MEMBER")) as keyof typeof PLAN_CONFIG;

  const plan = PLAN_CONFIG[planKey] ?? PLAN_CONFIG.MEMBER;

  // ReturnValue carries userId + plan so webhook can activate correctly
  const returnValue = `${session.user.id}|${planKey}`;

  const body = {
    TerminalNumber:     Number(process.env.CARDCOM_TERMINAL),
    ApiName:            process.env.CARDCOM_API_NAME,
    ApiPassword:        process.env.CARDCOM_API_PASSWORD,
    ReturnValue:        returnValue,
    Amount:             plan.amount,
    CoinID:             1,               // ILS
    MaxNumOfPayments:   1,
    ProductName:        plan.label,
    Language:           "He",
    SuccessRedirectUrl: `${appUrl}/payment/success`,
    FailedRedirectUrl:  `${appUrl}/payment/pending?error=payment_failed`,
    WebHookUrl:         `${appUrl}/api/payment/cardcom/webhook`,
    // Save card for future recurring charges
    CreateTokenForRecurring: true,
  };

  try {
    const res = await fetch(CARDCOM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.ReturnValue !== 0 || !data.url) {
      console.error("CardCom create error:", data);
      return NextResponse.redirect(
        new URL(`/payment/pending?error=cardcom_error&code=${data.ReturnValue}`, req.url)
      );
    }

    return NextResponse.redirect(data.url);
  } catch (err) {
    console.error("CardCom fetch error:", err);
    return NextResponse.redirect(new URL("/payment/pending?error=network", req.url));
  }
}
