import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CardcomQuickFixClient } from "./quick-fix-client";

export const metadata = { title: "תיקון מהיר ל-CardCom | אדמין" };

export default async function CardcomQuickFixPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto" dir="rtl">
      <CardcomQuickFixClient />
    </div>
  );
}
