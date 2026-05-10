"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronRight,
  Bell,
} from "lucide-react";
import {
  DOC_TYPES,
  ALLOWED_DOC_MIME_TYPES,
  MAX_DOC_SIZE_BYTES,
  sanitiseFilename,
  type DocType,
} from "@/lib/documents";

interface DocumentItem {
  pathname: string;
  url: string;
  type: string;
  filename: string;
  uploadedAt: string;
  sizeBytes: number;
}

interface Props {
  targetUser: {
    id: string;
    name: string | null;
    email: string;
    membershipType: string;
  };
  initialDocuments: DocumentItem[];
  docTypeLabels: Record<string, string>;
  // Kept in props for signature compatibility but no longer used —
  // uploads now go client-direct to Vercel Blob via the /upload route.
  uploadAction?: unknown;
  deleteAction: (
    userId: string,
    pathname: string,
  ) => Promise<{ error?: string; ok?: true }>;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AdminDocumentsClient({
  targetUser,
  initialDocuments,
  docTypeLabels,
  deleteAction,
}: Props) {
  const [docs, setDocs] = useState<DocumentItem[]>(initialDocuments);
  const [docType, setDocType] = useState<DocType>("cv");
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Client-direct upload. Skips the Next.js server-action body limit
   * (which bites on larger PDFs / Hebrew filenames) by hitting
   * Vercel Blob from the browser with a presigned token issued by
   * /api/admin/users/<id>/documents/upload.
   *
   * Path scheme matches the rest of the system:
   *   documents/<userId>/<docType>/<unix-ms>-<safe-filename>
   */
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploading) return;
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadError("לא נבחר קובץ");
      return;
    }
    if (file.size > MAX_DOC_SIZE_BYTES) {
      setUploadError(`הקובץ גדול מ-10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    if (!ALLOWED_DOC_MIME_TYPES.includes(file.type)) {
      setUploadError(
        `פורמט לא נתמך (${file.type || "לא ידוע"}). מותר: PDF, DOC, DOCX, JPG, PNG, WEBP`,
      );
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const safe = sanitiseFilename(file.name);
    const pathname = `documents/${targetUser.id}/${docType}/${Date.now()}-${safe}`;

    try {
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: `/api/admin/users/${targetUser.id}/documents/upload`,
        contentType: file.type,
      });

      // Optimistically push the new document into the local list so
      // Coral sees the upload land immediately, without a full refresh.
      setDocs((prev) => [
        {
          pathname: blob.pathname,
          url: blob.url,
          type: docType,
          filename: safe,
          uploadedAt: new Date().toISOString(),
          sizeBytes: file.size,
        },
        ...prev,
      ]);
      setUploadSuccess(safe);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "ההעלאה נכשלה");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(pathname: string) {
    if (deletingPath) return;
    if (!confirm("למחוק את הקובץ הזה לצמיתות?")) return;
    setDeletingPath(pathname);
    try {
      const res = await deleteAction(targetUser.id, pathname);
      if ("error" in res && res.error) {
        alert(res.error);
      } else {
        setDocs((prev) => prev.filter((d) => d.pathname !== pathname));
      }
    } finally {
      setDeletingPath(null);
    }
  }

  const grouped = DOC_TYPES.map((t) => ({
    type: t,
    label: docTypeLabels[t] ?? t,
    docs: docs.filter((d) => d.type === t),
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400" aria-label="ניווט">
        <Link href="/admin" className="hover:text-teal">אדמין</Link>
        <ChevronRight size={12} className="rotate-180" />
        <Link href="/admin/users" className="hover:text-teal">משתמשים</Link>
        <ChevronRight size={12} className="rotate-180" />
        <span className="text-gray-600">מסמכים</span>
      </nav>

      {/* Target user header */}
      <div className="bg-white rounded-3xl border border-black/5 p-5 sm:p-6 shadow-sm">
        <p className="text-xs font-bold text-teal uppercase tracking-wide mb-1">העלאת מסמך עבור:</p>
        <h1 className="text-xl sm:text-2xl font-black text-navy">
          {targetUser.name ?? "(ללא שם)"}
        </h1>
        <p className="text-sm text-gray-500 mt-1" dir="ltr">
          {targetUser.email}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {targetUser.membershipType === "VIP" || targetUser.membershipType === "PREMIUM"
            ? "🌟 חברה VIP — מסמכים פרטיים שלך מקורל"
            : "מסלול: " + targetUser.membershipType}
        </p>
      </div>

      {/* Upload form */}
      <div className="bg-gradient-to-l from-teal/5 via-white to-teal/5 border-2 border-teal/30 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={20} className="text-teal" />
          <h2 className="font-black text-navy text-base">העלאת קובץ חדש</h2>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Document type — radio group, more obvious than a dropdown */}
          <div>
            <label className="text-xs font-bold text-navy mb-2 block">
              סוג מסמך
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOC_TYPES.map((t) => (
                <label
                  key={t}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-2.5 text-xs font-bold transition-all ${
                    docType === t
                      ? "border-teal bg-teal/10 text-navy"
                      : "border-gray-200 text-gray-600 hover:border-teal/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="docType"
                    value={t}
                    checked={docType === t}
                    onChange={() => setDocType(t)}
                    className="sr-only"
                  />
                  {docTypeLabels[t] ?? t}
                </label>
              ))}
            </div>
          </div>

          {/* File picker */}
          <div>
            <label htmlFor="file" className="text-xs font-bold text-navy mb-2 block">
              קובץ (עד 10MB · PDF, DOC, DOCX, JPG, PNG, WEBP)
            </label>
            <input
              id="file"
              ref={fileInputRef}
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              required
              className="block w-full text-sm text-navy file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal/10 file:text-teal hover:file:bg-teal/20"
            />
            <p className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1">
              <Bell size={11} />
              המשתמשת תקבל התראה אוטומטית שמסמך חדש מחכה לה במערכת.
            </p>
          </div>

          {/* Errors / success */}
          {uploadError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>{uploadError}</p>
            </div>
          )}
          {uploadSuccess && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>הקובץ &quot;{uploadSuccess}&quot; הועלה בהצלחה ומופיע ברשימה למטה.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-teal text-white font-black px-5 py-3 rounded-xl hover:bg-teal-dark disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "מעלה..." : "העלאת הקובץ"}
          </button>
        </form>
      </div>

      {/* Existing documents */}
      <div className="bg-white rounded-3xl border border-black/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-teal" />
          <h2 className="font-black text-navy text-base">
            מסמכים קיימים ({docs.length})
          </h2>
        </div>

        {docs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            אין עדיין מסמכים בתיקייה של המשתמשת הזאת.
          </p>
        ) : (
          <div className="space-y-5">
            {grouped
              .filter((g) => g.docs.length > 0)
              .map((g) => (
                <div key={g.type}>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
                    {g.label}
                  </p>
                  <div className="space-y-2">
                    {g.docs.map((d) => (
                      <div
                        key={d.pathname}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <FileText size={18} className="text-teal shrink-0" />
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 text-sm font-semibold text-navy hover:text-teal hover:underline truncate"
                        >
                          {d.filename}
                        </a>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {fmtSize(d.sizeBytes)} · {fmtDate(d.uploadedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.pathname)}
                          disabled={deletingPath === d.pathname}
                          aria-label={`מחיקת ${d.filename}`}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          {deletingPath === d.pathname ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
