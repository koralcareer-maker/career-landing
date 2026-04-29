import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Users, Clock } from "lucide-react";
import { BroadcastForm } from "./broadcast-form";

const AUDIENCE_LABELS: Record<string, string> = {
  ALL:     "כולם",
  PAYING:  "משלמים",
  MEMBER:  "חבר/ה",
  VIP:     "VIP",
  PREMIUM: "פרמיום",
};

export default async function BroadcastPage() {
  // Count users per audience group
  const [all, member, vip, premium] = await Promise.all([
    prisma.user.count({ where: { accessStatus: "ACTIVE" } }),
    prisma.user.count({ where: { accessStatus: "ACTIVE", membershipType: "MEMBER" } }),
    prisma.user.count({ where: { accessStatus: "ACTIVE", membershipType: "VIP" } }),
    prisma.user.count({ where: { accessStatus: "ACTIVE", membershipType: "PREMIUM" } }),
  ]);

  const userCounts: Record<string, number> = {
    ALL:     all,
    PAYING:  member + vip + premium,
    MEMBER:  member,
    VIP:     vip,
    PREMIUM: premium,
  };

  // Recent broadcast history
  const logs = await prisma.broadcastLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { sentBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy">תפוצת מיילים</h1>
        <p className="text-gray-500 text-sm">שליחת מיילים לכל החברים או לפי סינון</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "כל הפעילים", count: all, color: "text-navy" },
          { label: "חבר/ה",      count: member, color: "text-teal" },
          { label: "VIP",        count: vip,    color: "text-navy" },
          { label: "פרמיום",     count: premium, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-navy">
            <Mail size={18} />
            כתיבת הודעה חדשה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcastForm userCounts={userCounts} />
        </CardContent>
      </Card>

      {/* History */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-navy">
              <Clock size={18} />
              היסטוריית שליחות
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נושא</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">קהל</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נשלח</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">נכשל</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תאריך</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שולח</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-navy max-w-[240px] truncate">{log.subject}</td>
                      <td className="py-3 px-4">
                        <Badge variant="teal" size="sm">
                          {AUDIENCE_LABELS[log.audience] ?? log.audience}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-green-700 font-semibold">
                          <Send size={12} />
                          {log.sentCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {log.skippedCount > 0
                          ? <span className="text-red-500">{log.skippedCount}</span>
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{log.sentBy?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {logs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">עדיין לא נשלחו הודעות תפוצה</p>
        </div>
      )}
    </div>
  );
}
