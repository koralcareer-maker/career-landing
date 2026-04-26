import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CreditCard, CheckCircle, ChevronLeft } from "lucide-react";

export default async function PaymentPendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.accessStatus === "ACTIVE") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
          <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Clock size={32} className="text-yellow-600" />
          </div>
          <h1 className="text-2xl font-black text-navy mb-3">ממתין לאישור תשלום</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            שלום {session.user.name ?? ""}! חשבונך נוצר בהצלחה.<br />
            כדי לגשת לקהילה, יש להשלים את תשלום דמי החברות.
          </p>

          <div className="bg-teal-pale rounded-xl p-4 mb-6 text-right">
            <div className="flex items-start gap-3">
              <CheckCircle size={16} className="text-teal shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-teal-dark">מה מצפה לך?</p>
                <ul className="text-teal-dark/70 mt-1 space-y-0.5 text-xs">
                  <li>• גישה לכל התכנים והכלים</li>
                  <li>• ניתוח קריירה AI אישי</li>
                  <li>• קהילה ואירועים</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CardCom Payment Button */}
          {/* TODO: Replace with real CardCom redirect URL */}
          <a
            href="/api/payment/cardcom/redirect"
            className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-4 rounded-xl hover:bg-teal-dark transition-colors text-base"
          >
            <CreditCard size={18} />
            תשלום דמי חברות
          </a>

          <p className="text-xs text-gray-400 mt-4">
            תשלום מאובטח דרך CardCom
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              כניסה עם חשבון אחר
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
