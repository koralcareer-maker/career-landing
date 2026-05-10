import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import {
  DOC_TYPES,
  DOC_TYPE_LABELS,
  MAX_DOC_SIZE_BYTES,
  isAllowedMimeType,
  sanitiseFilename,
  type DocType,
} from "@/lib/documents";
import { sendNewDocumentFromCoralEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow large request bodies — bulk imports send base64-encoded PDFs
// that can run several MB once Base64-padded.
export const maxDuration = 60;

/**
 * TEMPORARY one-shot import endpoint, used by the May 2026 bulk
 * migration of Coral's Drive trainee folders into the platform.
 *
 * Three operations exposed:
 *   - GET  /api/admin/bulk-drive-import?secret=...&op=list-users
 *     → returns id+name+email for every ACTIVE user. Used to
 *       fuzzy-match Drive folder names to user accounts.
 *   - POST /api/admin/bulk-drive-import (op=upload in body)
 *     → uploads a single base64-encoded file to a user's Blob
 *       folder under the requested doc type, fires the existing
 *       "new document from Coral" notification + email.
 *
 * Auth: a single shared secret hard-coded below (rotates with the
 * commit that introduces this file; removed in the cleanup commit
 * after the import is complete).
 *
 * The whole route is DELETED after Coral's import lands.
 */
const SHARED_SECRET = "kf-import-2026-x9j2-Lz8a-7Q3vMwN";
// Hard deadline: 2026-05-15. After this, the endpoint refuses even
// with the right secret — a second guard in case the cleanup commit
// is delayed.
const DEADLINE_ISO = "2026-05-15T00:00:00Z";

function checkAuth(secret: string | null): NextResponse | null {
  if (!secret || secret !== SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Date.now() > new Date(DEADLINE_ISO).getTime()) {
    return NextResponse.json({ error: "deadline-passed" }, { status: 410 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const op = req.nextUrl.searchParams.get("op");

  const denied = checkAuth(secret);
  if (denied) return denied;

  if (op === "list-users") {
    const users = await prisma.user.findMany({
      where: { accessStatus: "ACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        membershipType: true,
        gender: true,
      },
    });
    return NextResponse.json({ users });
  }

  return NextResponse.json({ error: "unknown-op" }, { status: 400 });
}

interface UploadBody {
  secret: string;
  userId: string;
  docType: DocType;
  filename: string;
  /** Base64-encoded file content. */
  contentBase64: string;
  /** MIME type — must be one of ALLOWED_DOC_MIME_TYPES. */
  contentType: string;
  /** Optional: skip email + notification (for silent backfills). */
  silent?: boolean;
}

export async function POST(req: NextRequest) {
  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const denied = checkAuth(body.secret);
  if (denied) return denied;

  // Validate fields.
  if (!body.userId) return NextResponse.json({ error: "missing-userId" }, { status: 400 });
  if (!DOC_TYPES.includes(body.docType)) {
    return NextResponse.json({ error: `invalid-docType:${body.docType}` }, { status: 400 });
  }
  if (!body.filename) return NextResponse.json({ error: "missing-filename" }, { status: 400 });
  if (!body.contentBase64) return NextResponse.json({ error: "missing-content" }, { status: 400 });
  if (!isAllowedMimeType(body.contentType)) {
    return NextResponse.json({ error: `bad-mime:${body.contentType}` }, { status: 400 });
  }

  // Decode base64 → buffer → check size.
  let buf: Buffer;
  try {
    buf = Buffer.from(body.contentBase64, "base64");
  } catch {
    return NextResponse.json({ error: "base64-decode-failed" }, { status: 400 });
  }
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 });
  }
  if (buf.byteLength > MAX_DOC_SIZE_BYTES) {
    return NextResponse.json({ error: `too-big:${buf.byteLength}` }, { status: 413 });
  }

  // Confirm target user exists + read contact info for the email/notify.
  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, name: true, email: true, gender: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user-not-found" }, { status: 404 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "blob-token-missing" },
      { status: 503 },
    );
  }

  // Upload to Vercel Blob.
  const safe = sanitiseFilename(body.filename);
  const pathname = `documents/${body.userId}/${body.docType}/${Date.now()}-${safe}`;
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(pathname, buf, {
      access: "public",
      contentType: body.contentType,
      addRandomSuffix: false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `blob-put-failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  // Side effects — silent mode skips them entirely so the import
  // doesn't pile 100 emails into the user's inbox at once.
  if (!body.silent) {
    const docLabel = DOC_TYPE_LABELS[body.docType];
    try {
      await prisma.notification.create({
        data: {
          userId: body.userId,
          type: "general",
          title: `קורל העלתה לך מסמך חדש — ${docLabel}`,
          message: `הקובץ "${safe}" מחכה לך במסמכים שלי.`,
          link: "/profile/documents",
        },
      });
    } catch (e) {
      console.error("[bulk-import notify] failed:", e);
    }

    // Email fire-and-forget; will no-op silently if Resend domain
    // isn't verified yet.
    sendNewDocumentFromCoralEmail({
      to: target.email,
      name: target.name ?? "",
      docTypeLabel: body.docType,
      filename: safe,
      gender: (target.gender as "f" | "m" | undefined) ?? "f",
    }).catch((err) => console.error("[bulk-import email] failed:", err));
  }

  return NextResponse.json({
    ok: true,
    pathname: blob.pathname,
    url: blob.url,
    size: buf.byteLength,
  });
}
