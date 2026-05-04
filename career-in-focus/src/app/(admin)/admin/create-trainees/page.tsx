import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TRAINEES } from "@/lib/imports/trainees-roster";
import { BulkTrigger } from "./bulk-trigger";

export const metadata = { title: "צור/תקן את כל המתאמנים | אדמין" };
export const dynamic = "force-dynamic";

export default async function CreateTraineesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">צור / תקן את כל המתאמנים</h1>
        <p className="text-sm text-gray-500">
          לחיצה אחת תיצור את כל ה-{TRAINEES.length} משתמשים עם הסיסמאות ששלחת להם במייל. אם המשתמש כבר קיים אבל לא מצליח להתחבר — הסיסמה תתוקן.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-black text-navy mb-3 text-sm">הרשימה ({TRAINEES.length}):</p>
        <ul className="space-y-1.5 text-sm">
          {TRAINEES.map((t) => (
            <li key={t.email} className="flex items-center justify-between gap-3 py-1 border-b border-slate-50 last:border-0">
              <span className="font-bold text-navy">{t.name}</span>
              <span className="text-slate-500 text-xs font-mono">{t.email}</span>
              <code className="text-[11px] bg-teal/10 text-teal-dark px-2 py-0.5 rounded">{t.password}</code>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
        ⚠️ <strong>אידמפוטנטי:</strong> בטוח להריץ שוב. משתמשים שכבר קיימים ובסדר לא ייגעו בהם.
      </div>

      <BulkTrigger />
    </div>
  );
}
