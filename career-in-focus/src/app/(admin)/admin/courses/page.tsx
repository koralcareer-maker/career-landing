import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteCourse } from "@/lib/actions/admin";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";

const ACCESS_LABELS: Record<string, string> = { FREE: "חינמי", INCLUDED: "כלול", DISCOUNTED: "מוזל", PAID: "בתשלום" };
const ACCESS_VARIANTS: Record<string, string> = { FREE: "green", INCLUDED: "teal", DISCOUNTED: "yellow", PAID: "red" };

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { contents: true } } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">ניהול קורסים</h1>
          <p className="text-gray-500 text-sm">{courses.length} קורסים</p>
        </div>
        <Link href="/admin/courses/new"><Button><Plus size={15} /> קורס חדש</Button></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-navy text-sm">{c.title}</p>
                  <Badge variant={(ACCESS_VARIANTS[c.accessType] as "teal" | "green" | "yellow" | "red") ?? "gray"} size="sm">
                    {ACCESS_LABELS[c.accessType]}
                  </Badge>
                  {!c.isPublished && <Badge variant="gray" size="sm">טיוטה</Badge>}
                </div>
                {c.category && <p className="text-xs text-gray-400">{c.category}</p>}
                {c.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{c.description}</p>}
                <p className="text-xs text-gray-300 mt-1">{c._count.contents} חלקים</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/admin/courses/${c.id}/edit`} className="p-1.5 rounded-lg hover:bg-teal-pale text-teal transition-colors" title="עריכה">
                  <Pencil size={14} />
                </Link>
                <form action={async () => { "use server"; await deleteCourse(c.id); }}>
                  <button type="submit" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {courses.length === 0 && (
          <Card padding="lg" className="col-span-2"><p className="text-center text-gray-400">אין קורסים עדיין</p></Card>
        )}
      </div>
    </div>
  );
}
