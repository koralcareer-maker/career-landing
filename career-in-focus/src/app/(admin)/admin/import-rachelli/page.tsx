import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  RACHELLI_EMAIL,
  RACHELLI_FULL_NAME,
  RACHELLI_TARGET_ROLE,
  RACHELLI_PHOTO_URL,
  RACHELLI_CV_URL,
  RACHELLI_APPLICATIONS,
} from "@/lib/imports/rachelli-data";
import { ImportTrigger } from "./import-trigger";

export const metadata = { title: "ייבוא נתוני רחלי | אדמין" };
export const dynamic = "force-dynamic";

export default async function ImportRachelliPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">ייבוא נתונים — רחלי זארי</h1>
        <p className="text-sm text-gray-500">
          ייבוא חד-פעמי של תיק הלקוחה: תמונת פרופיל, קורות חיים, ו-{RACHELLI_APPLICATIONS.length} מועמדויות מטבלת המעקב.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-black text-navy">מה ייובא:</h2>
        <ul className="space-y-2 text-sm text-navy/80">
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>שם:</strong> {RACHELLI_FULL_NAME}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>אימייל:</strong> {RACHELLI_EMAIL}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>תפקיד יעד:</strong> {RACHELLI_TARGET_ROLE}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span>
              <strong>תמונה:</strong>{" "}
              <a href={RACHELLI_PHOTO_URL} target="_blank" rel="noopener" className="text-teal hover:underline">{RACHELLI_PHOTO_URL}</a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span>
              <strong>קורות חיים:</strong>{" "}
              <a href={RACHELLI_CV_URL} target="_blank" rel="noopener" className="text-teal hover:underline">{RACHELLI_CV_URL}</a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal font-bold">✓</span>
            <span><strong>{RACHELLI_APPLICATIONS.length} מועמדויות</strong> ב-״התקדמות״ של רחלי</span>
          </li>
        </ul>

        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          ⚠️ <strong>חשוב:</strong> לפני שלוחצים — תוודאי שהמשתמשת של רחלי כבר קיימת ב-
          <a href="/admin/users" className="underline font-bold">/admin/users</a> (אימייל: {RACHELLI_EMAIL}).
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
