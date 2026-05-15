import Link from "next/link";
import { CheckCircle, ChevronLeft, Crown, Zap, Star, Users, TrendingUp, Sparkles, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

// Force a fresh count on every visit so the social-proof number is
// honest — caching would let the page lie when activity stops.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "מחירים — שלוש תוכניות חברות מ-19 ש\"ח לחודש",
  description:
    "שלוש תוכניות חברות בקריירה בפוקוס — מ-19 ש\"ח לחודש במבצע השקה. דרכון קריירה מבוסס AI, מאמן AI אישי, אלפי משרות מתאימות, וקהילה מקצועית. ביטול בכל עת.",
  alternates: { canonical: "https://app.careerinfocus.co.il/pricing" },
  openGraph: {
    title: "מחירים — קריירה בפוקוס",
    description:
      "תוכניות חברות מ-19 ש\"ח לחודש. דרכון קריירה AI, מאמן אישי, משרות מותאמות. ביטול בכל עת.",
    url: "https://app.careerinfocus.co.il/pricing",
    type: "website",
  },
};

// Pricing copy is owned by Coral. Three tiers; all-of-previous-tier is
// implicit in the first feature line ("הכל מחבילת חבר" / "הכל מחבילת
// PRO"). Internal enum keys (member / vip / premium) keep their historic
// names — renaming would break query-params and DB.
const PLANS = [
  {
    id: "member",
    name: "חבר",
    price: "19",
    originalPrice: "49",
    period: "לחודש",
    promoNote: "מבצע השקה — עד 1 ביולי 2026. אחר כך ₪49/חודש קבוע.",
    badge: "מבצע השקה",
    description: "כל הכלים והקהילה — להתחיל לחפש עבודה בצורה חכמה",
    icon: Star,
    features: [
      "משרות איכותיות ו״מתחת לרדאר״ שלא מגיעות ללוחות הדרושים הרגילים",
      "מערכת AI אישית שמכוונת אותך איך לשפר את חיפוש העבודה ולהגדיל סיכוי לראיונות",
      "דשבורד לניהול כל חיפוש העבודה במקום אחד — משרות, ראיונות, follow-ups ופניות",
      "כלים, קורסים וסדנאות לשיפור קו״ח, LinkedIn, AI ומיומנויות חיפוש עבודה",
      "הכנה לראיונות עבודה כולל סימולציות, שאלות ותשובות מקצועיות",
      "שיפור קורות החיים והנוכחות המקצועית שלך כדי לבלוט מול מגייסים",
      "דרכון קריירה — ניתוח AI לזיהוי חוזקות, פערים וכיווני קריירה מתאימים",
      "מודיעין שוק העבודה ועדכונים בזמן אמת על מגמות, גיוסים והזדמנויות",
      "הכוונה לנטוורקינג, פנייה למגייסים וחיפוש עבודה מעבר ללוחות הדרושים",
      "קהילה, סדנאות וטיפים אמיתיים ממגייסים ואנשי מקצוע מהשטח",
    ],
    cta: "הצטרפו במחיר השקה",
    href: "/signup?plan=member",
    highlight: false,
    // Logo-true palette: solid neutral cream (the previous gradient
    // pushed warm/khaki tones that Coral called 'mustard'). Border
    // and icon tile mirror the logo's black target-frame with the
    // teal silhouette inside — black is the dominant accent, teal
    // is the focused pop.
    accentText: "text-teal-dark",
    iconColor: "text-teal",
    iconBg: "bg-stone-900",
    border: "border-stone-900",
    bg: "bg-[#ece5d3]",
    ctaClass: "bg-stone-900 text-stone-100 hover:bg-black",
  },
  {
    id: "vip",
    name: "PRO",
    price: "149",
    period: "לחודש",
    badge: "הכי פופולרי",
    description: "אסטרטגיה אישית לחיפוש ממוקד ואפקטיבי",
    icon: Zap,
    iconColor: "text-white",
    iconBg: "bg-white/20",
    features: [
      "הכל מחבילת חבר",
      "להבין בדיוק איך לחפש עבודה בצורה יותר אפקטיבית ומדויקת",
      "להגדיל חשיפה למגייסים דרך שיפור קורות החיים ו־LinkedIn",
      "לקבל הכוונה אישית איך לפנות למשרות, מגייסים וחברות יעד",
      "להימנע מבזבוז זמן על חיפוש לא ממוקד ולא אפקטיבי",
      "לקבל מענה מקצועי כשנתקעים או לא יודעים איך להתקדם",
      "לקבל גישה מוקדמת לסדנאות, אירועים ותכנים מקצועיים",
      "לעבוד עם אסטרטגיית חיפוש מסודרת במקום \"לשלוח קו״ח באוויר\"",
    ],
    cta: "הצטרפו ל-PRO",
    href: "/signup?plan=vip",
    highlight: true,
    border: "border-teal",
    bg: "bg-gradient-to-br from-teal to-teal-dark",
    ctaClass: "bg-white text-teal font-black hover:bg-white/90",
  },
  {
    id: "premium",
    name: "VIP",
    price: "499",
    period: "לחודש",
    badge: "VIP",
    description: "ליווי אישי וצמוד לאורך כל תהליך החיפוש",
    icon: Crown,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    features: [
      "הכל מחבילת PRO",
      "קורות חיים מקצועיים שמציגים אותך בצורה חזקה ומדויקת יותר",
      "פגישת ייעוץ אישית עם קורל לבניית אסטרטגיית חיפוש מותאמת אליך",
      "הכנה לראיונות עבודה כולל סימולציות ושיפור מסרים מקצועיים",
      "הכוונה אישית לנטוורקינג, פנייה למגייסים וחברות יעד",
      "ליווי אישי וצמוד לאורך כל תהליך החיפוש",
      "גישה להזדמנויות איכותיות ומשרות \"מתחת לרדאר\"",
      "יותר סדר, ביטחון ודיוק בתוך תהליך חיפוש העבודה",
      "להרגיש שיש מישהו שמכוון אותך ולא להתמודד עם התהליך לבד",
    ],
    cta: "אני רוצה את ה-VIP",
    href: "/koral-connections",
    highlight: false,
    border: "border-purple-200",
    bg: "bg-purple-50",
    ctaClass: "bg-purple-600 text-white hover:bg-purple-700",
  },
];

const FAQ = [
  { q: "איך מתבצע התשלום?", a: "התשלום מתבצע בכרטיס אשראי בהוראת קבע חודשית. התשלום מאובטח ומוצפן." },
  { q: "האם ניתן לבטל?", a: "כן, ניתן לבטל בכל עת. החיוב הבא לא יתבצע." },
  { q: "מה קורה אחרי ההרשמה?", a: "מיד לאחר ההצטרפות יש לך גישה מלאה לכל הפלטפורמה — ממשרות ועד כלים וקורסים." },
  { q: "מה ההבדל בין PRO לחבילת חבר?", a: "PRO מוסיף הכוונה אסטרטגית — איך לחפש בצורה אפקטיבית, איך לפנות למגייסים, גישה מוקדמת לסדנאות, ומענה מקצועי כשנתקעים. בחבילת חבר יש את כל הכלים והקהילה — בלי שכבת ההכוונה האישית." },
  { q: "מה זה VIP?", a: "ליווי אישי וצמוד לאורך כל תהליך החיפוש. כולל פגישת ייעוץ אישית עם קורל, שיפור קורות חיים, סימולציות ראיונות, וגישה להזדמנויות 'מתחת לרדאר' — הכל בנוסף לכל מה שיש ב-PRO." },
];

export default async function PricingPage() {
  // Live social-proof numbers. Members + jobs scaled — when starting
  // out, the raw active-user count is too small to be persuasive, so
  // we surface the more meaningful "newcomers this week" + total jobs.
  const day = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - 7 * day);
  const [activeMembers, joinedThisWeek, activeJobs] = await Promise.all([
    prisma.user.count({ where: { accessStatus: "ACTIVE" } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.job.count({ where: { isPublished: true } }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Nav */}
      <nav className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>
        <Link href="/login" className="text-sm font-medium text-navy/70 hover:text-navy transition-colors">כניסה</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* ────────────────────────────────────────────────────────
            CV-Match teaser — top of page, BEFORE pricing.
            Coral asked to surface the lead magnet prominently so
            visitors get value-first before they see the price tag.
            ──────────────────────────────────────────────────────── */}
        <Link
          href="/cv-match"
          className="group relative block bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-10 overflow-hidden hover:shadow-2xl transition-shadow"
        >
          {/* Decorative orbs */}
          <div aria-hidden="true" className="absolute -top-20 -right-16 w-64 h-64 bg-teal/20 rounded-full blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl" />

          <div className="relative grid sm:grid-cols-[1fr_auto] gap-5 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-teal/20 border border-teal/30 text-teal-pale text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                <Sparkles size={12} aria-hidden="true" />
                כלי AI חינמי · ללא הרשמה
              </span>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-2">
                לפני שאתה משלמ/ת —{" "}
                <span className="bg-gradient-to-l from-teal-pale to-teal bg-clip-text text-transparent">
                  בדקו את ההתאמה שלכם בחינם
                </span>
              </h2>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl">
                העלי קו&quot;ח + הדביקי תיאור משרה → תוך 15 שניות מקבלים ציון התאמה
                אמיתי, חוזקות, פערים ופעולות. בלי לתת מייל, בלי לקבל ספאם.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-white text-navy font-black px-5 py-3 rounded-2xl shadow-lg group-hover:bg-cream transition-colors whitespace-nowrap shrink-0">
              התחילו בדיקה
              <ArrowLeft size={16} aria-hidden="true" />
            </div>
          </div>
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-bold px-4 py-2 rounded-full mb-4">
            🎯 הצטרף לקהילה
          </div>
          <h1 className="text-4xl font-black text-navy mb-4">בחר את המסלול שמתאים לך</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            כל המסלולים כוללים גישה מלאה לכלים, המשרות, הקורסים והקהילה
          </p>
        </div>

        {/* Live social-proof strip — three real-time numbers from the DB.
            Sits above the plans so the visitor sees momentum before they
            decide. Numbers refresh on every page view. */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-2xl mx-auto mb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal/10 text-teal mb-1.5">
              <Users size={18} aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy">
              {activeMembers.toLocaleString("he-IL")}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">חברים פעילים</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-700 mb-1.5">
              <TrendingUp size={18} aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy">
              +{joinedThisWeek.toLocaleString("he-IL")}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">הצטרפו השבוע</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-700 mb-1.5">
              <Star size={18} aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy">
              {activeJobs.toLocaleString("he-IL")}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">משרות פעילות</div>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border-2 p-7 relative flex flex-col ${plan.border} ${plan.bg} ${plan.highlight ? "shadow-lg shadow-teal/20 scale-105 z-10" : ""}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3.5 right-6 text-xs font-bold px-3 py-1 rounded-full ${plan.highlight ? "bg-teal text-white" : "bg-purple-600 text-white"}`}>
                    {plan.badge}
                  </span>
                )}

                {/* Icon + name. accentText overrides the default
                    navy/gray on cards that need a different default
                    (e.g. cream member card → teal). */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.iconBg}`}>
                    <Icon size={20} className={plan.iconColor} />
                  </div>
                  <h3 className={`font-black text-lg leading-tight ${plan.highlight ? "text-white" : (plan.accentText ?? "text-navy")}`}>{plan.name}</h3>
                </div>

                <p className={`text-sm mb-5 ${plan.highlight ? "text-white/80" : (plan.accentText ? "text-teal/70" : "text-gray-400")}`}>{plan.description}</p>

                {/* Price — show original crossed-out when there's a launch promo */}
                <div className={`mb-6 ${plan.highlight ? "text-white" : (plan.accentText ?? "text-navy")}`}>
                  {plan.originalPrice && (
                    <p className={`text-base font-semibold line-through opacity-50 leading-none mb-1 ${plan.highlight ? "text-white" : (plan.accentText ? "text-teal/40" : "text-slate-400")}`}>
                      ₪{plan.originalPrice}/חודש
                    </p>
                  )}
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-black">₪{plan.price}</span>
                    <span className="text-sm pb-2 opacity-60">{plan.period}</span>
                  </div>
                  {plan.promoNote && (
                    <p className="text-[11px] font-semibold mt-2 leading-relaxed text-stone-100 bg-stone-900 rounded-md px-2 py-1.5 inline-block">
                      ✨ {plan.promoNote}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-white/90" : (plan.accentText ? "text-teal-dark/85" : "text-gray-700")}`}>
                      <CheckCircle size={15} className={`mt-0.5 shrink-0 ${plan.highlight ? "text-white" : "text-teal"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaClass}`}
                >
                  {plan.cta}
                  <ChevronLeft size={15} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Guarantee banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center mb-12">
          <p className="text-2xl mb-2">🛡️</p>
          <h3 className="font-bold text-navy mb-1">ביטול בכל עת, ללא שאלות</h3>
          <p className="text-gray-400 text-sm">לא מרגיש שהקהילה מתאימה לך? מבטל בלחיצה אחת. אין התחייבות ארוכת טווח.</p>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-navy mb-6 text-center">שאלות נפוצות</h2>
          <div className="space-y-5">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-gray-50 pb-5 last:border-0">
                <h4 className="font-semibold text-navy text-sm mb-1.5">{f.q}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 text-sm mb-3">עוד לא בטוח? דבר עם קורל ישירות</p>
          <a
            href="https://wa.me/972501234567"
            className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-600 transition-colors"
          >
            💬 שלח הודעה בוואטסאפ
          </a>
        </div>
      </div>
    </div>
  );
}
