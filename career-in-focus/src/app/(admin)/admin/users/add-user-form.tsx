"use client";

import { useActionState, useState, useEffect } from "react";
import { UserPlus, CheckCircle, Copy, Check } from "lucide-react";

interface FormState {
  error?: string;
  success?: boolean;
  userId?: string;
  // Returned from the server action so the admin can copy the login
  // details straight into WhatsApp instead of waiting for the welcome
  // email to land.
  email?: string;
  password?: string;
  name?: string;
}

export function AddUserForm({
  action,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [gender, setGender] = useState<"f" | "m">("f");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState<"all" | "password" | null>(null);

  // Reset copy feedback after each new submission so old "copied!" badges
  // don't linger when Coral creates a second user.
  useEffect(() => {
    setCopied(null);
  }, [state]);

  async function copyToClipboard(text: string, key: "all" | "password") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* clipboard blocked — user can still select the text manually */
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gender" value={gender} />

      {/* ── Required fields: name + email + plan ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">שם פרטי ומשפחה *</label>
          <input
            name="name"
            placeholder="ישראל ישראלי"
            required
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">אימייל *</label>
          <input
            name="email"
            type="email"
            placeholder="user@example.com"
            required
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">סוג חברות</label>
          <select
            name="membershipType"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          >
            <option value="MEMBER">חבר/ה — 49₪</option>
            <option value="VIP">VIP — 149₪</option>
            <option value="PREMIUM">קורל תפעילי קשרים — 499₪</option>
          </select>
        </div>
      </div>

      {/* ── Gender — controls the welcome email tone (ברוכה / ברוך). ─── */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">איך לפנות אליו/ה במייל?</label>
        <div className="inline-flex gap-2">
          {[
            { value: "f" as const, label: "אישה" },
            { value: "m" as const, label: "גבר"  },
          ].map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGender(g.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                gender === g.value
                  ? "border-teal bg-teal text-white shadow-sm"
                  : "border-gray-200 text-gray-500 hover:border-teal/40"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Phone — required (used for WhatsApp + CRM) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">טלפון *</label>
          <input
            name="phone"
            type="tel"
            placeholder="050-1234567"
            required
            dir="ltr"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Advanced (collapsed by default) — custom password only ───── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-500 hover:text-teal transition-colors"
        >
          {showAdvanced ? "▲ פחות פרטים" : "▼ אפשרות מתקדמת (להגדיר סיסמה ידנית)"}
        </button>
        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">סיסמה זמנית</label>
              <input
                name="password"
                type="text"
                placeholder="(אם ריק — תיווצר אוטומטית)"
                minLength={6}
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Error / Success ──────────────────────────────────────────── */}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{state.error}</p>
      )}
      {state?.success && state?.password && state?.email && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-sm text-green-800 font-bold mb-3">
            <CheckCircle size={18} />
            המשתמש/ת נוצר/ה ומייל ברוכה הבאה נשלח אוטומטית.
          </div>

          <div className="bg-white rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-gray-500">פרטי כניסה לוואטסאפ:</p>
            <div className="font-mono text-xs text-navy bg-cream rounded-lg p-3 leading-7" dir="ltr">
              <div>📧 {state.email}</div>
              <div>🔑 {state.password}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(
                  `שלום ${state.name ?? ""}!\nנוצר לך חשבון בקריירה בפוקוס:\n\nאימייל: ${state.email}\nסיסמה: ${state.password}\n\nכניסה: https://career-landing-tau.vercel.app/login`,
                  "all"
                )}
                className="flex items-center gap-1.5 text-xs font-bold bg-teal text-white px-3 py-1.5 rounded-lg hover:bg-teal-dark transition-colors"
              >
                {copied === "all" ? <Check size={13} /> : <Copy size={13} />}
                {copied === "all" ? "הועתק!" : "העתק הודעה לוואטסאפ"}
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(state.password!, "password")}
                className="flex items-center gap-1.5 text-xs font-bold border border-teal/30 text-teal px-3 py-1.5 rounded-lg hover:bg-teal/10 transition-colors"
              >
                {copied === "password" ? <Check size={13} /> : <Copy size={13} />}
                {copied === "password" ? "הועתק" : "רק סיסמה"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-teal text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm disabled:opacity-50"
      >
        <UserPlus size={15} />
        {pending ? "יוצר משתמש..." : "צור משתמש/ת"}
      </button>

      <p className="text-xs text-gray-400">
        סיסמה תיווצר אוטומטית ותוצג לך כאן אחרי היצירה — מוכנה להעתקה לוואטסאפ.
      </p>
    </form>
  );
}
