import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CreditCard, AlertCircle } from "lucide-react";
import { amountForCycle, formatPrice, type PlanKey } from "@/lib/billing";

// Display names only — the price is computed dynamically below from
// amountForCycle so it stays in sync with the launch promo (₪19 until
// 2026-07-01, ₪49 afterwards). Internal enum names (MEMBER / VIP /
// PREMIUM) stay the same in DB and code; the displayed labels were
// re-shuffled per Coral (149 = "פרו", 499 = "VIP").
const PLAN_NAMES: Record<string, string> = {
  MEMBER:  "השקה",
  VIP:     "פרו",
  PREMIUM: "VIP",
};

export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string; code?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.accessStatus === "ACTIVE") redirect("/dashboard");

  const sp = await searchParams;
  const error = sp.error;
  const errorCode = sp.code;

  // Determine plan: from query param or user's stored membershipType
  const planKey = ((sp.plan ?? session.user.membershipType ?? "member")).toUpperCase() as PlanKey;
  const planName = PLAN_NAMES[planKey] ?? PLAN_NAMES.MEMBER;
  // Live price — respects the launch promo (₪19 → ₪49 cutoff). The
  // hardcoded ₪49 in the previous version was the source of Coral's
  // "why does it say 49 if launch is 19?" question.
  const planPriceLabel = `${formatPrice(amountForCycle(planKey, 0))}/חודש`;

  const errorMessages: Record<string, string> = {
    payment_failed: "התשלום לא הצליח. נסי שוב או השתמשי בכרטיס אחר.",
    cardcom_error:  "אירעה שגיאה בחיבור לסליקה. נסי שוב.",
    network:        "בעיית חיבור. נסי שוב.",
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">ק</div>
          <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm">
          {error ? (
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertCircle size={32} className="text-red-500" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Clock size={32} className="text-yellow-600" />
            </div>
          )}

          <h1 className="text-2xl font-black text-navy mb-3">
            {error ? "התשלום לא הושלם" : "השלמת רישום"}
          </h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-5 text-right">
              <p className="font-bold mb-1">{errorMessages[error] ?? "אירעה שגיאה. נסי שוב."}</p>
              {errorCode && (
                <p className="text-xs text-red-600 font-mono mt-1">קוד שגיאה: {errorCode}</p>
              )}
              {error === "cardcom_error" && (
                <p className="text-xs text-red-600 mt-2 leading-relaxed">
                  זו לרוב בעיה בהגדרות הסליקה (טרמינל / API key). שלחי לי את קוד השגיאה ואוכל לאבחן.
                </p>
              )}
            </div>
          )}

          {!error && (
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              שלום {session.user.name?.split(" ")[0] ?? ""}! חשבונך נוצר בהצלחה.<br />
              כדי לגשת לקהילה, השלימי את תשלום דמי החברות.
            </p>
          )}

          {/* Selected plan */}
          <div className="bg-teal-pale border border-teal/20 rounded-xl px-4 py-3 mb-6 flex items-center justify-between text-sm">
            <span className="font-semibold text-teal-dark">תוכנית נבחרת:</span>
            <div className="text-right">
              <span className="font-black text-navy">{planName}</span>
              <span className="text-gray-500 mr-2">{planPriceLabel}</span>
            </div>
          </div>

          {/* Pay button */}
          <a
            href={`/api/payment/cardcom/redirect?plan=${planKey.toLowerCase()}`}
            className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-4 rounded-xl hover:bg-teal-dark transition-colors text-base"
          >
            <CreditCard size={18} />
            {error ? "נסי שוב" : `תשלום ${planPriceLabel}`}
          </a>

          <p className="text-xs text-gray-400 mt-3">
            תשלום מאובטח דרך CardCom · SSL מוצפן
          </p>

          {/* Plan change */}
          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              לשינוי תוכנית ←
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
