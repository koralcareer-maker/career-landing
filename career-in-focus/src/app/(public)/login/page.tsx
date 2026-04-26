"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [state, action, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-black/5 p-8">
        <h1 className="text-2xl font-black text-navy mb-1">כניסה</h1>
        <p className="text-gray-500 text-sm mb-7">ברוך שובך! הזן את פרטיך להמשיך</p>

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
          />
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              label="סיסמה"
              placeholder="••••••••"
              autoComplete="current-password"
              required
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
            כניסה לחשבון
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            עדיין אין לך חשבון?{" "}
            <Link href="/signup" className="text-teal font-semibold hover:underline">הצטרפות</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
