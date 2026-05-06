"use client";

import { useState } from "react";
import { Mail, Loader2, X, Copy, Check, AlertCircle } from "lucide-react";

interface ResendResult {
  success?: boolean;
  email?: string;
  password?: string;
  name?: string;
  error?: string;
}

interface Props {
  userId: string;
  userName: string;
  userEmail: string;
  action: (id: string) => Promise<ResendResult>;
}

export function ResendCredentialsButton({ userId, userName, userEmail, action }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResendResult | null>(null);
  const [copied, setCopied] = useState<"all" | "password" | null>(null);

  async function trigger() {
    if (!confirm(`לאפס סיסמה ל-${userName} (${userEmail})?\n\nהסיסמה הקיימת תפסיק לעבוד וסיסמה חדשה תישלח אליו במייל.`)) {
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await action(userId);
      setResult(r);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "שגיאה" });
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, key: "all" | "password") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        title="אפס סיסמה ושלח מייל ברוכה הבאה"
        className="p-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
      </button>

      {result && (
        <div
          className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
          onClick={() => setResult(null)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-navy">פרטי כניסה חדשים</h3>
              <button onClick={() => setResult(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {result.error ? (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle size={16} className="mt-0.5" />
                <p>{result.error}</p>
              </div>
            ) : result.success && result.password && result.email ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  הסיסמה הקיימת איפסה ומייל ברוכה הבאה עם הסיסמה החדשה נשלח ל-{result.email}.
                </p>
                <div className="bg-cream rounded-xl p-3 font-mono text-xs leading-7" dir="ltr">
                  <div>📧 {result.email}</div>
                  <div>🔑 {result.password}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(
                      `שלום ${result.name ?? ""}!\nאיפסנו לך את הסיסמה לקריירה בפוקוס:\n\nאימייל: ${result.email}\nסיסמה: ${result.password}\n\nכניסה: https://career-landing-tau.vercel.app/login`,
                      "all"
                    )}
                    className="flex items-center gap-1.5 text-xs font-bold bg-teal text-white px-3 py-2 rounded-lg hover:bg-teal-dark transition-colors flex-1 justify-center"
                  >
                    {copied === "all" ? <Check size={13} /> : <Copy size={13} />}
                    {copied === "all" ? "הועתק!" : "העתק לוואטסאפ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.password!, "password")}
                    className="flex items-center gap-1.5 text-xs font-bold border border-teal/30 text-teal px-3 py-2 rounded-lg hover:bg-teal/10 transition-colors"
                  >
                    {copied === "password" ? <Check size={13} /> : <Copy size={13} />}
                    {copied === "password" ? "הועתק" : "רק סיסמה"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
