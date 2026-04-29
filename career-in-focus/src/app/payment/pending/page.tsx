import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  MEMBER:  { name: "חבר/ה",               price: "49₪/חודש" },
  VIP:     { name: "VIP",                  price: "149₪/חודש" },
  PREMIUM: { name: "קורל תפעילי קשרים",   price: "449₪/חודש" },
};

export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.accessStatus === "ACTIVE") redirect("/dashboard");

  const sp = await searchParams;
  const error = sp.error;

  // Determine plan: from query param or user's stored membershipType
  const planKey = ((sp.plan ?? session.user.membershipType ?? "member")).toUpperCase() as keyof typeof PLAN_LABELS;
  const plan = PLAN_LABELS[planKey] ?? PLAN_LABELS.MEMBER;

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
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-5 text-right">
              {errorMessages[error] ?? "אירעה שגיאה. נסי שוב."}
            </div>
          )}

          {!error && (
            <p className="text-gray-500 text-sm mb-5 leading-relaxed">
              שלום {session.user.name?.split(" ")[0] ?? ""}! חשבונך נוצר בהצלחה.<br />
              כדי לגשת לקהילה, השלימי את תשלום דמי החברות.
            </p>
          )}

          {/* Selected plan */}
          <div className="bg-teal-pale border border-teal/20 rounded-xl px-4 py-3 mb-5 flex items-center justify-between text-sm">
            <span className="font-semibold text-teal-dark">תוכנית נבחרת:</span>
            <div className="text-right">
              <span className="font-black text-navy">{plan.name}</span>
              <span className="text-gray-500 mr-2">{plan.price}</span>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-right">
            <div className="flex items-start gap-3">
              <CheckCircle size={16} className="text-teal shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-navy">מה מצפה לך?</p>
                <ul className="text-gray-500 mt-1 space-y-0.5 text-xs">
                  <li>• גישה לכל התכנים, הכלים והקורסים</li>
                  <li>• ניתוח קריירה AI אישי</li>
                  <li>• 371+ קבוצות וואטסאפ ופייסבוק</li>
                  <li>• קהילה ואירועים</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pay button */}
          <a
            href={`/api/payment/cardcom/redirect?plan=${planKey.toLowerCase()}`}
            className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-4 rounded-xl hover:bg-teal-dark transition-colors text-base"
          >
            <CreditCard size={18} />
            {error ? "נסי שוב" : `תשלום ${plan.price}`}
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
