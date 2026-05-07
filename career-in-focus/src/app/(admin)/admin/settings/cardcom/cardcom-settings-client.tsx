"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CreditCard, KeyRound, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";

interface FormState {
  error?: string;
  success?: boolean;
  savedFields?: number;
}

interface DiagnoseResult {
  ok?: boolean;
  diagnosis?: string;
  cardcomReturnValue?: number;
  cardcomDescription?: string;
}

interface Props {
  action: (prevState: unknown, formData: FormData) => Promise<FormState>;
  sources: {
    terminal:    "db" | "env" | "missing";
    apiName:     "db" | "env" | "missing";
    apiPassword: "db" | "env" | "missing";
  };
  currentLengths: {
    terminal: number;
    apiName: number;
    apiPassword: number;
  };
}

const SOURCE_BADGE: Record<"db" | "env" | "missing", { label: string; cls: string }> = {
  db:      { label: "נשמר באדמין",     cls: "bg-emerald-100 text-emerald-700" },
  env:     { label: "מוגדר מ-Vercel", cls: "bg-amber-100 text-amber-700" },
  missing: { label: "חסר",             cls: "bg-red-100 text-red-700" },
};

export function CardcomSettingsClient({ action, sources, currentLengths }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [showPassword, setShowPassword] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DiagnoseResult | null>(null);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/admin/diagnose-cardcom", { method: "POST" });
      const data = (await r.json()) as DiagnoseResult;
      setTestResult(data);
    } catch (e) {
      setTestResult({ ok: false, diagnosis: e instanceof Error ? e.message : "שגיאת רשת" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1 flex items-center gap-2">
          <CreditCard size={20} className="text-teal" />
          הגדרות סליקה (CardCom)
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          ניהול פרטי הגישה ל-CardCom ישירות מהאתר — בלי לגעת ב-Vercel.
          הערכים מאוחסנים מוצפנים במסד הנתונים ונקראים בכל קריאה לסליקה.
        </p>
      </div>

      {/* Current state */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">מצב נוכחי</p>
        <ul className="space-y-2">
          {[
            { key: "terminal",    label: "מספר טרמינל",  src: sources.terminal,    len: currentLengths.terminal },
            { key: "apiName",     label: "שם משתמש API", src: sources.apiName,     len: currentLengths.apiName },
            { key: "apiPassword", label: "סיסמת API",     src: sources.apiPassword, len: currentLengths.apiPassword },
          ].map((f) => {
            const badge = SOURCE_BADGE[f.src];
            return (
              <li key={f.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-navy">{f.label}</span>
                <div className="flex items-center gap-2">
                  {f.len > 0 && (
                    <span className="text-xs text-gray-400 font-mono">{f.len} תווים</span>
                  )}
                  <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">עדכון ערכים</p>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          השאירי שדה ריק כדי להשאיר את הערך הקיים בלי שינוי. רק הערכים שמילאת — יישמרו.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-navy mb-1 block">מספר טרמינל</label>
            <input
              name="terminal"
              type="text"
              placeholder={currentLengths.terminal > 0 ? "(נשמר — להחלפה רישמי כאן)" : "למשל: 15534"}
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-navy mb-1 block">שם משתמש API</label>
            <input
              name="apiName"
              type="text"
              placeholder={currentLengths.apiName > 0 ? "(נשמר — להחלפה רישמי כאן)" : "MerchantApi-XXXX"}
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-navy mb-1 block flex items-center gap-1">
              <KeyRound size={11} />
              סיסמת API
            </label>
            <div className="relative">
              <input
                name="apiPassword"
                type={showPassword ? "text" : "password"}
                placeholder={currentLengths.apiPassword > 0 ? "(נשמרה — להחלפה רישמי כאן)" : "סיסמה מהדשבורד של CardCom"}
                dir="ltr"
                className="w-full px-3 py-2.5 pe-9 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {state?.error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <p>{state.error}</p>
            </div>
          )}
          {state?.success && (
            <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <p>נשמרו {state.savedFields} שדות. רענני את הדף כדי לראות את העדכון.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-teal text-white font-black px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50"
          >
            <Save size={15} />
            {pending ? "שומרת..." : "שמירת השינויים"}
          </button>
        </form>
      </div>

      {/* Test connection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wide">בדיקת חיבור</p>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 bg-navy text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-navy-light disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {testing ? "בודק..." : "הרצת אבחון"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          שולח קריאה אמיתית ל-CardCom עם ₪1 (בדיקה בלבד — לא חיוב). אם תקין יחזיר ✅.
        </p>

        {testResult && (
          <div className={`rounded-xl p-3 ${testResult.ok ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className="flex items-start gap-2">
              {testResult.ok ? (
                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-600 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <p className={`font-black ${testResult.ok ? "text-emerald-800" : "text-amber-800"}`}>
                  {testResult.ok ? "ההגדרות תקינות" : "נמצאה בעיה"}
                </p>
                {testResult.diagnosis && (
                  <p className={`text-xs mt-1 leading-relaxed ${testResult.ok ? "text-emerald-700" : "text-amber-800"}`}>
                    {testResult.diagnosis}
                  </p>
                )}
                {(testResult.cardcomReturnValue !== undefined && testResult.cardcomReturnValue !== 0) && (
                  <p className="text-[11px] font-mono text-amber-700 mt-2">
                    CardCom: ReturnValue={testResult.cardcomReturnValue}
                    {testResult.cardcomDescription && ` · ${testResult.cardcomDescription}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        עוד בעיות?{" "}
        <Link href="/admin/diagnose-cardcom" className="text-teal hover:underline">
          לדף האבחון המלא
        </Link>
      </p>
    </div>
  );
}
