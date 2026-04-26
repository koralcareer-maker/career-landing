"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { sendCoachingMessage, clearCoachingChat, type Message } from "@/lib/actions/coaching";
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react";

const SUGGESTED = [
  "נתחי את מצב חיפוש העבודה שלי",
  "מה המשימה הכי חשובה שלי השבוע?",
  "איך אני משפרת את ציון המוכנות שלי?",
  "תני לי טיפ לכתיבת מכתב מקדים",
  "מה עדיף — לינקדאין או אתר חברה?",
];

export function CoachingChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isPending) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);

    startTransition(async () => {
      const reply = await sendCoachingMessage(msg);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    });
  }

  function handleClear() {
    startClearTransition(async () => {
      await clearCoachingChat();
      setMessages([]);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col" style={{ height: "65vh" }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
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
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs shrink-0 ml-2 mt-0.5 shadow-sm">
                <Sparkles size={12} />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-navy text-white rounded-tr-sm"
                : "bg-teal-pale text-navy rounded-tl-sm border border-teal/15"
            }`}>
              {m.content.split("\n").map((line, j) => (
                <span key={j}>{line}{j < m.content.split("\n").length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}

        {isPending && (
          <div className="flex justify-end">
            <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs shrink-0 ml-2 shadow-sm">
              <Sparkles size={12} />
            </div>
            <div className="bg-teal-pale rounded-2xl rounded-tl-sm px-4 py-3 border border-teal/15">
              <Loader2 size={16} className="text-teal animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested (when has messages) */}
      {messages.length > 0 && !isPending && (
        <div className="px-4 pt-2 flex gap-2 overflow-x-auto">
          {SUGGESTED.slice(0, 3).map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-xs bg-teal-pale text-teal font-medium px-3 py-1.5 rounded-full hover:bg-teal hover:text-white transition-all border border-teal/20 whitespace-nowrap shrink-0">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="שאלי את המאמן שלך..."
            disabled={isPending}
            className="flex-1 bg-cream rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 border border-transparent focus:border-teal/40 focus:outline-none transition-colors"
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
