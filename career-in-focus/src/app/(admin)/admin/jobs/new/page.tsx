import { createJob } from "@/lib/actions/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewJobPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/jobs" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">משרה חדשה</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={createJob} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input name="title" label="שם תפקיד *" placeholder="Frontend Developer" required />
              <Input name="company" label="שם חברה *" placeholder="TechCorp" required />
              <Input name="location" label="מיקום" placeholder="תל אביב / ריחוק מלא" />
              <Input name="field" label="תחום" placeholder="הייטק, פינטק, בריאות..." />
              <Select name="experienceLevel" label="רמת ניסיון" options={[
                { value: "", label: "בחר..." },
                { value: "junior", label: "Junior (0-2)" },
                { value: "mid", label: "Mid (2-5)" },
                { value: "senior", label: "Senior (5+)" },
                { value: "lead", label: "Lead / Manager" },
              ]} />
              <Input name="source" label="מקור המשרה" placeholder="LinkedIn, חברה, רפרל..." />
            </div>
            <Input name="externalUrl" type="url" label="לינק למשרה" placeholder="https://..." dir="ltr" />
            <Textarea name="summary" label="תיאור קצר" placeholder="2-3 משפטים על המשרה..." rows={2} />
            <Textarea name="description" label="תיאור מלא" placeholder="תיאור מלא של המשרה..." rows={4} />
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isHot" className="rounded" />
                🔥 משרה חמה
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked className="rounded" />
                פרסם מיידית
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit">פרסם משרה</Button>
              <Link href="/admin/jobs"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
