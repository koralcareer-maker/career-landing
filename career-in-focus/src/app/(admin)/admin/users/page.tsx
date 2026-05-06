import { prisma } from "@/lib/prisma";
import { formatDate, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { activateUser, suspendUser, createUserManually, setMembershipType } from "@/lib/actions/admin";
import { auth } from "@/auth";
import { UserCheck, UserX, UserPlus, Crown } from "lucide-react";
import { AddUserForm } from "./add-user-form";

// ─── Membership badge config ───────────────────────────────────────────────────

const MEMBERSHIP_LABELS: Record<string, { label: string; variant: "teal" | "green" | "navy" | "purple" | "yellow" | "gray" | "red" }> = {
  NONE:    { label: "ללא חברות",    variant: "gray" },
  MEMBER:  { label: "חבר | 49₪",   variant: "teal" },
  VIP:     { label: "VIP | 149₪",  variant: "navy" },
  PREMIUM: { label: "פרמיום | 449₪", variant: "purple" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: { select: { targetRole: true, questionnaireCompleted: true, resumeUrl: true } },
      careerPassport: { select: { id: true } },
      _count: { select: { jobApplications: true } },
      // Pull the most recent device activity per user — that's our
      // proxy for "last login" since we don't write a dedicated
      // lastLoginAt field. UserDevice.lastSeenAt is bumped on every
      // authenticated request through the device-limit middleware.
      devices: {
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        select: { lastSeenAt: true },
      },
    },
  });

  const photoUpgradeUsers = users.filter(u => u.photoUpgradeStatus === "REQUESTED");
  const pendingUsers = users.filter(u => u.accessStatus === "PENDING");
  const activeUsers = users.filter(u => u.accessStatus === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול משתמשים</h1>
          <p className="text-gray-500 text-sm">
            {users.length} משתמשים · {activeUsers.length} פעילים · {pendingUsers.length} ממתינים לאישור
          </p>
        </div>
      </div>

      {/* ─── Add User Form ─── */}
      <Card className="border-teal/30 bg-teal/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-teal text-base flex items-center gap-2">
            <UserPlus size={18} />
            הוספה מהירה — מספיקה כתובת מייל
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddUserForm action={createUserManually} />
        </CardContent>
      </Card>

      {/* Photo upgrade requests */}
      {photoUpgradeUsers.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-700 text-base">📸 בקשות שדרוג תמונת LinkedIn ({photoUpgradeUsers.length})</CardTitle>
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
                  <Badge variant="purple">ממתין לטיפול</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending users banner */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-yellow-600 font-bold text-sm">⏳ {pendingUsers.length} משתמשים ממתינים לאישור</span>
          <span className="text-yellow-700 text-xs">לחץ על ✅ כדי לאשר גישה</span>
        </div>
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
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">חברות</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">פרופיל</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">משרות</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">כניסה אחרונה</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">הצטרף</th>
                  <th className="py-3 px-4 text-xs text-gray-500 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const mem = MEMBERSHIP_LABELS[u.membershipType] ?? MEMBERSHIP_LABELS.NONE;
                  // Profile completion buckets — used to colour-code the column
                  // so Coral can scan "who needs nudging to fill the passport".
                  // Three states: full (questionnaire+CV+passport), partial, none.
                  const hasProfile = !!u.profile;
                  const hasCv = !!u.profile?.resumeUrl;
                  const hasQuestionnaire = !!u.profile?.questionnaireCompleted;
                  const hasPassport = !!u.careerPassport;
                  const completionScore =
                    Number(hasProfile) + Number(hasCv) + Number(hasQuestionnaire) + Number(hasPassport);
                  const profileVariant: "green" | "yellow" | "gray" =
                    completionScore >= 3 ? "green" : completionScore >= 1 ? "yellow" : "gray";
                  const profileLabel =
                    completionScore === 4 ? "מלא"
                    : completionScore === 0 ? "ריק"
                    : `${completionScore}/4`;
                  const lastSeen = u.devices[0]?.lastSeenAt;
                  return (
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
                        <Badge variant={mem.variant} size="sm">
                          {mem.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={profileVariant} size="sm" title={`פרופיל: ${hasProfile ? "✓" : "✗"} · קו"ח: ${hasCv ? "✓" : "✗"} · שאלון: ${hasQuestionnaire ? "✓" : "✗"} · דרכון: ${hasPassport ? "✓" : "✗"}`}>
                          {profileLabel}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs font-bold text-center">{u._count.jobApplications}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {lastSeen ? timeAgo(lastSeen) : <span className="text-gray-300">לא נכנס/ה</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {/* Activate */}
                          {u.accessStatus === "PENDING" && (
                            <form action={async () => { "use server"; await activateUser(u.id); }}>
                              <button type="submit" title="אשר חברות" className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                                <UserCheck size={13} />
                              </button>
                            </form>
                          )}
                          {/* Suspend */}
                          {u.accessStatus === "ACTIVE" && u.id !== session?.user?.id && (
                            <form action={async () => { "use server"; await suspendUser(u.id); }}>
                              <button type="submit" title="השהה" className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                                <UserX size={13} />
                              </button>
                            </form>
                          )}
                          {/* Upgrade to VIP */}
                          {u.membershipType === "MEMBER" && (
                            <form action={async () => { "use server"; await setMembershipType(u.id, "VIP"); }}>
                              <button type="submit" title="שדרג ל-VIP (149₪)" className="p-1.5 bg-navy/10 text-navy rounded-lg hover:bg-navy/20 transition-colors text-xs font-bold">
                                VIP
                              </button>
                            </form>
                          )}
                          {/* Upgrade to Premium */}
                          {(u.membershipType === "MEMBER" || u.membershipType === "VIP") && (
                            <form action={async () => { "use server"; await setMembershipType(u.id, "PREMIUM"); }}>
                              <button type="submit" title="שדרג לפרמיום (449₪)" className="p-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                                <Crown size={12} />
                              </button>
                            </form>
                          )}
                          {/* Downgrade */}
                          {u.membershipType !== "MEMBER" && u.membershipType !== "NONE" && (
                            <form action={async () => { "use server"; await setMembershipType(u.id, "MEMBER"); }}>
                              <button type="submit" title="הורד לחבר רגיל" className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors text-xs">↓</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pricing reference */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-slate-500 mb-3">תמחור הקהילה</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-white rounded-xl border border-teal/20">
              <p className="font-black text-teal text-lg">49₪</p>
              <p className="text-xs text-gray-500">חבר/ה</p>
              <p className="text-xs text-gray-400">לחודש</p>
            </div>
            <div className="text-center p-3 bg-white rounded-xl border border-navy/20">
              <p className="font-black text-navy text-lg">149₪</p>
              <p className="text-xs text-gray-500">VIP</p>
              <p className="text-xs text-gray-400">לחודש</p>
            </div>
            <div className="text-center p-3 bg-white rounded-xl border border-purple-200">
              <p className="font-black text-purple-700 text-lg">449₪</p>
              <p className="text-xs text-gray-500">קורל תפעילי קשרים</p>
              <p className="text-xs text-gray-400">לחודש</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
