"use client";

import { useState, useRef, useEffect } from "react";
import { sendCoachingMessage, clearCoachingChat, type Message } from "@/lib/actions/coaching";
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react";

const SUGGESTED = [
  "נתח את מצב חיפוש העבודה שלי",
  "מה המשימה הכי חשובה שלי השבוע?",
  "איך אני משפר את ציון המוכנות שלי?",
  "תן לי טיפ לכתיבת מכתב מקדים",
  "מה עדיף — לינקדאין או אתר חברה?",
];

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
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
            <div className="w-16 h-16 bg-teal-pale rounded-3xl flex items-center justify-center">
              <Sparkles size={28} className="text-teal" />
            </div>
            <div>
              <p className="font-bold text-navy mb-1">שלום! אני המאמן האישי שלך</p>
              <p className="text-sm text-gray-400 max-w-xs">אני מכיר את הנתונים שלך ויכול לנתח את מצב חיפוש העבודה שלך ולעזור לך להתקדם</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-xs bg-teal-pale text-teal font-medium px-3 py-1.5 rounded-full hover:bg-teal hover:text-white transition-all border border-teal/20">
                  {s}
                </button>
              ))}
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

      {/* Suggested chips (when chat has messages) */}
      {messages.length > 0 && !isPending && (
        <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto shrink-0">
          {SUGGESTED.slice(0, 3).map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-xs bg-teal-pale text-teal font-medium px-3 py-1.5 rounded-full hover:bg-teal hover:text-white transition-all border border-teal/20 whitespace-nowrap shrink-0">
              {s}
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
