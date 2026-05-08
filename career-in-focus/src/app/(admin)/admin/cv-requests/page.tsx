import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CvRequestsClient } from "./cv-requests-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "בקשות לכתיבת קוח | אדמין" };

interface Row {
  id: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  deliveredAt: string | null;
  adminNotes: string | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
    targetRole: string | null;
  };
}

export default async function CvRequestsAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  // Tolerate missing table — show empty state until migration runs.
  let rows: Row[] = [];
  try {
    const requests = await prisma.cvWritingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    if (requests.length > 0) {
      const userIds = [...new Set(requests.map((r) => r.userId))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, profile: { select: { phone: true, targetRole: true } } },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      rows = requests.map((r) => {
        const u = userMap.get(r.userId);
        return {
          id:           r.id,
          status:       r.status,
          createdAt:    r.createdAt.toISOString(),
          scheduledAt:  r.scheduledAt?.toISOString() ?? null,
          deliveredAt:  r.deliveredAt?.toISOString() ?? null,
          adminNotes:   r.adminNotes ?? null,
          user: {
            name:       u?.name ?? "—",
            email:      u?.email ?? "—",
            phone:      u?.profile?.phone ?? null,
            targetRole: u?.profile?.targetRole ?? null,
          },
        };
      });
    }
  } catch (e) {
    console.warn("[cv-requests admin] table missing or query failed:", e instanceof Error ? e.message : e);
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" dir="rtl">
      <CvRequestsClient rows={rows} />
    </div>
  );
}
