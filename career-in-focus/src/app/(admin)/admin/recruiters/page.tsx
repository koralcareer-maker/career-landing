import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserSearch, Users, Building2, Briefcase, Trash2 } from "lucide-react";
import { createRecruiter, deleteRecruiter } from "@/lib/actions/recruiters";
import { RecruiterForm } from "./recruiter-form";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  RECRUITER:  "מגייס",
  STAFFING:   "חברת השמה",
  HEADHUNTER: "הד האנטר",
};

const TYPE_VARIANTS: Record<string, "teal" | "navy" | "purple"> = {
  RECRUITER:  "teal",
  STAFFING:   "navy",
  HEADHUNTER: "purple",
};

export default async function AdminRecruitersPage() {
  const recruiters = await prisma.recruiter.findMany({
    orderBy: { createdAt: "desc" },
  });

  const total       = recruiters.length;
  const active      = recruiters.filter(r => r.isActive).length;
  const byRecruiter = recruiters.filter(r => r.type === "RECRUITER").length;
  const byStaffing  = recruiters.filter(r => r.type === "STAFFING").length;
  const byHeadhunter = recruiters.filter(r => r.type === "HEADHUNTER").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy">מגייסים וסוכנויות</h1>
        <p className="text-gray-500 text-sm">ניהול ספריית המגייסים, חברות ההשמה והד-האנטרים</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "סה״כ רשומות",    count: total,        icon: Users,     color: "text-navy" },
          { label: "מגייסים",        count: byRecruiter,  icon: UserSearch, color: "text-teal" },
          { label: "חברות השמה",     count: byStaffing,   icon: Building2,  color: "text-navy" },
          { label: "הד-האנטרים",     count: byHeadhunter, icon: Briefcase,  color: "text-purple-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <Icon size={20} className={`mx-auto mb-1.5 ${s.color}`} />
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-navy">
            <UserSearch size={18} />
            הוספת מגייס / חברת השמה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecruiterForm action={createRecruiter} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-navy">
            <Users size={18} />
            כל המגייסים ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recruiters.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <UserSearch size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">עדיין לא נוספו מגייסים</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שם</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">חברה</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סוג</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תחום</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">אימייל</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">טלפון</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סטטוס</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {recruiters.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-navy">{r.name}</td>
                      <td className="py-3 px-4 text-gray-600">{r.company}</td>
                      <td className="py-3 px-4">
                        <Badge variant={TYPE_VARIANTS[r.type] ?? "gray"} size="sm">
                          {TYPE_LABELS[r.type] ?? r.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{r.field ?? "—"}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {r.email ? (
                          <a href={`mailto:${r.email}`} className="text-teal hover:underline">{r.email}</a>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{r.phone ?? "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={r.isActive ? "teal" : "gray"} size="sm">
                          {r.isActive ? "פעיל" : "לא פעיל"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <form
                          action={async () => {
                            "use server";
                            await deleteRecruiter(r.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                            title="מחק"
                          >
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
