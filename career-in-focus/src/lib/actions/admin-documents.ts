"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import {
  ALLOWED_DOC_MIME_TYPES,
  DOC_TYPES,
  DOC_TYPE_LABELS,
  MAX_DOC_SIZE_BYTES,
  deleteUserDocument,
  isAllowedMimeType,
  sanitiseFilename,
  type DocType,
} from "@/lib/documents";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("נדרשת כניסה");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    throw new Error("פעולה זו זמינה לאדמין בלבד");
  }
  return session.user;
}

/**
 * Server-side upload to Vercel Blob on behalf of a user.
 *
 * Used by Coral to drop CVs, cover letters, recommendations, etc. into
 * a member's documents folder — typically as part of the VIP "Coral
 * prepares my CV" flow. The user then sees the file at /profile/documents.
 *
 * Path scheme matches the client-side upload route exactly:
 *   documents/<userId>/<docType>/<unix-ms>-<safe-filename>
 *
 * Creates a Notification for the target user so they discover the new
 * document next time they open the site.
 */
export async function uploadDocumentForUser(
  prevState: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: true; filename?: string }> {
  await requireAdmin();

  const userId = (formData.get("userId") as string)?.trim();
  const docType = (formData.get("docType") as string)?.trim() as DocType;
  const file = formData.get("file") as File | null;

  if (!userId) return { error: "חסר מזהה משתמש" };
  if (!DOC_TYPES.includes(docType)) return { error: "סוג מסמך לא תקין" };
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "לא נבחר קובץ" };
  }
  if (file.size > MAX_DOC_SIZE_BYTES) {
    return { error: `הקובץ גדול מ-10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }
  if (!isAllowedMimeType(file.type)) {
    return {
      error: `פורמט לא נתמך (${file.type || "לא ידוע"}). מותר: PDF, DOC, DOCX, JPG, PNG, WEBP`,
    };
  }

  // Confirm target user exists before spending Blob storage on it.
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!targetUser) return { error: "המשתמש לא נמצא" };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      error:
        "אחסון Vercel Blob לא מוגדר. תוסיפי BLOB_READ_WRITE_TOKEN ב-Vercel.",
    };
  }

  const safe = sanitiseFilename(file.name);
  const pathname = `documents/${userId}/${docType}/${Date.now()}-${safe}`;

  try {
    await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
  } catch (e) {
    return { error: `שגיאת אחסון: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Notification so the user discovers the new document on their next
  // visit. Links straight to the documents page.
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "general",
        title: `קורל העלתה לך מסמך חדש — ${DOC_TYPE_LABELS[docType]}`,
        message: `הקובץ "${safe}" מחכה לך במסמכים שלי.`,
        link: "/profile/documents",
      },
    });
  } catch (e) {
    // Non-blocking — the upload succeeded, the notification just won't show.
    console.error("[admin-doc-upload] notification failed:", e);
  }

  revalidatePath(`/admin/users/${userId}/documents`);
  revalidatePath("/profile/documents");
  return { ok: true, filename: safe };
}

/**
 * Delete a single document from a user's folder. Same caller-checks
 * as the user-side delete, plus a guard that confirms the pathname
 * starts with `documents/<userId>/` so a malformed input can't reach
 * other users' files.
 */
export async function deleteDocumentForUser(
  userId: string,
  pathname: string,
): Promise<{ error?: string; ok?: true }> {
  await requireAdmin();
  const userPrefix = `documents/${userId}/`;
  if (!pathname.startsWith(userPrefix)) {
    return { error: "הנתיב לא שייך למשתמש הזה" };
  }
  try {
    await deleteUserDocument(pathname);
  } catch (e) {
    return { error: `מחיקה נכשלה: ${e instanceof Error ? e.message : String(e)}` };
  }
  revalidatePath(`/admin/users/${userId}/documents`);
  return { ok: true };
}
