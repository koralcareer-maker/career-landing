import Link from "next/link";
import {
  Sparkles, Camera, Users, BookOpen, Network, Target,
  MessageCircle, Briefcase, CalendarDays, FileCheck, ArrowLeft, Lock,
} from "lucide-react";

/**
 * Reusable premium-gate page. Shown when a logged-in member tries to
 * access a feature that's restricted to the "קורל תפעילי קשרים" premium
 * tier. Lays out all premium benefits so the user understands what
 * they're missing, with a clear CTA into the existing lead-form flow.
 *
 * Usage from any (member) server-component:
 *   if (session.user.membershipType !== "PREMIUM") {
 *     return <PremiumGate feature="מחולל תמונת תדמית" />;
 *   }
 */
export interface PremiumGateProps {
  /** Short feature name shown in the lead headline ("מחולל תמונת תדמית"). */
  feature: string;
  /** One sentence describing the feature's value. Optional. */
  featureDesc?: string;
  /**
   * Optional accent icon for the locked feature in the hero.
   * Defaults to <Lock />.
   */
  featureIcon?: React.ReactNode;
}

const PREMIUM_BENEFITS: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Camera size={20} className="text-teal" />,
    title: "10 תמונות תדמית AI לחודש",
    desc: "תמונות פרופיל מקצועיות באיכות סטודיו, ישירות מהמערכת.",
  },
  {
    icon: <MessageCircle size={20} className="text-teal" />,
    title: "פגישת עומק 1:1 עם קורל",
    desc: "פגישה אישית — ניתוח חוזקות, חסמים ותכנית פעולה ברורה.",
  },
  {
    icon: <BookOpen size={20} className="text-teal" />,
    title: "תכני פרמיום: קורסים וסדנאות",
    desc: "גישה לקורסים בלעדיים שמותאמים למסלול שלך.",
  },
  {
    icon: <Network size={20} className="text-teal" />,
    title: "הפעלת קשרים אישית",
    desc: "קורל מפעילה את הרשת שלה כדי לקדם אותך למקומות רלוונטיים.",
  },
  {
    icon: <Target size={20} className="text-teal" />,
    title: "ליווי אסטרטגי לקריירה",
    desc: "מיקוד כיוון, מיצוב אישי וטקטיקה ברורה לתקיפת השוק.",
  },
  {
    icon: <Sparkles size={20} className="text-teal" />,
    title: "גישה מועדפת בוואטסאפ",
    desc: "ערוץ ישיר לקורל — שאלות בזמן אמת בין הפגישות.",
  },
  {
    icon: <Briefcase size={20} className="text-teal" />,
    title: "משרות מועדפות",
    desc: "גישה ראשונית למשרות חמות מהקשרים של קורל.",
  },
  {
    icon: <CalendarDays size={20} className="text-teal" />,
    title: "מפגשי פרמיום סגורים",
    desc: "מפגש קבוצתי קטן — Q&A, פאנלים ומאסטרקלאסים בלעדיים.",
  },
  {
    icon: <FileCheck size={20} className="text-teal" />,
    title: "ביקורת קורות חיים אישית",
    desc: "קורל עוברת ידנית על קו״ח שלך פעם ברבעון.",
  },
];

export function PremiumGate({ feature, featureDesc, featureIcon }: PremiumGateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f0fafa] to-[#e8f6f6]" dir="rtl">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Lock size={14} />
            פיצ&apos;ר פרמיום
          </div>

          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal/15 border border-teal/30 rounded-2xl mb-6">
            {featureIcon ?? <Lock size={28} className="text-teal" />}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
            {feature} זמין רק במסלול הפרמיום
          </h1>

          {featureDesc && (
            <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-xl mx-auto mb-8">
              {featureDesc}
            </p>
          )}

          <p className="text-white/60 text-sm sm:text-base mb-10 max-w-xl mx-auto">
            הפיצ&apos;ר הזה כלול בחבילת <span className="text-teal font-bold">קורל תפעילי קשרים</span> — מסלול פרמיום אישי שמלווה אותך לקריירה הבאה.
          </p>

          <Link
            href="/koral-connections"
            className="inline-flex items-center gap-2 px-8 py-4 bg-teal hover:bg-teal/90 text-white font-bold rounded-2xl text-base shadow-xl shadow-teal/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            אני רוצה לשדרג לפרמיום
            <ArrowLeft size={18} />
          </Link>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-teal text-sm font-bold mb-2">
            <Users size={14} />
            מה כלול במסלול פרמיום
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-navy mb-2">
            9 הטבות מקיפות לקריירה שלך
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">
            מסלול ליווי שלם — לא רק כלי אחד, אלא חבילה שמובילה אותך מהמיצוב ועד למשרת היעד.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PREMIUM_BENEFITS.map((benefit, i) => (
            <div
              key={i}
              className="flex gap-3 bg-white border border-slate-100 rounded-2xl p-5 hover:border-teal/30 hover:shadow-sm transition-all"
            >
              <div className="shrink-0 w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
                {benefit.icon}
              </div>
              <div>
                <h3 className="font-bold text-navy text-sm mb-1">{benefit.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-l from-navy to-[#1a3a4a] rounded-3xl p-8 sm:p-10 text-center text-white shadow-xl">
          <h3 className="text-xl sm:text-2xl font-black mb-3">
            מוכנה להתקדם לרמה הבאה?
          </h3>
          <p className="text-white/70 text-sm sm:text-base mb-6 max-w-md mx-auto">
            מקומות מוגבלים. קורל בוחרת ידנית את החברות שמתאימות למסלול.
          </p>
          <Link
            href="/koral-connections"
            className="inline-flex items-center gap-2 px-8 py-4 bg-teal hover:bg-teal/90 text-white font-bold rounded-2xl text-base shadow-xl shadow-teal/30 transition-all duration-200 hover:-translate-y-0.5"
          >
            לבדיקת התאמה
            <ArrowLeft size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
