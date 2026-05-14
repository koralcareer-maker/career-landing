"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * Contact form client component.
 *
 * Posts to the same /api/leads/incoming endpoint the marketing-site
 * contact form uses, encoding the support topic in the `source` field
 * so the admin panel can filter / triage. The five topics are the ones
 * that the legal pages reference:
 *
 *   general       — fallback / any
 *   cancel        — cancellation requests under the 14-day cooling-off
 *   privacy       — data correction, export, deletion (Privacy Protection Law rights)
 *   accessibility — bug reports against the accessibility statement
 *   support       — technical issues / "the platform isn't working"
 */

const TOPICS: Array<{ value: string; label: string; hint: string }> = [
  { value: "general",       label: "פנייה כללית",         hint: "כל שאלה אחרת" },
  { value: "cancel",        label: "ביטול מנוי",          hint: "ביטול תוך 14 יום או בהמשך" },
  { value: "privacy",       label: "פרטיות ונתונים",      hint: "עיון, תיקון, מחיקה או ייצוא של המידע שלך" },
  { value: "accessibility", label: "דיווח נגישות",        hint: "נתקלת בבעיית נגישות באתר" },
  { value: "support",       label: "תקלה טכנית",          hint: "משהו באתר לא עובד" },
];

interface Props {
  initialTopic: string;
}

export function ContactForm({ initialTopic }: Props) {
  // Validate initialTopic against allowed set — fall back to general
  // if the query param has a bogus value.
  const validInitial = TOPICS.find((t) => t.value === initialTopic) ? initialTopic : "general";

  const [topic, setTopic] = useState(validInitial);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("שם הוא שדה חובה");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("יש למלא אימייל או טלפון כדי שנוכל לחזור אליך");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          // Encode the topic in `source` — `/admin/leads` already
          // surfaces this field and we don't need a schema change.
          source: `support-${topic}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "שליחת הטופס נכשלה. נסי שוב.");
        return;
      }
      setDone(true);
    } catch {
      setError("שליחת הטופס נכשלה. נסי שוב בעוד דקה.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-8" dir="rtl">
        <CheckCircle2 size={48} className="text-teal mx-auto mb-3" />
        <h2 className="text-xl font-bold text-navy mb-2">הפנייה התקבלה</h2>
        <p className="text-slate-700">
          נחזור אלייך תוך 5 ימי עסקים לכתובת או למספר שמילאת.
        </p>
        <p className="text-sm text-slate-500 mt-3">
          לנושאים דחופים: WhatsApp לקורל 052-XXXXXXX
        </p>
      </div>
    );
  }

  const selectedTopic = TOPICS.find((t) => t.value === topic);

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <label className="block">
        <span className="text-sm font-bold text-navy mb-1.5 block">נושא הפנייה</span>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal focus:border-teal outline-none text-navy"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {selectedTopic && (
          <span className="block text-xs text-slate-500 mt-1">{selectedTopic.hint}</span>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-bold text-navy mb-1.5 block">
          שם מלא <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal focus:border-teal outline-none"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-bold text-navy mb-1.5 block">אימייל</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal focus:border-teal outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-navy mb-1.5 block">טלפון</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal focus:border-teal outline-none"
          />
        </label>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        חובה למלא לפחות אחד מהשניים — אימייל או טלפון.
      </p>

      <label className="block">
        <span className="text-sm font-bold text-navy mb-1.5 block">תוכן הפנייה</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={
            topic === "cancel"
              ? "ציינו את מספר ההצטרפות / האימייל שאיתו נרשמתם ואת הסיבה אם תרצו"
              : topic === "privacy"
              ? "מה היית רוצה לעשות עם המידע שלך? (עיון, תיקון, מחיקה, ייצוא)"
              : topic === "accessibility"
              ? "תארי את הדף, את הפעולה שניסיתי לבצע, ואת הקושי שנתקלתי בו"
              : "תוכן הפנייה"
          }
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal focus:border-teal outline-none resize-y min-h-[120px]"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-teal hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-teal/40"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            שולחים…
          </>
        ) : (
          "שליחת הפנייה"
        )}
      </button>
    </form>
  );
}
