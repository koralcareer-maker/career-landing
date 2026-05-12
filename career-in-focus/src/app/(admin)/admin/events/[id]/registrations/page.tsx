import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronRight, Mail, Phone, Users, Calendar, MapPin, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "נרשמים לאירוע | אדמין" };

export default async function EventRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      startAt: true,
      isOnline: true,
      location: true,
      type: true,
      maxCapacity: true,
    },
  });
  if (!event) notFound();

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: id, cancelledAt: null },
    orderBy: { registeredAt: "asc" },
  });

  // Pull contact info for everyone in one batch — cheaper than N queries.
  const userIds = registrations.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      membershipType: true,
      profile: { select: { phone: true } },
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  // Also count cancelled registrations so Coral can see drop-off.
  const cancelledCount = await prisma.eventRegistration.count({
    where: { eventId: id, cancelledAt: { not: null } },
  });

  const capacityWord = event.maxCapacity
    ? `${registrations.length}/${event.maxCapacity}`
    : `${registrations.length}`;

  // Build a single mailto link for bulk email — handy for "send Zoom
  // link 30 minutes before". Uses BCC so recipients don't see each other.
  const allEmails = users.map((u) => u.email).join(",");
  const mailtoBulk = users.length
    ? `mailto:?bcc=${encodeURIComponent(allEmails)}&subject=${encodeURIComponent(`עדכון לסדנה: ${event.title}`)}`
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400" aria-label="ניווט">
        <Link href="/admin" className="hover:text-teal">אדמין</Link>
        <ChevronRight size={12} className="rotate-180" />
        <Link href="/admin/events" className="hover:text-teal">אירועים</Link>
        <ChevronRight size={12} className="rotate-180" />
        <span className="text-gray-600">נרשמים</span>
      </nav>

      {/* Event summary */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-navy mb-2">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Calendar size={14} className="text-teal" />
                {formatDateTime(event.startAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                {event.isOnline ? <Clock size={14} className="text-teal" /> : <MapPin size={14} className="text-teal" />}
                {event.isOnline ? "ZOOM" : event.location ?? "TBA"}
              </span>
            </div>
          </div>
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="text-xs font-bold text-teal hover:underline"
          >
            לעריכת האירוע ←
          </Link>
        </div>
      </Card>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-teal">{capacityWord}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">נרשמים פעילים</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-orange-500">{cancelledCount}</p>
          <p className="text-xs text-gray-500 font-semibold mt-1">ביטולים</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-navy">
            {registrations.length + cancelledCount}
          </p>
          <p className="text-xs text-gray-500 font-semibold mt-1">סך הכל פעולות</p>
        </Card>
      </div>

      {/* Quick action — bulk mailto */}
      {mailtoBulk && (
        <a
          href={mailtoBulk}
          className="block bg-teal/5 border border-teal/30 rounded-2xl px-5 py-4 hover:bg-teal/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal rounded-xl flex items-center justify-center">
              <Mail size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-navy text-sm">שליחת מייל לכל הנרשמים</p>
              <p className="text-xs text-gray-500">
                ייפתח לך מייל חדש עם {users.length} כתובות ב-BCC (אף אחד לא רואה את השני)
              </p>
            </div>
          </div>
        </a>
      )}

      {/* Registrations table */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users size={16} className="text-teal" />
          <h2 className="font-black text-navy">רשימת הנרשמים ({registrations.length})</h2>
        </div>

        {registrations.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            עדיין לא נרשם אף אחד לאירוע הזה.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">#</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שם</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">אימייל</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">טלפון</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">מסלול</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תאריך הרשמה</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, idx) => {
                  const u = userById.get(reg.userId);
                  if (!u) return null;
                  // Build phone wa.me link (Israel format) only when the
                  // user has a phone in their profile. Strip non-digits
                  // and the leading 0 so "050-1234567" becomes "972501234567".
                  const phoneRaw = u.profile?.phone?.trim() ?? "";
                  const waLink = phoneRaw
                    ? `https://wa.me/972${phoneRaw.replace(/\D/g, "").replace(/^0/, "")}`
                    : null;

                  return (
                    <tr key={reg.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-navy">{u.name ?? "—"}</td>
                      <td className="py-3 px-4">
                        <a
                          href={`mailto:${u.email}`}
                          className="text-teal-dark hover:underline text-xs"
                          dir="ltr"
                        >
                          {u.email}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                            dir="ltr"
                          >
                            <Phone size={11} /> {phoneRaw}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            u.membershipType === "VIP" || u.membershipType === "PREMIUM"
                              ? "teal"
                              : "gray"
                          }
                          size="sm"
                        >
                          {u.membershipType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {formatDateTime(reg.registeredAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
