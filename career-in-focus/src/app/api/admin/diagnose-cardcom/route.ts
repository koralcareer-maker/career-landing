import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCardcomCredentials } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only diagnostic for the CardCom integration. Tells Coral
 * (without exposing secret values) whether the three required env
 * vars are set, and — if all three are present — runs a real test
 * call to CardCom's LowProfile/Create endpoint with a tiny ₪1 amount
 * so we can see the exact response code/message CardCom returns.
 *
 * Never logs or returns the secret values themselves.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  // Read DB-first / env-fallback. The diagnose page surfaces which
  // source each value is coming from so the admin knows whether the
  // last save through /admin/settings/cardcom landed in the DB.
  const creds = await getCardcomCredentials();
  const sourceLabel = (k: "db" | "env" | "missing", len: number) =>
    k === "missing" ? "MISSING" :
    k === "db"      ? `set (DB · ${len} chars)` :
                      `set (Env · ${len} chars)`;

  const env = {
    CARDCOM_TERMINAL:    sourceLabel(creds.source.terminal,    creds.terminal.length),
    CARDCOM_API_NAME:    sourceLabel(creds.source.apiName,     creds.apiName.length),
    CARDCOM_API_PASSWORD: sourceLabel(creds.source.apiPassword, creds.apiPassword.length),
  };

  if (!creds.terminal || !creds.apiName || !creds.apiPassword) {
    return NextResponse.json({
      ok: false,
      env,
      diagnosis:
        "חסרים ערכי CardCom. תיכנסי ל-/admin/settings/cardcom והוסיפי אותם, או הגדירי ב-Vercel את CARDCOM_TERMINAL, CARDCOM_API_NAME, CARDCOM_API_PASSWORD.",
    });
  }

  const terminal = creds.terminal;
  const apiName = creds.apiName;
  const apiPassword = creds.apiPassword;

  // Live ping with a ₪1 placeholder. We don't redirect anywhere — just
  // examine CardCom's response to surface the actual code + description.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://career-landing-tau.vercel.app";
  const body = {
    TerminalNumber: Number(terminal),
    ApiName: apiName,
    ApiPassword: apiPassword,
    ReturnValue: "diagnose",
    Amount: 1,
    CoinID: 1,
    MaxNumOfPayments: 1,
    ProductName: "אבחון",
    Language: "He",
    SuccessRedirectUrl: `${appUrl}/payment/success`,
    FailedRedirectUrl: `${appUrl}/payment/pending`,
    WebHookUrl: `${appUrl}/api/payment/cardcom/webhook`,
    CreateTokenForRecurring: true,
  };

  let cardcomResp: unknown;
  try {
    const r = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    cardcomResp = await r.json();
  } catch (e) {
    return NextResponse.json({
      ok: false,
      env,
      diagnosis: "החיבור ל-CardCom נכשל ברמת הרשת — אולי חסום outbound או ה-URL שגוי.",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const r = cardcomResp as { ReturnValue?: number; Description?: string; url?: string };
  if (r.ReturnValue === 0 && r.url) {
    return NextResponse.json({
      ok: true,
      env,
      diagnosis: "CardCom החזיר ReturnValue=0 + URL תקין. ההגדרות תקינות. אם משתמשים מקבלים שגיאה, הבעיה בנתוני התשלום שלהם או בנכסים על הטרמינל (CreateTokenForRecurring דורש הפעלה).",
      cardcomReturnValue: 0,
    });
  }

  return NextResponse.json({
    ok: false,
    env,
    diagnosis: `CardCom סירב: ReturnValue=${r.ReturnValue}, Description="${r.Description ?? "(ריק)"}"`,
    cardcomReturnValue: r.ReturnValue,
    cardcomDescription: r.Description,
  });
}

// Bonus: GET hits a quick env-var check for ALL critical integrations
// (Gemini, Resend, etc.) so the admin page can also surface 'CV upload
// will fail because GEMINI_API_KEY is missing' without leaving values.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "אדמין בלבד" }, { status: 403 });
  }

  const checks = [
    { key: "GEMINI_API_KEY", purpose: "ניתוח קורות חיים + דרכון AI", value: process.env.GEMINI_API_KEY ?? "" },
    { key: "AUTH_SECRET",    purpose: "התחברות / JWT",                value: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "" },
    { key: "RESEND_API_KEY", purpose: "שליחת מיילים",                  value: process.env.RESEND_API_KEY ?? "" },
    { key: "DATABASE_URL",   purpose: "מסד נתונים",                    value: process.env.DATABASE_URL ?? "" },
  ];

  return NextResponse.json({
    integrations: checks.map((c) => ({
      key: c.key,
      purpose: c.purpose,
      status: c.value ? `set (${c.value.length} chars)` : "MISSING",
    })),
  });
}
