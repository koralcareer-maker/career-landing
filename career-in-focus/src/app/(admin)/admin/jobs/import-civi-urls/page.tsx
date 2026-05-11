import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ImportCiviUrlsClient } from "./import-civi-urls-client";

export const metadata = { title: "ייבוא URLs מ-civi.co.il | אדמין" };

export default async function ImportCiviUrlsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <ImportCiviUrlsClient />
    </div>
  );
}
