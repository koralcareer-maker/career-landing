"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle, Star, Zap, Crown } from "lucide-react";
import { useState, Suspense } from "react";

const PLAN_LABELS: Record<string, { name: string; price: string; color: string; icon: React.ReactNode }> = {
  member:  { name: "חבר/ה",                  price: "49₪/חודש",  color: "text-teal",      icon: <Star size={14} /> },
  vip:     { name: "VIP",                     price: "149₪/חודש", color: "text-navy",      icon: <Zap size={14} /> },
  premium: { name: "קורל תפעילי קשרים",        price: "499₪/חודש", color: "text-purple-600",icon: <Crown size={14} /> },
};

function SignupForm() {
  const [state, action, isPending] = useActionState(signup, null);
  const [showPassword, setShowPassword] = useState(false);
  // Gender drives the tone of the welcome email and any user-addressed copy
  // (ברוכה/ברוך, מלאי/מלא, etc.). Default to feminine — the brand audience
  // is mostly women, so unanswered = feminine matches existing voice.
  const [gender, setGender] = useState<"f" | "m">("f");
  const searchParams = useSearchParams();
  const planKey = searchParams.get("plan") ?? "member";
  const plan = PLAN_LABELS[planKey] ?? PLAN_LABELS.member;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-10" dir="rtl">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-sm">
        {/* Selected plan badge */}
        <div className="bg-white border border-teal/20 rounded-2xl p-4 mb-5 flex items-center justify-between shadow-sm">
          <div className={`flex items-center gap-2 font-bold ${plan.color}`}>
            {plan.icon}
            {plan.name}
          </div>
          <div className="text-sm font-black text-navy">{plan.price}</div>
        </div>

        {/* Benefits */}
        <div className="bg-teal-pale border border-teal/20 rounded-2xl p-4 mb-5 flex flex-col gap-2">
          {["גישה לכל התכנים והכלים", "ניתוח קריירה AI", "קהילה תומכת"].map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm text-teal-dark font-medium">
              <CheckCircle size={14} className="shrink-0" />
              {b}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-8">
          <h1 className="text-2xl font-black text-navy mb-1">הצטרפות</h1>
          <p className="text-gray-500 text-sm mb-7">צור חשבון — התשלום בשלב הבא</p>

          <form action={action} className="space-y-4">
            {/* Hidden plan field */}
            <input type="hidden" name="plan" value={planKey} />
            {/* Hidden gender field — value comes from the pill buttons below */}
            <input type="hidden" name="gender" value={gender} />
            <Input
              id="name"
              name="name"
              type="text"
              label="שם מלא"
              placeholder="ישראל ישראלי"
              autoComplete="name"
              required
            />

            {/* Gender — drives email tone (ברוכה/ברוך etc.) */}
            <div>
              <label className="block text-xs font-bold text-navy/70 mb-1.5">
                איך לפנות אלייך?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "f" as const, label: "אישה" },
                  { value: "m" as const, label: "גבר"  },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
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
            <Input
              id="email"
              name="email"
              type="email"
              label="אימייל"
              placeholder="your@email.com"
              autoComplete="email"
              required
              dir="ltr"
            />
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="סיסמה"
                placeholder="לפחות 6 תווים"
                autoComplete="new-password"
                required
                hint="לפחות 6 תווים"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {state?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isPending}>
              יצירת חשבון
            </Button>
          </form>

          <p className="text-xs text-gray-400 mt-4 text-center">
            בהרשמה אתה מסכים ל
            <Link href="/terms" className="text-teal hover:underline mx-1">תנאי השימוש</Link>
            ו
            <Link href="/privacy" className="text-teal hover:underline mx-1">מדיניות הפרטיות</Link>
          </p>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              כבר חבר?{" "}
              <Link href="/login" className="text-teal font-semibold hover:underline">כניסה</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          <Link href="/pricing" className="hover:text-gray-600">← חזרה לעמוד המחירים</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
