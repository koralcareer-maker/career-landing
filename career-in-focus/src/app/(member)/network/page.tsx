import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyNetworkRequests } from "@/lib/actions/network";
import { NetworkRequestForm } from "./network-form";
import { Lock, Sparkles, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const statusMap = {
  PENDING:     { label: "ממתין לטיפול", icon: Clock,       color: "text-amber-600 bg-amber-50"  },
  IN_PROGRESS: { label: "בטיפול",       icon: Sparkles,    color: "text-teal bg-teal-pale"       },
  DONE:        { label: "הושלם",         icon: CheckCircle, color: "text-green-600 bg-green-50"   },
  DECLINED:    { label: "לא אושר",       icon: XCircle,     color: "text-gray-500 bg-gray-50"     },
};

export default async function NetworkPage() {
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { membershipType: true, name: true },
  });

  const isPremium = user?.membershipType === "PREMIUM";
  const requests = await getMyNetworkRequests();

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="relative bg-navy rounded-3xl px-7 py-7 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-teal/15 to-transparent" />
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-teal/8 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold bg-teal/20 text-teal px-2 py-0.5 rounded-full border border-teal/30">PREMIUM</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">קורל מפעילה את הקשרים שלה בשבילך</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            80% מהמשרות לא מתפרסמות — הן נסגרות דרך הפניות. כחברת פרימיום, קורל פונה ישירות לרשת הקשרים שלה עבורך.
          </p>
        </div>
      </div>

      {!isPremium ? (
        /* Locked — not premium */
        <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] p-8 text-center">
          <div className="w-16 h-16 bg-navy/5 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-navy/30" />
          </div>
          <h2 className="text-xl font-black text-navy mb-2">פיצר פרימיום בלבד</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            שדרגי לחברות פרימיום כדי שקורל תפעיל את הקשרים שלה ישירות עבורך — ותגיעי לראיונות שלא נגישים דרך אתרי משרות רגילים.
          </p>
          <div className="space-y-2 text-sm text-right max-w-xs mx-auto mb-6">
            {["קורל פונה לרשת הקשרים שלה בשמך", "גישה למשרות שלא מפורסמות", "ליווי אישי בתהליך", "עדיפות באירועים ובוובינרים"].map(f => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-teal shrink-0" />
                <span className="text-gray-700">{f}</span>
              </div>
            ))}
          </div>
          <Link href="/pricing"
            className="inline-flex items-center gap-2 bg-teal text-white font-bold px-6 py-3 rounded-2xl hover:bg-teal-dark hover:-translate-y-0.5 hover:shadow-lg transition-all">
            שדרגי לפרימיום
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {/* How it works */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] p-5">
            <h3 className="font-bold text-navy text-sm mb-4">איך זה עובד?</h3>
            <div className="space-y-3">
              {[
                { n: "1", t: "מלאי את הטופס", d: "תפקיד מבוקש, חברות מעניינות, הערות" },
                { n: "2", t: "קורל מקבלת התראה", d: "ותסקור את הפרופיל שלך תוך 48 שעות" },
                { n: "3", t: "קורל מפעילה קשרים", d: "פניה ישירה לאנשי רשת, מגייסים, ומנהלים" },
                { n: "4", t: "את מקבלת עדכון", d: "ומגיעה לראיון — בלי לשלוח קורות חיים לחלל" },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-teal rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">{s.n}</div>
                  <div>
                    <p className="text-sm font-semibold text-navy">{s.t}</p>
                    <p className="text-xs text-gray-400">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <NetworkRequestForm />

          {/* My requests */}
          {requests.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-bold text-navy text-sm">הבקשות שלי</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {requests.map(r => {
                  const s = statusMap[r.status];
                  const Icon = s.icon;
                  return (
                    <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy text-sm">{r.targetRole}</p>
                        {r.targetCompanies && <p className="text-xs text-gray-400 mt-0.5">{r.targetCompanies}</p>}
                        <p className="text-[10px] text-gray-300 mt-1">{new Date(r.createdAt).toLocaleDateString("he-IL")}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${s.color}`}>
                        <Icon size={12} />
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
