"use client";

import { useActionState } from "react";
import { CheckCircle, AlertCircle, Loader2, UserSearch } from "lucide-react";

interface FormState {
  error?: string;
  success?: boolean;
}

const TYPE_OPTIONS = [
  { value: "RECRUITER",   label: "מגייס" },
  { value: "STAFFING",    label: "חברת השמה" },
  { value: "HEADHUNTER",  label: "הד האנטר" },
];

export function RecruiterForm({
  action,
  defaultValues,
  submitLabel = "הוסף מגייס",
}: {
  action: (prevState: unknown, formData: FormData) => Promise<FormState>;
  defaultValues?: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    linkedinUrl?: string;
    type?: string;
    field?: string;
    notes?: string;
    isActive?: boolean;
  };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">שם מלא *</label>
          <input
            name="name"
            defaultValue={defaultValues?.name}
            placeholder="שם המגייס"
            required
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Company */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">חברה *</label>
          <input
            name="company"
            defaultValue={defaultValues?.company}
            placeholder="שם החברה"
            required
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">סוג</label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? "RECRUITER"}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          >
            {TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">אימייל</label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            placeholder="email@example.com"
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">טלפון</label>
          <input
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            placeholder="050-0000000"
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">LinkedIn</label>
          <input
            name="linkedinUrl"
            type="url"
            defaultValue={defaultValues?.linkedinUrl ?? ""}
            placeholder="https://linkedin.com/in/..."
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Field */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">תחום התמחות</label>
          <input
            name="field"
            defaultValue={defaultValues?.field ?? ""}
            placeholder="לדוגמה: הייטק, פיננסים, בריאות"
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">הערות פנימיות</label>
          <input
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            placeholder="הערות שלא יוצגו לחברים"
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

      </div>

      {/* Status */}
      {state?.error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
          <AlertCircle size={15} className="shrink-0" />
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700">
          <CheckCircle size={15} className="shrink-0" />
          נשמר בהצלחה!
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-teal text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm disabled:opacity-50"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <UserSearch size={15} />}
        {pending ? "שומר..." : submitLabel}
      </button>
    </form>
  );
}
