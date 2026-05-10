"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowLeft } from "lucide-react";

interface Result {
  ok?: boolean;
  message?: string;
  error?: string;
  saved?: { terminal: string; apiName: string; apiPassword: string };
}

export function CardcomQuickFixClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function trigger() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/cardcom-quick-fix", { method: "POST" });
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
        <h1 className="text-2xl font-black text-navy mb-1">תיקון מהיר ל-CardCom</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          לחיצה אחת תשמור את 3 פרטי CardCom (טרמינל / API Name / API Password)
          ישירות במסד הנתונים. הפעולה אידמפוטנטית — אפשר להריץ פעמיים בלי בעיה.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
        ⚠️ <strong>חשוב:</strong> אחרי שזה ירוק, להחליף את ה-API Password ב-CardCom
        שלי לסיסמה חדשה ולעדכן דרך <code>/admin/settings/cardcom</code>.
      </div>

      <button
        type="button"
        onClick={trigger}
        disabled={loading || result?.ok}
        className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "שומר..." : result?.ok ? "נשמר ✓" : "שמירה — לחיצה אחת"}
      </button>

      {result?.ok && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-black text-emerald-800 mb-1">הפרטים נשמרו ✓</p>
              <p className="text-sm text-emerald-700 leading-relaxed mb-3">{result.message}</p>
              {result.saved && (
                <ul className="text-xs text-emerald-700 font-mono space-y-0.5 mb-3">
                  <li>· טרמינל: {result.saved.terminal}</li>
                  <li>· API Name: {result.saved.apiName}</li>
                  <li>· API Password: {result.saved.apiPassword}</li>
                </ul>
              )}
              <Link
                href="/admin/diagnose-cardcom"
                className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:underline"
              >
                להריץ אבחון עכשיו
                <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {(result?.error || (result && !result.ok)) && !result?.ok && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-black text-red-800 mb-1">שגיאה בשמירה</p>
              <p className="text-sm text-red-700 leading-relaxed">{result?.error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
