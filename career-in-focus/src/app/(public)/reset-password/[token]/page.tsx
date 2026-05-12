import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "./reset-form";
import { AlertTriangle } from "lucide-react";

// Server component — validates the token before showing the form.
// If invalid/expired, render a friendly error with a link back to
// /forgot-password instead of a broken form.
export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = token
    ? await prisma.user.findUnique({
        where: { passwordResetToken: token },
        select: { id: true, passwordResetExpires: true },
      })
    : null;

  const isExpired =
    !user ||
    !user.passwordResetExpires ||
    user.passwordResetExpires < new Date();

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8" aria-label="חזרה לדף הבית">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-black/5 p-8">
        {isExpired ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-orange-500" />
            </div>
            <h1 className="text-xl font-black text-navy mb-2">הקישור פג תוקף</h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              קישורי איפוס תקפים ל-24 שעות בלבד. בקשי קישור חדש כדי להמשיך.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark transition-colors text-sm"
            >
              בקשי קישור חדש
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </div>
  );
}
