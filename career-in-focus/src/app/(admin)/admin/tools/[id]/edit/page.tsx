import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateTool } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TOOL_CATEGORIES } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tool = await prisma.tool.findUnique({ where: { id } });
  if (!tool) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateTool(id, formData);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/tools" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עריכת כלי / משאב</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <Input name="title" label="שם הכלי *" defaultValue={tool.title} required />
            <Textarea name="description" label="תיאור" defaultValue={tool.description ?? ""} rows={2} />
            <div className="grid grid-cols-2 gap-4">
              <Select name="type" label="סוג" defaultValue={tool.type} options={[
                { value: "AI_TOOL", label: "כלי AI" },
                { value: "TEMPLATE", label: "תבנית" },
                { value: "LINK", label: "לינק" },
                { value: "FILE", label: "קובץ" },
                { value: "QUESTIONNAIRE", label: "שאלון" },
                { value: "JOB_SOURCE", label: "מקור משרות" },
                { value: "WHATSAPP_GROUP", label: "קבוצת וואטסאפ" },
                { value: "CV_TEMPLATE", label: "תבנית קורות חיים" },
                { value: "COURSE_RESOURCE", label: "משאב קורס" },
                { value: "OTHER", label: "אחר" },
              ]} />
              <Select name="category" label="קטגוריה" defaultValue={tool.category ?? ""} options={[
                { value: "", label: "בחר..." },
                ...TOOL_CATEGORIES.map(c => ({ value: c, label: c })),
              ]} />
            </div>
            <Input name="externalUrl" type="url" label="לינק חיצוני" defaultValue={tool.externalUrl ?? ""} dir="ltr" />
            <Input name="targetRole" label="תפקיד יעד" defaultValue={tool.targetRole ?? ""} />
            <Textarea name="adminTip" label="טיפ מנהל" defaultValue={tool.adminTip ?? ""} rows={2} />
            <Textarea name="notes" label="הערות פנימיות" defaultValue={tool.notes ?? ""} rows={2} />
            <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
              <input type="checkbox" name="isPublished" defaultChecked={tool.isPublished} className="rounded" />
              פורסם
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit">שמור שינויים</Button>
              <Link href="/admin/tools"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
