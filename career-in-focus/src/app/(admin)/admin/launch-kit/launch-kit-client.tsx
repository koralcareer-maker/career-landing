"use client";

import { useState } from "react";
// We deliberately avoid lucide's brand-specific icons (Facebook, Linkedin,
// etc.) because they're stripped from the build in some lucide versions
// — and they make the design feel like an ad. Generic icons read
// cleaner anyway.
import {
  Megaphone, Search, Mail, Newspaper, Briefcase, MessagesSquare,
  Handshake, MessageCircle, Copy, CheckCircle2, ChevronDown, ChevronUp,
  Target, Sparkles, TrendingUp,
} from "lucide-react";

/**
 * Launch Kit UI — all campaign content organised into collapsible
 * sections. Each "block" is a single chunk of copy with its own
 * one-click Copy button.
 */

interface Block {
  /** Short identifier shown above the block (e.g. "טקסט הפוסט"). */
  label: string;
  /** Optional hint shown under the label (e.g. "Hebrew, ~140 chars"). */
  hint?: string;
  /** The actual copyable content. */
  text: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** One-line summary shown when section is collapsed. */
  summary: string;
  /** Optional metadata strip (budget, targets, etc.) shown when open. */
  meta?: { label: string; value: string }[];
  /** The actual copy blocks. */
  blocks: Block[];
  /** Action tips that aren't copyable, just guidance. */
  tips?: string[];
}

// ─── All sections ───────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "meta-ads",
    title: "Meta Ads (Facebook + Instagram)",
    icon: MessagesSquare,
    summary: "הערוץ העיקרי לתשלום — קופי לסטטיק + וידאו + Targeting",
    meta: [
      { label: "תקציב מומלץ", value: "200-300 ש\"ח/יום × 7 ימים" },
      { label: "סה\"כ", value: "1,400-2,100 ש\"ח" },
      { label: "יעד CPA", value: "25-50 ש\"ח למשלמ/ת" },
      { label: "צפי", value: "30-90 לקוחות חדשים" },
    ],
    blocks: [
      {
        label: "קריאייטיב 1 — סטטיק (כאב)",
        hint: "טקסט מעל לתמונה",
        text: `"שלחתי 47 קורות חיים. קיבלתי 3 תגובות."`,
      },
      {
        label: "קריאייטיב 1 — גוף הפוסט",
        text: `זה לא בעיה שלך. זו בעיה של איך את/ה מחפש/ת.

87% מהמשרות בישראל לעולם לא מגיעות ללוחות הדרושים. החלום שלך נמצא בשוק הסמוי — ויש לי מערכת שתעזור לך להגיע אליו.

✓ דרכון קריירה שמגלה את החוזקות שלך
✓ מאמן AI אישי שמכיר אותך
✓ אלפי משרות עם ציון התאמה אישי
✓ קהילה מקצועית של מחפשי עבודה

🎁 השקה: חודש ראשון ב-19 ש"ח (במקום 49)

👇 הצטרפו עכשיו`,
      },
      {
        label: "קריאייטיב 2 — Script לסרטון 15 שניות",
        hint: "סלפי מצלמת טלפון, רקע נקי, אור טבעי. סבטייטל גדול בעברית",
        text: `אני קורל. 10 שנים בגיוס וייעוץ קריירה.

ראיתי איך אנשים מצוינים נתקעים — לא בגלל כישורים, אלא בגלל שאין להם מערכת.

בניתי את קריירה בפוקוס בשבילך: דרכון AI אישי + מאמן AI + אלפי משרות + קהילה.

חודש ראשון ב-19 ש"ח. תצטרפ/י עכשיו 👇`,
      },
      {
        label: "Targeting — Audience",
        text: `Age: 25-45
Location: Israel
Language: Hebrew
Interests: Job hunting, Career development, LinkedIn, דרושים, חיפוש עבודה, תעסוקה
Lookalike Audience: רשימת 1,000 הבוגרים שלך → Lookalike 1% Israel
Exclude: מי שכבר ביקר ב-app.careerinfocus.co.il (Pixel)`,
      },
    ],
    tips: [
      "התקיני Meta Pixel ב-Vercel לפני שמתחילים — זה מאפשר retargeting + lookalike, מכפיל יעילות תוך 3 ימים. אם תרצי, אני יכול להוסיף את הקוד.",
      "התחילי עם תקציב נמוך (100 ש\"ח/יום) ל-2-3 ימים. אם CPA נמוך מ-50 ש\"ח — העלי ל-300 ש\"ח/יום.",
    ],
  },
  {
    id: "google-ads",
    title: "Google Ads — Search intent",
    icon: Search,
    summary: "מודעות לאנשים שכבר מחפשים בגוגל",
    meta: [
      { label: "תקציב מומלץ", value: "100-150 ש\"ח/יום × 7 ימים" },
      { label: "סה\"כ", value: "700-1,000 ש\"ח" },
      { label: "יעד CPA", value: "30-60 ש\"ח" },
    ],
    blocks: [
      {
        label: "Keywords (Phrase match)",
        text: `"מאמן קריירה"
"ייעוץ קריירה"
"חיפוש עבודה"
"איך למצוא עבודה"
"ניתוח קריירה"
"כלים לחיפוש עבודה"
"מאמן AI"
"דרכון קריירה"`,
      },
      {
        label: "מודעה A",
        text: `Headline 1: מאמן קריירה AI אישי
Headline 2: חודש ראשון 19₪
Description: דרכון קריירה · אלפי משרות · קהילה מקצועית. ביטול בכל עת.`,
      },
      {
        label: "מודעה B",
        text: `Headline 1: תקועה בחיפוש עבודה?
Headline 2: מערכת חכמה ב-19₪
Description: AI שמכיר את הפרופיל שלך, ממליץ על המשרות הנכונות. השקה השבוע.`,
      },
      {
        label: "מודעה C",
        text: `Headline 1: 87% מהמשרות סמויות
Headline 2: זוהי המערכת שתחבר אותך
Description: דרכון קריירה אישי + מאמן AI + משרות מתחת לרדאר. הצטרפי ב-19₪ לחודש.`,
      },
    ],
  },
  {
    id: "fb-personal",
    title: "פוסט פייסבוק אישי",
    icon: Megaphone,
    summary: "סטוריטלינג לפיד שלך — אישי, לא מכירתי",
    blocks: [
      {
        label: "גוף הפוסט",
        text: `כל שבוע מגיעות אליי 10-15 הודעות:
"קורל, שלחתי 50 CVs, אף תגובה. מה אני עושה לא נכון?"

10 שנים אני עוזרת לאנשים לעבור לתפקיד הבא. הבנתי שהבעיה היא לא ה-CV. הבעיה היא שאין מערכת.

אין דרכון של חוזקות אמיתיות.
אין כלי שמגלה משרות מתחת לרדאר.
אין מאמן שיגיד "עצרי — נסחי את זה אחרת".
אין קהילה שמחזיקה כשקשה.

השבוע אני סוף סוף משחררת מה שעבדתי עליו שנה: קריירה בפוקוס 🚀

פלטפורמה אחת שמכילה את כל מה שלמדתי + AI אישי שמלווה ב-24/7.

🎁 חודש השקה: 19 ש"ח (במקום 49).
את/ה לא חייב/ת לעשות את זה לבד.

👇
🔗 app.careerinfocus.co.il

#קריירהבפוקוס #חיפושעבודה #ייעוץקריירה`,
      },
    ],
  },
  {
    id: "linkedin",
    title: "פוסט לינקדאין",
    icon: Briefcase,
    summary: "טון מקצועי לקהל B2B + מחפשי עבודה רציניים",
    blocks: [
      {
        label: "גוף הפוסט",
        text: `87% מהמשרות בישראל לא מתפרסמות ב-LinkedIn ולא ב-Drushim.

אחרי 10 שנים בגיוס וייעוץ קריירה — בניתי מערכת שמטרגטת בדיוק את המשרות הסמויות הללו:

🎯 דרכון קריירה — ניתוח חוזקות, פערים ותפקידי יעד
🤖 מאמן AI אישי — מכיר את הפרופיל המלא שלך, עונה תוך שניות
💼 לוח משרות חכם — ציון התאמה אישי לכל משרה (1000+ פעילות)
👥 קהילה מקצועית — 500+ מחפשי עבודה

השקה השבוע: חודש ראשון ב-19 ש"ח.

🔗 app.careerinfocus.co.il

#CareerInIsrael #JobSearch #CareerDevelopment #ייעוץקריירה`,
      },
    ],
  },
  {
    id: "email-sequence",
    title: "רצף מייל לרשימת הבוגרים (3 מיילים)",
    icon: Mail,
    summary: "סיקוונס אוטומטי על פני 4 ימים — הקנל החזק ביותר",
    meta: [
      { label: "צפי המרה", value: "8-12% מהפותחים" },
      { label: "מתוך 1,000 בוגרים", value: "20-30 משלמים" },
    ],
    blocks: [
      {
        label: "מייל 1 — נושא",
        text: `🚀 השקנו את מה שתמיד רציתי לבנות עבורך`,
      },
      {
        label: "מייל 1 — גוף",
        hint: "ביום ההשקה",
        text: `היי [שם],

אם ליווינו אותך בעבר — תודה. ראיתי אותך מצליחה.

השבוע אני משחררת את קריירה בפוקוס — מערכת שלמה שמכילה את כל 10 השנים שלי בגיוס וייעוץ קריירה. דרכון AI, מאמן אישי, אלפי משרות, קהילה.

כבוגרת — חודש ראשון ב-19 ש"ח (בלעדי לרשימה שלי).

[כפתור גדול: הצטרפי עכשיו]

מאחלת לך עוד הצלחה,
קורל`,
      },
      {
        label: "מייל 2 — נושא",
        text: `4 כלים שאת מקבלת ב-19 ש"ח`,
      },
      {
        label: "מייל 2 — גוף",
        hint: "יומיים אחרי המייל הראשון",
        text: `[שם], אם פספסת את ההשקה — קצרצר על מה שיש פנים:

✓ דרכון קריירה — ניתוח AI שמזהה את החוזקות הייחודיות שלך, פערי המיומנות שמעכבים אותך, ותפקידים שהכי מתאימים

✓ מאמן AI — שאלי כל שאלה ("איך אכתוב מכתב מקדים לחברה X?", "מה לעשות כשמגייסת לא חוזרת?"). תשובות מבוססות על הפרופיל שלך — לא טיפים גנריים

✓ משרות עם ציון התאמה — 1,000+ משרות פעילות, כל אחת עם ציון אישי מ-0 עד 100. לא עוד 200 משרות לעבור עליהן — רק 20 שכדאי באמת

✓ קהילה + ליווי — 500+ אנשים בדיוק במצב שלך

19 ש"ח לחודש ראשון. ביטול בכל עת.

[כפתור: הצטרפי]`,
      },
      {
        label: "מייל 3 — נושא",
        text: `⏰ נשארו 3 ימים למחיר ההשקה`,
      },
      {
        label: "מייל 3 — גוף",
        hint: "4 ימים אחרי המייל הראשון",
        text: `[שם],

סיפור שקיבלתי השבוע מ-[שם משתמש/ת חדש/ה]:

"3 חודשים שלחתי קורות חיים בלי תשובה. השבוע, אחרי הניתוח של הדרכון הבנתי שהמיקוד שלי היה לא נכון. שיניתי גישה — קיבלתי 4 ראיונות תוך שבוע."

זאת הסיבה שבניתי את זה.

3 ימים נשארו למחיר ההשקה של 19 ש"ח. אחרי זה — 49 ש"ח.

[כפתור: הצטרפי ב-19 ש"ח]`,
      },
    ],
  },
  {
    id: "press",
    title: "Pitch לעיתונאים",
    icon: Newspaper,
    summary: "סיקור חינמי = מכפיל פי 3 על הכל",
    meta: [
      { label: "כתבת כלכלה", value: "Globes / Calcalist / TheMarker / ynet" },
    ],
    blocks: [
      {
        label: "מיילים של עורכי קריירה",
        text: `Globes: jobs@globes.co.il
Calcalist: careers@calcalist.co.il
ynet כלכלה: business@ynet.co.il
TheMarker: info@themarker.com`,
      },
      {
        label: "נושא המייל",
        text: `סטארטאפ ישראלי — AI לחיפוש עבודה בעברית`,
      },
      {
        label: "גוף המייל",
        text: `שלום [שם הכתב/ת],

אני קורל שלו, מאמנת קריירה (M.A. בייעוץ קריירה, 10+ שנות ניסיון בגיוס). השבוע השקתי את קריירה בפוקוס — פלטפורמה ישראלית שמשלבת AI עם ליווי קריירה אישי.

חשבתי שזה עשוי לעניין אותך — שלוש זוויות פוטנציאליות:

1. הסיפור של הפלטפורמה (סטארטאפ ישראלי, נבנה בשנה)
2. AI בעבודה (איך זה משנה גיוס בישראל)
3. הצלחת לקוח/ה ראשון (אני יכולה לקשר אותך)

מצורף press kit עם נתונים + לוגו + תמונות.

אשמח לראיון בטלפון/זום באורך 15-30 דק'.

בברכה,
קורל שלו
[טלפון]
[קישור לאתר]`,
      },
    ],
    tips: [
      "הכיני Press Kit ב-Google Drive: 2-3 תמונות מקצועיות שלך + לוגו + One-pager עם 5 נתונים (500 בוגרים, 1000 משרות, וכו') + 3 ציטוטים שלך לסיקור.",
      "סיקור חינמי באחד מהאתרים האלה מביא 5,000-15,000 ביקורים תוך 24 שעות. ROI לאין-ערוך.",
    ],
  },
  {
    id: "partner-dm",
    title: "DM לפרטנרים (מאמני קריירה אחרים)",
    icon: Handshake,
    summary: "אפיליאט: 35% עמלה רבת-חיים על כל הפניה",
    blocks: [
      {
        label: "DM לקוצ'רים בלינקדאין",
        text: `היי [שם],

[משהו אישי על הפוסט/תוכן שלהם — חובה!]. כתיבה מצוינת על [נושא].

אני בונה כלי שאני חושבת שיכול להעצים את הלקוחות שלך — דרכון קריירה שמספק ניתוח חוזקות וכיוונים תוך 5 דקות. רוב הזמן זה לוקח 2-3 פגישות.

אשמח לתת לך גישה חינם בתמורה לפידבק. אם בסוף תרצי לקדם לקליינטים שלך, יש לי תוכנית אפיליאט (35% עמלה רבת-חיים על כל הפניה).

[קישור]

מתי טוב לך ל-15 דק' זום?

בברכה, קורל`,
      },
    ],
    tips: [
      "מי לפנות: מאמני קריירה בלינקדאין (חיפוש 'מאמן קריירה' location: Israel), בעלי קורסי קריירה, קוצ'רים שכותבים על קריירה במדיום או בבלוגים אישיים.",
      "אם פרטנרשיפים מתחילים לעבוד — תגידי לי ואני אבנה לך מערכת affiliate links מלאה בקוד (קוד הפניה ייחודי, dashboard עמלות, וכו').",
    ],
  },
  {
    id: "fb-groups",
    title: "פוסטים לקבוצות פייסבוק",
    icon: MessageCircle,
    summary: "10 קבוצות גדולות = 500-1,500 ביקורים",
    blocks: [
      {
        label: "לקבוצות \"חיפוש עבודה\"",
        text: `שלום לכולם 🙋‍♀️
בניתי כלי שאני חושבת שיעזור לחלקכם:
דרכון קריירה שמנתח את החוזקות שלך ב-5 דקות, ולוח משרות עם ציון התאמה אישי לכל משרה.
השבוע השקה — חודש ראשון ב-19 ש"ח.
app.careerinfocus.co.il`,
      },
      {
        label: "לקבוצות \"אמהות חוזרות לעבודה\"",
        text: `חזרה לעבודה אחרי לידה זה אתגר. בניתי מערכת שעוזרת לזהות מה משלים אצלך גם אחרי הפסקה — דרכון קריירה + ליווי אישי.
19 ש"ח חודש ראשון.
app.careerinfocus.co.il`,
      },
      {
        label: "לקבוצות \"הסבת מקצוע\"",
        text: `רוצה לעבור לתחום חדש אבל לא בטוחה מה מתאים לך? הדרכון שלנו עושה ניתוח AI של 10 פרמטרים ומחזיר את 5 התפקידים שהכי מתאימים לחוזקות שלך.
19 ש"ח לחודש ראשון.
app.careerinfocus.co.il`,
      },
      {
        label: "לקבוצות הייטק",
        text: `קולגות הייטק 👋
לאחר 10 שנים בגיוס הייטק בישראל — בניתי כלי AI שמעלה את שיעור הראיונות שלך.
דרכון קריירה אישי + מאמן AI + לוח משרות חכם.
19 ש"ח לחודש ראשון.
app.careerinfocus.co.il`,
      },
    ],
  },
];

// ─── UI ──────────────────────────────────────────────────────────────

export function LaunchKitClient() {
  // Track which sections are open + which blocks were just copied
  // (so we can swap the icon to a check-mark for 2 seconds).
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SECTIONS.map((s) => [s.id, true])),
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));
  }

  async function copyBlock(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fall back — older browsers / iframes.
      window.prompt("העתיקי את הטקסט:", text);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl" dir="rtl">
      {/* Page header */}
      <header className="bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white rounded-3xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-teal/20 border border-teal/40">
            <Megaphone size={20} className="text-teal" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal">ערכת השקה</p>
            <h1 className="text-2xl sm:text-3xl font-black">כל הקמפיינים במקום אחד</h1>
          </div>
        </div>
        <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
          לחצי על &quot;העתקה&quot; ליד כל בלוק טקסט והדביקי איפה שצריך. הכל מותאם
          אישית לקריירה בפוקוס. הצעת מסלול ביצוע נמצאת בתחתית.
        </p>

        {/* Expected results banner */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <StatPill
            icon={<Target size={14} />}
            label="צפי תנועה"
            value="8,000-14,000 ביקורים"
          />
          <StatPill
            icon={<Sparkles size={14} />}
            label="צפי הרשמות"
            value="180-500 חברים"
          />
          <StatPill
            icon={<TrendingUp size={14} />}
            label="צפי משלמים"
            value="90-265 לקוחות"
          />
        </div>
      </header>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections[section.id];
        return (
          <section
            key={section.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Collapsible header */}
            <button
              type="button"
              onClick={() => toggle(section.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-slate-50 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal/10 text-teal-dark shrink-0">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black text-navy text-right">{section.title}</h2>
                <p className="text-xs text-slate-500 text-right mt-0.5 truncate">{section.summary}</p>
              </div>
              {isOpen ? (
                <ChevronUp size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
              )}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">
                {section.meta && section.meta.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 rounded-xl p-3">
                    {section.meta.map((m) => (
                      <div key={m.label}>
                        <p className="text-slate-500 font-semibold mb-0.5">{m.label}</p>
                        <p className="font-bold text-navy">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {section.blocks.map((b, idx) => {
                  const key = `${section.id}-${idx}`;
                  const justCopied = copiedKey === key;
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-navy">{b.label}</p>
                          {b.hint && <p className="text-[11px] text-slate-500 mt-0.5">{b.hint}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyBlock(key, b.text)}
                          aria-label={`העתקת: ${b.label}`}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            justCopied
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-teal text-white hover:bg-teal-dark"
                          }`}
                        >
                          {justCopied ? (
                            <>
                              <CheckCircle2 size={12} aria-hidden="true" />
                              הועתק
                            </>
                          ) : (
                            <>
                              <Copy size={12} aria-hidden="true" />
                              העתקה
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 text-sm whitespace-pre-wrap break-words font-sans text-navy leading-relaxed">
                        {b.text}
                      </pre>
                    </div>
                  );
                })}

                {section.tips && section.tips.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    {section.tips.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-700 shrink-0">💡</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Execution plan */}
      <section className="bg-white rounded-2xl border-2 border-teal/40 p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-black text-navy mb-3 flex items-center gap-2">
          <Target size={18} className="text-teal-dark" aria-hidden="true" />
          סדר הביצוע השבועי
        </h2>
        <ol className="space-y-2 text-sm">
          {[
            { day: "היום", action: "Google Search Console + הוספת sitemap (15 דק')" },
            { day: "היום", action: "מייל #1 לרשימת הבוגרים (1,000+ אנשים)" },
            { day: "מחר", action: "פוסט פייסבוק אישי + פוסט לינקדאין" },
            { day: "מחר-שלישי", action: "וואטסאפ אישי לרשת חברים (50-100 הודעות)" },
            { day: "שלישי", action: "הפעלת קמפיין Meta Ads (3,000-5,000 ש\"ח לשבוע)" },
            { day: "שלישי", action: "שליחת Pitch ל-4 עיתונאים" },
            { day: "רביעי", action: "פרסום ב-10 קבוצות פייסבוק" },
            { day: "רביעי", action: "מייל #2 לרשימת הבוגרים" },
            { day: "חמישי", action: "DM ל-20 מאמני קריירה (פרטנרשיפים)" },
            { day: "חמישי", action: "פנייה אישית למי שצפה ולא נרשם" },
            { day: "שישי", action: "מייל #3 (תזכורת סיום מבצע)" },
            { day: "שישי", action: "בדיקת תוצאות בדשבורד /admin" },
          ].map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="text-xs font-bold bg-teal/10 text-teal-dark rounded-md px-2 py-0.5 shrink-0 min-w-[56px] text-center">
                {step.day}
              </span>
              <span className="text-navy leading-relaxed">{step.action}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function StatPill({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
      <p className="text-[11px] text-white/70 flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className="text-sm font-black text-white mt-0.5">{value}</p>
    </div>
  );
}
