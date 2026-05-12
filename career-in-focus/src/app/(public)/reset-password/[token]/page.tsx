import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// The /reset-password/[token] flow was scaffolded ahead of the
// PasswordReset model on User. Until that model + token validation
// is implemented, render a friendly "ask the admin" screen so the
// route doesn't 500 and members still have a path forward.
//
// When the real fields land (passwordResetToken + passwordResetExpires
// on User), restore the prisma.user.findUnique({ where: { passwordResetToken } })
// lookup and the form below.

export default async function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      <Link href="/" className="flex items-center gap-2 mb-8" aria-label="חזרה לדף הבית">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-black/5 p-8 text-center">
        <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-orange-500" />
        </div>
        <h1 className="text-xl font-black text-navy mb-2">איפוס סיסמה אוטומטי בקרוב</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          איפוס סיסמה אוטומטי טרם זמין. כדי לאפס סיסמה — פנו לקורל מנהלת המערכת והיא תאפס לכם ידנית.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-teal text-white font-bold px-5 py-3 rounded-xl hover:bg-teal-dark transition-colors text-sm"
        >
          חזרה לדף הכניסה
        </Link>
      </div>
    </div>
  );
}
