import { Users, Sparkles, ShieldCheck, Search } from "lucide-react";
import { TalentForm } from "./talent-form";

export const metadata = {
  title: "קורל מקושרים | הצטרפו למאגר המועמדים של קריירה בפוקוס",
  description:
    "השאירו פרטים וקורות חיים ותיכנסו ישירות למאגר של קורל שלו. כשתימצא משרה שמתאימה לכם בדיוק, נפנה אליכם. חינם, ללא רישום.",
};

export default function TalentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-white py-10 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-bold rounded-full px-4 py-1.5 mb-4">
            <Users size={14} />
            קורל מקושרים
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-navy mb-3 leading-tight">
            הצטרפו למאגר המועמדים שלי
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            השאירו פרטים וקורות חיים, ותיכנסו ישירות למאגר האישי שלי. ברגע שאמצא משרה שמתאימה לכם בדיוק, אפנה אליכם. ללא עלות, ללא התחייבות.
          </p>
        </div>

        {/* Value tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Tile icon={<Search size={18} />} title="התאמה חכמה" body="המערכת מאתרת לכם משרות שמתאימות בדיוק לפרופיל" />
          <Tile icon={<Sparkles size={18} />} title="ללא עלות" body="ההצטרפות למאגר חינמית לחלוטין" />
          <Tile icon={<ShieldCheck size={18} />} title="דיסקרטי" body="הפרטים נשמרים אצלי בלבד ולא מועברים לאף גורם ללא אישורכם" />
        </div>

        <TalentForm />

        <p className="text-center text-xs text-slate-400 mt-8">
          שאלות? כתבו ל-
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
