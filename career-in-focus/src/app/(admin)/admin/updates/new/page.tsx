import { createUpdate } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewUpdatePage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/updates" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">עדכון חדש</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={createUpdate} className="space-y-4">
            <Input name="title" label="כותרת *" placeholder="כגון: עדכון שוק העבודה — אפריל 2026" required />
            <Select name="category" label="קטגוריה" options={[
              { value: "general", label: "כללי" },
              { value: "market", label: "עדכון שוק" },
              { value: "launch", label: "השקה" },
              { value: "event", label: "אירוע" },
              { value: "recruiter", label: "מגייס" },
            ]} />
            <Textarea name="content" label="תוכן *" placeholder="כתוב את תוכן העדכון כאן..." rows={6} required />
            <div className="grid grid-cols-2 gap-4">
              <Input name="ctaText" label="טקסט כפתור (אופציונלי)" placeholder="לפרטים נוספים" />
              <Input name="ctaUrl" type="url" label="לינק כפתור" placeholder="https://..." dir="ltr" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPinned" className="rounded" />
                📌 נעוץ בראש
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                <input type="checkbox" name="isPublished" defaultChecked className="rounded" />
                פרסם מיידית
              </label>
            </div>
            <p className="text-xs text-gray-400">פרסום עדכון ישלח התראה לכל החברים הפעילים</p>
            <div className="flex gap-3 pt-2">
              <Button type="submit">פרסם עדכון</Button>
              <Link href="/admin/updates"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
