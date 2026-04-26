import { prisma } from "@/lib/prisma";
import { formatDateTime, EVENT_TYPE_LABELS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/lib/actions/admin";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { startAt: "asc" } });
  const upcoming = events.filter(e => e.startAt >= new Date());
  const past = events.filter(e => e.startAt < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול אירועים</h1>
          <p className="text-gray-500 text-sm">{upcoming.length} אירועים קרובים</p>
        </div>
        <Link href="/admin/events/new"><Button><Plus size={15} /> אירוע חדש</Button></Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">שם אירוע</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סוג</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">תאריך ושעה</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs">סטטוס</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const isPast = e.startAt < new Date();
                return (
                  <tr key={e.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isPast ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4 font-medium text-navy">{e.title}</td>
                    <td className="py-3 px-4">
                      <Badge variant="teal" size="sm">{EVENT_TYPE_LABELS[e.type] ?? e.type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDateTime(e.startAt)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={isPast ? "gray" : e.isPublished ? "green" : "yellow"} size="sm">
                        {isPast ? "עבר" : e.isPublished ? "פורסם" : "טיוטה"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/events/${e.id}/edit`} className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors" title="עריכה">
                          <Pencil size={13} />
                        </Link>
                        <form action={async () => { "use server"; await deleteEvent(e.id); }}>
                          <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
