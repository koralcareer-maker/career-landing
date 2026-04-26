import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ChevronLeft } from "lucide-react";

export default async function PaymentSuccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4" dir="rtl">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl p-8 border border-black/5 shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-navy mb-3">ברוך הבא לקהילה! 🎉</h1>
          <p className="text-gray-500 text-sm mb-7">
            התשלום אושר בהצלחה. עכשיו יש לך גישה מלאה לכל הפלטפורמה.
          </p>
          <Link href="/dashboard" className="w-full flex items-center justify-center gap-2 bg-teal text-white font-bold py-4 rounded-xl hover:bg-teal-dark transition-colors text-base">
            כניסה ללוח הבקרה
            <ChevronLeft size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
