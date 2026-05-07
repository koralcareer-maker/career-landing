"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { CARDCOM_KEYS, setSetting } from "@/lib/settings";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    throw new Error("Unauthorized");
  }
}

/**
 * Save CardCom credentials to the Setting table.
 * Empty fields are treated as "leave unchanged" so the admin can update
 * just one of the three (e.g. rotate the password) without retyping the
 * other two. To explicitly clear a field, the admin types a single space
 * — handled by setSetting() in lib/settings.ts (whitespace-only ⇒ delete).
 */
export async function saveCardcomCredentials(prevState: unknown, formData: FormData) {
  await requireAdmin();

  const terminal    = (formData.get("terminal") as string)?.trim() ?? "";
  const apiName     = (formData.get("apiName") as string)?.trim() ?? "";
  const apiPassword = (formData.get("apiPassword") as string)?.trim() ?? "";

  // Empty inputs = "don't touch this field". Saves the admin from
  // re-typing the password every time they tweak the terminal number.
  const updates: Promise<void>[] = [];
  if (terminal.length > 0)    updates.push(setSetting(CARDCOM_KEYS.terminal, terminal));
  if (apiName.length > 0)     updates.push(setSetting(CARDCOM_KEYS.apiName, apiName));
  if (apiPassword.length > 0) updates.push(setSetting(CARDCOM_KEYS.apiPassword, apiPassword));

  if (updates.length === 0) {
    return { error: "לא הוזן אף ערך — לא בוצע שינוי" };
  }

  try {
    await Promise.all(updates);
  } catch (e) {
    return {
      error:
        e instanceof Error && /no such table|does not exist/i.test(e.message)
          ? "טבלת Setting לא קיימת ב-DB. תריצי קודם את /admin/migrate-job-alerts."
          : "שגיאה בשמירה. נסי שוב.",
    };
  }

  revalidatePath("/admin/settings/cardcom");
  return { success: true, savedFields: updates.length };
}
