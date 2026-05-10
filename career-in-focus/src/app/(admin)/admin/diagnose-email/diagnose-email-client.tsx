"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Mail, Send } from "lucide-react";

interface ReportItem {
  step: number;
  name: string;
  ok: boolean;
  detail: string;
}

interface Result {
  ok?: boolean;
  summary?: string;
  report?: ReportItem[];
  fromDomain?: string;
  domainsChecked?: string[];
  error?: string;
}

export function DiagnoseEmailClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [testEmail, setTestEmail] = useState("");

  async function trigger(includeTestSend: boolean) {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const url = includeTestSend && testEmail.trim()
        ? `/api/admin/diagnose-email?to=${encodeURIComponent(testEmail.trim())}`
        : "/api/admin/diagnose-email";
      const res = await fetch(url, { method: "POST" });
      const data = (await res.json()) as Result;
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
        <h1 className="text-2xl font-black text-navy mb-1 flex items-center gap-2">
          <Mail size={20} className="text-teal" />
          אבחון מערכת המיילים
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          בודק 3 דברים: (1) ש-RESEND_API_KEY מוגדר ב-Vercel, (2) שהדומיין השולח מאומת ב-Resend,
          (3) [אופציונלי] שולח מייל בדיקה לכתובת שתבחרי.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <label className="text-xs font-bold text-navy block">
          לאיזו כתובת לשלוח מייל בדיקה? (אופציונלי)
        </label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="koral@example.com"
          dir="ltr"
          className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-navy text-base md:text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
        />
        <p className="text-xs text-gray-500 leading-relaxed">
          השאירי ריק כדי לבדוק רק תצורה (בלי לשלוח מייל). מלאי כתובת אם רוצה לבדוק שהמייל באמת מגיע.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => trigger(false)}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border-2 border-teal text-teal font-bold px-4 py-2.5 rounded-xl hover:bg-teal/5 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          בדיקת תצורה בלבד
        </button>
        <button
          type="button"
          onClick={() => trigger(true)}
          disabled={loading || !testEmail.trim()}
          className="inline-flex items-center gap-2 bg-teal text-white font-bold px-4 py-2.5 rounded-xl hover:bg-teal-dark disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {testEmail.trim() ? "תצורה + שליחת מייל בדיקה" : "מלאי כתובת לשליחה"}
        </button>
      </div>

      {result && (
        <>
          <div
            className={`rounded-2xl p-4 border-2 ${
              result.ok
                ? "bg-emerald-50 border-emerald-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.ok ? (
                <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              )}
              <p
                className={`font-black text-sm leading-relaxed ${
                  result.ok ? "text-emerald-800" : "text-red-800"
                }`}
              >
                {result.summary ?? (result.ok ? "הכל תקין" : "נמצאה בעיה")}
              </p>
            </div>
          </div>

          {result.report && (
            <div className="space-y-2">
              {result.report.map((step) => (
                <div
                  key={step.step}
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
          )}

          {result.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {result.error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
