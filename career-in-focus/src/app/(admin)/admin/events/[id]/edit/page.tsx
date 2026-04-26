import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateEvent } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

function toDatetimeLocal(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const action = async (formData: FormData) => {
    "use server";
    await updateEvent(id, formData);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/events" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עריכת אירוע</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={action} className="space-y-4">
            <Input name="title" label="שם האירוע *" defaultValue={event.title} required />
            <div className="grid grid-cols-2 gap-4">
              <Select name="type" label="סוג" defaultValue={event.type} options={[
                { value: "WEBINAR", label: "וובינר" },
                { value: "WORKSHOP", label: "סדנה" },
                { value: "LIVE", label: "שידור חי" },
                { value: "GUEST_RECRUITER", label: "מגייס אורח" },
                { value: "JOB_DROP", label: "Job Drop" },
                { value: "LAUNCH", label: "השקה" },
                { value: "NETWORKING", label: "נטוורקינג" },
              ]} />
              <Input name="location" label="מיקום" defaultValue={event.location ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="startAt" type="datetime-local" label="התחלה *" defaultValue={toDatetimeLocal(event.startAt)} required />
              <Input name="endAt" type="datetime-local" label="סיום" defaultValue={toDatetimeLocal(event.endAt)} />
            </div>
            <Textarea name="description" label="תיאור" defaultValue={event.description ?? ""} rows={3} />
            <Input name="meetingUrl" type="url" label="קישור לפגישה" defaultValue={event.meetingUrl ?? ""} dir="ltr" />
            <Input name="registerUrl" type="url" label="קישור להרשמה" defaultValue={event.registerUrl ?? ""} dir="ltr" />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isOnline" defaultChecked={event.isOnline} className="rounded" />
                אירוע מקוון
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked={event.isPublished} className="rounded" />
                פורסם
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">שמור שינויים</Button>
              <Link href="/admin/events"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
