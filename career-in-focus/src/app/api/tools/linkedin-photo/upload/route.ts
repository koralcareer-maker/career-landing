import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { BLOB_ROOT } from "@/lib/blob";

/**
 * Issues short-lived signed-URL tokens that let the BROWSER upload source
 * photos directly to Vercel Blob — bypassing the 4.5MB API-route body limit
 * entirely. We do NOT proxy bytes through this endpoint.
 *
 * The client passes the desired pathname (e.g.
 *   linkedin-photos/<userId>/<ts>/sources/source-1.jpg
 * ); we verify the user is signed in and that the path lives under their
 * own folder, then mint a token. Vercel Blob handles the actual upload.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  if (session.user.membershipType !== "PREMIUM") {
    return NextResponse.json(
      { error: "מחולל התמונות זמין רק במסלול הפרמיום." },
      { status: 403 }
    );
  }
  const userId = session.user.id;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[linkedin-photo/upload] BLOB_READ_WRITE_TOKEN missing");
    return NextResponse.json(
      {
        error:
          "אחסון התמונות לא מוגדר. יש להפעיל Vercel Blob ולוודא שהמשתנה BLOB_READ_WRITE_TOKEN קיים בסביבת Production.",
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
        // Authorize: only allow uploads under this user's folder, and only as sources.
        const prefix = `${BLOB_ROOT}/${userId}/`;
        if (!pathname.startsWith(prefix) || !pathname.includes("/sources/")) {
          throw new Error(`pathname-forbidden:${pathname}`);
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024, // 8MB per source
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // No DB write — Blob list() is the source of truth.
        console.log("[linkedin-photo/upload] source uploaded", {
          pathname: blob.pathname,
          tokenPayload,
        });
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin-photo/upload] handleUpload failed:", msg);
    return NextResponse.json({ error: `העלאה נדחתה: ${msg}` }, { status: 400 });
  }
}
