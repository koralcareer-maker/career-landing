import Link from "next/link";
import { CheckCircle, ChevronLeft } from "lucide-react";

export const metadata = { title: "מחירים | קריירה בפוקוס" };

const PLANS = [
  {
    name: "חברות חודשית",
    price: "₪149",
    period: "לחודש",
    description: "מתאים למי שרוצה להתנסות ולהתחיל",
    features: [
      "גישה מלאה לכל התכנים והקורסים",
      "ניתוח קריירה AI — דרכון קריירה",
      "מעקב התקדמות ומעקב משרות",
      "כלים, תבניות ומשאבים",
      "גישה לקהילה ופורום",
      "השתתפות באירועים ווובינרים",
      "ביטול בכל עת",
    ],
    cta: "הצטרפות חודשית",
    href: "/signup?plan=monthly",
    highlight: false,
  },
  {
    name: "חברות שנתית",
    price: "₪990",
    period: "לשנה",
    badge: "הכי פופולרי — חסכון של 44%",
    description: "מתאים למי שרציני על חיפוש העבודה",
    features: [
      "הכל בחברות חודשית +",
      "עדיפות רישום לאירועים",
      "פגישת ייעוץ אישי × 1",
      "גישה לארכיון כל הסדנאות",
      "תמיכה בעדיפות",
      "תג VIP בקהילה",
    ],
    cta: "הצטרפות שנתית",
    href: "/signup?plan=annual",
    highlight: true,
  },
];

const FAQ = [
  { q: "איך מתבצע התשלום?", a: "התשלום מתבצע דרך CardCom — שירות תשלומים מאובטח ומוכר בישראל. אפשר לשלם בכרטיס אשראי." },
  { q: "האם ניתן לבטל?", a: "כן. חברות חודשית ניתן לבטל בכל עת. חברות שנתית ניתן לבטל תוך 14 יום ולקבל החזר מלא." },
  { q: "מה קורה אחרי ההרשמה?", a: "מיד לאחר התשלום תקבל גישה מלאה לכל הפלטפורמה ותוכל להתחיל לבנות את הדרכון שלך." },
  { q: "האם יש ניסיון חינמי?", a: "יש לנו שבוע ניסיון חינמי. לאחר 7 ימים תתבצע חיוב ראשון אם לא ביטלת." },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      {/* Nav */}
      <nav className="bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>
        <Link href="/login" className="text-sm font-medium text-navy/70 hover:text-navy transition-colors">כניסה</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-navy mb-4">הצטרף לקהילה</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">גישה מלאה לכל הכלים, התכנים והקהילה שיעזרו לך למצוא עבודה מהר יותר</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-2xl p-8 border-2 relative ${p.highlight ? "border-teal bg-teal/5" : "border-gray-200 bg-white"}`}>
              {p.badge && (
                <span className="absolute -top-3 right-6 bg-teal text-white text-xs font-bold px-3 py-1 rounded-full">{p.badge}</span>
              )}
              <h3 className="font-bold text-navy text-xl mb-1">{p.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{p.description}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-5xl font-black text-navy">{p.price}</span>
                <span className="text-gray-400 text-sm pb-2">{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle size={16} className="text-teal shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${p.highlight ? "bg-teal text-white hover:bg-teal-dark" : "bg-navy text-white hover:bg-navy-light"}`}
              >
                {p.cta}
                <ChevronLeft size={16} />
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-navy mb-6 text-center">שאלות נפוצות</h2>
          <div className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.q}>
                <h4 className="font-semibold text-navy text-sm mb-1">{f.q}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
