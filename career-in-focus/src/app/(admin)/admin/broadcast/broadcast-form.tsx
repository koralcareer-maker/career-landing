"use client";

import { useActionState, useState } from "react";
import { sendBroadcast } from "@/lib/actions/broadcast";
import { Send, Users, Eye, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "ALL",     label: "כל המשתמשים הפעילים",   color: "bg-navy/10 text-navy" },
  { value: "PAYING",  label: "כל המשלמים (לא NONE)",   color: "bg-teal/10 text-teal" },
  { value: "MEMBER",  label: "חבר/ה — 49₪ בלבד",       color: "bg-teal/10 text-teal-dark" },
  { value: "VIP",     label: "פרו — 149₪ בלבד",         color: "bg-navy/10 text-navy" },
  { value: "PREMIUM", label: "VIP — 499₪ בלבד",         color: "bg-purple-100 text-purple-700" },
];

export function BroadcastForm({ userCounts }: {
  userCounts: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(sendBroadcast, null);
  const [audience, setAudience] = useState("ALL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const selectedAudience = AUDIENCE_OPTIONS.find(o => o.value === audience)!;
  const recipientCount = userCounts[audience] ?? 0;

  // Preview HTML (simplified)
  const previewHtml = body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">

        {/* Audience */}
        <div>
          <label className="text-sm font-bold text-navy mb-2 block">קהל יעד</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AUDIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                  audience === opt.value
                    ? "border-teal bg-teal/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={opt.value}
                  checked={audience === opt.value}
                  onChange={() => setAudience(opt.value)}
                  className="hidden"
                />
                <span className={`w-2 h-2 rounded-full ${audience === opt.value ? "bg-teal" : "bg-gray-300"}`} />
                <span className="flex-1 leading-tight">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* Recipient count badge */}
          <div className="mt-3 flex items-center gap-2">
            <Users size={14} className="text-teal" />
            <span className="text-sm text-gray-500">
              יישלח ל-<strong className="text-navy">{recipientCount}</strong> נמענים
            </span>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-sm font-bold text-navy mb-1.5 block">נושא המייל *</label>
          <input
            name="subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="לדוגמה: עדכון חשוב לחברי הקהילה 🎯"
            required
            dir="rtl"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-bold text-navy">תוכן ההודעה *</label>
            <span className="text-xs text-gray-400">**טקסט** = מודגש · שורה חדשה = פסקה</span>
          </div>
          <textarea
            name="body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            required
            dir="rtl"
            placeholder={`שלום,\n\nרציתי לעדכן אתכם ש...\n\nבברכה,\nקורל`}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none resize-y"
          />
        </div>

        {/* Preview toggle */}
        {body && subject && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm text-teal font-medium hover:underline"
          >
            <Eye size={14} />
            {showPreview ? "הסתר תצוגה מקדימה" : "הצג תצוגה מקדימה"}
          </button>
        )}

        {/* Preview */}
        {showPreview && subject && body && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-200">
              תצוגה מקדימה — כך ייראה המייל
            </div>
            <div className="p-4 bg-[#F5F1EB]">
              <div className="max-w-lg mx-auto bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="bg-[#1C1C2E] px-6 py-4 text-center">
                  <p className="text-white font-black text-base">קריירה בפוקוס</p>
                  <p className="text-teal text-xs">הקהילה לחיפוש עבודה חכם</p>
                </div>
                <div className="px-6 py-5" dir="rtl">
                  <h2 className="font-black text-navy text-lg mb-3">{subject}</h2>
                  <div
                    className="text-gray-700 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                  <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400">
                    בברכה, <strong>קורל שלו</strong> · קריירה בפוקוס
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error / Success */}
        {state?.error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <CheckCircle size={16} className="shrink-0" />
            נשלח בהצלחה ל-<strong>{state.sentCount}</strong> נמענים
            {(state.skippedCount ?? 0) > 0 && ` · ${state.skippedCount} נכשלו`}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !subject.trim() || !body.trim() || recipientCount === 0}
            className="inline-flex items-center gap-2 bg-teal text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {pending ? "שולח..." : `שלח ל-${recipientCount} נמענים`}
          </button>
          {recipientCount === 0 && (
            <p className="text-xs text-gray-400">אין נמענים בקבוצה הנבחרת</p>
          )}
        </div>
      </form>
    </div>
  );
}
