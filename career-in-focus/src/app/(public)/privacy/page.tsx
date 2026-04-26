import Link from "next/link";
export const metadata = { title: "מדיניות פרטיות | קריירה בפוקוס" };
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream px-6 py-12" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>
        <div className="bg-white rounded-2xl p-8 border border-black/5">
          <h1 className="text-3xl font-black text-navy mb-2">מדיניות פרטיות</h1>
          <p className="text-gray-400 text-sm mb-8">עדכון אחרון: ינואר 2026</p>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-5">
            <section>
              <h2 className="font-bold text-navy text-base mb-2">1. מידע שאנו אוספים</h2>
              <p>אנו אוספים: פרטי זיהוי (שם, אימייל, טלפון), מידע מקצועי (תפקיד נוכחי, יעד קריירה, ניסיון), נתוני שימוש, ותמונת פרופיל אם הועלתה.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">2. שימוש במידע</h2>
              <p>המידע משמש ל: מתן השירות, התאמה אישית, ניתוח קריירה AI, שיפור הפלטפורמה, שליחת עדכונים רלוונטיים ותמיכה.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">3. שיתוף מידע</h2>
              <p>אנו לא מוכרים את המידע שלך לצדדים שלישיים. מידע עשוי להישתף עם ספקי שירות הכרחיים (אחסון, תשלומים, אימייל) תחת הסכמי סודיות.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">4. אבטחת מידע</h2>
              <p>אנו משתמשים בהצפנה ובסטנדרטים מקובלים לאבטחת המידע שלך. סיסמאות מאוחסנות בצורה מוצפנת (bcrypt).</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">5. זכויותיך</h2>
              <p>יש לך זכות לעיין במידע שלך, לתקן אותו, למחוק אותו או לבקש ייצוא שלו. פנה אלינו בכתובת המייל המצוינת.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">6. יצירת קשר</h2>
              <p>לשאלות פרטיות: <a href="mailto:privacy@career-in-focus.co.il" className="text-teal hover:underline">privacy@career-in-focus.co.il</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
