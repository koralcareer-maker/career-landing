"use client";

import { useState } from "react";
import { submitPremiumLead } from "@/lib/actions/premium-lead";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await submitPremiumLead({
      fullName: fd.get("fullName") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      targetRole: fd.get("targetRole") as string,
      description: fd.get("description") as string,
      whyNow: fd.get("whyNow") as string,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle2 className="text-teal" size={52} />
        <h3 className="text-2xl font-bold text-navy">קיבלנו את הפנייה שלך!</h3>
        <p className="text-slate-500 max-w-md">
          קורל תבדוק את הפנייה ותחזור אליך בהקדם לשיחת היכרות.
          תודה שבחרת בקריירה בפוקוס ✨
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm px-4 py-3 text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal transition-all";
  const labelClass = "block text-sm font-semibold text-navy/80 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>שם מלא *</label>
          <input name="fullName" required placeholder="ישראל ישראלי" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>טלפון *</label>
          <input name="phone" required type="tel" placeholder="050-0000000" className={inputClass} dir="ltr" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>אימייל *</label>
          <input name="email" required type="email" placeholder="your@email.com" className={inputClass} dir="ltr" />
        </div>
        <div>
          <label className={labelClass}>תפקיד יעד *</label>
          <input name="targetRole" required placeholder="למשל: VP Product, מנהל שיווק..." className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>ספר/י בקצרה מה את/ה מחפש/ת</label>
        <textarea
          name="description"
          rows={3}
          placeholder="תאר את הניסיון שלך, את התפקידים שמעניינים אותך ואת מה שאתה מחפש בעבודה הבאה..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className={labelClass}>למה דווקא עכשיו?</label>
        <textarea
          name="whyNow"
          rows={2}
          placeholder="מה גרם לך לפנות עכשיו? מה הדחיפות?"
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-teal to-[#2ab8b8] hover:from-[#2ab8b8] hover:to-teal text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-teal/25 transition-all duration-200 disabled:opacity-60"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> שולח/ת...</>
        ) : (
          <><Send size={16} /> שלח/י לקורל</>
        )}
      </button>

      <p className="text-center text-xs text-slate-400">
        הפרטים שמורים בצורה מאובטחת ולא מועברים לצד שלישי
      </p>
    </form>
  );
}
