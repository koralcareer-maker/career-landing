import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  YONI_EMAIL,
  YONI_FULL_NAME,
  YONI_TARGET_ROLE,
  YONI_LOCATION,
  YONI_APPLICATIONS,
} from "@/lib/imports/yoni-data";
import { ImportTrigger } from "./import-trigger";

export const metadata = { title: "ייבוא נתוני יוני | אדמין" };
export const dynamic = "force-dynamic";

export default async function ImportYoniPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">ייבוא נתונים — יונתן (יוני) אבירם</h1>
        <p className="text-sm text-gray-500">
          ייבוא חד-פעמי של תיק הלקוח: פרטי פרופיל ו-{YONI_APPLICATIONS.length} מועמדויות מטבלת ה-Job Search.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-black text-navy">מה ייובא:</h2>
        <ul className="space-y-2 text-sm text-navy/80">
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>שם:</strong> {YONI_FULL_NAME}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>אימייל:</strong> {YONI_EMAIL}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>תפקיד יעד:</strong> {YONI_TARGET_ROLE}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>מיקום:</strong> {YONI_LOCATION}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>{YONI_APPLICATIONS.length} מועמדויות</strong> (Jan-May 2026) ב״התקדמות״ של יוני</span>
          </li>
        </ul>

        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          <div>⚠️ <strong>חשוב:</strong> לפני שלוחצים — תוודאי שהמשתמש של יוני כבר קיים ב-
            <a href="/admin/users" className="underline font-bold">/admin/users</a> (אימייל: {YONI_EMAIL}).</div>
          <div>📁 <strong>שים לב:</strong> אין כרגע קורות חיים או תמונת פרופיל בתיקייה שלו בדרייב, אז הם לא ייובאו. אפשר תמיד להוסיף ידנית ב-/profile של יוני.</div>
        </div>
      </div>

      {/* Trigger */}
      <ImportTrigger />

      <p className="text-xs text-slate-400">
        הפעולה אידמפוטנטית — אפשר להריץ שוב בלי לחשוש מכפילויות. מועמדויות שכבר קיימות ידולגו.
      </p>
    </div>
  );
}
