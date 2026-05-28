"use client";

import { useActionState, useState } from "react";
import { submitTalent, type SubmitTalentState } from "@/lib/actions/talent-submit";
import { Send, CheckCircle2, AlertCircle, Loader2, Upload, FileText } from "lucide-react";

const REGION_OPTIONS = ["", "צפון", "חיפה", "מרכז", "שפלה", "ירושלים", "דרום", "אילת", "מהבית / מרחוק"];

const initial: SubmitTalentState = {};

export function TalentForm() {
  const [state, formAction, pending] = useActionState(submitTalent, initial);
  const [cvText, setCvText] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvStatus, setCvStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setCvName(file.name);
    setCvStatus("uploading");
    setCvText("");
    try {
      const fd = new FormData();
      fd.append("cv", file);
      const res = await fetch("/api/talent/upload-cv", { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string };
      if (res.ok && j.ok && j.text) {
        setCvText(j.text);
        setCvStatus("done");
      } else {
        setCvStatus("error");
      }
    } catch {
      setCvStatus("error");
    }
  }

  if (state?.ok) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center" dir="rtl">
        <div className="inline-flex w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-navy mb-2">נכנסתם למאגר! 🎉</h2>
        <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
          הפרטים נקלטו בהצלחה. ברגע שאמצא משרה שמתאימה לכם, אפנה אליכם ישירות.
          בינתיים מוזמנים להצטרף לקבוצת המשרות שלי לעדכונים שוטפים.
        </p>
        <a
          href="https://chat.whatsapp.com/BbBAf0p0R01GrNgf5GQjMg"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-6 bg-teal hover:bg-teal-dark text-white font-bold px-5 py-2.5 rounded-xl"
        >
          להצטרפות לקבוצת המשרות ←
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" dir="rtl">
      {/* Honeypot */}
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] w-px h-px opacity-0" />
      {/* CV text extracted client-side from the uploaded file */}
      <input type="hidden" name="cvText" value={cvText} />

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-black text-navy flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal/10 text-teal text-sm font-black flex items-center justify-center">1</span>
          הפרטים שלכם
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">שם מלא <span className="text-red-500">*</span></label>
            <input
              name="name" required defaultValue={state?.fields?.name ?? ""}
              placeholder="ישראלה ישראלי"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">טלפון <span className="text-red-500">*</span></label>
            <input
              name="phone" type="tel" defaultValue={state?.fields?.phone ?? ""}
              placeholder="050-1234567" dir="ltr"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">אימייל</label>
            <input
              name="email" type="email" defaultValue={state?.fields?.email ?? ""}
              placeholder="you@example.com" dir="ltr"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">תפקיד מבוקש</label>
            <input
              name="targetRole" defaultValue={state?.fields?.targetRole ?? ""}
              placeholder="לדוגמה: מנהלת פרויקטים, נציג שירות, מפתח/ת"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1.5 block">אזור מועדף</label>
            <select
              name="region" defaultValue={state?.fields?.region ?? ""}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            >
              {REGION_OPTIONS.map((r) => <option key={r || "none"} value={r}>{r || "בחרו אזור"}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-black text-navy flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal/10 text-teal text-sm font-black flex items-center justify-center">2</span>
          קצת עליכם
        </h2>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1.5 block">ספרו על הניסיון והשאיפות שלכם</label>
          <textarea
            name="about" rows={4} defaultValue={state?.fields?.about ?? ""}
            placeholder="כמה שנות ניסיון, באילו תחומים, מה אתם מחפשים בתפקיד הבא..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-y leading-relaxed"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 mb-1.5 block">
            קורות חיים <span className="text-slate-400 font-normal">(PDF / Word, עד 8MB)</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 cursor-pointer hover:border-teal hover:bg-teal/5 transition-colors">
            {cvStatus === "uploading" ? <Loader2 size={16} className="text-teal animate-spin" /> : cvStatus === "done" ? <FileText size={16} className="text-emerald-600" /> : <Upload size={16} className="text-teal" />}
            <span className="text-sm text-slate-600 truncate">
              {cvStatus === "uploading" ? "מעלה קובץ..." : cvStatus === "done" ? `נטען: ${cvName}` : cvStatus === "error" ? "לא הצלחנו לקרוא, נסו קובץ אחר" : "לחצו לבחירת קובץ קורות חיים"}
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <p className="text-[11px] text-slate-400 mt-1.5">אפשר להשאיר פרטים גם בלי קובץ, אבל קורות חיים עוזרים להתאמה מדויקת יותר.</p>
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
          הפרטים נכנסים ישירות למאגר המאובטח של קורל ולא מועברים לאף גורם ללא אישורכם.
        </p>
        <button
          type="submit" disabled={pending || cvStatus === "uploading"}
          className="inline-flex items-center justify-center gap-2 bg-teal hover:bg-teal-dark text-white font-black px-6 py-3 rounded-xl shadow-lg shadow-teal/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {pending ? "שולח..." : "הצטרפות למאגר"}
        </button>
      </div>
    </form>
  );
}
