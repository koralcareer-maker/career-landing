import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listUserDocuments,
  deleteUserDocument,
  userDocsPrefix,
} from "@/lib/documents";

export const runtime = "nodejs";

/** GET /api/profile/documents — list the current user's documents. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ documents: [] });
  }
  try {
    const docs = await listUserDocuments(session.user.id);
    return NextResponse.json({ documents: docs });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[profile/documents] list failed:", msg);
    return NextResponse.json({ documents: [], warning: "טעינת מסמכים נכשלה" });
  }
}

/**
 * DELETE /api/profile/documents?pathname=...
 * Strict ownership check: pathname must start with this user's folder.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "נדרשת כניסה למערכת" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "אחסון לא מוגדר" }, { status: 503 });
  }

  const pathname = req.nextUrl.searchParams.get("pathname");
  if (!pathname) {
    return NextResponse.json({ error: "חסרה כתובת קובץ למחיקה" }, { status: 400 });
  }
  if (!pathname.startsWith(userDocsPrefix(session.user.id))) {
    return NextResponse.json(
      { error: "המסמך אינו שייך למשתמשת המחוברת" },
      { status: 403 }
    );
  }

  try {
    await deleteUserDocument(pathname);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[profile/documents] delete failed:", msg);
    return NextResponse.json({ error: "מחיקה נכשלה" }, { status: 500 });
  }
}
