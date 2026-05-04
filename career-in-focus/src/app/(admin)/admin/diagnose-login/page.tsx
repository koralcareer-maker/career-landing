import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DiagnoseForm } from "./diagnose-form";

export const metadata = { title: "אבחון התחברות | אדמין" };
export const dynamic = "force-dynamic";

export default async function DiagnoseLoginPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">אבחון התחברות</h1>
        <p className="text-sm text-gray-500">
          בודק למה משתמשת לא מצליחה להתחבר. הזיני אימייל (וסיסמה אם רוצה לבדוק תאימות), ותקבלי דיווח מדויק.
        </p>
      </div>

      <DiagnoseForm />
    </div>
  );
}
