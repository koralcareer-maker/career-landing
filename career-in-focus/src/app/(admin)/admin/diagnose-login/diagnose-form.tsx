"use client";

import { useState } from "react";
import { Search, CheckCircle, AlertCircle, XCircle, Loader2, Mail } from "lucide-react";
import {
  diagnoseLogin,
  resendWelcomeEmail,
  type DiagnoseResult,
  type ResendWelcomeResult,
} from "@/lib/actions/admin-imports";

const VERDICTS: Record<DiagnoseResult["verdict"], { color: string; emoji: string; title: string }> = {
  OK_CAN_LOGIN:    { color: "green",  emoji: "✅", title: "הכל תקין"           },
  USER_MISSING:    { color: "red",    emoji: "❌", title: "משתמש לא קיים"      },
  NO_PASSWORD:     { color: "orange", emoji: "⚠️", title: "אין סיסמה במאגר"    },
  WRONG_PASSWORD:  { color: "red",    emoji: "🔑", title: "סיסמה לא תואמת"     },
  NOT_ACTIVE:      { color: "orange", emoji: "🚫", title: "משתמש לא פעיל"      },
  OTHER:           { color: "slate",  emoji: "❓", title: "מצב לא ברור"        },
};

export function DiagnoseForm() {
  const [email, setEmail]       = useState("mr.aviram@gmail.com");
  const [password, setPassword] = useState("YoniKoral2026!");
  const [pending, setPending]   = useState(false);
  const [result, setResult]     = useState<DiagnoseResult | null>(null);
  const [error, setError]       = useState<string | null>(null);

  // ─── Resend-welcome state — separate from diagnose state so the user can
  // see both outputs at once.
  const [resendPending, setResendPending] = useState(false);
  const [resendResult,  setResendResult]  = useState<ResendWelcomeResult | null>(null);

  async function run() {
    if (!email.trim()) return;
    setPending(true);
    setError(null);
    setResult(null);
    setResendResult(null);
    try {
      const r = await diagnoseLogin(email, password || undefined);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!email.trim()) return;
    setResendPending(true);
    setResendResult(null);
    try {
      const r = await resendWelcomeEmail(email);
      setResendResult(r);
    } catch (e) {
      setResendResult({ ok: false, message: e instanceof Error ? e.message : "שגיאה" });
    } finally {
      setResendPending(false);
    }
  }

  const v = result ? VERDICTS[result.verdict] : null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">אימייל לבדיקה</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1 block">סיסמה (אופציונלי — כדי לבדוק תאימות)</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={run}
            disabled={pending || !email.trim()}
            className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {pending ? "בודקת..." : "אבחני"}
          </button>

          {/* Resend welcome email — uses the gender stored on the user row,
              so men get the male version and women the female version. */}
          <button
            type="button"
            onClick={resend}
            disabled={resendPending || !email.trim()}
            className="inline-flex items-center gap-2 bg-white text-navy font-bold px-5 py-2.5 rounded-xl border border-slate-200 hover:border-teal/60 hover:text-teal transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            {resendPending ? "שולחת..." : "שלחי שוב מייל ברוכה הבאה"}
          </button>
        </div>
      </div>

      {resendResult && (
        <div className={`rounded-xl p-4 border flex items-start gap-3 ${
          resendResult.ok
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {resendResult.ok ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <p className="font-bold text-sm">{resendResult.message}</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-red-800 flex items-start gap-3">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {result && v && (
        <div className={`rounded-2xl p-5 border-2 ${
          v.color === "green"  ? "bg-green-50 border-green-200" :
          v.color === "orange" ? "bg-orange-50 border-orange-200" :
          v.color === "red"    ? "bg-red-50 border-red-200" :
                                  "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">{v.emoji}</span>
            <div>
              <p className="text-lg font-black text-navy">{v.title}</p>
              <p className="text-sm text-navy/70 mt-1">{result.hint}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 mt-4 text-xs space-y-1.5 font-mono">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-slate-500">אימייל שנבדק:</span>
              <span className="text-navy">{result.emailLookedUp}</span>

              <span className="text-slate-500">משתמשת קיימת:</span>
              <span className={result.userExists ? "text-green-700" : "text-red-700"}>
                {result.userExists ? "כן ✓" : "לא ✗"}
              </span>

              <span className="text-slate-500">יש סיסמה במאגר:</span>
              <span className={result.hasPasswordHash ? "text-green-700" : "text-red-700"}>
                {result.hasPasswordHash ? "כן ✓" : "לא ✗"}
              </span>

              {result.accessStatus && (
                <>
                  <span className="text-slate-500">סטטוס:</span>
                  <span className={result.accessStatus === "ACTIVE" ? "text-green-700" : "text-orange-700"}>
                    {result.accessStatus}
                  </span>
                </>
              )}

              {result.membershipType && (
                <>
                  <span className="text-slate-500">סוג חברות:</span>
                  <span className="text-navy">{result.membershipType}</span>
                </>
              )}

              {result.role && (
                <>
                  <span className="text-slate-500">תפקיד:</span>
                  <span className="text-navy">{result.role}</span>
                </>
              )}

              {result.passwordMatches !== null && (
                <>
                  <span className="text-slate-500">סיסמה תואמת:</span>
                  <span className={result.passwordMatches ? "text-green-700" : "text-red-700"}>
                    {result.passwordMatches ? "כן ✓" : "לא ✗"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
