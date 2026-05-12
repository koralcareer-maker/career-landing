"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(requestPasswordReset, null);

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8" aria-label="חזרה לדף הבית">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-black/5 p-8">
        {state && "ok" in state ? (
          // Success state — same UI for valid and invalid emails to prevent
          // account-enumeration. The action does the right thing internally.
          <div className="text-center">
            <div className="w-14 h-14 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-teal" />
            </div>
            <h1 className="text-xl font-black text-navy mb-2">בדקי את האימייל שלך</h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              אם הכתובת שהזנת רשומה אצלנו — שלחנו אליה קישור לאיפוס סיסמה.
              הקישור תקף ל-24 שעות.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              לא רואה את המייל? בדקי גם בתיקיית הספאם / קידום מכירות.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"
            >
              חזרה לכניסה <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-black text-navy mb-1">שכחת סיסמה?</h1>
            <p className="text-gray-500 text-sm mb-7">
              הזיני את כתובת האימייל שלך — נשלח אליך קישור לבחירת סיסמה חדשה.
            </p>

            <form action={action} className="space-y-4">
              <Input
                id="email"
                name="email"
                type="email"
                label="אימייל"
                placeholder="your@email.com"
                autoComplete="email"
                required
                dir="ltr"
                aria-label="כתובת אימייל"
              />

              {state?.error && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600"
                >
                  {state.error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={isPending}>
                שליחת קישור איפוס
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-teal hover:underline"
              >
                ← חזרה לכניסה
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
