import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DiagnoseEmailClient } from "./diagnose-email-client";

export const metadata = { title: "אבחון מיילים | אדמין" };

export default async function DiagnoseEmailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <DiagnoseEmailClient />
    </div>
  );
}
