"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle2, Star, Zap, Crown, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { useState, Suspense } from "react";

const PLAN_LABELS: Record<string, { name: string; price: string; color: string; bg: string; icon: React.ReactNode }> = {
  member: {
    name: "השקה",
    price: "₪19/חודש",
    color: "text-teal",
    bg: "from-amber-50 to-white border-amber-200",
    icon: <Star size={14} />,
  },
  // Display labels — internal enum keys (vip / premium) keep their
  // historic names so the existing routing / DB rows still resolve.
  vip: {
    name: "PRO",
    price: "₪149/חודש",
    color: "text-white",
    bg: "from-teal to-teal-dark border-teal",
    icon: <Zap size={14} />,
  },
  premium: {
    name: "VIP",
    price: "₪499/חודש",
    color: "text-purple-700",
    bg: "from-purple-50 to-white border-purple-200",
    icon: <Crown size={14} />,
  },
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
  const isHighlightPlan = planKey === "vip"; // PRO display

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0e7d2] via-cream to-[#e6d9b8] relative overflow-hidden" dir="rtl">
      {/* Decorative orbs — warm beige palette per Coral, no teal-tinted background */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-stone-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-4 py-8 sm:py-12">
        {/* Top brand row */}
        <div className="max-w-md mx-auto flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={36} height={36} className="rounded-lg" />
            <span className="font-black text-navy text-lg group-hover:text-teal transition-colors">קריירה בפוקוס</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-navy/60 hover:text-teal transition-colors">
            כבר רשום/ה?
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          {/* ─── Hero promise — the "why" before the "how" ───────────── */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 text-teal px-3 py-1 rounded-full text-xs font-bold mb-4">
              <Sparkles size={12} />
              שיטת הפוקוס · המקפצה הבאה בקריירה שלך
            </div>
            <h1 className="text-3xl sm:text-[34px] font-black text-navy leading-[1.15] mb-2">
              צרי חשבון<br />תתחיל למצוא עבודה
            </h1>
          </div>

          {/* ─── Selected plan strip ─────────────────────────────────── */}
          <div className={`relative bg-gradient-to-br ${plan.bg} border-2 rounded-2xl p-4 mb-5 shadow-md ${isHighlightPlan ? "shadow-teal/20" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`flex items-center gap-2 font-black text-base ${plan.color}`}>
                <div className={`w-9 h-9 rounded-xl ${isHighlightPlan ? "bg-white/20" : "bg-white"} flex items-center justify-center shadow-sm`}>
                  {plan.icon}
                </div>
                <span>מסלול {plan.name}</span>
              </div>
              <div className={`text-left ${plan.color}`}>
                <div className="text-2xl font-black leading-none">{plan.price}</div>
                {planKey === "member" && (
                  <div className="text-[10px] font-bold opacity-70 mt-0.5">במחיר השקה עד יולי</div>
                )}
              </div>
            </div>
            <Link
              href="/pricing"
              className={`text-[11px] font-bold mt-3 inline-block ${isHighlightPlan ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-navy"} transition-colors`}
            >
              שינוי מסלול ←
            </Link>
          </div>

          {/* ─── Headline social-proof — the page's emotional core ───── */}
          <div className="relative mb-7">
            {/* Decorative glow behind the card */}
            <div className="absolute inset-0 -m-2 bg-gradient-to-br from-teal/30 via-emerald-200/40 to-amber-200/30 rounded-[28px] blur-xl opacity-60 pointer-events-none" />

            <div className="relative bg-gradient-to-br from-white via-emerald-50/70 to-teal/10 border-2 border-teal/40 rounded-[24px] p-6 sm:p-7 shadow-[0_20px_50px_-15px_rgba(62,207,207,0.35)] overflow-hidden">
              {/* Subtle sparkle accents */}
              <Sparkles size={14} className="absolute top-4 left-4 text-teal/40" />
              <Sparkles size={10} className="absolute bottom-5 right-7 text-emerald-400/50" />

              {/* Big circular check badge */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-teal rounded-full blur-md opacity-40" />
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-teal to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal/40">
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black tracking-wider text-teal uppercase">למה זה עובד</p>
                  <p className="text-xs text-gray-500">שיטת הפוקוס · מאות בוגרות בכל שנה</p>
                </div>
              </div>

              {/* The headline itself — broken into emphasis lines */}
              <p className="text-[19px] sm:text-xl leading-[1.55] text-navy font-bold">
                הצטרפו ל
                <span className="text-teal-dark">מאות</span>
                {" "}שעצרו את{" "}
                <span className="bg-gradient-to-l from-teal to-emerald-600 bg-clip-text text-transparent font-black">
                  הלופ המתיש
                </span>
                {" "}של חיפוש העבודה בשיטת הפוקוס ומצאו את{" "}
                <span className="bg-gradient-to-l from-emerald-600 to-teal bg-clip-text text-transparent font-black">
                  המקפצה הבאה
                </span>
                {" "}בקריירה שלהם.
              </p>

              {/* Bottom accent line */}
              <div className="mt-5 pt-4 border-t border-teal/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-dark">
                  <span className="inline-block w-2 h-2 bg-teal rounded-full animate-pulse" />
                  זוהי לא תוכנה — זוהי שיטה
                </div>
                <p className="text-[11px] text-gray-400 font-semibold">חשבון בחינם · ביטול בלחיצה</p>
              </div>
            </div>
          </div>

          {/* ─── The form card ───────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-xl shadow-navy/5 border border-black/5 p-7 sm:p-8">
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
                    { value: "m" as const, label: "גבר" },
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        gender === g.value
                          ? "border-teal bg-teal text-white shadow-sm shadow-teal/30"
                          : "border-gray-200 text-gray-500 hover:border-teal/40 hover:text-teal"
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
                  aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
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

            {/* Trust strip — under the CTA */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-gray-100">
              {[
                { icon: ShieldCheck, label: "ביטול בכל עת" },
                { icon: Lock,        label: "תשלום מאובטח" },
                { icon: Sparkles,    label: "גישה מיידית" },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.label} className="flex flex-col items-center gap-1 text-center">
                    <Icon size={14} className="text-teal" />
                    <span className="text-[11px] font-bold text-gray-500 leading-tight">{t.label}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-gray-400 mt-5 text-center leading-relaxed">
              בהרשמה את מסכימה ל
              <Link href="/terms" className="text-teal hover:underline mx-1">תנאי השימוש</Link>
              ו
              <Link href="/privacy" className="text-teal hover:underline mx-1">מדיניות הפרטיות</Link>
            </p>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                כבר חברה?{" "}
                <Link href="/login" className="text-teal font-bold hover:underline">כניסה</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            <Link href="/pricing" className="hover:text-teal transition-colors">← חזרה לעמוד המחירים</Link>
          </p>
        </div>
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
