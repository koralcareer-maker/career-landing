"use client";

import { useState, useRef, useEffect } from "react";
import { sendCoachingMessage, clearCoachingChat, type Message } from "@/lib/actions/coaching";
import {
  Send, Trash2, Sparkles, Loader2,
  Briefcase, Building2, MessageSquare, FileText,
  TrendingUp, AlertTriangle, ArrowLeft,
} from "lucide-react";

// ─── Quick Actions — six data-aware prompts that pre-fill the chat. Each
// prompt is written to *force* the coach to combine the user's data with
// market/strategy advice, not give generic answers. The exact phrasing
// matters: it primes Gemini to follow the Analysis/Insight/Action
// structure required by the system prompt.
const QUICK_ACTIONS: Array<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  prompt: string;
  tone: "teal" | "purple" | "amber" | "rose" | "emerald" | "navy";
}> = [
  {
    icon: Briefcase,
    label: "מצא לי משרות רלוונטיות",
    tone: "teal",
    prompt: "תסקור את המשרות הזמינות לי במערכת לפי תפקיד היעד שלי. תעבור על 5-7 משרות שהכי רלוונטיות, ולכל אחת תגיד: למה היא מתאימה לפרופיל שלי ספציפית, ומה הצעד הראשון להגיש (Easy Apply / פנייה ישירה / נטוורקינג).",
  },
  {
    icon: Building2,
    label: "מפה לי חברות שמגייסות בתחום שלי",
    tone: "purple",
    prompt: "תכין לי מפת חברות שמגייסות בתחום היעד שלי. תחלק ל-3 קבוצות: (1) מגייסות פעילות עכשיו, (2) חברות בצמיחה שכדאי לעקוב אחריהן, (3) חברות רלוונטיות שכרגע פסיביות. לכל חברה — שורה אחת על למה היא מתאימה לי, ואיך הכי טוב לפנות (לוח / ישירה / נטוורקינג).",
  },
  {
    icon: MessageSquare,
    label: "כתוב לי הודעה למגייסת",
    tone: "rose",
    prompt: "אני רוצה לפנות באופן יזום למגייס/ת בלינקדאין. תשאל אותי איזה תפקיד או חברה (משפט קצר), ואחר כך תנסח לי הודעה אישית של 4-5 שורות שמותאמת לפרופיל שלי ולמשרה. אחרי ההודעה — תציע גם גרסה למייל וגם follow-up אם לא יענו תוך שבוע.",
  },
  {
    icon: FileText,
    label: "מכתב מקדים מותאם",
    tone: "amber",
    prompt: "אני צריכ/ה מכתב מקדים. תשאל אותי איזה תפקיד וחברה, ועל בסיס הניסיון שלי בפרופיל תכתוב לי מכתב של 3 פסקאות: (1) למה הם, (2) למה אני התאמה ספציפית — עם 2-3 הישגים מהקריירה שלי שמתאימים לתפקיד, (3) קריאה לפעולה.",
  },
  {
    icon: TrendingUp,
    label: "ניתוח שוק העבודה בתחום שלי",
    tone: "emerald",
    prompt: "תן לי סקירה של שוק העבודה בתפקיד היעד שלי בישראל: רמת ביקוש, רמת תחרות, מגמות גיוס בחודשים האחרונים, ומיומנויות שהכי דרושות. תסיים באסטרטגיה מומלצת לחיפוש שלי השבוע (לאיזה ערוצים להתמקד).",
  },
  {
    icon: AlertTriangle,
    label: "למה לא קוראים לי לראיון?",
    tone: "navy",
    prompt: "תנתח את חיפוש העבודה שלי. תסתכל על מספר ההגשות שלי, שיעור התגובה, מקורות ההגשה, ויש סיכוי שאני לא מגיע/ה לראיון בגלל בעיה ספציפית: כמות לא מספיקה, איכות גרועה של הגשות, מקורות חלשים, או חוסר התאמה לתפקיד. תגיד לי מה הסיבה הסבירה ביותר על בסיס הנתונים, ומה לתקן השבוע.",
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

function renderLine(line: string, key: number) {
  // Bold: **text**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
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

export function CoachingChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsPending(true);

    try {
      const reply = await sendCoachingMessage(msg);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "אירעה שגיאת רשת. נסה שנית." }]);
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-full gap-4 text-center py-2">
            <div className="w-14 h-14 bg-teal-pale rounded-3xl flex items-center justify-center">
              <Sparkles size={24} className="text-teal" />
            </div>
            <div>
              <p className="font-black text-navy">שלום! אני המאמן האישי שלך</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                אני מנתח/ת אותך לפי הנתונים שלך — כמות הגשות, שיעור תגובה, מקורות, רצף פעילות — ונותן/ת לך הוראות קונקרטיות לפעולה.
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
                    onClick={() => handleSend(a.prompt)}
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
          <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
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

        <div ref={bottomRef} />
      </div>

      {/* Quick action chips (when chat already has messages — keeps them
          accessible without dominating the screen). */}
      {messages.length > 0 && !isPending && (
        <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto shrink-0">
          {QUICK_ACTIONS.slice(0, 4).map((a) => (
            <button
              key={a.label}
              onClick={() => handleSend(a.prompt)}
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
            placeholder="שאל את המאמן שלך..."
            disabled={isPending}
            className="flex-1 bg-cream rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors disabled:opacity-60"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isPending}
            className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center text-white hover:bg-teal-dark hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
