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
import { amountForCycle, planLabel, type PlanKey } from "@/lib/billing";

const CARDCOM_API = "https://secure.cardcom.solutions/api/v11/LowProfile/Create";

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
  const planKey: PlanKey = (["MEMBER", "VIP", "PREMIUM"].includes(planParam)
    ? planParam
    : (session.user.membershipType ?? "MEMBER")) as PlanKey;

  // First charge — use the launch promo amount where applicable. CardCom
  // expects the amount in shekels (₪), but our billing module uses agorot
  // (₪ × 100) for precision, so divide here.
  const amountAgorot = amountForCycle(planKey, 0);
  const amountShekels = amountAgorot / 100;
  const productLabel = planLabel(planKey);

  // ReturnValue carries userId + plan so webhook can activate correctly
  const returnValue = `${session.user.id}|${planKey}`;

  const body = {
    TerminalNumber:     Number(process.env.CARDCOM_TERMINAL),
    ApiName:            process.env.CARDCOM_API_NAME,
    ApiPassword:        process.env.CARDCOM_API_PASSWORD,
    ReturnValue:        returnValue,
    Amount:             amountShekels,
    CoinID:             1,               // ILS
    MaxNumOfPayments:   1,
    ProductName:        productLabel,
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

    // Capture the raw text first so we can surface it on the error
    // page when CardCom responds with HTML or a non-JSON body. The
    // previous version called res.json() unconditionally and lost
    // anything that wasn't well-formed JSON.
    const rawText = await res.text();
    let data: { ReturnValue?: number; Description?: string; url?: string; ResponseCode?: number } | null = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    const ok = data?.ReturnValue === 0 && typeof data?.url === "string" && data.url.length > 0;
    if (!ok) {
      console.error("CardCom create error:", { status: res.status, raw: rawText.slice(0, 500), data });

      // Surface useful diagnostics on the error page. ReturnValue uses
      // CardCom's documented codes; Description is the Hebrew/English
      // string they ship with the rejection. We truncate the raw body
      // to keep URLs sane.
      const params = new URLSearchParams({ error: "cardcom_error" });
      if (typeof data?.ReturnValue === "number") params.set("code", String(data.ReturnValue));
      else params.set("code", `http_${res.status}`);
      if (data?.Description) params.set("desc", data.Description.slice(0, 200));
      else if (!data && rawText) params.set("desc", `non-json: ${rawText.slice(0, 120)}`);
      return NextResponse.redirect(new URL(`/payment/pending?${params.toString()}`, req.url));
    }

    return NextResponse.redirect(data!.url!);
  } catch (err) {
    console.error("CardCom fetch error:", err);
    const msg = err instanceof Error ? err.message : "unknown";
    const params = new URLSearchParams({
      error: "network",
      desc: msg.slice(0, 200),
    });
    return NextResponse.redirect(new URL(`/payment/pending?${params.toString()}`, req.url));
  }
}
