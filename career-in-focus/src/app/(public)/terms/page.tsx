import Link from "next/link";
export const metadata = { title: "תנאי שימוש | קריירה בפוקוס" };
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream px-6 py-12" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>
        <div className="bg-white rounded-2xl p-8 border border-black/5">
          <h1 className="text-3xl font-black text-navy mb-2">תנאי שימוש</h1>
          <p className="text-gray-400 text-sm mb-8">עדכון אחרון: ינואר 2026</p>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-5">
            <section>
              <h2 className="font-bold text-navy text-base mb-2">1. קבלת התנאים</h2>
              <p>בשימוש בפלטפורמה "קריירה בפוקוס" ("השירות") אתה מסכים לתנאי שימוש אלו. אם אינך מסכים, אנא הפסק להשתמש בשירות.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">2. השירות</h2>
              <p>קריירה בפוקוס מספקת פלטפורמת קהילה למחפשי עבודה בישראל הכוללת: תכנים מקצועיים, כלים לחיפוש עבודה, מעקב התקדמות, קהילה ואירועים. הגישה לפלטפורמה מותנית בתשלום דמי חברות.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">3. חשבון משתמש</h2>
              <p>אתה אחראי לשמירה על סודיות פרטי הכניסה שלך ולכל הפעילות המתבצעת תחת חשבונך. עליך לספק מידע נכון ומדויק בעת ההרשמה.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">4. תשלום ומינוי</h2>
              <p>דמי החברות גובים מראש לפי תוכנית שנבחרה (חודשית / שנתית). חיוב מתבצע דרך CardCom. ניתן לבטל מינוי חודשי בכל עת. מינוי שנתי ניתן לביטול תוך 14 יום מיום ההצטרפות עם החזר מלא.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">5. תוכן ושימוש מותר</h2>
              <p>אסור להעתיק, להפיץ או למכור תכנים מהפלטפורמה ללא אישור מפורש. אסור לשתף פרטי כניסה. אסור להשתמש בפלטפורמה לפעילות בלתי חוקית.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">6. הגבלת אחריות</h2>
              <p>קריירה בפוקוס אינה מתחייבת למציאת עבודה. התכנים מסופקים "כמות שהם" ללא אחריות לתוצאות.</p>
            </section>
            <section>
              <h2 className="font-bold text-navy text-base mb-2">7. יצירת קשר</h2>
              <p>לשאלות ופניות: <a href="mailto:info@career-in-focus.co.il" className="text-teal hover:underline">info@career-in-focus.co.il</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
