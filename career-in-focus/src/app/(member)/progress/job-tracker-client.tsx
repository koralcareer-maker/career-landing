"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addJobApplication, deleteJobApplication } from "@/lib/actions/progress";
import { APPLICATION_STATUS_LABELS, formatDate } from "@/lib/utils";
import { Plus, Trash2, ExternalLink, X, ChevronDown, ChevronUp } from "lucide-react";

interface App {
  id: string;
  company: string;
  role: string;
  dateApplied: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  nextFollowUp: string | null;
  contactName: string | null;
  jobLink: string | null;
  responseReceived: boolean;
}

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_COLORS: Record<string, string> = {
  APPLIED: "teal", FIT_CHECKED: "gray", SAVED: "gray",
  PROACTIVE_OUTREACH: "purple", FOLLOWUP_SENT: "yellow",
  INTERVIEW_SCHEDULED: "navy", FIRST_INTERVIEW: "navy", ADVANCED_INTERVIEW: "navy",
  TASK_HOME: "yellow", OFFER: "green", REJECTED: "red", FROZEN: "gray", ACCEPTED: "green",
};

export function JobTrackerClient({ apps }: { apps: App[] }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [state, action, isPending] = useActionState(addJobApplication, null);

  return (
    <div className="p-5">
      {/* Add button */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{apps.length} בקשות רשומות</p>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />
          הוסף בקשה
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-cream rounded-2xl p-5 mb-5 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-navy text-sm">הוספת בקשה חדשה</h4>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input name="company" label="חברה *" placeholder="שם החברה" required />
            <Input name="role" label="תפקיד *" placeholder="שם התפקיד" required />
            <Input name="dateApplied" type="date" label="תאריך הגשה" />
            <Input name="source" label="מקור" placeholder="LinkedIn, דוא&quot;ל, פנייה יזומה..." />
            <Input name="contactName" label="איש קשר" placeholder="שם + פרטים" />
            <Input name="jobLink" type="url" label="לינק למשרה" placeholder="https://..." dir="ltr" />
            <Input name="nextFollowUp" type="date" label="פולואפ הבא" />
            <Select
              name="status"
              label="סטטוס"
              options={[{ value: "", label: "בחר סטטוס" }, ...STATUS_OPTIONS]}
            />
            <div className="sm:col-span-2">
              <Textarea name="notes" label="הערות" placeholder="כתוב כאן כל הערה רלוונטית..." rows={2} />
            </div>
            {state?.error && <p className="sm:col-span-2 text-xs text-red-500">{state.error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" loading={isPending} size="sm">שמור</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>ביטול</Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {apps.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Briefcase_icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">עדיין לא הוספת בקשות עבודה</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus size={14} /> הוסף ראשונה
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-right pb-2 px-2 font-semibold text-gray-500 text-xs">חברה</th>
                <th className="text-right pb-2 px-2 font-semibold text-gray-500 text-xs">תפקיד</th>
                <th className="text-right pb-2 px-2 font-semibold text-gray-500 text-xs hidden sm:table-cell">תאריך</th>
                <th className="text-right pb-2 px-2 font-semibold text-gray-500 text-xs">סטטוס</th>
                <th className="text-right pb-2 px-2 font-semibold text-gray-500 text-xs hidden md:table-cell">פולואפ</th>
                <th className="pb-2 px-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <>
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-cream/50 transition-colors">
                    <td className="py-3 px-2">
                      <span className="font-semibold text-navy">{app.company}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{app.role}</td>
                    <td className="py-3 px-2 text-gray-400 text-xs hidden sm:table-cell">
                      {app.dateApplied ? formatDate(app.dateApplied) : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={(STATUS_COLORS[app.status] as "teal" | "green" | "yellow" | "red" | "gray" | "navy" | "purple") ?? "gray"} size="sm">
                        {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-gray-400 text-xs hidden md:table-cell">
                      {app.nextFollowUp ? formatDate(app.nextFollowUp) : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1">
                        {app.jobLink && (
                          <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-teal transition-colors">
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                          className="p-1 text-gray-400 hover:text-navy transition-colors"
                        >
                          {expandedId === app.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("למחוק בקשה זו?")) {
                              await deleteJobApplication(app.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === app.id && (
                    <tr key={`${app.id}-detail`} className="bg-cream/50">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {app.source && <div><span className="font-semibold text-gray-500">מקור: </span>{app.source}</div>}
                          {app.contactName && <div><span className="font-semibold text-gray-500">איש קשר: </span>{app.contactName}</div>}
                          <div><span className="font-semibold text-gray-500">תגובה: </span>{app.responseReceived ? "✅ כן" : "⏳ לא"}</div>
                          {app.notes && <div className="col-span-full"><span className="font-semibold text-gray-500">הערות: </span>{app.notes}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline icon to avoid import issues
function Briefcase_icon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}
