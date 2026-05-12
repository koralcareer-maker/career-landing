"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPassword.bind(null, token);
  const [state, formAction, isPending] = useActionState(action, null);
  const [showPassword, setShowPassword] = useState(false);

  if (state && "ok" in state) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-teal" />
        </div>
        <h1 className="text-xl font-black text-navy mb-2">הסיסמה עודכנה ✓</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          הסיסמה החדשה שלך נשמרה. עכשיו אפשר להיכנס איתה לחשבון.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark transition-colors text-sm"
        >
          כניסה לחשבון
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-black text-navy mb-1">בחירת סיסמה חדשה</h1>
      <p className="text-gray-500 text-sm mb-7">
        בחרי סיסמה חדשה (לפחות 6 תווים). נשמור אותה ונחזיר אותך לכניסה.
      </p>

      <form action={formAction} className="space-y-4">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            label="סיסמה חדשה"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            dir="ltr"
            aria-label="סיסמה חדשה"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-8 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          label="אימות סיסמה"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          dir="ltr"
          aria-label="אימות הסיסמה החדשה"
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
          שמירת סיסמה חדשה
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm font-semibold text-teal hover:underline">
          ← חזרה לכניסה
        </Link>
      </div>
    </>
  );
}
