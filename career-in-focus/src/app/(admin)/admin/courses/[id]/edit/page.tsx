import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateCourse } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateCourse(id, formData);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/courses" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עריכת קורס</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <Input name="title" label="שם הקורס *" defaultValue={course.title} required />
            <Textarea name="description" label="תיאור" defaultValue={course.description ?? ""} rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <Input name="category" label="קטגוריה" defaultValue={course.category ?? ""} placeholder="כגון: קורות חיים, ראיונות..." />
              <Input name="formatType" label="פורמט" defaultValue={course.formatType ?? ""} placeholder="וידאו, PDF, קישור..." />
            </div>
            <Select name="accessType" label="רמת גישה" defaultValue={course.accessType} options={[
              { value: "INCLUDED", label: "כלול בחברות" },
              { value: "FREE", label: "חינמי" },
              { value: "DISCOUNTED", label: "מוזל לחברים" },
              { value: "PAID", label: "בתשלום" },
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <Input name="ctaText" label="טקסט כפתור" defaultValue={course.ctaText ?? ""} />
              <Input name="ctaUrl" type="url" label="קישור" defaultValue={course.ctaUrl ?? ""} dir="ltr" />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
              <input type="checkbox" name="isPublished" defaultChecked={course.isPublished} className="rounded" />
              פורסם
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit">שמור שינויים</Button>
              <Link href="/admin/courses"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
