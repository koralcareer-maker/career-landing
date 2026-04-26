import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { activateUser, suspendUser } from "@/lib/actions/admin";
import { auth } from "@/auth";
import { UserCheck, UserX, Search } from "lucide-react";

export default async function AdminUsersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: { select: { targetRole: true, questionnaireCompleted: true } }, _count: { select: { jobApplications: true } } },
  });

  const photoUpgradeUsers = users.filter(u => u.photoUpgradeStatus === "REQUESTED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול משתמשים</h1>
          <p className="text-gray-500 text-sm">{users.length} משתמשים רשומים</p>
        </div>
      </div>

      {/* Photo upgrade requests */}
      {photoUpgradeUsers.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700">📸 בקשות שדרוג תמונת LinkedIn ({photoUpgradeUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {photoUpgradeUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-navy text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {u.photoUpgradeRequestedAt && (
                      <p className="text-xs text-gray-400">בוקש ב-{formatDate(u.photoUpgradeRequestedAt)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="purple">₪49 — ממתין לטיפול</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שם</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">אימייל</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סטטוס</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תפקיד</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">יעד</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">בקשות</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">הצטרף</th>
                  <th className="py-3 px-4 text-xs text-gray-500">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-navy">{u.name ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={u.accessStatus === "ACTIVE" ? "green" : u.accessStatus === "PENDING" ? "yellow" : "red"}
                        size="sm"
                      >
                        {u.accessStatus === "ACTIVE" ? "פעיל" : u.accessStatus === "PENDING" ? "ממתין" : u.accessStatus === "SUSPENDED" ? "מוגבל" : "פג תוקף"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.role === "SUPER_ADMIN" ? "navy" : u.role === "ADMIN" ? "teal" : "gray"} size="sm">
                        {u.role === "SUPER_ADMIN" ? "סופר אדמין" : u.role === "ADMIN" ? "אדמין" : "חבר"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{u.profile?.targetRole ?? "—"}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs text-center">{u._count.jobApplications}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {u.accessStatus === "PENDING" && (
                          <form action={async () => { "use server"; await activateUser(u.id); }}>
                            <button type="submit" title="אשר חברות" className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                              <UserCheck size={13} />
                            </button>
                          </form>
                        )}
                        {u.accessStatus === "ACTIVE" && u.id !== session?.user?.id && (
                          <form action={async () => { "use server"; await suspendUser(u.id); }}>
                            <button type="submit" title="השהה" className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                              <UserX size={13} />
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
