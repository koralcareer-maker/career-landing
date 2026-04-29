import Link from "next/link";
import { CheckCircle, ChevronLeft, Crown, Zap, Star } from "lucide-react";

export const metadata = { title: "מחירים | קריירה בפוקוס" };

const PLANS = [
  {
    id: "member",
    name: "חבר/ה",
    price: "49",
    period: "לחודש",
    badge: null,
    description: "גישה מלאה לכל תכני הקהילה",
    icon: Star,
    iconColor: "text-teal",
    iconBg: "bg-teal/10",
    features: [
      "גישה מלאה לכל הכלים והמשאבים",
      "371+ קבוצות וואטסאפ ופייסבוק למשרות",
      "לוח משרות עם התאמה אישית",
      "קורסים מקצועיים (Excel, BI, אנגלית ועוד)",
      "דרכון קריירה — ניתוח AI",
      "מעקב התקדמות ומעקב מועמדויות",
      "תבניות נטוורקינג ו-CV",
      "גישה לקהילה ואירועים",
      "ביטול בכל עת",
    ],
    cta: "הצטרפי לקהילה",
    href: "/signup?plan=member",
    highlight: false,
    border: "border-gray-200",
    bg: "bg-white",
    ctaClass: "bg-navy text-white hover:bg-navy/90",
  },
  {
    id: "vip",
    name: "VIP",
    price: "149",
    period: "לחודש",
    badge: "הכי פופולרי",
    description: "לחיפוש עבודה רציני עם ליווי אישי",
    icon: Zap,
    iconColor: "text-white",
    iconBg: "bg-white/20",
    features: [
      "הכל בחברות רגילה +",
      "פגישת ייעוץ קריירה אישית × 1 לחודש",
      "ביקורת CV ומכתב מוטיבציה",
      "עדיפות רישום לאירועים וסדנאות",
      "גישה לארכיון כל הוובינרים",
      "תג VIP בקהילה",
      "מענה אישי מקורל תוך 24 שעות",
    ],
    cta: "הצטרפי ל-VIP",
    href: "/signup?plan=vip",
    highlight: true,
    border: "border-teal",
    bg: "bg-gradient-to-br from-teal to-teal-dark",
    ctaClass: "bg-white text-teal font-black hover:bg-white/90",
  },
  {
    id: "premium",
    name: "קורל תפעילי קשרים",
    price: "449",
    period: "לחודש",
    badge: "Premium",
    description: "קורל מפעילה עבורך קשרים עם מגייסים",
    icon: Crown,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    features: [
      "הכל בחברות VIP +",
      "קורל שולחת בשמך לינקדאין/מגייסים",
      "בניית אסטרטגיית חיפוש עבודה אישית",
      "פניות ישירות לחברות יעד",
      "שיפור פרופיל לינקדאין אישי",
      "מעקב שוטף עם קורל",
      "עד 20 פניות חמות לחודש",
    ],
    cta: "אני רוצה שקורל תפעיל עבורי קשרים",
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
  { q: "מה ההבדל בין VIP לחבר/ה רגיל/ה?", a: "VIP כולל ליווי אישי מקורל — ביקורת CV, פגישות ייעוץ ומענה אישי. חבר/ה רגיל/ה מקבל/ת גישה לכל הכלים ללא ליווי אישי." },
  { q: "מה זה 'קורל תפעילי קשרים'?", a: "השירות הפרמיום שבו קורל בעצמה שולחת פניות בשמך למגייסים ולאנשי קשר בחברות יעד. מתאים למי שרוצה חיפוש עבודה אגרסיבי ומובנה." },
];

export default function PricingPage() {
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

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-bold px-4 py-2 rounded-full mb-4">
            🎯 הצטרפי לקהילה
          </div>
          <h1 className="text-4xl font-black text-navy mb-4">בחרי את המסלול שמתאים לך</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            כל המסלולים כוללים גישה מלאה לכלים, המשרות, הקורסים והקהילה
          </p>
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

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.iconBg}`}>
                    <Icon size={20} className={plan.iconColor} />
                  </div>
                  <h3 className={`font-black text-lg leading-tight ${plan.highlight ? "text-white" : "text-navy"}`}>{plan.name}</h3>
                </div>

                <p className={`text-sm mb-5 ${plan.highlight ? "text-white/80" : "text-gray-400"}`}>{plan.description}</p>

                {/* Price */}
                <div className={`flex items-end gap-1 mb-6 ${plan.highlight ? "text-white" : "text-navy"}`}>
                  <span className="text-5xl font-black">₪{plan.price}</span>
                  <span className="text-sm pb-2 opacity-60">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${plan.highlight ? "text-white/90" : "text-gray-700"}`}>
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
          <p className="text-gray-400 text-sm">לא מרגישה שהקהילה מתאימה לך? מבטלת בלחיצה אחת. אין התחייבות ארוכת טווח.</p>
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
          <p className="text-gray-400 text-sm mb-3">עוד לא בטוחה? דברי עם קורל ישירות</p>
          <a
            href="https://wa.me/972501234567"
            className="inline-flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-600 transition-colors"
          >
            💬 שלחי הודעה בוואטסאפ
          </a>
        </div>
      </div>
    </div>
  );
}
