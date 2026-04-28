"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Check, MessageCircle, Users, Mail, Linkedin } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "whatsapp" | "email" | "linkedin";
type Target = "recruiter" | "referral" | "cold";

interface Prompt {
  id: string;
  title: string;
  description: string;
  channel: Channel;
  target: Target;
  template: string;
}

// ─── Prompts Data ─────────────────────────────────────────────────────────────

const PROMPTS: Prompt[] = [
  // ── מגייס | וואטסאפ ───────────────────────────────────────────────────────
  {
    id: "rec-wa-1",
    title: "פנייה למגייס — הכרות ראשונית",
    description: "לפנייה ראשונה למגייס שלא מכיר אותך",
    channel: "whatsapp",
    target: "recruiter",
    template: `שלום [שם המגייס] 😊

קוראים לי [שמך] ואני [תפקידך הנוכחי / מה אתה מחפש].

נתקלתי בפרופיל שלך בלינקדאין ונראה שאתה עובד עם חברות בתחום [תחום].

אשמח לשמוע אם יש לך משרות רלוונטיות ב-[סוג תפקיד] — [תיאור קצר שלך ב-1-2 משפטים].

תודה רבה! 🙏`,
  },
  {
    id: "rec-wa-2",
    title: "פנייה למגייס — עקב משרה ספציפית",
    description: "ראית משרה שמתאימה לך וכבר שלחת מועמדות",
    channel: "whatsapp",
    target: "recruiter",
    template: `שלום [שם המגייס],

שמי [שמך], הגשתי מועמדות למשרת [שם המשרה] ב-[שם החברה] לפני מספר ימים.

אני [תיאור קצר — ניסיון, התמחות] ואני מאמין שאני יכול להביא ערך אמיתי לתפקיד הזה.

האם יש לך 5 דקות לשמוע קצת עלי? אשמח לשלוח CV או לדבר בשיחה קצרה.

תודה על הזמן! 🙏`,
  },
  {
    id: "rec-wa-3",
    title: "מעקב אחרי מועמדות",
    description: "שבוע-שבועיים אחרי הגשת CV בלי תשובה",
    channel: "whatsapp",
    target: "recruiter",
    template: `שלום [שם המגייס],

שלחתי לאחרונה מועמדות ל-[שם המשרה] ב-[שם החברה].

רציתי לוודא שה-CV הגיע ולשאול אם יש עדכון כלשהו בנוגע לתהליך.

אני עדיין מאוד מעוניין במשרה — [משפט קצר על הסיבה].

שיהיה לך יום נהדר! 😊`,
  },

  // ── חבר מביא חבר | וואטסאפ ───────────────────────────────────────────────
  {
    id: "ref-wa-1",
    title: "בקשת הפניה מחבר/ה בחברה",
    description: "לפנייה לחבר שעובד בחברה שמעניינת אותך",
    channel: "whatsapp",
    target: "referral",
    template: `היי [שם החבר/ה] 😊

שמעתי שאתה/ת עובד/ת ב-[שם החברה] — ממש נחמד!

אני בתהליך חיפוש עבודה ויש משרה שם שנראית לי מאוד מתאימה: [שם המשרה].

אתה/ת יכול/ה להמליץ עלי פנימית? מבטיח/ה שזה לא יביך — רק אם זה נוח לך לגמרי.

אשמח לשלוח לך את ה-CV ומכתב מוטיבציה קצר.

תודה ענקית! 🙏`,
  },
  {
    id: "ref-wa-2",
    title: "בקשת הפניה מהיכרות דרך שלישי",
    description: "מישהו חיבר ביניכם ואתה פונה בפעם הראשונה",
    channel: "whatsapp",
    target: "referral",
    template: `שלום [שם],

קוראים לי [שמך] — [שם מי שחיבר ביניכם] חיבר בינינו וציין שאתה/ת עובד/ת ב-[שם החברה].

אני [מה אתה עושה — משפט קצר] ומחפש/ת הזדמנות ב-[תחום/תפקיד].

ראיתי שיש משרת [שם המשרה] שנראית לי ממש מתאימה. האם יש אפשרות שתפנה אותי פנימית?

אשמח לשלוח CV ולספר יותר — כל עזרה תתקבל בברכה 🙏`,
  },

  // ── מגייס | אימייל ────────────────────────────────────────────────────────
  {
    id: "rec-email-1",
    title: "מייל ראשון למגייס",
    description: "פנייה מקצועית ומובנית למגייס בדוא\"ל",
    channel: "email",
    target: "recruiter",
    template: `שורת נושא: [שמך] | [תפקיד] | [X שנות ניסיון]

שלום [שם המגייס],

שמי [שמך] ואני [תיאור מקצועי — תפקיד + ניסיון + מומחיות].

בעקבות פרסום משרת [שם המשרה] ב-[שם החברה], אני פונה אליך ישירות — הרקע שלי ב-[תחום ספציפי] מתאים במיוחד לדרישות.

בין ההישגים המרכזיים שלי:
• [הישג 1 — עם מספרים אם אפשר]
• [הישג 2]
• [הישג 3]

מצורף CV לבחינתך. אשמח לשיחה קצרה של 15 דקות להכיר.

תודה רבה,
[שמך]
[קישור לינקדאין] | [טלפון]`,
  },
  {
    id: "rec-email-2",
    title: "מייל מעקב שבוע לאחר שליחת CV",
    description: "follow-up מנומס שמבדל אותך",
    channel: "email",
    target: "recruiter",
    template: `שורת נושא: מעקב | [שמך] | מועמדות ל-[שם המשרה]

שלום [שם המגייס],

שלחתי לפני כשבוע מועמדות למשרת [שם המשרה] ורציתי לוודא שה-CV הגיע.

בינתיים גיליתי עוד על [שם החברה] — [משהו ספציפי שקראת/שמעת על החברה שגרם לך להתלהב יותר].

אני עדיין מאוד מעוניין ואשמח לעדכון כלשהו.

תודה,
[שמך]`,
  },

  // ── חבר מביא חבר | אימייל ────────────────────────────────────────────────
  {
    id: "ref-email-1",
    title: "מייל לבקשת הפניה",
    description: "בקשה מסודרת ומנומסת מחבר שעובד בחברה",
    channel: "email",
    target: "referral",
    template: `שורת נושא: בקשה קטנה — הפניה ב-[שם החברה]

היי [שם החבר],

אני יודע שאתה/ת עובד/ת ב-[שם החברה] ויש משרה שם שנראית לי מאוד מעניינת: [שם המשרה].

הרקע שלי ב-[תחום] ו-[ניסיון רלוונטי] מתאים לדרישות, ואני מאמין שיש לי מה לתרום.

אם זה נוח לגמרי לך — הפניה פנימית יכולה לעזור מאוד. מצרף CV ומכתב מוטיבציה קצר.

אם זה לא במקום — אין בעיה בכלל, אני מעריך בכל מקרה 😊

תודה רבה,
[שמך]`,
  },

  // ── מגייס | לינקדאין ────────────────────────────────────────────────────
  {
    id: "rec-li-1",
    title: "הודעת InMail למגייס",
    description: "הודעה קצרה ואפקטיבית ב-LinkedIn",
    channel: "linkedin",
    target: "recruiter",
    template: `שלום [שם המגייס],

אני [שמך], [תפקיד] עם [X שנות ניסיון] ב-[תחום].

ראיתי שאתה עובד עם חברות בתחום [תחום] — אשמח לדעת אם יש הזדמנויות רלוונטיות.

[משפט אחד על הערך שלך — מה אתה מביא שמייחד אותך].

נשמח להתחבר! 🙏`,
  },
  {
    id: "rec-li-2",
    title: "הודעת Connection Request למנהל גיוס",
    description: "הודעת חיבור קצרה שמובילה לשיחה",
    channel: "linkedin",
    target: "recruiter",
    template: `שלום [שם],

אני [שמך] — [תיאור קצר ב-15 מילה מקסימום]. אשמח להתחבר ולשמוע על הזדמנויות בתחום [תחום]. 🙏`,
  },

  // ── היכרות קרה | לינקדאין ─────────────────────────────────────────────────
  {
    id: "cold-li-1",
    title: "פנייה קרה למנהל ישיר בחברת היעד",
    description: "לפנייה למנהל שיכול להיות המגייס שלך",
    channel: "linkedin",
    target: "cold",
    template: `שלום [שם המנהל],

עקבתי אחרי הפוסטים שלך על [נושא מתחום] ומצאתי אותם מאוד מעניינים — במיוחד [מה ספציפי שקראת].

אני [שמך], [תיאור קצר]. אני מאוד מעריץ את מה שאתם עושים ב-[שם החברה] ואשמח לשמוע על הזדמנויות בצוות.

האם אפשר ל-15 דקות שיחה? אני מבטיח לשמור על הזמן.

תודה! 😊`,
  },
  {
    id: "cold-li-2",
    title: "פנייה קרה עם הפניה לתוכן משותף",
    description: "שימוש בעניין משותף כגשר לפתיחת שיחה",
    channel: "linkedin",
    target: "cold",
    template: `שלום [שם],

ראיתי שאנחנו שניים מתעניינים ב-[תחום/נושא] — מצאתי את הפוסט שלך על [נושא] ממש מדויק.

אני [שמך] ועובד/ת ב-[תחום]. אשמח להתחבר ולהחליף רעיונות — וגם לשמוע על [שם החברה] ואם יש הזדמנויות רלוונטיות.

🙏`,
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: "whatsapp", label: "וואטסאפ", icon: <MessageCircle size={16} />, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { id: "email", label: "אימייל", icon: <Mail size={16} />, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { id: "linkedin", label: "לינקדאין", icon: <Linkedin size={16} />, color: "text-sky-700", bg: "bg-sky-50 border-sky-200" },
];

const TARGETS: { id: Target; label: string }[] = [
  { id: "recruiter", label: "מגייס" },
  { id: "referral", label: "חבר מביא חבר" },
  { id: "cold", label: "פנייה קרה" },
];

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp: "#25D366",
  email: "#3B82F6",
  linkedin: "#0A66C2",
};

// ─── Prompt Card ──────────────────────────────────────────────────────────────

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(prompt.template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const channel = CHANNELS.find((c) => c.id === prompt.channel)!;
  const channelColor = CHANNEL_COLORS[prompt.channel];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-navy text-sm mb-0.5">{prompt.title}</h3>
          <p className="text-xs text-slate-400">{prompt.description}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${channel.bg} ${channel.color}`}>
          {channel.icon}
          {channel.label}
        </div>
      </div>

      {/* Template */}
      <div className="px-5 py-4">
        <pre className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans" dir="rtl">
          {prompt.template}
        </pre>
      </div>

      {/* Copy button */}
      <div className="px-5 pb-4">
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: copied ? "#16a34a" : channelColor,
            color: "white",
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "הועתק!" : "העתק תבנית"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function NetworkingClient() {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeTarget, setActiveTarget] = useState<Target | null>(null);

  const filtered = PROMPTS.filter((p) => {
    if (activeChannel && p.channel !== activeChannel) return false;
    if (activeTarget && p.target !== activeTarget) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#1e3a5f] via-[#1b4f8a] to-[#2563eb] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5 transition-colors">
            <ArrowRight size={14} />
            חזרה לכלים
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black">תבניות נטוורקינג</h1>
              <p className="text-white/75 text-sm mt-1">{PROMPTS.length} תבניות · 3 ערוצים · מגייסים, הפניות ופנייה קרה</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            תבניות מוכנות לשימוש לניסוח הודעות נטוורקינג — פשוט העתיקו, התאימו פרטים אישיים ושלחו.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Channel filter */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">ערוץ</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveChannel(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !activeChannel ? "bg-navy text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-navy"
                }`}
              >
                הכל
              </button>
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannel(activeChannel === c.id ? null : c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeChannel === c.id ? `${c.color} ${c.bg} border` : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target filter */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">פנייה אל</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTarget(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !activeTarget ? "bg-navy text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-navy"
                }`}
              >
                הכל
              </button>
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTarget(activeTarget === t.id ? null : t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeTarget === t.id ? "bg-navy text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-navy"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        {(activeChannel || activeTarget) && (
          <p className="text-sm text-slate-500 mb-4">
            נמצאו {filtered.length} תבניות
            <button
              onClick={() => { setActiveChannel(null); setActiveTarget(null); }}
              className="mr-2 text-navy hover:underline"
            >
              נקה
            </button>
          </p>
        )}

        {/* Tips */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-bold text-yellow-800 mb-2">💡 טיפים לשימוש בתבניות</p>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>החליפו את כל הסוגריים המרובעים בפרטים האישיים שלכם</li>
            <li>הוסיפו משהו ספציפי על החברה/האדם — זה עושה את כל ההבדל</li>
            <li>וואטסאפ ולינקדאין — קצרים יותר; אימייל — ניתן להרחיב מעט</li>
            <li>המתינו 5-7 ימים לפני מעקב ושלחו פעם אחת בלבד</li>
          </ul>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-40" />
            <p>לא נמצאו תבניות מתאימות</p>
          </div>
        )}
      </div>
    </div>
  );
}
