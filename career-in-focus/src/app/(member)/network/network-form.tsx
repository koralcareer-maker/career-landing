"use client";

import { useActionState } from "react";
import { submitNetworkRequest } from "@/lib/actions/network";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle } from "lucide-react";

export function NetworkRequestForm() {
  const [state, action, isPending] = useActionState(
    async (_: unknown, formData: FormData) => submitNetworkRequest(formData),
    null
  );

  if (state?.success) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] p-8 text-center">
        <div className="w-14 h-14 bg-teal-pale rounded-3xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={26} className="text-teal" />
        </div>
        <h3 className="font-black text-navy text-lg mb-2">הבקשה נשלחה!</h3>
        <p className="text-gray-500 text-sm">קורל תסקור את הפרופיל שלך ותחזור אלייך תוך 48 שעות.</p>
      </div>
    );
  }

  return (
    <form action={action} className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="font-bold text-navy text-sm">הגישי בקשה</h3>
      </div>
      <div className="p-5 space-y-4">
        {state?.error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">{state.error}</div>
        )}

        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">תפקיד מבוקש *</label>
          <input name="targetRole" required placeholder="למשל: מנהלת מוצר, מעצבת UX..."
            className="w-full bg-cream rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">חברות מעניינות <span className="text-gray-400 font-normal">(אופציונלי)</span></label>
          <input name="targetCompanies" placeholder="למשל: Google, Monday, Check Point..."
            className="w-full bg-cream rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy mb-1.5">הערות נוספות <span className="text-gray-400 font-normal">(אופציונלי)</span></label>
          <textarea name="notes" rows={3} placeholder="מה חשוב לדעת? העדפות מיקום, ניסיון ספציפי..."
            className="w-full bg-cream rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors resize-none" />
        </div>

        <Button type="submit" loading={isPending} className="w-full">
          <Send size={15} />
          שלחי בקשה לקורל
        </Button>
      </div>
    </form>
  );
}
