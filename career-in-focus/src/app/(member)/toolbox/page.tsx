import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currentToolset, type ToolboxCategory } from "@/lib/data/monthly-toolbox";
import {
  Sparkles, Briefcase, Users, FileText, MessagesSquare, TrendingUp, GraduationCap, Wrench, ArrowUpRight,
} from "lucide-react";

export const metadata = { title: "ארגז הכלים החודשי | קריירה בפוקוס" };
export const dynamic = "force-dynamic";

const CATEGORY_META: Record<ToolboxCategory, { icon: typeof Sparkles; label: string; tone: string }> = {
  ai:         { icon: Sparkles,       label: "AI",            tone: "bg-purple-50 text-purple-700 border-purple-200" },
  jobs:       { icon: Briefcase,      label: "משרות",          tone: "bg-teal/10 text-teal border-teal/20" },
  networking: { icon: Users,          label: "נטוורקינג",      tone: "bg-amber-50 text-amber-700 border-amber-200" },
  cv:         { icon: FileText,       label: "קורות חיים",     tone: "bg-blue-50 text-blue-700 border-blue-200" },
  interview:  { icon: MessagesSquare, label: "ראיונות",        tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  trend:      { icon: TrendingUp,     label: "מגמות שוק",      tone: "bg-rose-50 text-rose-700 border-rose-200" },
  skill:      { icon: GraduationCap,  label: "למידה",          tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  tool:       { icon: Wrench,         label: "כלי",            tone: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default async function ToolboxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const set = currentToolset();
  if (!set) {
    return (
      <div className="p-8 text-center text-slate-500" dir="rtl">
        עדיין אין כלים מעודכנים. תחזרי מחר.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy/95 to-teal/40 p-6 sm:p-9 text-white mb-8">
        <div className="absolute top-0 left-0 w-72 h-72 bg-teal/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-3">
            <Sparkles size={13} className="text-teal" />
            <span className="text-xs font-bold tracking-wider">{set.label}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
            ארגז הכלים החודשי שלך
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
            {set.intro}
          </p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {set.items.map((item) => {
          const meta = CATEGORY_META[item.category];
          const Icon = meta.icon;
          const isExternal = item.url.startsWith("http");
          return (
            <Card key={item.id} className="p-5 flex flex-col h-full hover:shadow-md hover:border-teal/30 transition-all group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${meta.tone}`}>
                  <Icon size={12} />
                  {meta.label}
                </div>
                {item.badge ? (
                  <Badge variant="teal" size="sm">{item.badge}</Badge>
                ) : null}
              </div>
              <h3 className="font-black text-navy text-base sm:text-lg mb-1.5 leading-snug">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {item.blurb}
              </p>
              <div className="mt-auto pt-3 border-t border-slate-100 space-y-3">
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-amber-700 font-bold mb-0.5">למה דווקא החודש</p>
                  <p className="text-xs text-amber-900 leading-snug">{item.whyNow}</p>
                </div>
                <Link
                  href={item.url}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-teal hover:text-teal-dark transition-colors"
                >
                  לכלי
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-8 leading-relaxed">
        ארגז הכלים מתעדכן בתחילת כל חודש. רוצה להציע כלי לחודש הבא?{" "}
        <Link href="/contact" className="text-teal font-semibold hover:underline">
          תכתבי לי
        </Link>
      </p>
    </div>
  );
}
