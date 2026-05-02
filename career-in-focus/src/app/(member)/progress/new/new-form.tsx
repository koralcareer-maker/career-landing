"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addJobApplication } from "@/lib/actions/progress";
import { APPLICATION_STATUS_LABELS } from "@/lib/utils";

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function NewApplicationForm() {
  const [state, formAction, pending] = useActionState(addJobApplication, null);
  const router = useRouter();

  // After a successful submit, navigate to the new application's detail
  // page with ?welcome=1 — that's where the celebration banner + suggested
  // next actions will surface.
  useEffect(() => {
    if (state && "success" in state && state.success && "id" in state && state.id) {
      router.push(`/progress/${state.id}?welcome=1`);
    }
  }, [state, router]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/progress" className="text-gray-400 hover:text-navy">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-teal" />
          <h1 className="text-2xl font-black text-navy">הוספת מועמדות</h1>
        </div>
      </div>

      <Card className="p-5">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">חברה *</label>
              <Input name="company" required placeholder="Google, Wix, ..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">תפקיד *</label>
              <Input name="role" required placeholder="Product Manager, Senior Designer..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">תאריך הגשה</label>
              <Input name="dateApplied" type="date" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">סטטוס</label>
              <Select name="status" defaultValue="APPLIED" options={STATUS_OPTIONS} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">מקור</label>
              <Input name="source" placeholder="LinkedIn / חבר / אתר חברה..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">איש קשר</label>
              <Input name="contactName" placeholder="שם המראיין/ת או מגייס/ת" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">קישור למשרה</label>
              <Input name="jobLink" type="url" placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">הערות</label>
              <Textarea name="notes" rows={3} placeholder="פרטים על המשרה / איש הקשר / מה ידוע עד כה..." />
            </div>
          </div>

          {state && "error" in state && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1 h-11 bg-teal hover:bg-teal/90 text-white rounded-xl border-0 font-bold disabled:opacity-50">
              {pending ? "שומר..." : "הוסיפי מועמדות"}
            </Button>
            <Link href="/progress" className="h-11 px-5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center hover:border-gray-300">
              ביטול
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
