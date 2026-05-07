import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCardcomCredentials } from "@/lib/settings";
import { saveCardcomCredentials } from "@/lib/actions/admin-settings";
import { CardcomSettingsClient } from "./cardcom-settings-client";

export const metadata = { title: "הגדרות סליקה | אדמין" };
export const dynamic = "force-dynamic";

export default async function CardcomSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) redirect("/dashboard");

  // Tolerate the Setting table not existing yet — getCardcomCredentials
  // catches and falls back to env vars internally.
  const creds = await getCardcomCredentials();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto" dir="rtl">
      <CardcomSettingsClient
        action={saveCardcomCredentials}
        sources={creds.source}
        // Pass a non-secret summary (length only) so the UI can show
        // "currently set" without leaking the values themselves.
        currentLengths={{
          terminal: creds.terminal.length,
          apiName: creds.apiName.length,
          apiPassword: creds.apiPassword.length,
        }}
      />
    </div>
  );
}
