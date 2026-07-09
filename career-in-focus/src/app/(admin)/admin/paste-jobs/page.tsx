"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle, Copy } from "lucide-react";

interface JobResult {
  title: string;
  company: string;
  status: string;
  id?: string;
}

interface ApiResponse {
  ok?: boolean;
  total?: number;
  created?: number;
  duplicates?: number;
  errors?: number;
  jobs?: JobResult[];
  error?: string;
}

export default function PasteJobsPage() {
  const [text, setText] = useState("");
  const [source, setSource] = useState("קורל - וואטסאפ");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function submit() {
    if (text.trim().length < 20) {
      setResult({ error: "צריך להדביק לפחות 20 תווים" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/paste-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source }),
      });
      const data = (await res.json()) as ApiResponse;
      setResult(data);
      if (data.created && data.created > 0) {
        setText("");
      }
    } catch (e) {
      setResult({ error: String(e instanceof Error ? e.message : e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-navy flex items-center gap-2">
          <Sparkles size={24} className="text-teal" />
          הדבקת משרה מוואטסאפ
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          הדביקי כאן טקסט של משרה או רשימת משרות שאת שולחת בוואטסאפ. ה-AI יזהה את
          הפרטים אוטומטית ויעלה לאתר.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-navy mb-2">
              מקור <span className="font-normal text-gray-500 text-xs">(מופיע ברשימת המשרות)</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-2">
              טקסט המשרה
              <span className="font-normal text-gray-500 text-xs mr-2">
                (העתיקי מוואטסאפ ותדביקי כאן. אפשר גם רשימה עם כמה משרות)
              </span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`דוגמה:\n\n🚀 דרוש/ה מנהל/ת תפעול לבית דפוס מוביל בראש העין!\n\n✅ ניהול צוות עובדים\n✅ אחריות על תפעול וייצור\n✅ עבודה מול לקוחות וספקים\n\n📧 קורות חיים לשלוח ל: coral@example.com`}
              rows={12}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal focus:outline-none font-mono"
              dir="rtl"
            />
            <div className="text-xs text-gray-400 mt-1 flex justify-between">
              <span>{text.length} תווים</span>
              {text.length >= 20 && (
                <span className="text-teal">מוכן לזיהוי אוטומטי</span>
              )}
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={loading || text.trim().length < 20}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>מזהה משרות...</>
            ) : (
              <>
                <Sparkles size={16} />
                נתחי והעלי לאתר
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card
          className={
            result.error
              ? "border-red-200"
              : (result.created ?? 0) > 0
              ? "border-teal/30"
              : "border-amber-200"
          }
        >
          <CardContent className="p-6 space-y-3">
            {result.error ? (
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertCircle size={18} />
                {result.error}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-teal font-bold text-lg">
                    <CheckCircle2 size={20} />
                    {result.created} נוצרו
                  </div>
                  {(result.duplicates ?? 0) > 0 && (
                    <div className="text-gray-500 text-sm">
                      • {result.duplicates} כבר קיימות במאגר
                    </div>
                  )}
                  {(result.errors ?? 0) > 0 && (
                    <div className="text-red-500 text-sm">
                      • {result.errors} שגיאות
                    </div>
                  )}
                </div>

                {result.jobs && result.jobs.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    {result.jobs.map((j, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-3 py-2 text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-navy">{j.title}</div>
                          <div className="text-gray-500 text-xs">{j.company}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {j.status === "created" && (
                            <span className="text-teal text-xs bg-teal-pale px-2 py-0.5 rounded">
                              נוצרה
                            </span>
                          )}
                          {j.status === "duplicate" && (
                            <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded">
                              קיימת
                            </span>
                          )}
                          {j.status.startsWith("error") && (
                            <span className="text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded">
                              שגיאה
                            </span>
                          )}
                          {j.id && (
                            <a
                              href={`/admin/jobs/${j.id}`}
                              className="text-teal hover:underline text-xs flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-teal-pale/30 border-teal/20">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="font-bold text-navy flex items-center gap-2">
            <Copy size={14} />
            טיפים
          </div>
          <ul className="text-gray-600 text-xs space-y-1 mr-4 list-disc">
            <li>אפשר להדביק גם רשימה של כמה משרות בהודעה אחת - הוא יזהה את כולן.</li>
            <li>אם יש קישור למשרה (civi.co.il, alljobs וכו') - הוא יישמר אוטומטית.</li>
            <li>אם יש אימייל ליצירת קשר - הוא יוצר כפתור "שלח קו"ח" עם מייל מוכן.</li>
            <li>כל משרה שנוצרת מסומנת כ-חמה כדי לעלות לראש הרשימה.</li>
            <li>אם הדבקת את אותה משרה פעמיים - היא לא תיווצר שוב.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
