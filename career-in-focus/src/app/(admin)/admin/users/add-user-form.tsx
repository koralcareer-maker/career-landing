"use client";

import { useActionState, useState } from "react";
import { UserPlus, Eye, EyeOff, CheckCircle } from "lucide-react";

interface FormState {
  error?: string;
  success?: boolean;
  userId?: string;
}

export function AddUserForm({
  action,
}: {
  action: (prevState: unknown, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<"f" | "m">("f");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gender" value={gender} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">שם מלא *</label>
          <input
            name="name"
            placeholder="ישראל ישראלי"
            required
            dir="rtl"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>

        {/* Email */}
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

        {/* Password */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">סיסמה זמנית *</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="לפחות 6 תווים"
              required
              minLength={6}
              dir="ltr"
              className="w-full px-3 py-2 pe-9 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Membership */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">סוג חברות</label>
          <select
            name="membershipType"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          >
            <option value="MEMBER">חבר/ה — 49₪</option>
            <option value="VIP">VIP — 149₪</option>
            <option value="PREMIUM">קורל תפעילי קשרים — 449₪</option>
          </select>
        </div>
      </div>

      {/* Gender — controls the welcome email tone (ברוכה / ברוך). */}
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

      {/* Error / Success */}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{state.error}</p>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <CheckCircle size={16} />
          המשתמש/ת נוצר/ה בהצלחה ויכול/ה להתחבר עם הסיסמה שהגדרת.
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
        המשתמש/ת יכול/ה להתחבר מיד לאחר הרישום. שלח/י להם את האימייל והסיסמה.
      </p>
    </form>
  );
}
