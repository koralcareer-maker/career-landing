import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateJob } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateJob(id, formData);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/jobs" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עריכת משרה</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="title" label="תפקיד *" defaultValue={job.title} required />
              <Input name="company" label="חברה *" defaultValue={job.company} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="location" label="מיקום" defaultValue={job.location ?? ""} />
              <Input name="field" label="תחום" defaultValue={job.field ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select name="experienceLevel" label="רמת ניסיון" defaultValue={job.experienceLevel ?? ""} options={[
                { value: "", label: "כללי" },
                { value: "junior", label: "Junior" },
                { value: "mid", label: "Mid" },
                { value: "senior", label: "Senior" },
                { value: "lead", label: "Lead / Manager" },
              ]} />
              <Input name="source" label="מקור" defaultValue={job.source ?? ""} />
            </div>
            <Textarea name="summary" label="תיאור קצר" defaultValue={job.summary ?? ""} rows={2} />
            <Input name="externalUrl" type="url" label="קישור למשרה" defaultValue={job.externalUrl ?? ""} dir="ltr" />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isHot" defaultChecked={job.isHot} className="rounded" />
                🔥 משרה חמה
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked={job.isPublished} className="rounded" />
                פורסם
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">שמור שינויים</Button>
              <Link href="/admin/jobs"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
