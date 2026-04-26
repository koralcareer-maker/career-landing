import { createEvent } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewEventPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/events" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">אירוע חדש</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={createEvent} className="space-y-4">
            <Input name="title" label="שם האירוע *" placeholder="כגון: וובינר - כיצד לכתוב קורות חיים מנצחים" required />
            <div className="grid grid-cols-2 gap-4">
              <Select name="type" label="סוג אירוע" options={[
                { value: "WEBINAR", label: "וובינר" },
                { value: "WORKSHOP", label: "סדנה" },
                { value: "LIVE", label: "שידור חי" },
                { value: "GUEST_RECRUITER", label: "מגייס אורח" },
                { value: "JOB_DROP", label: "מקלחת משרות" },
                { value: "LAUNCH", label: "השקה" },
                { value: "NETWORKING", label: "נטוורקינג" },
              ]} />
              <Input name="startAt" type="datetime-local" label="תאריך ושעת התחלה *" required />
              <Input name="endAt" type="datetime-local" label="תאריך ושעת סיום" />
              <Input name="meetingUrl" type="url" label="לינק לפגישה (זום/מיט)" placeholder="https://zoom.us/..." dir="ltr" />
            </div>
            <Input name="registerUrl" type="url" label="לינק הרשמה" placeholder="https://..." dir="ltr" />
            <Textarea name="description" label="תיאור האירוע" placeholder="פרטים על האירוע..." rows={3} />
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isOnline" defaultChecked className="rounded" />
                אירוע אונליין
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked className="rounded" />
                פרסם מיידית
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">צור אירוע</Button>
              <Link href="/admin/events"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
