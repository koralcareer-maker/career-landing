import Link from "next/link";

export const metadata = { title: "מדיניות פרטיות | קריירה בפוקוס" };

/**
 * Privacy policy.
 *
 * Expanded to cover the data we actually collect now (birthDate,
 * birthPlace, CV files, AI-generated analyses) and to name the
 * specific third-party processors we use, so it satisfies Israel's
 * Privacy Protection Law (חוק הגנת הפרטיות, תשמ"א-1981) +
 * Privacy Protection Regulations (Data Security), תשע"ז-2017.
 *
 * Anyone reading this should walk away knowing:
 *   - exactly what data is collected
 *   - which third-party processors touch it
 *   - how long we keep it
 *   - how they can demand correction or deletion
 *   - who to contact (the privacy email goes to Coral)
 */
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
          <p className="text-slate-600 text-sm mb-8">עדכון אחרון: מאי 2026</p>

          <div className="prose prose-sm max-w-none text-slate-800 space-y-6">
            <section>
              <h2 className="font-bold text-navy text-base mb-2">פתיחה</h2>
              <p>
                קריירה בפוקוס (להלן: &quot;השירות&quot;, &quot;אנחנו&quot;) מחויבת להגן על
                פרטיות המשתמשים/ות. מדיניות זו מסבירה איזה מידע אנו אוספים, איך אנו
                משתמשים בו, עם מי אנו חולקים אותו, ומה הזכויות שלך לפי
                <strong> חוק הגנת הפרטיות התשמ&quot;א-1981</strong> ותקנות הגנת הפרטיות (אבטחת מידע) התשע&quot;ז-2017.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">1. איזה מידע אנו אוספים</h2>
              <p>בעת ההרשמה ושימוש בפלטפורמה אנו אוספים את הקטגוריות הבאות:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li><strong>פרטי זיהוי:</strong> שם מלא, כתובת אימייל, מספר טלפון, סיסמה (מאוחסנת מוצפנת — bcrypt)</li>
                <li><strong>מידע מקצועי:</strong> תפקיד נוכחי, תפקיד יעד, שנות ניסיון, חוזקות, פערי מיומנות, יעדים, תחומי עניין, ערכי עבודה</li>
                <li><strong>קורות חיים:</strong> קובץ ה-CV שאת/ה מעלה (PDF/DOCX) — נשמר בענן ומשמש לניתוח</li>
                <li><strong>פרטים אישיים לניתוח עומק:</strong> תאריך לידה ומקום לידה (אופציונליים — נאספים רק אם בחרת ליצור ניתוח אישיותי)</li>
                <li><strong>פעילות בפלטפורמה:</strong> משרות שצפית/הסתרת/הגשת, התקדמות בקורסים, שיחות עם המאמן AI, פעולות בקהילה</li>
                <li><strong>נתוני חיוב:</strong> פרטי תשלום מועברים ישירות ל-CardCom (אנחנו לא מאחסנים מספרי כרטיס אשראי)</li>
                <li><strong>נתוני שימוש טכניים:</strong> כתובת IP, סוג דפדפן, מערכת הפעלה, עוגיות (להלן)</li>
                <li><strong>תוכן שאת/ה יוצר/ת:</strong> הודעות בקהילה, תגובות, פוסטים</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">2. מטרות השימוש</h2>
              <p>אנו משתמשים במידע אך ורק למטרות הבאות:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>מתן השירות והפלטפורמה</li>
                <li>התאמת תוכן והמלצות אישיות (משרות, קורסים, ניתוחים)</li>
                <li>הפעלת המאמן AI וניתוחי קריירה</li>
                <li>תקשורת איתך (התראות, עדכונים, תמיכה)</li>
                <li>שיפור הפלטפורמה ושירות הלקוחות</li>
                <li>עמידה בהוראות החוק</li>
                <li>מניעת שימוש לרעה והגנה על השירות</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">3. שיתוף מידע עם צדדים שלישיים</h2>
              <p>
                אנחנו <strong>לא מוכרים את המידע שלך לאף אחד</strong>. המידע מועבר לצדדים שלישיים אך ורק עבור הספקת השירות, תחת הסכמי
                סודיות (DPA), והם רשאים להשתמש בו רק למטרה זו:
              </p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li><strong>Vercel</strong> (אחסון השרת והפלטפורמה) — ארה&quot;ב, מאושר GDPR-compliant</li>
                <li><strong>Turso / libSQL</strong> (מסד הנתונים) — אירופה</li>
                <li><strong>Vercel Blob Storage</strong> (אחסון תמונות + קבצי CV) — ארה&quot;ב</li>
                <li><strong>Google Gemini API</strong> (מנוע ה-AI לניתוחי קריירה ולמאמן) — ארה&quot;ב/אירופה. גוגל מתחייבת לא לאמן מודלים על תוכן API לפי מדיניותה.</li>
                <li><strong>Anthropic API</strong> (Claude — מנוע AI חלופי לניתוחים מתקדמים, כשמוגדר) — ארה&quot;ב. Anthropic מתחייבת לא לאחסן/לאמן על תוכן ה-API שלך.</li>
                <li><strong>Resend</strong> (שליחת מיילים — התראות, עדכונים, אישורי חיוב) — אירופה</li>
                <li><strong>CardCom</strong> (סליקת תשלומים) — ישראל, עומדת ב-PCI-DSS</li>
                <li><strong>Sentry / Vercel Analytics</strong> (ניטור שגיאות וביצועים) — מידע אנונימי בלבד</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">4. שמירת המידע ותקופת אחסון</h2>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li><strong>בזמן חברות פעילה:</strong> המידע נשמר כל עוד החשבון שלך פעיל.</li>
                <li><strong>לאחר ביטול חברות:</strong> המידע נשמר עוד עד 18 חודשים לטובת תיעוד חשבונאי וחוקי, ואז נמחק.</li>
                <li><strong>נתוני חיוב:</strong> נשמרים 7 שנים לפי דרישות פקודת מס הכנסה.</li>
                <li><strong>תקשורת תמיכה:</strong> נשמרת עד 3 שנים לטובת שירות איכותי.</li>
                <li><strong>בכל עת:</strong> את/ה רשאי/ת לבקש מחיקה מיידית של החשבון (ראו סעיף 6).</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">5. אבטחת מידע</h2>
              <p>אנו נוקטים באמצעי הגנה מקובלים בתעשייה:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>הצפנת TLS 1.3 בכל התעבורה בין הדפדפן לשרת</li>
                <li>סיסמאות מאוחסנות מוצפנות עם bcrypt (לא ניתנות לפענוח אחורה)</li>
                <li>גישה למסד הנתונים מוגבלת לעובדי הפלטפורמה בלבד</li>
                <li>אסימוני אימות (JWT) חתומים מוצפנים</li>
                <li>גיבויים אוטומטיים מוצפנים</li>
              </ul>
              <p className="mt-2">
                למרות זאת, אף מערכת אינה חסינה לחלוטין. אם תזהי/ה הפרת אבטחה — אנא דווח/י מיד ל-{" "}
                <a href="mailto:privacy@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                  privacy@careerinfocus.co.il
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">6. זכויותיך</h2>
              <p>לפי חוק הגנת הפרטיות יש לך זכויות הבאות, וניתן לממש אותן בכל עת:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li><strong>זכות עיון</strong> — לראות את כל המידע שיש לנו עליך</li>
                <li><strong>זכות תיקון</strong> — לתקן מידע לא מדויק (ניתן ישירות בפרופיל)</li>
                <li><strong>זכות מחיקה</strong> — למחוק את חשבונך ואת כל הנתונים שלך</li>
                <li><strong>זכות ייצוא</strong> — לקבל את כל הנתונים שלך בקובץ JSON</li>
                <li><strong>זכות התנגדות</strong> — להתנגד לעיבוד מסוים של המידע</li>
              </ul>
              <p className="mt-2">
                למימוש זכות כלשהי — שלח/י בקשה ל-{" "}
                <a href="mailto:privacy@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                  privacy@careerinfocus.co.il
                </a>{" "}
                ונחזור אליך תוך 30 יום (לפי דרישת החוק).
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">7. עוגיות (Cookies)</h2>
              <p>אנו משתמשים בעוגיות חיוניות בלבד עבור:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>שמירת מצב התחברות (session cookies)</li>
                <li>שמירת הגדרות תצוגה (כולל הגדרות נגישות)</li>
                <li>הגנה מפני התקפות CSRF</li>
              </ul>
              <p className="mt-2">לא משתמשים בעוגיות פרסום או מעקב צד-שלישי.</p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">8. קטינים</h2>
              <p>
                השירות מיועד למשתמשים מעל גיל 18. אם הינך מתחת לגיל 18, נדרשת הסכמת הורה/אפוטרופוס.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">9. שינויים במדיניות</h2>
              <p>
                נעדכן מדיניות זו מעת לעת. שינויים מהותיים יישלחו אליך באימייל לפחות 14 יום לפני
                כניסתם לתוקף. תאריך העדכון האחרון מופיע למעלה.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-navy text-base mb-2">10. יצירת קשר</h2>
              <p>לכל פנייה בנושאי פרטיות:</p>
              <ul className="list-disc pr-5 space-y-1 mt-2">
                <li>אימייל:&nbsp;
                  <a href="mailto:privacy@careerinfocus.co.il" className="text-teal hover:underline font-semibold">
                    privacy@careerinfocus.co.il
                  </a>
                </li>
                <li>אחראית הפרטיות בארגון: <strong>קורל שלו</strong></li>
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
