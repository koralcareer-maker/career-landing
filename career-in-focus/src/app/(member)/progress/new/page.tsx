import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewApplicationForm } from "./new-form";

export const metadata = { title: "מועמדות חדשה | קריירה בפוקוס" };

export default async function NewApplicationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <NewApplicationForm />
    </div>
  );
}
