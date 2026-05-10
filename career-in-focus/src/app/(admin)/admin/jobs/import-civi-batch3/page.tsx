import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ImportCiviBatch3Client } from "./import-civi-batch3-client";

export const metadata = { title: "ייבוא משרות מ-civi.co.il (Batch 3) | אדמין" };

export default async function ImportCiviJobsBatch3Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <ImportCiviBatch3Client />
    </div>
  );
}
