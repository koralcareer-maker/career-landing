"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from "lucide-react";

interface ReportItem {
  step: number;
  name: string;
  ok: boolean;
  detail: string;
}

interface FlowCheckResult {
  ok?: boolean;
  summary?: string;
  report?: ReportItem[];
  cardcomCheckoutUrl?: string | null;
  error?: string;
}

export function CardcomFlowCheckClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlowCheckResult | null>(null);

  async function trigger() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cardcom-flow-check", { method: "POST" });
      const data = (await res.json()) as FlowCheckResult;
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">בדיקת זרימת תשלום מקצה לקצה</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          מבצע בדיקה מלאה של זרימת התשלום — בלי לחייב כסף. בודק:
          (1) פרטי CardCom יוצרים דף תשלום, (2) Webhook מפעיל משתמש בהצלחה,
          (3) עמוד הצלחת תשלום קיים. תוצאה ירוקה = מוכנה לתשלום אמיתי.
        </p>
      </div>

      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "בודקת..." : "הרצת בדיקה מקיפה"}
      </button>

      {result && (
        <>
          {/* Summary banner */}
          <div
            className={`rounded-2xl p-5 border-2 ${
              result.ok
                ? "bg-emerald-50 border-emerald-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.ok ? (
                <CheckCircle2 size={22} className="text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={22} className="text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`font-black text-base mb-1 ${
                    result.ok ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  {result.ok ? "הכל תקין ✓" : "נמצאו בעיות"}
                </p>
                <p
                  className={`text-sm leading-relaxed ${
                    result.ok ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {result.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Per-step results */}
          {result.report && (
            <div className="space-y-3">
              {result.report.map((step) => (
                <div
                  key={step.step}
                  className={`bg-white border rounded-2xl p-4 ${
                    step.ok ? "border-emerald-200" : "border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${
                        step.ok ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    >
                      {step.ok ? "✓" : "!"}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-navy text-sm">
                        שלב {step.step}: {step.name}
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed mt-1">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional CardCom checkout preview */}
          {result.cardcomCheckoutUrl && result.ok && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-black text-amber-900 uppercase tracking-wide mb-2">
                בונוס: לראות את עמוד התשלום של CardCom
              </p>
              <p className="text-xs text-amber-800 leading-relaxed mb-3">
                הקישור הזה מוביל לעמוד התשלום האמיתי שלקוחות שלך יראו (סכום ₪19).
                <strong> אל תזיני כרטיס</strong> — רק תוודאי שהעמוד נטען בעברית עם הסכום הנכון.
                סגרי את הטאב אחרי שראית.
              </p>
              <a
                href={result.cardcomCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors"
              >
                לפתוח בטאב חדש
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {result.error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              {result.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
