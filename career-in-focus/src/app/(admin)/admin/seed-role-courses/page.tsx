import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { ROLE_COURSES } from "@/lib/imports/role-courses-data";
import { SeedTrigger } from "./seed-trigger";

export const metadata = { title: "הוספת קורסים לתפקידי תפעול | אדמין" };
export const dynamic = "force-dynamic";

const TAG_LABELS: Record<string, string> = {
  procurement:         "רכש",
  "financial-analyst": "אנליסט פיננסי",
  logistics:           "לוגיסטיקה",
  "import-export":     "ייבוא ייצוא",
};

export default async function SeedRoleCoursesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  // Group courses by tag for the preview
  const byTag: Record<string, typeof ROLE_COURSES> = {};
  for (const c of ROLE_COURSES) {
    (byTag[c.tag] ??= []).push(c);
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 bg-gradient-to-br from-teal to-teal-dark rounded-2xl flex items-center justify-center text-white shrink-0">
          <GraduationCap size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-navy">קורסים לתפקידי תפעול ופיננסים</h1>
          <p className="text-sm text-slate-500 mt-1">
            יוצר/מעדכן {ROLE_COURSES.length} קורסים שמתויגים לתפקידי <strong>רכש</strong>,
            <strong> אנליסט פיננסי</strong>, <strong>לוגיסטיקה</strong> ו-<strong>ייבוא ייצוא</strong> —
            מתאים אוטומטית למתאמנות שתפקיד היעד שלהן באחד מהתחומים האלה.
          </p>
        </div>
      </div>

      <SeedTrigger />

      <div className="mt-8 space-y-6">
        {Object.entries(byTag).map(([tag, list]) => (
          <div key={tag}>
            <h2 className="font-bold text-navy text-lg mb-3 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-teal/15 text-teal-dark rounded-lg text-xs font-black">
                {list.length}
              </span>
              {TAG_LABELS[tag] ?? tag}
            </h2>
            <div className="space-y-2">
              {list.map((c) => (
                <div key={c.title} className="border border-slate-100 rounded-xl p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-bold text-navy text-sm">{c.title}</p>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 shrink-0 ${
                      c.accessType === "INCLUDED"   ? "bg-teal/15 text-teal-dark" :
                      c.accessType === "DISCOUNTED" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {c.accessType === "INCLUDED" ? "כלול" : c.accessType === "DISCOUNTED" ? "בהנחה" : c.accessType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {c.formatType} · קטגוריה: {c.category}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
        <p className="font-bold mb-1">לתשומת לבך</p>
        <p className="leading-relaxed">
          הקורסים נוצרים עם <code className="bg-white px-1.5 py-0.5 rounded text-xs">ctaUrl</code>{" "}
          זמני (#). אחרי הזריעה, היכנסי ל-<a href="/admin/courses" className="underline font-bold">/admin/courses</a>{" "}
          ועדכני את הקישור האמיתי לכל קורס. הזריעה idempotent — אפשר להריץ שוב, היא תעדכן ולא תכפיל.
        </p>
      </div>
    </div>
  );
}
