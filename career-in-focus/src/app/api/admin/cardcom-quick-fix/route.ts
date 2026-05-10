import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CARDCOM_KEYS, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot admin endpoint that overwrites the three CardCom credentials
 * in the Setting table with values pasted into source by Coral. The
 * regular /admin/settings/cardcom form was not working for her in the
 * browser, so we bypass the form by writing directly here.
 *
 * THIS FILE IS A TEMPORARY UNLOCK. Once /admin/diagnose-cardcom returns
 * green, follow up with a commit that REMOVES this route entirely so
 * the credentials don't sit in git history forever, AND have Coral
 * rotate the API password from her CardCom dashboard.
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

  // Values from CardCom's onboarding email (12 May 2026).
  // Company 312465461 · Terminal 180856 · User Koralshalev.
  const TERMINAL    = "180856";
  const API_NAME    = "j9GCPj6jGVWumRQOERJO";
  const API_PASS    = "WyBfnFobGxW29jTwmYbn";

  try {
    await Promise.all([
      setSetting(CARDCOM_KEYS.terminal,    TERMINAL),
      setSetting(CARDCOM_KEYS.apiName,     API_NAME),
      setSetting(CARDCOM_KEYS.apiPassword, API_PASS),
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && /no such table|does not exist/i.test(e.message)
            ? "טבלת Setting לא קיימת. תריצי קודם את /admin/migrate-job-alerts."
            : `שגיאה בשמירה: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "הפרטים נשמרו ב-DB. תריצי /admin/diagnose-cardcom לאישור.",
    saved: {
      terminal:    `${TERMINAL.length} chars`,
      apiName:     `${API_NAME.length} chars`,
      apiPassword: `${API_PASS.length} chars`,
    },
  });
}
