/**
 * Admin view of all marketing-site leads. New rows arrive via
 * /api/leads/incoming (called by the old Netlify site's contact form
 * once Dolev wires it up) and trigger a notification email to Coral.
 *
 * The page itself is a clean handled/unhandled split — unhandled
 * leads at the top, with a button to mark them done so they fall
 * to the bottom and stay out of Coral's daily scanning area.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { markLeadHandled, unmarkLeadHandled } from "@/lib/actions/leads";
import { Mail, Phone, MessageSquare, CheckCircle2, RotateCcw, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

function fmt(date: Date) {
  return new Date(date).toLocaleString("he-IL", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export default async function LeadsAdminPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const leads = await prisma.lead.findMany({
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
  const open = leads.filter((l) => !l.handled);
  const done = leads.filter((l) => l.handled);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-black text-navy mb-1">פניות מהאתר</h1>
      <p className="text-sm text-slate-500 mb-6">
        כל הפניות שמגיעות מטופס "צרי קשר" באתר השיווקי. {open.length} פניות ממתינות, {done.length} טופלו.
      </p>

      {open.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
          <CheckCircle2 size={32} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-emerald-800 font-bold">אין פניות פתוחות. נוקח!</p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-black text-amber-700 uppercase tracking-wide mb-3">פתוחות · ממתינות לטיפול</h2>
          <div className="space-y-3 mb-8">
            {open.map((l) => (
              <LeadCard key={l.id} lead={l} />
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-wide mb-3">טופלו</h2>
          <div className="space-y-2">
            {done.map((l) => (
              <LeadCard key={l.id} lead={l} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface LeadRow {
  id: string;
  createdAt: Date;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string | null;
  handled: boolean;
  handledAt: Date | null;
}

function LeadCard({ lead, compact }: { lead: LeadRow; compact?: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition-all ${
        lead.handled
          ? "border-slate-100 opacity-70"
          : "border-amber-200 shadow-amber-100/50"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="font-black text-navy text-base">{lead.name}</h3>
            <p className="text-xs text-slate-400 inline-flex items-center gap-1 mt-0.5">
              <Clock size={11} />
              {fmt(lead.createdAt)}
              {lead.source && <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 mr-1">{lead.source}</span>}
            </p>
          </div>
          <form action={lead.handled ? unmarkLeadHandled : markLeadHandled}>
            <input type="hidden" name="id" value={lead.id} />
            <button
              type="submit"
              className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                lead.handled
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {lead.handled ? <><RotateCcw size={12} /> פתח שוב</> : <><CheckCircle2 size={12} /> סמן כטופל</>}
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="text-teal hover:underline inline-flex items-center gap-1">
              <Mail size={13} />
              <span dir="ltr">{lead.email}</span>
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-teal hover:underline inline-flex items-center gap-1">
              <Phone size={13} />
              <span dir="ltr">{lead.phone}</span>
            </a>
          )}
        </div>

        {lead.message && !compact && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 inline-flex items-center gap-1 mb-1">
              <MessageSquare size={11} /> הודעה
            </p>
            <p className="text-sm text-navy/80 whitespace-pre-wrap leading-relaxed">{lead.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
