import Link from "next/link";

export const metadata = { title: "תנאי שימוש | קריירה בפוקוס" };

/**
 * Terms of Service.
 *
 * Expanded so the paid membership tiers (49₪ / 149₪ / 499₪) are
 * covered by Israel's Consumer Protection Law obligations:
 *
 *   - תקופת cooling-off של 14 יום לפי חוק הגנת הצרכן התשמ"א-1981
 *   - אופן הביטול (איך מבטלים, למי פונים, מה הזיכוי)
 *   - האם יש קנס ביטול (יכול עד 5% או 100₪, הנמוך מביניהם)
 *   - חידוש אוטומטי + איך לעצור אותו
 *
 * Also explicit limitation of liability and a Hebrew governing-law
 * clause so disputes don't get drag to a foreign forum.
 */
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
          <p className="text-slate-600 text-sm mb-8">עדכון אחרון: מאי 2026</p>

          <div className="prose prose-sm max-w-none text-slate-800 space-y-6">
            <section>
              <h2 className="font-bold text-navy text-base mb-2">1. קבלת התנאים</h2>
              <p>
                בהרשמתך ושימושך בפלטפורמת &quot;קריירה בפוקוס&quot; (להלן: &quot;השירות&quot;)
                את/ה מסכים/ה לתנאי שימוש אלו במלואם. אם אינך מסכים/ה, אנא הימנע/י משימוש בשירות.
                התנאים מחייבים מהרגע שבחרת את/ה לפעול בפלטפורמה.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">2. השירות</h2>
              <p>
                קריירה בפוקוס מפעילה פלטפורמה דיגיטלית למחפשי/ות עבודה בישראל, הכוללת תכנים
                מקצועיים, כלי ניתוח קריירה מבוססי AI, לוח משרות, מעקב התקדמות, קהילה, אירועים,
                מאמן AI אישי וכלים מקצועיים נוספים. השירות מתעדכן באופן שוטף ועשוי להשתנות
                מעת לעת.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">3. חשבון משתמש</h2>
              <p>
                את/ה אחראי/ת לסודיות פרטי הכניסה שלך ולכל פעילות בחשבונך. בעת ההרשמה את/ה
                מתחייב/ת לספק פרטים נכונים ומדויקים. השירות שומר את הזכות לחסום או למחוק
                חשבון שמפר את התנאים.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">4. תוכניות חברות ותשלום</h2>
              <p>הגישה לחלק מהפיצ&apos;רים מותנית במנוי בתשלום. התוכניות הנוכחיות:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li><strong>חבר (49 ש&quot;ח לחודש)</strong> — גישה לתכנים, לוח המשרות, ומאמן AI עם 10 שאלות ליום</li>
                <li><strong>פרו (149 ש&quot;ח לחודש)</strong> — כל מה שב-&quot;חבר&quot; + 50 שאלות יומיות למאמן, ניתוח CV מורחב, כלים מתקדמים</li>
                <li><strong>VIP (499 ש&quot;ח לחודש)</strong> — כל מה שב-&quot;פרו&quot; + מאמן AI ללא הגבלה, ליווי אישי</li>
              </ul>
              <p className="mt-2">
                התשלום נגבה מראש דרך CardCom (סולק מוסמך PCI-DSS). אנחנו לא שומרים פרטי כרטיס אשראי.
              </p>
              <p className="mt-2">
                <strong>חידוש אוטומטי:</strong> המנוי מתחדש אוטומטית בסוף כל תקופת חיוב. ניתן לעצור
                את החידוש בכל עת דרך עמוד &quot;המנוי שלי&quot; או בפנייה אלינו.
              </p>
            </section>

            <section className="bg-teal/5 border border-teal/30 rounded-xl p-4">
              <h2 className="font-bold text-navy text-base mb-2">5. זכות ביטול (14 יום) — לפי חוק הגנת הצרכן</h2>
              <p>
                בהתאם לחוק הגנת הצרכן התשמ&quot;א-1981 (תקנות הגנת הצרכן: ביטול עסקה, התשע&quot;א-2010),
                <strong> יש לך זכות לבטל את העסקה תוך 14 ימים</strong> מיום ההצטרפות, ולקבל
                החזר כספי מלא — בניכוי דמי ביטול כקבוע בחוק (5% או 100 ש&quot;ח, הנמוך מביניהם).
              </p>
              <p className="mt-2">
                <strong>איך מבטלים?</strong> שלח/י הודעת ביטול לאחת מהדרכים הבאות:
              </p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>אימייל:&nbsp;
                  <a href="mailto:cancel@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                    cancel@careerinfocus.co.il
                  </a>
                </li>
                <li>טופס ביטול בעמוד &quot;המנוי שלי&quot;</li>
                <li>פנייה בכתב לקורל שלו, מייסדת קריירה בפוקוס</li>
              </ul>
              <p className="mt-2">
                <strong>מועד ההחזר:</strong> ההחזר יתבצע תוך 14 יום מיום קבלת הבקשה, באמצעי התשלום
                שבו בוצעה העסקה.
              </p>
              <p className="mt-2 text-sm">
                לאחר תום 14 הימים, ניתן לבטל מנוי חודשי בכל עת לקראת תקופת החיוב הבאה (ללא החזר על
                החודש שכבר חויב), ומנוי שנתי לפי שיקול דעת ההנהלה ובהתאם לחוק.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">6. תוכן ושימוש מותר</h2>
              <p>בעת השימוש בפלטפורמה את/ה מתחייב/ת:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>לא להעתיק, להפיץ, למכור או לפרסם תכנים מהפלטפורמה ללא אישור מפורש</li>
                <li>לא לשתף פרטי כניסה עם אחרים</li>
                <li>לא להשתמש בפלטפורמה לפעילות בלתי-חוקית או פוגענית</li>
                <li>לא לפרסם תוכן פוגעני, גזעני, מאיים, או מפר זכויות יוצרים בקהילה</li>
                <li>לא להפעיל בוטים, מכשירי scraping או כלים אוטומטיים ללא אישור</li>
              </ul>
              <p className="mt-2">
                הפרה של הסעיף עלולה לגרור חסימה מיידית של החשבון ללא החזר.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">7. תוכן שהמשתמש/ת מעלה</h2>
              <p>
                בעת העלאת תוכן (CV, פוסטים, תגובות) את/ה שומר/ת על מלוא הזכויות שלך, אך מעניק/ה לנו
                רישיון לא-בלעדי להציג, לעבד ולנתח את התוכן לצורך מתן השירות. אנחנו לא משתמשים
                בתוכן שלך לאימון מודלי AI ולא משתפים אותו עם משתמשים אחרים אלא לפי הסכמתך
                המפורשת (לדוגמה: פוסטים בקהילה).
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">8. ניתוחי AI</h2>
              <p>
                הפלטפורמה משתמשת במנועי AI (Google Gemini, Anthropic Claude) לניתוחי קריירה,
                מאמן אישי, וכתיבת תוצרים. <strong>הניתוחים מסופקים &quot;כמות שהם&quot;</strong> ומהווים
                כלי עזר בלבד — אינם מהווים תחליף לייעוץ קריירה מקצועי אישי. ההחלטות שלך הן באחריותך.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">9. הגבלת אחריות</h2>
              <p>
                קריירה בפוקוס אינה מתחייבת למציאת עבודה, לאיכות תוצאות הניתוחים, או לדיוק המשרות
                המוצגות בלוח (חלקן נשאבות מאתרי דרושים חיצוניים). השירות מסופק &quot;כמות שהוא&quot;,
                ללא אחריות מכל סוג, מפורשת או משתמעת. בכל מקרה אחריותנו לא תעלה על סכום דמי המנוי
                ששילמת בששת החודשים שקדמו לתביעה.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">10. שינויים בתנאים</h2>
              <p>
                אנו רשאים לעדכן את התנאים מעת לעת. שינויים מהותיים יישלחו אליך באימייל לפחות 14 יום
                לפני כניסתם לתוקף. המשך השימוש בפלטפורמה לאחר מכן יחשב כהסכמה לתנאים החדשים.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">11. דין וסמכות שיפוט</h2>
              <p>
                על השימוש בפלטפורמה יחול הדין הישראלי בלבד. בכל מחלוקת תהיה סמכות שיפוט בלעדית
                לבתי המשפט המוסמכים במחוז תל אביב-יפו.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">12. יצירת קשר</h2>
              <p>לכל שאלה בנוגע לתנאי השימוש:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>אימייל כללי:&nbsp;
                  <a href="mailto:info@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                    info@careerinfocus.co.il
                  </a>
                </li>
                <li>ביטולים:&nbsp;
                  <a href="mailto:cancel@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                    cancel@careerinfocus.co.il
                  </a>
                </li>
                <li>פרטיות:&nbsp;
                  <a href="mailto:privacy@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                    privacy@careerinfocus.co.il
                  </a>
                </li>
              </ul>
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
