import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateUpdate } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const update = await prisma.update.findUnique({ where: { id } });
  if (!update) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateUpdate(id, formData);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/updates" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עריכת עדכון</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <Input name="title" label="כותרת *" defaultValue={update.title} required />
            <Textarea name="content" label="תוכן *" defaultValue={update.content} rows={5} required />
            <Select name="category" label="קטגוריה" defaultValue={update.category ?? "general"} options={[
              { value: "general", label: "כללי" },
              { value: "market", label: "שוק העבודה" },
              { value: "launch", label: "השקה" },
              { value: "event", label: "אירוע" },
              { value: "recruiter", label: "מגייס" },
              { value: "tip", label: "טיפ" },
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <Input name="ctaText" label="טקסט כפתור" defaultValue={update.ctaText ?? ""} placeholder="לחץ כאן" />
              <Input name="ctaUrl" type="url" label="קישור כפתור" defaultValue={update.ctaUrl ?? ""} dir="ltr" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPinned" defaultChecked={update.isPinned} className="rounded" />
                📌 נעוץ
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked={update.isPublished} className="rounded" />
                פורסם
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">שמור שינויים</Button>
              <Link href="/admin/updates"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
