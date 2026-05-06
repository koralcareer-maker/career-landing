import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Sparkles, Mail, ArrowLeft } from "lucide-react";

/**
 * Post-payment "you're in" screen. The CardCom webhook has already
 * activated the user + sent the welcome email by the time the user
 * gets here, so this page is purely celebratory + a launchpad into
 * the dashboard.
 *
 * Per Coral: 'ברוך הבא איזה כיף שהצטרפת' — warmer copy than the
 * old single-line version, plus a hint that the welcome email is
 * already on its way.
 */
export default async function PaymentSuccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f7f7] via-[#f0fafa] to-[#d6f0f0] flex items-center justify-center px-4 py-10 relative overflow-hidden" dir="rtl">
      {/* Decorative orbs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-black/5 shadow-2xl shadow-teal/10 text-center">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 justify-center mb-6">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={36} height={36} className="rounded-lg" />
            <span className="font-black text-navy text-base">קריירה בפוקוס</span>
          </Link>

          {/* Success badge */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-teal rounded-full blur-2xl opacity-40" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-teal/40">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-black text-navy mb-3 leading-tight">
            {firstName ? `${firstName}, ` : ""}איזה כיף שהצטרפת! 🎉
          </h1>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 max-w-sm mx-auto">
            התשלום אושר ויש לך גישה מלאה לכל הקהילה — כלי AI, משרות,
            דרכון קריירה, סדנאות והליווי האישי.
          </p>

          {/* Welcome email indicator */}
          <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2.5 justify-center text-sm">
            <Mail size={15} className="text-teal shrink-0" />
            <span className="text-teal-dark font-bold">מייל ברוך הבא נשלח אלייך</span>
          </div>

          {/* Primary CTA */}
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 bg-teal text-white font-black py-4 rounded-xl hover:bg-teal-dark transition-all hover:-translate-y-0.5 text-base shadow-md shadow-teal/30"
          >
            <Sparkles size={16} />
            כניסה לקהילה
            <ArrowLeft size={16} />
          </Link>

          {/* Secondary suggestion */}
          <p className="text-xs text-gray-400 mt-5">
            הצעד הראשון שכדאי לעשות:
            <Link href="/profile" className="text-teal font-bold mr-1 hover:underline">
              להגדיר את חיפוש העבודה שלך
            </Link>
            (לוקח 2 דקות, מפעיל את כל ההמלצות).
          </p>
        </div>
      </div>
    </div>
  );
}
