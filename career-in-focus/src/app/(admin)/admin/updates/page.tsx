import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteUpdate } from "@/lib/actions/admin";
import Link from "next/link";
import { Plus, Trash2, Pin, Pencil } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  market: "שוק", launch: "השקה", event: "אירוע", recruiter: "מגייס", general: "כללי"
};

export default async function AdminUpdatesPage() {
  const updates = await prisma.update.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול עדכונים</h1>
          <p className="text-gray-500 text-sm">{updates.length} עדכונים</p>
        </div>
        <Link href="/admin/updates/new"><Button><Plus size={15} /> עדכון חדש</Button></Link>
      </div>

      <div className="space-y-3">
        {updates.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {u.isPinned && <Pin size={12} className="text-teal" />}
                  <p className="font-bold text-navy">{u.title}</p>
                  <Badge variant="gray" size="sm">{CATEGORY_LABELS[u.category ?? "general"] ?? u.category}</Badge>
                  {!u.isPublished && <Badge variant="yellow" size="sm">טיוטה</Badge>}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{u.content}</p>
                <p className="text-xs text-gray-300 mt-1">{formatDate(u.createdAt)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/admin/updates/${u.id}/edit`} className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors" title="עריכה">
                  <Pencil size={14} />
                </Link>
                <form action={async () => { "use server"; await deleteUpdate(u.id); }}>
                  <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {updates.length === 0 && (
          <Card padding="lg">
            <p className="text-center text-gray-400">אין עדכונים עדיין</p>
          </Card>
        )}
      </div>
    </div>
  );
}
