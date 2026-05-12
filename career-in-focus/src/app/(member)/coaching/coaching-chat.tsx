"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sendCoachingMessage, clearCoachingChat, type Message } from "@/lib/actions/coaching";
import { createGenderT, type Gender } from "@/lib/gender";
import {
  Send, Trash2, Sparkles, Loader2,
  Briefcase, Building2, MessageSquare, FileText,
  TrendingUp, AlertTriangle, ArrowLeft, Radar,
  Lock,
} from "lucide-react";

// Extend the persisted Message with an optional upgrade-tier flag so we
// can render an inline upgrade CTA under the bot reply when the user
// has just hit their daily quota. The flag is only set client-side
// (server returns CoachingReply with upgradeTo) and is NOT persisted
// to the DB session — when the user reloads, the upgrade banner
// disappears and only the plain message text remains.
type LocalMessage = Message & {
  upgradeTo?: "VIP" | "PREMIUM";
};

// ─── Quick Actions ─────────────────────────────────────────────────────────
// Each action carries TWO strings:
//   - userMessage: the short, natural Hebrew sentence the chat shows as if
//     the user typed it ('מפה לי חברות מתחת לרדאר'). Clean, friendly UX.
//   - prompt: the full multi-paragraph instruction the AI actually receives
//     behind the scenes — the structural rules, the format requirements,
//     the 'don't invent links' guard. Never visible to the user.
// Splitting them makes the chat read naturally while still steering Gemini
// to a specific, professional output structure.
const QUICK_ACTIONS: Array<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  userMessage: string;
  prompt: string;
  tone: "teal" | "purple" | "amber" | "rose" | "emerald" | "navy";
}> = [
  {
    icon: Briefcase,
    label: "מצא לי משרות רלוונטיות",
    tone: "teal",
    userMessage: "מצאי לי 5-7 משרות רלוונטיות עבורי",
    prompt: "תסקרי את המשרות הזמינות לי בלוח המשרות של המערכת לפי תפקיד היעד שלי. תעברי על 5-7 משרות שהכי רלוונטיות מתוך הרשימה במערכת (אסור להמציא), ולכל אחת תציגי: שם חברה + טייטל + הקישור המלא להגשה + למה היא מתאימה לפרופיל שלי + הצעד הראשון להגיש (Easy Apply / פנייה ישירה / נטוורקינג).",
  },
  {
    icon: Radar,
    label: "משרות 'מתחת לרדאר' עבורי",
    tone: "purple",
    userMessage: "תכיני לי מיפוי חברות 'מתחת לרדאר' עבורי",
    prompt: `תכיני לי מיפוי חברות "מתחת לרדאר" באיכות של מגייסת בכירה — בדיוק באותו סטנדרט שקורל שולחת ללקוחות הבכירים שלה במייל. הדוח חייב להיות מובנה כך:

**פסקת פתיחה (3-4 שורות):**
תפקיד היעד שלי, אזור / תחום, ומה האסטרטגיה שאני נוקטת.

**📎 משרות מהמערכת (אם יש):**
אם בלוח המשרות יש משרות מתאימות עם תווית 🔒, תציגי 3-4 מהן: שם חברה + טייטל + הקישור המלא להגשה + שורה אחת למה זה מתאים לי.

**🎯 מיפוי חברות "מתחת לרדאר" (8-12 חברות):**
לכל חברה הציגי בטבלה:
- **שם החברה** (מודגש)
- תת-תחום (לדוגמה: Fintech / B2B SaaS / Cyber / Health-Tech / FoodTech)
- מיקום (תל אביב / רעננה / רמת גן / וכו')
- שלב צמיחה / מימון אם ידוע (לדוגמה: "גייסה $110M", "יוניקורן $2.4B", "סטארטאפ צומח")
- **למה כדאי לבדוק** — סיבה ספציפית לפרופיל שלי

**למה לכוון לחברות מתחת לרדאר?**
5 סיבות אסטרטגיות (פחות תחרות / השפעה גדולה / קידום מהיר / למידה רוחבית / אופציות).

**צעדים לשבוע הקרוב (5 צעדים ממוספרים):**
1. לבחור 5-7 חברות מהרשימה
2. להיכנס לעמוד הקריירה ול-LinkedIn Jobs של כל אחת
3. לחפש אנשי קשר רלוונטיים בלינקדאין (HRBP / מנהל גיוס / ראש צוות)
4. להכין פנייה מותאמת לכל חברה (להזכיר מוצר ספציפי או לקוח)
5. לחפש variations של הטייטל

**Variations של תפקיד היעד:**
5-6 כותרות חלופיות לחיפוש בלוחות.

חוקים:
- אל תמציאי משרות שאין במערכת. אם יש 🔒 בלוח — תשתמשי. אם אין — אמרי "אין כרגע משרות סגורות במערכת בתחום הזה".
- כן את יכולה להמליץ על חברות (גם אם אין משרה פתוחה כרגע) — זה המיפוי האסטרטגי. רק תהיי כנה: "החברות מומלצות לפי הפרופיל שלך, לא בהכרח עם משרה פתוחה כרגע."
- כל חברה שתזכירי — שם אמיתי, תחום אמיתי, מיקום סביר.
- לא לחזור על מילות מפתח גנריות. כל סיבה חייבת להיות ספציפית לי.
- סיים ב-"בהצלחה! 💪" ובחתימה "— קורל".`,
  },
  {
    icon: Building2,
    label: "מפה לי חברות שמגייסות בתחום שלי",
    tone: "purple",
    userMessage: "מפי לי חברות שמגייסות בתחום שלי",
    prompt: "תכין לי מפת חברות שמגייסות בתחום היעד שלי. תחלק ל-3 קבוצות: (1) מגייסות פעילות עכשיו, (2) חברות בצמיחה שכדאי לעקוב אחריהן, (3) חברות רלוונטיות שכרגע פסיביות. לכל חברה — שורה אחת על למה היא מתאימה לי, ואיך הכי טוב לפנות (לוח / ישירה / נטוורקינג).",
  },
  {
    icon: MessageSquare,
    label: "כתוב לי הודעה למגייסת",
    tone: "rose",
    userMessage: "כתבי לי הודעה לפנייה יזומה למגייסת בלינקדאין",
    prompt: "אני רוצה לפנות באופן יזום למגייס/ת בלינקדאין. תשאלי אותי איזה תפקיד או חברה (משפט קצר), ואחר כך תנסחי לי הודעה אישית של 4-5 שורות שמותאמת לפרופיל שלי ולמשרה. אחרי ההודעה — הציעי גם גרסה למייל וגם follow-up אם לא יענו תוך שבוע.",
  },
  {
    icon: FileText,
    label: "מכתב מקדים מותאם",
    tone: "amber",
    userMessage: "כתבי לי מכתב מקדים מותאם לתפקיד",
    prompt: "אני זקוקה למכתב מקדים. תשאלי אותי איזה תפקיד וחברה, ועל בסיס הניסיון שלי בפרופיל תכתבי מכתב של 3 פסקאות: (1) למה הם, (2) למה אני התאמה ספציפית — עם 2-3 הישגים מהקריירה שלי שמתאימים לתפקיד, (3) קריאה לפעולה.",
  },
  {
    icon: TrendingUp,
    label: "ניתוח שוק העבודה בתחום שלי",
    tone: "emerald",
    userMessage: "תני לי סקירת שוק העבודה בתחום שלי",
    prompt: "תן לי סקירה של שוק העבודה בתפקיד היעד שלי בישראל: רמת ביקוש, רמת תחרות, מגמות גיוס בחודשים האחרונים, ומיומנויות שהכי דרושות. תסיים באסטרטגיה מומלצת לחיפוש שלי השבוע (לאיזה ערוצים להתמקד).",
  },
  {
    icon: AlertTriangle,
    label: "למה לא קוראים לי לראיון?",
    tone: "navy",
    userMessage: "למה לא קוראים לי לראיון?",
    prompt: "תנתחי את חיפוש העבודה שלי. הסתכלי על מספר ההגשות, שיעור התגובה, מקורות ההגשה. יש סיכוי שאני לא מגיעה לראיון בגלל בעיה ספציפית: כמות לא מספיקה, איכות הגשות נמוכה, מקורות חלשים, או חוסר התאמה לתפקיד. הגידי מה הסיבה הסבירה ביותר על בסיס הנתונים, ומה לתקן השבוע.",
  },
];

const TONE_STYLES: Record<typeof QUICK_ACTIONS[number]["tone"], { card: string; icon: string }> = {
  teal:    { card: "border-teal/30 hover:border-teal hover:bg-teal/5",         icon: "bg-teal/15 text-teal-dark" },
  purple:  { card: "border-purple-200 hover:border-purple-400 hover:bg-purple-50", icon: "bg-purple-100 text-purple-700" },
  amber:   { card: "border-amber-200 hover:border-amber-400 hover:bg-amber-50",    icon: "bg-amber-100 text-amber-700" },
  rose:    { card: "border-rose-200 hover:border-rose-400 hover:bg-rose-50",       icon: "bg-rose-100 text-rose-700" },
  emerald: { card: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50", icon: "bg-emerald-100 text-emerald-700" },
  navy:    { card: "border-slate-200 hover:border-navy hover:bg-slate-50",          icon: "bg-navy/10 text-navy" },
};

// ─── Simple markdown renderer ─────────────────────────────────────────────────

// Linkifies a plain text segment — splits on URL boundaries and wraps each
// URL in an anchor. We do this AFTER bold splitting so that **text** stays
// intact even when it contains/abuts a URL.
function linkifySegment(text: string, baseKey: string) {
  // Match http(s)://… or www.… up to whitespace or closing punctuation.
  const urlRegex = /(https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset regex state after .test() — global regexes are stateful.
      urlRegex.lastIndex = 0;
      const href = part.startsWith("http") ? part : `https://${part}`;
      // Strip trailing punctuation that's almost certainly not part of the URL.
      const trailing = part.match(/[.,;:!?)\]]+$/);
      const cleanHref = trailing ? href.slice(0, href.length - trailing[0].length) : href;
      const display = trailing ? part.slice(0, part.length - trailing[0].length) : part;
      return (
        <span key={`${baseKey}-${i}`}>
          <a
            href={cleanHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal underline underline-offset-2 hover:text-teal-dark break-all"
          >
            {display}
          </a>
          {trailing?.[0] ?? ""}
        </span>
      );
    }
    return <span key={`${baseKey}-${i}`}>{part}</span>;
  });
}

function renderLine(line: string, key: number) {
  // Bold: **text** — split first so URLs inside bold are still linkified below.
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-bold">
              {linkifySegment(part.slice(2, -2), `b-${key}-${i}`)}
            </strong>
          );
        }
        return <span key={i}>{linkifySegment(part, `t-${key}-${i}`)}</span>;
      })}
    </span>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-1" />;
        // Bullet list lines
        if (line.match(/^[\-•\*]\s/)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-teal mt-0.5 shrink-0">•</span>
              <span>{renderLine(line.replace(/^[\-•\*]\s/, ""), i)}</span>
            </div>
          );
        }
        // Numbered list lines
        if (line.match(/^\d+\.\s/)) {
          return <div key={i}>{renderLine(line, i)}</div>;
        }
        return <div key={i}>{renderLine(line, i)}</div>;
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CoachingChat({ initialMessages, gender }: { initialMessages: Message[]; gender: Gender }) {
  const t = createGenderT(gender);
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // messagesContainerRef scrolls only its own contents — replaces
  // the previous bottomRef.scrollIntoView() which dragged the whole
  // page when the chat wasn't fully in view (Coral's complaint).
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll only inside the chat container, never the page. Also
  // respect the user's scroll position — if they've scrolled up to
  // read older messages, don't yank them down on every new message.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Within 200px of bottom = "user is following the conversation"
    // → auto-scroll. Further up = they're reading history → don't move.
    if (distanceFromBottom < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isPending]);

  // Two parameters now:
  //   displayText — what the chat bubble shows (clean, short, natural).
  //   sendText    — what the AI actually receives (may be long with
  //                 explicit instructions). Defaults to displayText
  //                 for normal user-typed messages.
  async function handleSend(displayText?: string, sendText?: string) {
    const display = (displayText ?? input).trim();
    if (!display || isPending) return;
    const aiPayload = (sendText ?? display).trim();

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: display }]);
    setIsPending(true);

    try {
      const reply = await sendCoachingMessage(aiPayload);
      // sendCoachingMessage now returns { text, upgradeTo? } — old
      // callers expecting a plain string are gone. Attach the upgrade
      // flag so the renderer can show an inline CTA card.
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: reply.text,
          ...(reply.upgradeTo ? { upgradeTo: reply.upgradeTo } : {}),
        },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "אירעה שגיאת רשת. נסי/נסה שוב." }]);
    } finally {
      setIsPending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function handleClear() {
    if (isClearing) return;
    setIsClearing(true);
    try {
      await clearCoachingChat();
      setMessages([]);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col" style={{ height: "70vh" }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="text-xs font-semibold text-gray-500">מאמן קריירה AI · מחובר</span>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} disabled={isClearing}
            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
            <Trash2 size={12} />
            נקה שיחה
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full gap-4 text-center py-2">
            <div className="w-14 h-14 bg-teal-pale rounded-3xl flex items-center justify-center">
              <Sparkles size={24} className="text-teal" />
            </div>
            <div>
              <p className="font-black text-navy">{t("שלום! אני מאמנת ה-AI האישית שלך", "שלום! אני מאמן ה-AI האישי שלך")}</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                {t("אני מנתחת אותך", "אני מנתח אותך")} לפי הנתונים שלך — כמות הגשות, שיעור תגובה, מקורות, רצף פעילות — {t("ונותנת לך", "ונותן לך")} הוראות קונקרטיות לפעולה.
              </p>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-2">פעולות מהירות</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                const style = TONE_STYLES[a.tone];
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => handleSend(a.userMessage, a.prompt)}
                    className={`text-right bg-white rounded-xl border-2 p-3 transition-all flex items-center gap-3 ${style.card}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.icon}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-navy leading-snug">{a.label}</p>
                    </div>
                    <ArrowLeft size={12} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            <div className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0 mt-0.5 shadow-sm ${
                m.role === "assistant" ? "bg-teal" : "bg-navy"
              }`}>
                {m.role === "assistant" ? <Sparkles size={12} /> : "א"}
              </div>

              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-navy text-white rounded-tr-sm"
                  : "bg-teal-pale text-navy rounded-tl-sm border border-teal/15"
              }`}>
                {m.role === "assistant" ? (
                  <MessageContent content={m.content} />
                ) : (
                  <span>{m.content}</span>
                )}
              </div>
            </div>

            {/* Inline upgrade CTA — only when the bot reply flagged a
                quota hit and suggested a tier. Sits under the message
                bubble (not inside it) so it's clearly an action area,
                not part of the AI's words. Disappears on reload because
                upgradeTo is client-only state. */}
            {m.role === "assistant" && m.upgradeTo && (
              <div className="mr-9 max-w-[78%]">
                <Link
                  href="/pricing"
                  className="block bg-gradient-to-l from-navy via-[#1a3a4a] to-[#0d2d3a] text-white rounded-2xl p-4 hover:shadow-lg hover:shadow-navy/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center shrink-0">
                      <Lock size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-teal uppercase tracking-wider mb-0.5">
                        להמשיך בלי הגבלה
                      </p>
                      <p className="font-black text-sm">
                        {m.upgradeTo === "VIP"
                          ? "מסלול פרו · 50 שאלות יומיות + ניתוח עומק"
                          : "מסלול VIP · ללא הגבלה + ליווי אישי של קורל"}
                      </p>
                    </div>
                    <ArrowLeft size={18} className="text-teal shrink-0 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            )}
          </div>
        ))}

        {isPending && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs shrink-0 mt-0.5 shadow-sm">
              <Sparkles size={12} />
            </div>
            <div className="bg-teal-pale rounded-2xl rounded-tl-sm px-4 py-3 border border-teal/15">
              <div className="flex items-center gap-1.5">
                <Loader2 size={14} className="text-teal animate-spin" />
                <span className="text-xs text-teal/70">מעבד...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick action chips (when chat already has messages — keeps them
          accessible without dominating the screen). */}
      {messages.length > 0 && !isPending && (
        <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto shrink-0">
          {QUICK_ACTIONS.slice(0, 4).map((a) => (
            <button
              key={a.label}
              onClick={() => handleSend(a.userMessage, a.prompt)}
              className="text-xs bg-teal-pale text-teal-dark font-bold px-3 py-1.5 rounded-full hover:bg-teal hover:text-white transition-all border border-teal/20 whitespace-nowrap shrink-0"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && !isPending && handleSend()}
            placeholder="שאלי/שאל את המאמן שלך..."
            aria-label="שדה הודעה למאמן"
            disabled={isPending}
            // text-base on mobile (16px) prevents iOS Safari auto-zoom on focus.
            className="flex-1 bg-cream rounded-xl px-4 py-3 md:py-2.5 text-base md:text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors disabled:opacity-60"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isPending}
            aria-label="שליחת הודעה"
            className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center text-white hover:bg-teal-dark hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
