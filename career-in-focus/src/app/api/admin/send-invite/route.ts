/**
 * POST /api/admin/send-invite
 *
 * Sends Coral's job-board invite email (the /join signup link) to a
 * short list of addresses she supplies — the "שלח להם את הקישור" flow
 * for people who reached out via video comments / DMs.
 *
 * Body: { emails: string[] }  (max 20 per call)
 *
 * Each recipient gets an INDIVIDUAL email (no CC/BCC leakage) via
 * Resend, from the site domain with reply-to set to Coral's Gmail so
 * answers land in her inbox.
 *
 * Admin-only.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RESEND_FROM =
  process.env.RESEND_FROM ?? "קורל <noreply@careerinfocus.co.il>";
const REPLY_TO = "koralcareer@gmail.com";

const SUBJECT = "משרות חדשות שמתאימות לך, ישר למייל 🎯";

const HTML = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#1e293b;line-height:1.7;max-width:560px;margin:0 auto">
<p>היי,</p>
<p>כאן קורל מקריירה בפוקוס 🎯</p>
<p>פתחתי את לוח המשרות שלי לרישום חופשי, ורציתי לשלוח לך את הקישור.</p>
<p><b>מה מחכה לך שם:</b><br>
✅ אלפי משרות מכל התחומים, שאני מרכזת ומעדכנת כל יום<br>
✅ משרות "מתחת לרדאר" שלא מגיעות ללוחות הדרושים הרגילים<br>
✅ לחיצה אחת על משרה מובילה ישירות להגשת מועמדות</p>
<p><b>והחלק הכי שווה:</b> בהרשמה מסמנים את התחומים שמעניינים אותך, ומאותו רגע, בכל פעם שנכנסות משרות חדשות שמתאימות לך, הן מגיעות ישר למייל שלך. בלי לחפש, בלי לגלול, ובלי ספאם. אם אין משהו חדש שמתאים, פשוט לא יגיע כלום.</p>
<p>ההרשמה חינם לגמרי, לוקחת דקה, ואפשר להסיר את עצמך בכל רגע:</p>
<p style="margin:24px 0;text-align:center">
<a href="https://app.careerinfocus.co.il/join" style="background:#0d9488;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block">להרשמה חינם ללוח המשרות 👈</a>
</p>
<p style="font-size:13px;color:#64748b;text-align:center">או בקישור: <a href="https://app.careerinfocus.co.il/join">app.careerinfocus.co.il/join</a></p>
<p>בהצלחה,<br>
<b>קורל שלו</b><br>
קריירה בפוקוס<br>
053-5777005</p>
</div>`;

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { emails?: string[] } | null;
  const emails = (body?.emails ?? [])
    .filter((e): e is string => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
    .map((e) => e.trim().toLowerCase())
    .slice(0, 20);
  if (emails.length === 0) {
    return NextResponse.json({ error: "expected { emails: [...] }" }, { status: 400 });
  }

  const results: Array<{ email: string; ok: boolean; detail?: string }> = [];
  for (const to of emails) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to,
          reply_to: REPLY_TO,
          subject: SUBJECT,
          html: HTML,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      results.push({ email: to, ok: r.ok, detail: r.ok ? undefined : `status ${r.status}` });
    } catch (e) {
      results.push({ email: to, ok: false, detail: String(e).slice(0, 80) });
    }
  }

  return NextResponse.json({
    ok: results.every((r) => r.ok),
    sent: results.filter((r) => r.ok).length,
    results,
  });
}
