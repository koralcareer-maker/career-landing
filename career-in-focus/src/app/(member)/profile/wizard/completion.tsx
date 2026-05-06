"use client";

import Link from "next/link";
import { CheckCircle2, Compass, MessageCircle, Target, ArrowLeft, Sparkles } from "lucide-react";

/**
 * Final wizard screen. Shown after step 4 saves successfully.
 * Three primary actions get the user moving immediately — finding
 * jobs, opening the AI coach, or starting application tracking.
 */
export function CompletionScreen({ firstName }: { firstName: string }) {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal to-emerald-400 rounded-3xl shadow-xl shadow-teal/30 mb-5">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-navy mb-2">המערכת שלך מוכנה</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
          {firstName ? `${firstName}, ` : ""}אספנו את כל הנתונים — עכשיו האלגוריתם יודע מה את מחפשת ויכול להתחיל לעבוד עבורך.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <ActionCard
          href="/jobs"
          icon={Compass}
          title="חיפוש משרות"
          description="לוח המשרות עם התאמה לפרופיל"
          accent="teal"
        />
        <ActionCard
          href="/coaching"
          icon={MessageCircle}
          title="מאמן AI"
          description="לקבל המלצות מיידיות"
          accent="navy"
        />
        <ActionCard
          href="/jobs/tracker"
          icon={Target}
          title="מעקב מועמדויות"
          description="לעקוב אחרי כל משרה ששלחת"
          accent="purple"
        />
      </div>

      <div className="bg-gradient-to-br from-teal/10 to-cream rounded-2xl p-5 border border-teal/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white shrink-0 flex items-center justify-center">
            <Sparkles size={16} className="text-teal" />
          </div>
          <div className="flex-1">
            <p className="font-black text-navy text-sm mb-1">השלב הבא: דרכון קריירה</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              הניתוח החכם של הפרופיל שלך — כולל ציון התאמה, חוזקות בולטות, פערי מיומנויות ותפקידים מומלצים. נוצר אוטומטית כשהדאטה מוכן.
            </p>
            <Link
              href="/profile?tab=passport"
              className="inline-flex items-center gap-1 text-sm font-bold text-teal hover:text-teal-dark transition-colors"
            >
              לדרכון הקריירה
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: typeof Compass;
  title: string;
  description: string;
  accent: "teal" | "navy" | "purple";
}) {
  const accentMap = {
    teal:   { bg: "bg-teal/5",    iconBg: "bg-teal/15",    icon: "text-teal",       hover: "hover:border-teal/60"   },
    navy:   { bg: "bg-navy/5",    iconBg: "bg-navy/10",    icon: "text-navy",       hover: "hover:border-navy/40"   },
    purple: { bg: "bg-purple-50", iconBg: "bg-purple-100", icon: "text-purple-600", hover: "hover:border-purple-300" },
  };
  const a = accentMap[accent];
  return (
    <Link
      href={href}
      className={`block ${a.bg} border border-gray-100 ${a.hover} rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className={`w-11 h-11 rounded-xl ${a.iconBg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={a.icon} />
      </div>
      <h3 className="font-black text-navy text-base mb-1">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
