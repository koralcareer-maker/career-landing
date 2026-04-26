import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Award, Clock, Users, Star, ChevronLeft, Heart, Target, Lightbulb } from "lucide-react";

const CREDENTIALS = [
  { icon: Award,  text: "תואר שני (M.A.) בייעוץ קריירה ותעסוקה" },
  { icon: Clock,  text: "10+ שנות ניסיון בגיוס ומשאבי אנוש" },
  { icon: Users,  text: "200+ בוגרים שמצאו עבודה" },
  { icon: Star,   text: "מומחית לשוק העבודה הנסתר" },
];

const VALUES = [
  { icon: Target,    title: "מיקוד וכיוון",     desc: "לא לפזר — לדייק. כל מהלך מחושב ומכוון לתוצאה אחת: עבודה שמתאימה לך." },
  { icon: Lightbulb, title: "שיטה שעובדת",     desc: "פיתחתי גישה שמנצחת את השוק הנסתר — הגישה שמביאה לראיונות, לא רק לשליחות קורות חיים." },
  { icon: Heart,     title: "ליווי אנושי",      desc: "חיפוש עבודה הוא תהליך רגשי. אני כאן לא רק כמקצוענית אלא כמי שמבינה מה עוברים עליכם." },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream" dir="rtl">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-navy text-lg">קריירה בפוקוס</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-navy/70 hover:text-navy transition-colors">כניסה</Link>
            <Link href="/pricing" className="bg-teal text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-teal-dark hover:-translate-y-0.5 transition-all shadow-sm">
              הצטרפות
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-navy py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-teal/10" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Photo */}
          <div className="shrink-0">
            <div className="w-52 h-60 md:w-64 md:h-72 rounded-3xl overflow-hidden shadow-2xl border-4 border-teal/30 relative">
              <Image src="/koral.jpg" alt="קורל שלו" fill className="object-cover object-top" />
            </div>
          </div>
          {/* Text */}
          <div className="text-right text-white">
            <span className="inline-block bg-teal/20 text-teal text-xs font-bold px-3 py-1 rounded-full border border-teal/30 mb-4">אודות</span>
            <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">קורל שלו</h1>
            <p className="text-teal text-xl font-semibold mb-5">מאסטרית קריירה ומומחית לעולם התעסוקה החדש</p>
            <p className="text-white/70 text-base leading-relaxed max-w-xl">
              עשור של ניסיון בגיוס ומשאבי אנוש, תואר שני בתחום, ומעל 200 אנשים שעזרתי להם למצוא את התפקיד שתמיד רצו — לא על ידי שליחת קורות חיים לכולם.
            </p>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="bg-white py-12 px-6 border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
          {CREDENTIALS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.text} className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-cream">
                <div className="w-10 h-10 bg-teal-pale rounded-xl flex items-center justify-center">
                  <Icon size={20} className="text-teal" />
                </div>
                <p className="text-xs font-semibold text-navy leading-snug">{c.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-right space-y-6">
          <h2 className="text-3xl font-black text-navy">הסיפור שלי</h2>
          <p className="text-gray-600 leading-relaxed text-base">
            התחלתי את הדרך שלי בעולם הגיוס ומשאבי האנוש — מצד שני של המשוואה. ראיתי אלפי קורות חיים, ניהלתי מחלקות גיוס, וידעתי בדיוק אילו מועמדים מקבלים ראיונות ואילו לא — ולמה.
          </p>
          <p className="text-gray-600 leading-relaxed text-base">
            עם הזמן הבנתי שיש פער עצום: אנשים מוכשרים שמחפשים עבודה לבד, שולחים קורות חיים לכל עבר, ומתייאשים. הבעיה? 80% מהמשרות בישראל לא מתפרסמות פומבית — הן נסגרות מתחת לראדאר, דרך הפנייה וגיוס שקט.
          </p>
          <p className="text-gray-600 leading-relaxed text-base">
            לכן יצרתי שיטה שמלמדת איך לפרוץ לשוק הנסתר — לא עם יותר קורות חיים, אלא עם אסטרטגיה חכמה, מיתוג מקצועי נכון, ורשת קשרים שעובדת בשבילך. יותר מ-200 בוגרים כבר הוכיחו שהשיטה עובדת.
          </p>
          <p className="text-gray-600 leading-relaxed text-base">
            קריירה בפוקוס היא הצעד הבא — קהילה מלאה בכלים, תכנים, וליווי שיעזרו לך למצוא את התפקיד הבא שלך, מהר יותר וחכם יותר.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-navy text-right mb-10">מה מנחה אותי</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="feature-card bg-cream rounded-2xl p-6 text-right border border-black/5">
                  <div className="w-11 h-11 bg-teal-pale rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-teal" />
                  </div>
                  <h3 className="font-bold text-navy mb-2">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What I offer */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-right">
          <h2 className="text-2xl font-black text-navy mb-8">מה תמצאי בקהילה</h2>
          <div className="space-y-3">
            {[
              "כלים ומשאבים מעשיים לכל שלב בחיפוש העבודה",
              "ניתוח קריירה מבוסס AI — חוזקות, פערים, ותפקידים מומלצים",
              "מעקב התקדמות — בקשות, ראיונות, ופולואפים במקום אחד",
              "משרות עם ציון התאמה אישי לפרופיל שלך",
              "קהילה תומכת של מחפשי עבודה שמבינים מה עוברים עליך",
              "אירועים, וובינרים, ומגייסים אורחים מדי חודש",
              "תכנים ולמידה — קורסים וסדנאות מקצועיות",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-black/5">
                <CheckCircle size={18} className="text-teal shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-5 border-3 border-teal/40 relative shadow-lg">
            <Image src="/koral.jpg" alt="קורל שלו" fill className="object-cover object-top" />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">בואי נתחיל ביחד</h2>
          <p className="text-white/70 mb-8">הצטרפי לקהילה וקבלי גישה לכל הכלים, התכנים, והליווי שצריכים כדי למצוא עבודה חכם יותר ומהר יותר.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing" className="bg-teal text-white font-bold px-8 py-4 rounded-2xl hover:bg-teal-dark hover:-translate-y-0.5 transition-all shadow-md text-base inline-flex items-center gap-2 justify-center">
              הצטרפות לקהילה
              <ChevronLeft size={18} />
            </Link>
            <Link href="/" className="bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base">
              חזרה לעמוד הבית
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy text-white/50 py-8 px-6 text-center border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Image src="/logo.png" alt="קריירה בפוקוס" width={28} height={28} className="rounded-md opacity-80" />
          <span className="font-bold text-white/70 text-sm">קריירה בפוקוס</span>
        </div>
        <p className="text-xs">© 2026 קריירה בפוקוס. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
