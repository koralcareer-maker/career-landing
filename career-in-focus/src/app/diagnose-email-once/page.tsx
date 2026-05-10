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

interface DnsRecord {
  record: string; // "TXT" | "MX" | "CNAME"
  name: string;
  value: string;
  ttl?: string | number;
  priority?: number;
  status?: string;
}

async function runDiagnostics(): Promise<{
  steps: Step[];
  fromDomain: string;
  allOk: boolean;
  dnsRecords: DnsRecord[] | null;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "קורל מקריירה בפוקוס <noreply@careerinfocus.co.il>";
  const fromDomain =
    (from.match(/<[^@]+@([^>]+)>/) ?? [])[1] ??
    (from.match(/@([^\s>]+)/) ?? [])[1] ??
    "";

  const steps: Step[] = [];
  let dnsRecords: DnsRecord[] | null = null;

  if (!apiKey) {
    steps.push({
      name: "RESEND_API_KEY ב-Vercel",
      ok: false,
      detail:
        "המשתנה לא מוגדר. תוסיפי אותו ב-Vercel → Project Settings → Environment Variables.",
    });
    return { steps, fromDomain, allOk: false, dnsRecords };
  }
  steps.push({
    name: "RESEND_API_KEY ב-Vercel",
    ok: true,
    detail: `מוגדר (${apiKey.length} תווים)`,
  });

  // Domain verification check + DNS records fetch
  try {
    const r = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
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
          detail: `הדומיין קיים אבל הסטטוס: ${match.status}. למטה כל רשומות ה-DNS שצריך להוסיף.`,
        });

        // Fetch the specific domain's DNS records — that's what Coral
        // (or Dolev) needs to add at the registrar.
        try {
          const dnsResp = await fetch(`https://api.resend.com/domains/${match.id}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10_000),
          });
          if (dnsResp.ok) {
            const dns = (await dnsResp.json()) as {
              records?: Array<{
                record: string;
                name: string;
                value: string;
                ttl?: string | number;
                priority?: number;
                status?: string;
              }>;
            };
            dnsRecords = dns.records ?? null;
          }
        } catch {
          /* ignore — main domain status already surfaced above */
        }
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
    dnsRecords,
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

        {/* DNS records to add — show as a clean table when Resend
            returned them. Coral can copy each value and forward to
            Dolev (NS1) verbatim. */}
        {result.dnsRecords && result.dnsRecords.length > 0 && (
          <div className="mt-6 border-2 border-amber-300 rounded-2xl p-5 bg-amber-50">
            <h2 className="font-black text-amber-900 text-base mb-2">
              📤 שלחי את זה לדולב — רשומות DNS להוספה
            </h2>
            <p className="text-xs text-amber-800 leading-relaxed mb-4">
              העתיקי את כל הטבלה (או כל שורה בנפרד) ושלחי לדולב. הוא יוסיף את הרשומות
              ב-NS1, ותוך 5-30 דקות הסטטוס כאן יהפוך ל-✓.
            </p>
            <div className="space-y-3" dir="ltr">
              {result.dnsRecords.map((rec, i) => (
                <div
                  key={i}
                  className="bg-white border border-amber-200 rounded-xl p-3 text-xs font-mono"
                >
                  <div className="grid grid-cols-[80px_1fr] gap-2 text-left">
                    <span className="font-bold text-amber-900">Type:</span>
                    <span className="text-navy">{rec.record}</span>

                    <span className="font-bold text-amber-900">Name:</span>
                    <span className="text-navy break-all">{rec.name}</span>

                    <span className="font-bold text-amber-900">Value:</span>
                    <span className="text-navy break-all">{rec.value}</span>

                    {rec.ttl !== undefined && (
                      <>
                        <span className="font-bold text-amber-900">TTL:</span>
                        <span className="text-navy">{rec.ttl}</span>
                      </>
                    )}

                    {rec.priority !== undefined && (
                      <>
                        <span className="font-bold text-amber-900">Priority:</span>
                        <span className="text-navy">{rec.priority}</span>
                      </>
                    )}

                    {rec.status && (
                      <>
                        <span className="font-bold text-amber-900">Status:</span>
                        <span
                          className={
                            rec.status === "verified"
                              ? "text-emerald-600 font-bold"
                              : "text-orange-600"
                          }
                        >
                          {rec.status}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 mt-4 leading-relaxed">
              💡 אחרי שדולב הוסיף את הרשומות — תחזרי לדף הזה ותרענני. אם הסטטוס
              עדיין &quot;failed&quot; אחרי 30 דקות, תיכנסי לחשבון Resend ולחצי על &quot;Verify DNS&quot;.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6 text-center">
          דף זמני — יוסר אחרי שהמיילים יעבדו.
        </p>
      </div>
    </div>
  );
}
