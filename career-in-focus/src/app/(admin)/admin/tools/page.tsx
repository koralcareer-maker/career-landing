import { prisma } from "@/lib/prisma";
import { TOOL_TYPE_LABELS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteTool } from "@/lib/actions/admin";
import Link from "next/link";
import { Plus, Trash2, ExternalLink, Pencil } from "lucide-react";

export default async function AdminToolsPage() {
  const tools = await prisma.tool.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול כלים ומשאבים</h1>
          <p className="text-gray-500 text-sm">{tools.length} כלים</p>
        </div>
        <Link href="/admin/tools/new"><Button><Plus size={15} /> כלי חדש</Button></Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-navy text-sm">{t.title}</p>
                  <Badge variant="teal" size="sm">{TOOL_TYPE_LABELS[t.type] ?? t.type}</Badge>
                  {t.category && <Badge variant="gray" size="sm">{t.category}</Badge>}
                  {!t.isPublished && <Badge variant="yellow" size="sm">טיוטה</Badge>}
                </div>
                {t.description && <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>}
                {t.adminTip && <p className="text-xs text-teal mt-1">💡 {t.adminTip.substring(0, 60)}...</p>}
                {t.externalUrl && (
                  <a href={t.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal flex items-center gap-1 mt-1 hover:underline">
                    <ExternalLink size={10} /> פתח קישור
                  </a>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/admin/tools/${t.id}/edit`} className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors" title="עריכה">
                  <Pencil size={14} />
                </Link>
                <form action={async () => { "use server"; await deleteTool(t.id); }}>
                  <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {tools.length === 0 && (
          <Card padding="lg" className="col-span-2"><p className="text-center text-gray-400">אין כלים עדיין</p></Card>
        )}
      </div>
    </div>
  );
}
