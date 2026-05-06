import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Star, Users, Briefcase, BookOpen, Wrench, TrendingUp, CalendarDays, ChevronLeft, Award, Clock } from "lucide-react";

const FEATURES = [
  { icon: TrendingUp,   title: "מעקב התקדמות",       desc: "ממשק ניהול חיפוש עבודה מלא — בקשות, ראיונות, פולואפים ומדדים בזמן אמת" },
  { icon: Star,         title: "דרכון קריירה AI",     desc: "ניתוח מעמיק של חוזקות, פערי מיומנויות ותפקידים מומלצים — מותאם אישית" },
  { icon: Briefcase,    title: "משרות עם ציון התאמה", desc: "כל משרה מקבלת ציון התאמה אישי על בסיס הפרופיל שלך" },
  { icon: BookOpen,     title: "תכנים ולמידה",        desc: "קורסים, סדנאות ומשאבים מקצועיים לכל שלב בחיפוש העבודה" },
  { icon: Wrench,       title: "כלים ומשאבים",        desc: "כלי AI, תבניות קורות חיים, מאגרי לינקים ומשאבים נבחרים" },
  { icon: Users,        title: "קהילה תומכת",         desc: "פורום קהילתי עם שאלות, הצלחות, טיפים ומשרות ממחפשי עבודה כמוך" },
  { icon: CalendarDays, title: "אירועים ומפגשים",     desc: "וובינרים, סדנאות, מגייסים אורחים ואירועי נטוורקינג שוטפים" },
  { icon: Users,        title: "מועמד השבוע",         desc: "חשיפה לחברים, מגייסים ורשת הקהילה — בואו נקדם אתכם" },
];

const TESTIMONIALS = [
  { name: "מיכל ר.", role: "מעצבת UX", text: "אחרי 8 חודשים של חיפוש עבודה לבד, הצטרפתי לקהילה וב-6 שבועות מצאתי עבודה. הדרכון עזר לי לראות מה היה חסר לי.", avatar: "מ" },
  { name: "אבי ג.", role: "מנהל מוצר", text: "הכלים, הקורסים והאירועים — הכל במקום אחד. לא הייתי מאמין שחיפוש עבודה יכול להיות כזה מובנה.", avatar: "א" },
  { name: "לירן כ.", role: "FullStack Developer", text: "ניתוח פערי המיומנויות שלי היה מדויק להפתיע. השקעתי בשני קורסים שהמליצו לי ועברתי ראיונות שלפני לא עברתי.", avatar: "ל" },
];

// 3 tier teasers — full feature lists live on /pricing. The landing
// surfaces only the headline benefits per tier so the section stays
// scannable; CTA on each card jumps to the matching plan on /pricing.
const PLANS = [
  {
    id: "member",
    name: "השקה",
    price: "₪19",
    originalPrice: "₪49",
    period: "לחודש",
    promoNote: "במחיר השקה עד 1.7.26",
    features: [
      "מערכת AI אישית להכוונת חיפוש עבודה",
      "דשבורד לניהול משרות, ראיונות ופניות",
      "כלים, קורסים וסדנאות מקצועיות",
      "דרכון קריירה — ניתוח חוזקות ופערים",
      "מודיעין שוק ועדכונים בזמן אמת",
      "קהילה, אירועים וטיפים מהשטח",
    ],
    cta: "הצטרפו במחיר השקה",
    href: "/signup?plan=member",
    highlight: false,
  },
  {
    id: "pro",
    name: "PRO",
    price: "₪149",
    period: "לחודש",
    badge: "הכי פופולרי",
    features: [
      "הכל מחבילת ההשקה",
      "אסטרטגיית חיפוש מסודרת ויעדים אישיים",
      "הגדלת חשיפה למגייסים — CV ו-LinkedIn",
      "הכוונה אישית לפנייה למשרות וחברות יעד",
      "מענה מקצועי כשנתקעים בתהליך",
      "גישה מוקדמת לסדנאות ותכנים",
    ],
    cta: "הצטרפו ל-PRO",
    href: "/signup?plan=vip",
    highlight: true,
  },
  {
    id: "vip",
    name: "VIP",
    price: "₪499",
    period: "לחודש",
    features: [
      "הכל מחבילת PRO",
      "פגישת ייעוץ אישית עם קורל",
      "כתיבת קורות חיים מקצועיים",
      "סימולציות ראיונות והכנה אישית",
      "ליווי אישי וצמוד לאורך התהליך",
      "גישה למשרות 'מתחת לרדאר'",
    ],
    cta: "אני רוצה ליווי אישי",
    href: "/koral-connections",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream font-sans" dir="rtl">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-navy text-lg">קריירה בפוקוס</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm font-medium text-navy/70 hover:text-navy transition-colors hidden sm:block">אודות</Link>
            <Link href="/login" className="text-sm font-medium text-navy/70 hover:text-navy transition-colors">כניסה</Link>
            <Link href="/pricing" className="bg-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-dark hover:-translate-y-0.5 transition-all shadow-sm">
              הצטרפות
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-navy text-white py-20 md:py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-teal/20 opacity-80" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal/20 text-teal border border-teal/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Star size={14} />
            הקהילה המקצועית למחפשי עבודה בישראל
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            מצא את העבודה<br />
            <span className="text-teal">שתמיד רצית</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            פלטפורמת הקהילה לחיפוש עבודה עם תכנים, כלים, ניתוח קריירה AI, מעקב התקדמות, משרות ואירועים — הכל במקום אחד.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing" className="bg-teal text-white font-bold px-8 py-4 rounded-2xl hover:bg-teal-dark transition-all duration-200 hover:-translate-y-0.5 text-base flex items-center gap-2 justify-center">
              הצטרפות לקהילה
              <ChevronLeft size={18} />
            </Link>
            <Link href="/login" className="bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base">
              כבר חבר? כנס
            </Link>
          </div>
          <div className="mt-10 flex justify-center gap-8 text-sm text-white/50">
            <span>✓ ביטול בכל עת</span>
            <span>✓ תשלום מאובטח</span>
            <span>✓ תוצאות מיידיות</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: "22K+",   label: "חברי קהילה" },
            { num: "84%",     label: "מצאו עבודה ב-90 יום" },
            { num: "300+",    label: "משרות פעילות" },
            { num: "פי 3",    label: "יותר ראיונות תוך 30 יום" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-teal">{s.num}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-navy mb-3">הכל שצריך לחיפוש עבודה מוצלח</h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">לא עוד כלי אחד — מערכת שלמה שמלווה אותך מהרגע הראשון עד ההצלחה</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={`feature-card animate-fade-in-up stagger-${i + 1} bg-white rounded-2xl p-5 border border-black/5 shadow-sm`}>
                <div className="w-11 h-11 bg-teal-pale rounded-xl flex items-center justify-center mb-3">
                  <Icon size={22} className="text-teal" />
                </div>
                <h3 className="font-bold text-navy text-sm mb-1.5">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-navy py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-3">מה אומרים החברים שלנו</h2>
            <p className="text-white/50">סיפורי הצלחה אמיתיים מהקהילה</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map((s) => <Star key={s} size={14} fill="#3ECFCF" className="text-teal" />)}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-teal/20 rounded-full flex items-center justify-center text-teal font-bold text-sm">{t.avatar}</div>
                  <div>
                    <div className="text-white font-semibold text-sm">{t.name}</div>
                    <div className="text-white/40 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the coach */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Photo */}
            <div className="shrink-0 flex flex-col items-center gap-4">
              <div className="w-56 h-64 rounded-3xl overflow-hidden shadow-xl border-4 border-teal/15 relative">
                <Image src="/koral.jpg" alt="קורל שלו" fill className="object-cover object-top" />
              </div>
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="קריירה בפוקוס" width={32} height={32} className="rounded-lg" />
                <span className="font-bold text-navy text-sm">קריירה בפוקוס</span>
              </div>
            </div>

            {/* Bio */}
            <div className="text-right flex-1">
              <span className="inline-block bg-teal-pale text-teal text-xs font-bold px-3 py-1 rounded-full mb-4">מי אני?</span>
              <h2 className="text-3xl font-black text-navy mb-2 leading-snug">קורל שלו</h2>
              <p className="text-teal font-semibold text-base mb-4">מאסטרית קריירה ומומחית לעולם התעסוקה החדש</p>
              <p className="text-gray-600 leading-relaxed mb-4">
                מאמנת קריירה עם תואר שני בתחום וניסיון של יותר מעשור בניהול מחלקות גיוס ומשאבי אנוש. בארבע השנים האחרונות מתמחה בליווי מקצועיים ומנהלים דרך מעברי קריירה משמעותיים.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                הצטרפו למאות מחפשי עבודה שמצאו את התפקיד הבא שלהם בשיטת קריירה בפוקוס.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                {[
                  { icon: Award, text: "תואר שני בקריירה" },
                  { icon: Clock, text: "10+ שנות ניסיון" },
                  { icon: Users, text: "500+ בוגרים" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 bg-cream text-navy text-sm font-medium px-3 py-1.5 rounded-full border border-navy/10">
                    <Icon size={13} className="text-teal" />
                    {text}
                  </div>
                ))}
              </div>
              <Link href="/about" className="inline-flex items-center gap-2 text-teal font-semibold text-sm hover:underline">
                קרא עוד עליי <ChevronLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-navy mb-3">בחרו את המסלול שמתאים לכם</h2>
          <p className="text-gray-500">3 מסלולים — כל אחד כולל את הקודם, מתאים לשלב שאתם נמצאים בו</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-7 border-2 relative flex flex-col ${
                p.highlight ? "border-teal bg-teal/5 shadow-xl shadow-teal/10 md:scale-105 z-10" : "border-gray-200 bg-white"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 right-5 bg-teal text-white text-xs font-bold px-3 py-1 rounded-full">{p.badge}</span>
              )}
              <div className="mb-5">
                <h3 className="font-black text-navy text-lg">{p.name}</h3>
                {p.originalPrice && (
                  <p className="text-sm font-semibold line-through opacity-50 leading-none mt-1.5 mb-1 text-slate-400">
                    {p.originalPrice}/{p.period}
                  </p>
                )}
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-4xl font-black text-navy">{p.price}</span>
                  <span className="text-gray-400 text-sm pb-1">{p.period}</span>
                </div>
                {p.promoNote && (
                  <p className="text-[11px] font-semibold mt-2 text-amber-700 bg-amber-100 rounded-md px-2 py-1 inline-block">
                    ✨ {p.promoNote}
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle size={15} className="text-teal shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`w-full flex items-center justify-center py-3 rounded-xl font-bold text-sm transition-all ${
                  p.highlight ? "bg-teal text-white hover:bg-teal-dark" : "bg-navy text-white hover:bg-navy-light"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/pricing" className="text-teal hover:underline font-bold">
            לפירוט מלא של כל המסלולים ←
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="bg-teal py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-4">מוכן להתחיל?</h2>
          <p className="text-white/80 mb-8">הצטרפו ל-22K+ חברי הקהילה שמוצאים את המשרה הבאה שלהם בעזרת קריירה בפוקוס</p>
          <Link href="/signup" className="bg-white text-teal font-bold px-10 py-4 rounded-2xl hover:bg-cream transition-colors text-base inline-flex items-center gap-2">
            הצטרפות חינם לשבוע ניסיון
            <ChevronLeft size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/50 py-10 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={32} height={32} className="rounded-lg opacity-90" />
            <span className="font-bold text-white/80">קריירה בפוקוס</span>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-sm mb-4">
            <Link href="/terms" className="hover:text-white transition-colors">תנאי שימוש</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">מדיניות פרטיות</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">מחירים</Link>
            <Link href="/login" className="hover:text-white transition-colors">כניסה</Link>
          </div>
          <p className="text-xs">© 2026 קריירה בפוקוס. כל הזכויות שמורות.</p>
        </div>
      </footer>
    </div>
  );
}
