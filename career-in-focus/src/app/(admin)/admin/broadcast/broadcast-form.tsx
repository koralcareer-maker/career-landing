"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { sendBroadcast, sendBroadcastTest } from "@/lib/actions/broadcast";
import { OLD_LEADS_BROADCAST_TEMPLATE } from "@/lib/email/broadcast-render";
import { Send, Users, Eye, AlertCircle, CheckCircle, Loader2, Sparkles, Mail } from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "ALL",        label: "כל המשתמשים הפעילים",            color: "bg-navy/10 text-navy" },
  { value: "PAYING",     label: "כל המשלמים (לא NONE)",            color: "bg-teal/10 text-teal" },
  { value: "MEMBER",     label: "חבר/ה — 49₪ בלבד",                color: "bg-teal/10 text-teal-dark" },
  { value: "VIP",        label: "פרו — 149₪ בלבד",                 color: "bg-navy/10 text-navy" },
  { value: "PREMIUM",    label: "VIP — 499₪ בלבד",                 color: "bg-purple-100 text-purple-700" },
  // Re-engagement audience for the historical leads imported from the
  // old marketing site. Coral's job-search check-in email goes here.
  { value: "OLD_LEADS",  label: "לידים מהאתר הישן (לא משלמים)",    color: "bg-amber-100 text-amber-700" },
];

// Local alias so the existing form code reads naturally. The template
// itself lives in @/lib/email/broadcast-render — same source the
// scheduled-broadcast cron uses, so the form preview and the cron-fired
// send produce identical emails.
const OLD_LEADS_TEMPLATE = OLD_LEADS_BROADCAST_TEMPLATE;

export function BroadcastForm({ userCounts }: {
  userCounts: Record<string, number>;
}) {
  const [state, formAction, pending] = useActionState(sendBroadcast, null);
  const [audience, setAudience] = useState("ALL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  // Track whether the OLD_LEADS template has been auto-loaded so we
  // don't re-load (and blow away Coral's edits) if she switches audience
  // away and then back.
  const [templateLoaded, setTemplateLoaded] = useState(false);
  // Test-send state — runs separately from the main form action so it
  // doesn't trip the BroadcastForm's pending/success/error UI.
  const [testPending, startTest] = useTransition();
  const [testResult, setTestResult] = useState<{ ok?: boolean; error?: string; sentTo?: string } | null>(null);

  // Auto-load the pre-approved re-engagement template the first time
  // Coral picks OLD_LEADS — but only if both fields are still empty,
  // so we never overwrite work she's already started typing.
  useEffect(() => {
    if (
      audience === "OLD_LEADS" &&
      !templateLoaded &&
      subject.trim() === "" &&
      body.trim() === ""
    ) {
      setSubject(OLD_LEADS_TEMPLATE.subject);
      setBody(OLD_LEADS_TEMPLATE.body);
      setTemplateLoaded(true);
    }
  }, [audience, templateLoaded, subject, body]);

  const selectedAudience = AUDIENCE_OPTIONS.find(o => o.value === audience)!;
  const recipientCount = userCounts[audience] ?? 0;

  // Fires the sendBroadcastTest server action with the current form
  // state. Used by the "שלח דוגמה אליי" button so Coral can verify the
  // designed email in her own inbox before triggering the full send.
  function runTestSend() {
    setTestResult(null);
    const fd = new FormData();
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set("audience", audience);
    startTest(async () => {
      const r = await sendBroadcastTest(null, fd);
      setTestResult({ ok: r.success, error: r.error, sentTo: r.sentTo });
    });
  }

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

          {/* OLD_LEADS template hint + reload button. Visible only when
              that audience is selected — so it's invisible noise for
              the regular member-broadcast flow. */}
          {audience === "OLD_LEADS" && (
            <div className="mt-3 flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="text-amber-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    תבנית "איך מתקדם חיפוש העבודה?" נטענה אוטומטית
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    אפשר לערוך לפני שליחה · {"{שם}"} יוחלף בשם הפרטי של כל נמען/ת
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubject(OLD_LEADS_TEMPLATE.subject);
                  setBody(OLD_LEADS_TEMPLATE.body);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0"
              >
                טען מחדש
              </button>
            </div>
          )}
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
            <span className="text-xs text-gray-400">**טקסט** = מודגש · {"{שם}"} = השם הפרטי של הנמען/ת</span>
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

        {/* Test send result — separate from the main form action's
            state banner so it doesn't disappear when the form re-renders. */}
        {testResult?.ok && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <div>דוגמה נשלחה — בדקי בתיבה את העיצוב המלא לפני שאת שולחת לכולם.</div>
              {testResult.sentTo && (
                <div className="text-xs text-blue-600 mt-1 font-mono" dir="ltr">→ {testResult.sentTo}</div>
              )}
            </div>
          </div>
        )}
        {testResult?.error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            {testResult.error}
          </div>
        )}

        {/* Submit + test send */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={pending || !subject.trim() || !body.trim() || recipientCount === 0}
            className="inline-flex items-center gap-2 bg-teal text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {pending ? "שולח..." : `שלח ל-${recipientCount} נמענים`}
          </button>

          <button
            type="button"
            onClick={runTestSend}
            disabled={testPending || !subject.trim() || !body.trim()}
            className="inline-flex items-center gap-2 bg-white border-2 border-navy text-navy font-bold px-5 py-2.5 rounded-xl hover:bg-navy/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="שולח עותק אחד אלייך לפני שאת שולחת לכולם"
          >
            {testPending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {testPending ? "שולחת דוגמה..." : "שלח דוגמה אליי"}
          </button>

          {recipientCount === 0 && (
            <p className="text-xs text-gray-400">אין נמענים בקבוצה הנבחרת</p>
          )}
        </div>
      </form>
    </div>
  );
}
