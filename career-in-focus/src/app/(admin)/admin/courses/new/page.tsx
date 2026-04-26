import { createCourse } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewCoursePage() {
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/courses" className="text-gray-400 hover:text-navy"><ChevronLeft size={18} /></Link>
        <h1 className="text-2xl font-black text-navy">קורס חדש</h1>
      </div>
      <Card>
        <CardContent className="p-6">
          <form action={createCourse} className="space-y-4">
            <Input name="title" label="שם הקורס *" placeholder="כגון: מדריך לכתיבת קורות חיים" required />
            <Textarea name="description" label="תיאור" placeholder="מה הקורס מכיל ולמי הוא מיועד?" rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <Input name="category" label="קטגוריה" placeholder="חיפוש עבודה, ראיונות, LinkedIn..." />
              <Input name="formatType" label="פורמט תוכן" placeholder="וידאו, PDF, קורס חיצוני..." />
              <Select name="accessType" label="סוג גישה" options={[
                { value: "INCLUDED", label: "כלול בחברות" },
                { value: "FREE", label: "חינמי" },
                { value: "DISCOUNTED", label: "מוזל לחברים" },
                { value: "PAID", label: "בתשלום נפרד" },
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input name="ctaText" label="טקסט כפתור" placeholder="התחל קורס" />
              <Input name="ctaUrl" type="url" label="לינק קורס" placeholder="https://..." dir="ltr" />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
              <input type="checkbox" name="isPublished" defaultChecked className="rounded" />
              פרסם מיידית
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit">צור קורס</Button>
              <Link href="/admin/courses"><Button variant="ghost" type="button">ביטול</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
