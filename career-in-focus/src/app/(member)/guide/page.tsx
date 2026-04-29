import Link from "next/link";
import { BookOpen, User, Briefcase, Wrench, CalendarDays, MessageSquare, Brain, Star, ChevronLeft, CheckCircle2, Sparkles, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = { title: "מדריך למשתמש | קריירה בפוקוס" };

const STEPS = [
  {
    step: 1,
    icon: User,
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
    title: "מלאי את הפרופיל שלך",
    desc: "הוסיפי תפקיד נוכחי, תפקיד מבוקש, קישור לינקדאין וקורות חיים. זה הבסיס שממנו ה-AI מתחיל לעבוד.",
    href: "/profile",
    cta: "עברי לפרופיל",
    time: "5 דקות",
  },
  {
    step: 2,
    icon: Brain,
    color: "bg-purple-50 text-purple-600",
    border: "border-purple-100",
    title: "צרי את הדרכון הקריירה שלך",
    desc: 'ענה על 15 שאלות קצרות — ה-AI מנתח ומייצרת דרכון קריירה אישי עם חוזקות, פערים, תפקידים מתאימים ותוכנית פעולה.',
    href: "/skills",
    cta: "צרי דרכון",
    time: "10 דקות",
  },
  {
    step: 3,
    icon: Briefcase,
    color: "bg-teal-50 text-teal-600",
    border: "border-teal-100",
    title: "גלי משרות שנבחרו בשבילך",
    desc: "משרות שנבחרו ביד — עם כפתור מעקב ישיר לטראקר שלך. סמני 'שמור' כדי לעקוב אחרי הגשות.",
    href: "/jobs",
    cta: "לגלות משרות",
    time: "מתחדש שבועית",
  },
  {
    step: 4,
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    border: "border-orange-100",
    title: "השתמשי בכלים המקצועיים",
    desc: "קבוצות וואטסאפ, מגייסים וחברות השמה, תבניות נטוורקינג, מחולל תמונת לינקדאין ועוד.",
    href: "/tools",
    cta: "לכלים",
    time: "תמיד זמין",
    highlights: ["קבוצות וואטסאפ", "מגייסים", "תמונת לינקדאין AI"],
  },
  {
    step: 5,
    icon: MessageSquare,
    color: "bg-green-50 text-green-600",
    border: "border-green-100",
    title: "עקבי אחרי ההתקדמות שלך",
    desc: "הטראקר עוקב אחרי כל בקשת עבודה — מ'שמרתי' ועד 'קיבלתי הצעה'. גרפים שבועיים ומשימות קרובות.",
    href: "/progress",
    cta: "לטראקר",
    time: "עדכן יומית",
  },
  {
    step: 6,
    icon: CalendarDays,
    color: "bg-pink-50 text-pink-600",
    border: "border-pink-100",
    title: "הצטרפי לאירועים",
    desc: "ווובינרים שבועיים, אירועי נטוורקינג, מפגשי מגייסים ומפגשי קבוצה. כולם כלולים בחברות.",
    href: "/events",
    cta: "לאירועים",
    time: "כל שבוע",
  },
  {
    step: 7,
    icon: Sparkles,
    color: "bg-indigo-50 text-indigo-600",
    border: "border-indigo-100",
    title: "שוחחי עם מאמן ה-AI",
    desc: "מאמן קריירה אישי שמכיר את הפרופיל שלך, עונה על שאלות, מעניק משוב על CVs, ועוזר להתכונן לראיונות.",
    href: "/coaching",
    cta: "לפתוח שיחה",
    time: "24/7",
  },
];

const TIPS = [
  "עדכני את הטראקר אחרי כל שליחה — זה עוזר לך לראות תמונה אמיתית",
  "שלחי לפחות 3 בקשות ביום — כמות + איכות = תוצאות",
  "קרי לפחות עדכון אחד בשבוע — הם מכילים תוכן ערכי ועדכוני שוק",
  "השתמשי בתבניות נטוורקינג — פנייה ישירה למגייסת עובדת",
  "בדקי את דף המגייסים — יש שם פרטי קשר ישירים לעשרות חברות",
];

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-2xl" dir="rtl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
          <Link href="/dashboard" className="hover:text-navy transition-colors">דשבורד</Link>
          <ChevronLeft size={14} />
          <span className="text-navy font-medium">מדריך למשתמש</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal to-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-navy">מדריך למשתמש</h1>
            <p className="text-gray-500 text-sm">7 צעדים לחיפוש עבודה יעיל יותר</p>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-navy to-[#1a3a5c] rounded-2xl p-6 text-white">
        <p className="font-black text-lg mb-1">ברוכה הבאה לקריירה בפוקוס! 🎉</p>
        <p className="text-white/70 text-sm leading-relaxed">
          הפלטפורמה מכילה הכל שצריך כדי לחפש עבודה בצורה חכמה, מסודרת ופחות לבד.
          עקבי אחרי הצעדים כאן ותצאי לדרך הנכונה.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <h2 className="font-black text-navy text-lg">📋 הצעדים הראשונים</h2>
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.step} className={`p-5 border ${s.border} hover:shadow-md transition-shadow`}>
              <div className="flex items-start gap-4">
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-black text-gray-300">#{s.step}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-black text-navy text-base">{s.title}</h3>
                    <span className="text-xs text-gray-400 shrink-0">{s.time}</span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{s.desc}</p>

                  {s.highlights && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.highlights.map((h) => (
                        <span key={h} className="bg-orange-50 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  <Link
                    href={s.href}
                    className="inline-flex items-center gap-1 text-teal font-bold text-sm hover:underline"
                  >
                    {s.cta}
                    <ChevronLeft size={14} />
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="p-6 bg-amber-50 border-amber-100">
        <h2 className="font-black text-navy text-base mb-4">💡 טיפים שעובדים</h2>
        <ul className="space-y-2.5">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      {/* Features Quick Links */}
      <div>
        <h2 className="font-black text-navy text-lg mb-3">⚡ קיצורי דרך</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/tools/linkedin-photo", label: "📸 תמונת לינקדאין AI" },
            { href: "/tools/whatsapp-groups", label: "💬 קבוצות וואטסאפ" },
            { href: "/recruiters", label: "🔍 מגייסים וחברות השמה" },
            { href: "/tools/networking-prompts", label: "✍️ תבניות נטוורקינג" },
            { href: "/coaching", label: "🤖 מאמן AI אישי" },
            { href: "/progress", label: "📊 טראקר בקשות עבודה" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="bg-white border border-gray-200 rounded-xl p-3 text-sm font-semibold text-navy hover:border-teal/40 hover:bg-teal-pale transition-colors"
            >
              {q.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="bg-gray-50 rounded-2xl p-5 text-center">
        <p className="text-sm text-gray-500">
          שאלות? בעיות? <Link href="/dashboard" className="text-teal font-semibold hover:underline">חזרי לדשבורד</Link> ·
          {" "}<Link href="/coaching" className="text-teal font-semibold hover:underline">שאלי את מאמן ה-AI</Link>
        </p>
        <p className="text-xs text-gray-400 mt-1">אנחנו כאן כדי שתצליחי 💙 קורל</p>
      </div>
    </div>
  );
}
