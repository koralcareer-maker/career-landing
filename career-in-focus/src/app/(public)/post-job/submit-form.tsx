"use client";

import { useActionState } from "react";
import { submitRecruiterJob, type SubmitJobState } from "@/lib/actions/recruiter-submit-job";
import { Send, CheckCircle2, AlertCircle, Loader2, Briefcase } from "lucide-react";

const FIELD_OPTIONS = [
  "הייטק", "תוכנה", "מחשוב", "אבטחת מידע וסייבר",
  "מכירות ושיווק", "ניהול פרויקטים", "Ad - Tech", "PPC", "דיגיטל", "אינטרנט",
  "כספים, חשבונאות וכלכלה", "ביטוח", "בנקאות",
  "משאבי אנוש", "חברת השמה",
  "מזכירות ואדמיניסטרציה", "תפעול ובק אופיס", "תפעול ושירות לקוחות",
  "נהגים, רכב ותחבורה", "לוגיסטיקה ומחסנים",
  "בנייה ונדל\"ן", "חוק ומשפט",
  "חינוך והדרכה", "חברה וקהילה",
  "מסעדנות, מלונאות ותיירות", "קמעונאות ורכש",
  "אלקטרוניקה וחומרה", "חשמל", "מכונות, תעשייה וייצור",
  "עיצוב", "בכירים", "ניהול מוקדים טלפונים", "אבטחה",
  "אחר",
];

const initial: SubmitJobState = {};

export function SubmitJobForm() {
  const [state, formAction, pending] = useActionState(submitRecruiterJob, initial);

  if (state?.ok) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center" dir="rtl">
        <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-navy mb-2">המשרה התקבלה</h2>
        <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
          קורל תאשר את המשרה ותפרסם אותה במאגר תוך כמה שעות. אם יש שאלה דחופה — ניתן לפנות
          ל-<a href="mailto:koralcareer@gmail.com" className="text-teal font-bold hover:underline">koralcareer@gmail.com</a>.
        </p>
        <a
          href="/post-job"
          className="inline-flex items-center gap-1.5 mt-6 text-teal hover:text-teal-dark font-bold"
        >
          להוסיף משרה נוספת ←
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" dir="rtl">
      {/* Honeypot field — hidden from real users, bots love to fill it */}
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] w-px h-px opacity-0" />

      {/* Recruiter card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-black text-navy flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal/10 text-teal text-sm font-black flex items-center justify-center">1</span>
          הפרטים שלך
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">שם מלא <span className="text-red-500">*</span></label>
            <input
              name="recruiterName"
              required
              defaultValue={state?.fields?.recruiterName ?? ""}
              placeholder="ישראלה ישראלי"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">אימייל <span className="text-red-500">*</span></label>
            <input
              name="recruiterEmail"
              type="email"
              required
              defaultValue={state?.fields?.recruiterEmail ?? ""}
              placeholder="recruiter@example.co.il"
              dir="ltr"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">טלפון <span className="text-slate-400 font-normal">(לא חובה)</span></label>
            <input
              name="recruiterPhone"
              type="tel"
              defaultValue={state?.fields?.recruiterPhone ?? ""}
              placeholder="050-1234567"
              dir="ltr"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Job card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-black text-navy flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal/10 text-teal text-sm font-black flex items-center justify-center">2</span>
          פרטי המשרה
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">חברה <span className="text-red-500">*</span></label>
            <input
              name="company"
              required
              defaultValue={state?.fields?.company ?? ""}
              placeholder="שם החברה"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">תפקיד <span className="text-red-500">*</span></label>
            <input
              name="title"
              required
              defaultValue={state?.fields?.title ?? ""}
              placeholder="לדוגמה: מנהל/ת מכירות"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">מיקום</label>
            <input
              name="location"
              defaultValue={state?.fields?.location ?? ""}
              placeholder="תל אביב, ירושלים, היברידי..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">תחום <span className="text-red-500">*</span></label>
            <select
              name="field"
              defaultValue={state?.fields?.field ?? "אחר"}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            >
              {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">תיאור המשרה <span className="text-red-500">*</span></label>
            <textarea
              name="description"
              required
              minLength={20}
              rows={5}
              defaultValue={state?.fields?.description ?? ""}
              placeholder="מה התפקיד כולל, מה הדרישות, מה החברה מציעה (לפחות 20 תווים)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-y leading-relaxed"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">
              קישור למודעה <span className="text-slate-400 font-normal">(אם יש)</span>
            </label>
            <input
              name="externalUrl"
              type="url"
              defaultValue={state?.fields?.externalUrl ?? ""}
              placeholder="https://..."
              dir="ltr"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-xs text-slate-500 leading-relaxed">
          המשרה תועלה לאחר אישור קצר. אנחנו בודקים שהמודעה אמיתית ומכבדת את המשתמשות.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-teal hover:bg-teal-dark text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-teal/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {pending ? "שולח..." : "שליחה לאישור"}
        </button>
      </div>
    </form>
  );
}
