import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only email integration check.
 *
 * Reports:
 *   1. Whether RESEND_API_KEY is set in the env at all.
 *   2. Whether the `from` domain we use (parsed from EMAIL_FROM or our
 *      default `noreply@careerinfocus.co.il`) is reachable through
 *      Resend's domain list — i.e. whether Coral has verified DKIM/SPF.
 *   3. A live test send to whatever email address the admin passes via
 *      ?to=… so she can watch the inbox in real time.
 *
 * Usage:
 *   POST /api/admin/diagnose-email           → check config only
 *   POST /api/admin/diagnose-email?to=koral@example.com
 *                                            → also send a test email
 *
 * This endpoint NEVER returns the API key or any secret.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "קורל מקריירה בפוקוס <noreply@careerinfocus.co.il>";

  // Pull the domain out of the FROM address so we can look it up in
  // Resend's verified-domains list. Email format: "Name <user@host>".
  const fromDomain = (from.match(/<[^@]+@([^>]+)>/) ?? [])[1] ??
    (from.match(/@([^\s>]+)/) ?? [])[1] ??
    "";

  type Step = { step: number; name: string; ok: boolean; detail: string };
  const report: Step[] = [];

  // ─── Step 1: API key present ─────────────────────────────────────
  if (!apiKey) {
    report.push({
      step: 1,
      name: "RESEND_API_KEY ב-Vercel",
      ok: false,
      detail:
        "המשתנה לא הוגדר. תיכנסי ל-Vercel → Project Settings → Environment Variables ותוסיפי RESEND_API_KEY עם הערך מ-Resend dashboard.",
    });
    return NextResponse.json({ ok: false, report, fromDomain });
  }
  report.push({
    step: 1,
    name: "RESEND_API_KEY ב-Vercel",
    ok: true,
    detail: `מוגדר (${apiKey.length} תווים)`,
  });

  // ─── Step 2: Domain verified at Resend ───────────────────────────
  let domainVerified = false;
  let domainsChecked: string[] = [];
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (r.ok) {
      const json = (await r.json()) as { data?: Array<{ name: string; status: string }> };
      const list = json.data ?? [];
      domainsChecked = list.map((d) => `${d.name} (${d.status})`);
      const match = list.find((d) => d.name.toLowerCase() === fromDomain.toLowerCase());
      domainVerified = match?.status === "verified";
      report.push({
        step: 2,
        name: `דומיין שולח: ${fromDomain}`,
        ok: domainVerified,
        detail: domainVerified
          ? `מאומת ב-Resend ✓`
          : match
            ? `קיים אבל סטטוס=${match.status} (לא 'verified'). תיכנסי ל-resend.com/domains, תוסיפי את רשומות ה-DNS שהם נותנים לך, ותלחצי 'Verify'.`
            : `לא נמצא ב-Resend. דומיינים קיימים בחשבון: ${domainsChecked.join(", ") || "(אין)"}. צריך להוסיף את ${fromDomain} ב-resend.com/domains.`,
      });
    } else {
      report.push({
        step: 2,
        name: `דומיין שולח: ${fromDomain}`,
        ok: false,
        detail: `Resend החזיר HTTP ${r.status}. ייתכן שה-API key לא תקין.`,
      });
    }
  } catch (e) {
    report.push({
      step: 2,
      name: `דומיין שולח: ${fromDomain}`,
      ok: false,
      detail: `שגיאת רשת מול Resend: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // ─── Step 3: Live test send ──────────────────────────────────────
  const to = req.nextUrl.searchParams.get("to")?.trim();
  if (to) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: "🧪 בדיקת מייל מקריירה בפוקוס",
          html: `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:sans-serif;direction:rtl;padding:20px;">
            <h2 style="color:#3ECFCF;">המייל הגיע ✓</h2>
            <p>זה מייל בדיקה אוטומטי. אם את רואה אותו — שירות המיילים עובד תקין.</p>
            <p style="color:#888;font-size:12px;">נשלח מ: ${from}</p>
          </body></html>`,
        }),
      });

      if (r.ok) {
        const json = (await r.json()) as { id?: string };
        report.push({
          step: 3,
          name: `שליחת מייל בדיקה ל-${to}`,
          ok: true,
          detail: `Resend קיבל את המייל בהצלחה. ID: ${json.id?.slice(0, 12) ?? "?"}. בדקי את התיבה (כולל ספאם) — צריך להגיע תוך דקה.`,
        });
      } else {
        const errText = await r.text();
        report.push({
          step: 3,
          name: `שליחת מייל בדיקה ל-${to}`,
          ok: false,
          detail: `Resend דחה: HTTP ${r.status} — ${errText.slice(0, 250)}`,
        });
      }
    } catch (e) {
      report.push({
        step: 3,
        name: `שליחת מייל בדיקה ל-${to}`,
        ok: false,
        detail: `שגיאת רשת: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return NextResponse.json({
    ok: report.every((s) => s.ok),
    report,
    fromDomain,
    domainsChecked,
    summary: report.every((s) => s.ok)
      ? "כל הבדיקות עברו — אם המייל לא הגיע, תבדקי בספאם."
      : "נמצאה בעיה — תקראי את הפירוט.",
  });
}
