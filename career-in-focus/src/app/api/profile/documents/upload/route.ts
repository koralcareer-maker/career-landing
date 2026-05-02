import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import {
  userDocsPrefix,
  DOC_TYPES,
  ALLOWED_DOC_MIME_TYPES,
  MAX_DOC_SIZE_BYTES,
} from "@/lib/documents";

/**
 * Issues short-lived signed tokens that let the browser upload personal
 * documents directly to Vercel Blob (PDF / DOCX / images, up to 10MB).
 * Path scheme: documents/<userId>/<docType>/<ts>-<filename>.
 *
 * The path is validated server-side before a token is issued — so users
 * can only ever upload to their own folder, and only into one of the
 * documented doc-type subfolders.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "אחסון המסמכים לא מוגדר עדיין. יש להפעיל Vercel Blob ולוודא שהמשתנה BLOB_READ_WRITE_TOKEN קיים.",
      },
      { status: 503 }
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const prefix = userDocsPrefix(userId);
        if (!pathname.startsWith(prefix)) {
          throw new Error("pathname-not-yours");
        }
        // pathname must be <prefix><docType>/<filename>
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
          tokenPayload: JSON.stringify({ userId, docType }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("[profile/documents/upload] uploaded", {
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[profile/documents/upload] failed:", msg);
    return NextResponse.json({ error: `העלאה נדחתה: ${msg}` }, { status: 400 });
  }
}
