import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  ALLOWED_DOC_MIME_TYPES,
  MAX_DOC_SIZE_BYTES,
} from "@/lib/documents";

export const runtime = "nodejs";

/**
 * Admin-only upload endpoint. Issues short-lived signed tokens that let
 * the browser upload directly to Vercel Blob into a SPECIFIC user's
 * folder, then creates a notification for that user.
 *
 * Same shape as src/app/api/profile/documents/upload/route.ts but with
 * two differences: (1) admin auth instead of session-user, (2) the
 * target userId is read from the URL path (/admin/users/[id]/documents
 * /upload), not derived from the logged-in user.
 *
 * Client-direct uploads bypass Next.js's server-action body limit, so
 * Hebrew-filename quirks and large files both stop being a problem.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה" }, { status: 401 });
  }
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isAdmin) {
    return NextResponse.json({ error: "פעולה זו זמינה לאדמין בלבד" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "אחסון Vercel Blob לא מוגדר. תוסיפי BLOB_READ_WRITE_TOKEN ב-Vercel → Environment Variables.",
      },
      { status: 503 },
    );
  }

  const { id: targetUserId } = await params;

  // Verify the target user exists before issuing a token so we don't
  // waste Blob storage on a typo in the URL.
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "המשתמש לא נמצא" }, { status: 404 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const prefix = `documents/${targetUserId}/`;
        if (!pathname.startsWith(prefix)) {
          throw new Error("pathname-mismatch");
        }
        const rel = pathname.slice(prefix.length);
        const slash = rel.indexOf("/");
        if (slash === -1) throw new Error("missing-doctype");
        const docType = rel.slice(0, slash);
        if (!DOC_TYPES.includes(docType as (typeof DOC_TYPES)[number])) {
          throw new Error(`invalid-doctype:${docType}`);
        }
        return {
          allowedContentTypes: ALLOWED_DOC_MIME_TYPES,
          maximumSizeInBytes: MAX_DOC_SIZE_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ targetUserId, docType }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Drop a notification for the target user so they discover the
        // file on their next visit. Best-effort — don't block the
        // upload completion on the notify DB write.
        try {
          const payload = tokenPayload
            ? (JSON.parse(tokenPayload) as { targetUserId?: string; docType?: string })
            : null;
          const userId = payload?.targetUserId;
          const docType = payload?.docType as (typeof DOC_TYPES)[number] | undefined;
          if (!userId) return;

          // Pull the filename back off the blob's pathname for a friendly
          // notification body. The pathname is documents/<userId>/<docType>/<ts>-<filename>.
          const tail = blob.pathname.split("/").pop() ?? "";
          const dash = tail.indexOf("-");
          const filename = dash !== -1 ? tail.slice(dash + 1) : tail;

          await prisma.notification.create({
            data: {
              userId,
              type: "general",
              title: `קורל העלתה לך מסמך חדש — ${docType ? DOC_TYPE_LABELS[docType] : "מסמך"}`,
              message: `הקובץ "${filename}" מחכה לך במסמכים שלי.`,
              link: "/profile/documents",
            },
          });
        } catch (e) {
          console.error("[admin upload notify] failed:", e);
        }
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[admin upload] failed:", msg);
    return NextResponse.json({ error: `העלאה נדחתה: ${msg}` }, { status: 400 });
  }
}
