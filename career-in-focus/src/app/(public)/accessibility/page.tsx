import Link from "next/link";

export const metadata = { title: "הצהרת נגישות | קריירה בפוקוס" };

/**
 * Accessibility statement page.
 *
 * Israeli law (תקנות שוויון זכויות לאנשים עם מוגבלות [התאמות נגישות
 * לשירות], תשע"ג-2013) requires every business serving the public
 * online to publish an accessibility statement that says, at minimum:
 *
 *   1. The accessibility standard the site is built to (here: WCAG 2.0 AA / IS 5568).
 *   2. Which adjustments are available (font size, contrast, motion, etc.).
 *   3. Known accessibility gaps + a path to report new ones.
 *   4. Contact details of the business's accessibility coordinator.
 *   5. Date of the last review.
 *
 * This page is also linked from the floating widget (components/
 * accessibility/widget.tsx → "הצהרת הנגישות המלאה") and from the
 * footer. The widget itself supplies the practical adjustments.
 */
export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-cream px-6 py-12" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center text-white font-bold text-sm">ק</div>
          <span className="font-bold text-navy">קריירה בפוקוס</span>
        </Link>

        <div className="bg-white rounded-2xl p-8 border border-black/5">
          <h1 className="text-3xl font-black text-navy mb-2">הצהרת נגישות</h1>
          <p className="text-slate-600 text-sm mb-8">עדכון אחרון: מאי 2026</p>

          <div className="prose prose-sm max-w-none text-slate-800 space-y-6">
            <section>
              <h2 className="font-bold text-navy text-base mb-2">מחויבותנו לנגישות</h2>
              <p>
                קריירה בפוקוס פועלת ברציפות להפוך את האתר נגיש לאנשים עם מוגבלויות. אנו מאמינות
                שהזכות לשירות שווה היא ערך יסוד, ופועלות להתאים את הפלטפורמה לתקני הנגישות העדכניים
                ביותר ולשפר אותה באופן מתמשך.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">תקן הנגישות</h2>
              <p>
                האתר מותאם לתקן הישראלי <strong>ת"י 5568</strong> ברמת AA, המבוסס על המלצות
                ה-W3C העולמי: <strong>WCAG 2.1 ברמת AA</strong>. אנו פועלות לעמוד בדרישות תקנות
                שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), תשע"ג-2013.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">התאמות נגישות בפלטפורמה</h2>
              <p>בכל דף באתר מופיע כפתור נגישות צף (האייקון בפינה התחתונה השמאלית) שמאפשר:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>שינוי גודל הטקסט (רגיל / גדול / ענק)</li>
                <li>הפעלת מצב ניגודיות גבוהה (טקסט שחור על רקע לבן)</li>
                <li>ביטול אנימציות ותנועות</li>
                <li>הדגשת קישורים בקווים תחתונים</li>
                <li>הגדלת סמן העכבר</li>
                <li>הדגשת אזור הפוקוס (מתאר עבה סביב האלמנט הנבחר)</li>
              </ul>
              <p className="mt-2">
                ההגדרות נשמרות במכשיר שלך ויחולו אוטומטית בכניסה הבאה.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">תאימות לטכנולוגיות עזר</h2>
              <p>האתר תוכנן לעבוד עם:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>קוראי מסך מובילים (NVDA, JAWS, VoiceOver, TalkBack)</li>
                <li>ניווט מלא במקלדת (Tab / Shift+Tab / Enter / ESC)</li>
                <li>זום בדפדפן עד 200% ללא איבוד תוכן</li>
                <li>תפעול ללא עכבר</li>
                <li>תיאורי טקסט חלופי על תמונות</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">חלקים שעדיין בהתאמה</h2>
              <p>
                למרות מאמצינו, ייתכן שחלקים מסוימים של האתר אינם נגישים במלואם בשלב זה:
              </p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>תוכן וידאו ללא תמלול מלא בשלבים ראשונים — הוספת כתוביות בעבודה</li>
                <li>חלק מהקבצים שמועלים על ידי משתמשים (CV-ים) אינם נגישים אוטומטית</li>
                <li>תוכן צד שלישי (משרות מאתרי דרושים חיצוניים) — הנגישות שלהם אינה באחריותנו</li>
              </ul>
              <p className="mt-2">
                אם נתקלתם בבעיית נגישות שלא צוינה — אנא דווחו לנו לפי הפרטים למטה ונפעל לתקן.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">דיווח על בעיית נגישות</h2>
              <p>
                אם חוויתם קושי בשימוש באתר עקב מוגבלות, נשמח לעזור. פנו אלינו:
              </p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>
                  טופס פנייה ייעודי:&nbsp;
                  <Link
                    href="/contact?topic=accessibility"
                    className="text-teal hover:underline font-semibold"
                  >
                    דיווח נגישות
                  </Link>
                </li>
                <li>נסו לתאר את הדף, את הפעולה שניסיתם לבצע, ואת הקושי שנתקלתם בו</li>
                <li>נחזור אליכם תוך 5 ימי עסקים</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">רכזת הנגישות</h2>
              <p>
                <strong>קורל שלו</strong>, מייסדת קריירה בפוקוס, משמשת כרכזת הנגישות של השירות.
              </p>
              <p className="mt-1">
                ליצירת קשר עם רכזת הנגישות:&nbsp;
                <Link
                  href="/contact?topic=accessibility"
                  className="text-teal hover:underline font-semibold"
                >
                  טופס פנייה לרכזת הנגישות
                </Link>
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">סקירה ועדכון</h2>
              <p>
                הצהרת נגישות זו מתעדכנת בכל פעם שמתבצע שינוי משמעותי באתר. ההצהרה נסקרת לפחות
                פעם בשנה כדי לוודא שהיא משקפת את המצב העדכני של הפלטפורמה.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <Link href="/" className="text-teal hover:underline font-semibold text-sm">
              ← חזרה לעמוד הבית
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
