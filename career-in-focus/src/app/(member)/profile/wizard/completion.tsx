"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle2, Compass, MessageCircle, Target, ArrowLeft, Sparkles } from "lucide-react";
import { createGenderT, type Gender } from "@/lib/gender";

/**
 * Final wizard screen. Shown after step 4 saves successfully.
 *
 * The CTA that matters most is the Career Passport (/skills): without
 * it the AI's match scores stay generic. We make that the hero action
 * and also auto-navigate after a few seconds so users who scroll past
 * the screen still land on the right next step. Members who want to
 * skip to Jobs/Coach/Tracker have visible alternates below.
 */
export function CompletionScreen({ firstName, gender }: { firstName: string; gender: Gender }) {
  const router = useRouter();
  const t = createGenderT(gender);

  // After 6s, push the user into the Career Passport — long enough to
  // read the screen, short enough that nobody gets stranded on a
  // success page wondering "what now?".
  useEffect(() => {
    const t = window.setTimeout(() => router.push("/skills"), 6000);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal to-emerald-400 rounded-3xl shadow-xl shadow-teal/30 mb-5">
          <CheckCircle2 size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-navy mb-2">המערכת שלך מוכנה</h1>
        <p className="text-gray-500 text-base leading-relaxed max-w-lg mx-auto">
          {firstName ? `${firstName}, ` : ""}אספנו את כל הנתונים — עכשיו השלב המרכזי הוא <strong className="text-navy">דרכון הקריירה</strong>, שייצור את ציוני ההתאמה לפרופיל שלך.
        </p>
      </div>

      {/* PRIMARY: Career Passport — this is the next mandatory step. */}
      <Link
        href="/skills"
        className="group block bg-gradient-to-br from-teal/15 via-white to-cream border-2 border-teal/30 rounded-3xl p-6 sm:p-7 mb-6 shadow-lg shadow-teal/10 hover:shadow-xl hover:shadow-teal/20 transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal to-teal-dark flex items-center justify-center shrink-0 shadow-md">
            <Sparkles size={26} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-teal-dark mb-1 tracking-wide">השלב הבא · אוטומטי בעוד 6 שניות</p>
            <h2 className="text-xl font-black text-navy mb-1">לדרכון הקריירה ←</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              ניתוח חכם של הפרופיל שלך — ציון התאמה, חוזקות בולטות, פערים ותפקידים מומלצים.
            </p>
          </div>
          <ArrowLeft size={22} className="text-teal shrink-0 transition-transform group-hover:-translate-x-1" />
        </div>
      </Link>

      <div className="text-center mb-3">
        <span className="text-xs text-gray-400 font-bold tracking-wide">או דלגי לאחת מהפעולות</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          href="/progress"
          icon={Target}
          title="מעקב מועמדויות"
          description="לעקוב אחרי כל משרה ששלחת"
          accent="purple"
        />
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
      className={`block text-center ${a.bg} border border-gray-100 ${a.hover} rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className={`w-11 h-11 rounded-xl ${a.iconBg} flex items-center justify-center mb-3 mx-auto`}>
        <Icon size={20} className={a.icon} />
      </div>
      <h3 className="font-black text-navy text-base mb-1">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );
}
