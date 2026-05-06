"use client";

import { useState } from "react";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface DiagnoseResult {
  ok?: boolean;
  env?: Record<string, string>;
  diagnosis?: string;
  cardcomReturnValue?: number;
  cardcomDescription?: string;
  error?: string;
}

export function DiagnoseCardcomClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);

  async function trigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/diagnose-cardcom", { method: "POST" });
      const data = (await res.json()) as DiagnoseResult;
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">אבחון סליקה (CardCom)</h1>
        <p className="text-sm text-gray-500">
          הכפתור בודק האם הגדרות ה-CardCom שלך פעילות, ומריץ קריאת בדיקה ל-CardCom (₪1, לא חיוב אמיתי) כדי להבין למה משתמשים מקבלים שגיאה.
        </p>
      </div>

      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        {loading ? "בודק..." : "הרצת אבחון"}
      </button>

      {result && (
        <div className={`rounded-2xl p-5 border ${result.ok ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-start gap-3 mb-3">
            {result.ok ? (
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-amber-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-black text-sm ${result.ok ? "text-emerald-800" : "text-amber-800"}`}>
                {result.ok ? "ההגדרות תקינות" : "נמצאה בעיה"}
              </p>
              {result.diagnosis && (
                <p className={`text-sm mt-1 ${result.ok ? "text-emerald-700" : "text-amber-800"} leading-relaxed`}>
                  {result.diagnosis}
                </p>
              )}
            </div>
          </div>

          {result.env && (
            <div className="bg-white/70 rounded-xl p-3 mt-3">
              <p className="text-xs font-bold text-gray-500 mb-2">משתני סביבה (Vercel):</p>
              <ul className="space-y-1">
                {Object.entries(result.env).map(([k, v]) => (
                  <li key={k} className="text-xs font-mono text-navy flex justify-between gap-3">
                    <span>{k}</span>
                    <span className={v === "MISSING" ? "text-red-600 font-bold" : "text-emerald-600"}>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.cardcomReturnValue !== undefined && result.cardcomReturnValue !== 0) && (
            <div className="bg-white/70 rounded-xl p-3 mt-3 text-xs font-mono">
              <p className="text-gray-500 mb-1">תגובת CardCom:</p>
              <p className="text-navy">ReturnValue: {result.cardcomReturnValue}</p>
              {result.cardcomDescription && <p className="text-navy">Description: {result.cardcomDescription}</p>}
            </div>
          )}

          {result.error && (
            <p className="text-xs text-red-600 mt-3 font-mono">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
