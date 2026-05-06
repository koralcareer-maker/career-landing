import { LeadForm } from "./lead-form";
import {
  Sparkles, CheckCircle2, Clock, Target, Users, TrendingUp,
  FileText, Link, Briefcase, DollarSign, Calendar, Zap,
  Shield, Star, MessageCircle, UserCheck, Globe, Award, Send
} from "lucide-react";

export default function KoralConnectionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f0fafa] to-[#e8f6f6] pb-20">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-teal/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-teal/15 border border-teal/30 text-teal px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Sparkles size={14} />
            מסלול VIP — מקומות מוגבלים
          </div>

          <h1 className="text-4xl sm:text-5xl font-black mb-5 leading-tight">
            VIP — קורל תפעילי קשרים
          </h1>

          <p className="text-lg sm:text-xl text-white/75 leading-relaxed max-w-2xl mx-auto mb-10">
            המסלול הגבוה ביותר. קורל נכנסת איתך אישית לתהליך, מדייקת את כיוון הקריירה,
            ומפעילה את הרשת שלה כדי לקדם אותך לשלב הבא — כולל פגישת ייעוץ, שיפור CV,
            סימולציות ראיונות וליווי צמוד לאורך כל הדרך.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#lead-form"
              className="px-8 py-4 bg-teal hover:bg-teal/90 text-white font-bold rounded-2xl text-base shadow-xl shadow-teal/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              אני רוצה לבדוק התאמה
            </a>
            <a
              href="#lead-form"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-base transition-all duration-200"
            >
              קבע/י שיחת התאמה
            </a>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-navy mb-2">איך זה עובד?</h2>
          <p className="text-slate-500">שלושה שלבים ברורים מהפגישה הראשונה ועד לתוצאות</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: "01",
              title: "פגישת עומק אישית עם קורל",
              desc: "ניתוח ניסיון, חוזקות, חסמים, מטרות ותפקידי יעד — שיחה כנה וממוקדת שמבינה אותך לעומק.",
              icon: <MessageCircle size={22} className="text-teal" />,
            },
            {
              num: "02",
              title: "דיוק אסטרטגיית הקריירה",
              desc: "מיקוד כיוון, סוגי חברות, מיצוב אישי, ואיפה נכון לתקוף את השוק — תכנית פעולה ברורה.",
              icon: <Target size={22} className="text-teal" />,
            },
            {
              num: "03",
              title: "הפעלת קשרים רלוונטיים",
              desc: "קורל מפעילה קשרים קיימים באופן חכם ואקטיבי במקומות רלוונטיים לפי ההתאמה שלך.",
              icon: <Globe size={22} className="text-teal" />,
            },
          ].map((step) => (
            <div
              key={step.num}
              className="relative bg-white rounded-3xl p-7 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
            >
              <div className="text-5xl font-black text-slate-100 absolute top-5 left-6 select-none">
                {step.num}
              </div>
              <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="font-bold text-navy mb-2">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── What YOU need to bring ─── */}
      <section className="bg-white/60 backdrop-blur-sm border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-navy mb-2">מה דרוש ממך</h2>
            <p className="text-slate-500">כדי שנוכל לעבוד יחד בצורה הטובה ביותר</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: <FileText size={18} />, label: "קורות חיים מעודכנים" },
              { icon: <Link size={18} />, label: "לינקדאין פעיל" },
              { icon: <Briefcase size={18} />, label: "תיאור ניסיון מקצועי" },
              { icon: <DollarSign size={18} />, label: "מטרות שכר ותפקיד" },
              { icon: <Calendar size={18} />, label: "זמינות לראיונות" },
              { icon: <CheckCircle2 size={18} />, label: "פתיחות להצעות" },
              { icon: <Zap size={18} />, label: "מחויבות לפעול מהר" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100"
              >
                <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center text-teal">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-navy leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── What you GET ─── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-navy mb-2">מה תקבל/י</h2>
          <p className="text-slate-500">תמיכה אישית ותוצאות מדידות</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: <UserCheck size={20} />, label: "פגישת עומק אישית", desc: "שיחה ממוקדת עם קורל שמכירה את השוק לעומק" },
            { icon: <Target size={20} />, label: "מפת כיוון קריירה ברורה", desc: "להיכן ללכת ואיך להגיע לשם במהירות" },
            { icon: <TrendingUp size={20} />, label: "אסטרטגיית חיפוש ממוקדת", desc: "לא תתפזר — רק על מה שבאמת מתאים לך" },
            { icon: <Globe size={20} />, label: "פתיחת דלתות רלוונטיות", desc: "הגעה לאנשים הנכונים בדרך החכמה" },
            { icon: <Users size={20} />, label: "חיבורים איכותיים כשיש התאמה", desc: "היכרויות אמיתיות עם ערך עסקי" },
            { icon: <Clock size={20} />, label: "מעקב אישי לתקופה מוגדרת", desc: "קורל לא עוזבת בדרך — מלווה עד לתוצאה" },
            { icon: <Award size={20} />, label: "חידוד קו\"ח / לינקדאין", desc: "שיפור החומרים שלך כדי לבלוט בשוק" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-teal/20 to-teal/5 rounded-xl flex items-center justify-center text-teal shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-bold text-navy text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Transparency ─── */}
      <section className="max-w-4xl mx-auto px-6 pb-6">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-7 flex gap-4">
          <Shield size={24} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 mb-1">חשוב לדעת</h3>
            <p className="text-amber-700 text-sm leading-relaxed">
              אין התחייבות להשמה או קבלה לעבודה. המטרה היא למקסם הזדמנויות, לדייק התאמות
              ולהפעיל קשרים בצורה חכמה ורלוונטית. התוצאות תלויות גם בך — בפתיחות שלך,
              בזמינות ובמחויבות לתהליך.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Timeline ─── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-navy mb-2">לוח הזמנים</h2>
          <p className="text-slate-500">מה קורה בכל שלב</p>
        </div>

        <div className="relative">
          {/* Line */}
          <div className="absolute right-[1.375rem] top-5 bottom-5 w-0.5 bg-gradient-to-b from-teal to-teal/10 hidden sm:block" />

          <div className="space-y-6">
            {[
              { week: "שבוע 1", title: "פגישת עומק + דיוק אסטרטגיה", color: "bg-teal" },
              { week: "שבוע 2", title: "שדרוג חומרים + פתיחת כיוונים", color: "bg-teal/80" },
              { week: "שבועות 3–4", title: "הפעלת קשרים + חיבורים + מעקב", color: "bg-teal/60" },
            ].map((row) => (
              <div key={row.week} className="flex items-start gap-5">
                <div className={`w-11 h-11 ${row.color} rounded-full flex items-center justify-center shrink-0 shadow-md`}>
                  <Star size={16} className="text-white" />
                </div>
                <div className="flex-1 bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-bold text-teal mb-0.5">{row.week}</p>
                  <p className="font-semibold text-navy">{row.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing box ─── */}
      <section className="max-w-4xl mx-auto px-6 pb-10">
        <div className="relative overflow-hidden bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] rounded-3xl p-8 text-white text-center shadow-2xl">
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-teal/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal/8 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-teal/20 border border-teal/30 text-teal px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <Sparkles size={13} /> מסלול VIP
            </div>
            <h3 className="text-2xl font-black mb-3">מקומות מוגבלים בכל חודש</h3>
            <p className="text-white/65 mb-6 max-w-md mx-auto text-sm leading-relaxed">
              קורל עובדת עם מספר מצומצם של אנשים בכל פעם כדי להבטיח תשומת לב אישית ואיכות גבוהה.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center text-sm text-white/60 mb-6">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal" /> תשומת לב אישית מקורל</span>
              <span className="hidden sm:block">·</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal" /> ליווי VIP לאורך כל התהליך</span>
              <span className="hidden sm:block">·</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-teal" /> מקומות מוגבלים</span>
            </div>
            <a
              href="#lead-form"
              className="inline-block px-10 py-4 bg-teal hover:bg-teal/90 text-white font-bold rounded-2xl text-base shadow-lg shadow-teal/30 transition-all duration-200 hover:-translate-y-0.5"
            >
              הגש/י מועמדות למסלול
            </a>
          </div>
        </div>
      </section>

      {/* ─── Lead Form ─── */}
      <section id="lead-form" className="max-w-2xl mx-auto px-6 pb-10">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Send size={24} className="text-teal" />
            </div>
            <h2 className="text-2xl font-black text-navy mb-2">שלח/י לקורל</h2>
            <p className="text-slate-500 text-sm">
              מלא/י את הפרטים ונחזור אליך בהקדם לשיחת התאמה חינמית
            </p>
          </div>
          <LeadForm />
        </div>
      </section>
    </div>
  );
}

