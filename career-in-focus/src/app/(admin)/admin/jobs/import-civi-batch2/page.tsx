import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ImportCiviBatch2Client } from "./import-civi-batch2-client";

export const metadata = { title: "ייבוא משרות מ-civi.co.il (אצווה 2) | אדמין" };

export default async function ImportCiviJobsBatch2Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <ImportCiviBatch2Client />
    </div>
  );
}
