import { list, del, type ListBlobResultBlob } from "@vercel/blob";

/**
 * Per-user personal documents folder, stored in Vercel Blob with the
 * pathname scheme:
 *
 *   documents/<userId>/<docType>/<unix-ms>-<safe-filename>
 *
 * No DB row is needed — Blob is the source of truth. The user-facing
 * page lists everything under documents/<userId>/ and groups by docType.
 *
 * Doc types are a closed set so the UI can render labelled sections
 * ("קורות חיים", "תעודות"...) and so the upload route can reject paths
 * that don't fit the scheme.
 */

export const DOCUMENTS_ROOT = "documents";

export const DOC_TYPES = [
  "cv",
  "cover-letter",
  "certificate",
  "recommendation",
  "portfolio",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  cv: "קורות חיים",
  "cover-letter": "מכתבי מקדים",
  certificate: "תעודות והסמכות",
  recommendation: "מכתבי המלצה",
  portfolio: "תיק עבודות",
  other: "אחר",
};

export const ALLOWED_DOC_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function userDocsPrefix(userId: string): string {
  return `${DOCUMENTS_ROOT}/${userId}/`;
}

export function docTypePrefix(userId: string, docType: DocType): string {
  return `${userDocsPrefix(userId)}${docType}/`;
}

/** Replace anything outside [A-Za-z0-9.\-_] with `_` so paths stay clean. */
export function sanitiseFilename(name: string): string {
  // Keep file extension, sanitise the rest. Strip Hebrew via NFKD isn't
  // safe (loses meaning); just pass-through the unicode and replace only
  // characters that break URL/blob storage.
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 200);
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_DOC_MIME_TYPES.includes(mime);
}

export interface UserDocument {
  pathname: string;     // full Blob pathname
  url: string;          // public URL
  type: DocType;
  filename: string;     // friendly name
  uploadedAt: Date;
  sizeBytes: number;
}

/** List a user's documents, grouped (newest first). */
export async function listUserDocuments(userId: string): Promise<UserDocument[]> {
  const prefix = userDocsPrefix(userId);
  const out: UserDocument[] = [];

  let cursor: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const parsed = parseDocumentPath(blob, prefix);
      if (parsed) out.push(parsed);
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }
  out.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  return out;
}

function parseDocumentPath(
  blob: ListBlobResultBlob,
  prefix: string
): UserDocument | null {
  // pathname like: documents/<userId>/<docType>/<ts>-<filename>
  const rel = blob.pathname.slice(prefix.length); // <docType>/<ts>-<filename>
  const slash = rel.indexOf("/");
  if (slash === -1) return null;
  const typePart = rel.slice(0, slash) as DocType;
  if (!DOC_TYPES.includes(typePart)) return null;

  const fileWithTs = rel.slice(slash + 1);
  const dash = fileWithTs.indexOf("-");
  if (dash === -1) return null;
  const tsRaw = fileWithTs.slice(0, dash);
  const filename = fileWithTs.slice(dash + 1);
  const ts = Number(tsRaw);

  return {
    pathname: blob.pathname,
    url: blob.url,
    type: typePart,
    filename: filename || rel,
    uploadedAt: Number.isFinite(ts) ? new Date(ts) : new Date(blob.uploadedAt),
    sizeBytes: blob.size,
  };
}

/** Delete a user's document. Caller MUST verify ownership before calling. */
export async function deleteUserDocument(pathname: string): Promise<void> {
  await del(pathname);
}
