import { Briefcase, Sparkles, Users, Clock } from "lucide-react";
import { SubmitJobForm } from "./submit-form";

export const metadata = {
  title: "פרסום משרה למאגר | קריירה בפוקוס",
  description: "מגייסים ומגייסות — שלחו את המשרה שלכם למאגר של קהילת קריירה בפוקוס. חינם, ללא רישום, אישור תוך כמה שעות.",
};

export default function PostJobPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-white py-10 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-bold rounded-full px-4 py-1.5 mb-4">
            <Briefcase size={14} />
            פרסום משרה
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-navy mb-3 leading-tight">
            יש לך משרה? בואי להוסיף אותה למאגר
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            המשרה תופיע בפני קהילה של מאות מחפשות עבודה איכותיות בקריירה בפוקוס. ללא תשלום, ללא רישום.
          </p>
        </div>

        {/* Value tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Tile icon={<Users size={18} />}        title="קהילה ממוקדת" body="מועמדות שעברו אבחון מקצועי" />
          <Tile icon={<Sparkles size={18} />}     title="ללא עלות"     body="פרסום חינמי לחלוטין" />
          <Tile icon={<Clock size={18} />}        title="אישור מהיר"   body="המשרה עולה לאוויר תוך שעות" />
        </div>

        <SubmitJobForm />

        <p className="text-center text-xs text-slate-400 mt-8">
          שאלות? כתבי ל-
          <a href="mailto:koralcareer@gmail.com" className="text-teal hover:underline">koralcareer@gmail.com</a>
        </p>
      </div>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <div className="font-bold text-navy text-sm">{title}</div>
        <div className="text-xs text-slate-500 leading-snug mt-0.5">{body}</div>
      </div>
    </div>
  );
}
