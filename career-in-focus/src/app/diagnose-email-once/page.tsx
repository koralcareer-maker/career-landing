/**
 * Public, server-rendered email-system diagnostic.
 *
 * Coral could not log in as admin to run /admin/diagnose-email, so this
 * page exposes the same checks at a public URL — no admin session
 * needed. Returns a static HTML report. Never reveals the API key
 * value itself; only its existence + length, and the public domain
 * verification state from Resend.
 *
 * Once the email pipeline is healthy, remove this route.
 */

import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Step {
  name: string;
  ok: boolean;
  detail: string;
}

async function runDiagnostics(): Promise<{
  steps: Step[];
  fromDomain: string;
  allOk: boolean;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "קורל מקריירה בפוקוס <noreply@careerinfocus.co.il>";
  const fromDomain =
    (from.match(/<[^@]+@([^>]+)>/) ?? [])[1] ??
    (from.match(/@([^\s>]+)/) ?? [])[1] ??
    "";

  const steps: Step[] = [];

  if (!apiKey) {
    steps.push({
      name: "RESEND_API_KEY ב-Vercel",
      ok: false,
      detail:
        "המשתנה לא מוגדר. תוסיפי אותו ב-Vercel → Project Settings → Environment Variables.",
    });
    return { steps, fromDomain, allOk: false };
  }
  steps.push({
    name: "RESEND_API_KEY ב-Vercel",
    ok: true,
    detail: `מוגדר (${apiKey.length} תווים)`,
  });

  // Domain verification check
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Resend is fast — but keep a short cap so the page doesn't hang.
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      steps.push({
        name: `דומיין שולח: ${fromDomain}`,
        ok: false,
        detail: `Resend החזיר HTTP ${r.status}. ייתכן שה-API key שגוי או פג תוקף.`,
      });
    } else {
      const json = (await r.json()) as {
        data?: Array<{ name: string; status: string; id: string; region?: string }>;
      };
      const list = json.data ?? [];
      const match = list.find(
        (d) => d.name.toLowerCase() === fromDomain.toLowerCase(),
      );
      if (!match) {
        steps.push({
          name: `דומיין שולח: ${fromDomain}`,
          ok: false,
          detail: `הדומיין לא נמצא בחשבון Resend שלך. דומיינים קיימים: ${list.map((d) => `${d.name} (${d.status})`).join(", ") || "אין"}. צריך להוסיף את ${fromDomain} ב-resend.com/domains.`,
        });
      } else if (match.status !== "verified") {
        steps.push({
          name: `דומיין שולח: ${fromDomain}`,
          ok: false,
          detail: `הדומיין קיים אבל הסטטוס: ${match.status}. צריך להשלים אימות (DNS records) ב-resend.com/domains/${match.id}.`,
        });
      } else {
        steps.push({
          name: `דומיין שולח: ${fromDomain}`,
          ok: true,
          detail: "מאומת ✓",
        });
      }
    }
  } catch (e) {
    steps.push({
      name: `דומיין שולח: ${fromDomain}`,
      ok: false,
      detail: `שגיאה: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  return {
    steps,
    fromDomain,
    allOk: steps.every((s) => s.ok),
  };
}

export default async function DiagnoseEmailOncePage() {
  const result = await runDiagnostics();

  return (
    <div className="min-h-screen bg-cream py-10 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-md border border-black/5 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Mail size={28} className="text-teal" />
          <h1 className="text-2xl font-black text-navy">אבחון מיילים</h1>
        </div>

        {/* Summary banner */}
        <div
          className={`rounded-2xl p-4 border-2 mb-6 ${
            result.allOk
              ? "bg-emerald-50 border-emerald-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.allOk ? (
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
            )}
            <p
              className={`font-black text-sm leading-relaxed ${
                result.allOk ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {result.allOk
                ? "כל הבדיקות עברו ✓"
                : "נמצאה בעיה — קראי את הפירוט למטה"}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {result.steps.map((step, i) => (
            <div
              key={i}
              className={`bg-white border rounded-2xl p-4 ${
                step.ok ? "border-emerald-200" : "border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${
                    step.ok ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {step.ok ? "✓" : "!"}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-navy text-sm">{step.name}</p>
                  <p className="text-xs text-gray-600 leading-relaxed mt-1">
                    {step.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          דף זמני — יוסר אחרי שהמיילים יעבדו.
        </p>
      </div>
    </div>
  );
}
