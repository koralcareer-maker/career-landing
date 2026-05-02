"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  ChevronLeft, FileText, Upload, Trash2, ExternalLink,
  AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DOC_TYPES, DOC_TYPE_LABELS, sanitiseFilename, MAX_DOC_SIZE_BYTES,
  ALLOWED_DOC_MIME_TYPES, DOCUMENTS_ROOT,
  type DocType,
} from "@/lib/documents";

interface DocumentDTO {
  pathname: string;
  url: string;
  type: DocType;
  filename: string;
  uploadedAt: string;
  sizeBytes: number;
}

interface Props {
  userId: string;
  initialDocuments: DocumentDTO[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DocumentsClient({ userId, initialDocuments }: Props) {
  const [docs, setDocs] = useState<DocumentDTO[]>(initialDocuments);
  const [uploadingType, setUploadingType] = useState<DocType | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<DocType | null>(null);

  // Refresh once on mount so we pick up server-side state.
  useEffect(() => {
    let alive = true;
    fetch("/api/profile/documents", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data.documents)) setDocs(data.documents);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  function pickFile(type: DocType) {
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again triggers change
    const type = pendingTypeRef.current;
    pendingTypeRef.current = null;
    if (!f || !type) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_DOC_MIME_TYPES.includes(f.type)) {
      setError(`סוג הקובץ "${f.type}" אינו נתמך. אפשרי: PDF / DOCX / DOC / JPG / PNG / WEBP`);
      return;
    }
    if (f.size > MAX_DOC_SIZE_BYTES) {
      setError(`הקובץ גדול מ-${MAX_DOC_SIZE_BYTES / 1024 / 1024}MB`);
      return;
    }

    setUploadingType(type);
    try {
      const ts = Date.now();
      const safeName = sanitiseFilename(f.name);
      const pathname = `${DOCUMENTS_ROOT}/${userId}/${type}/${ts}-${safeName}`;
      await upload(pathname, f, {
        access: "public",
        handleUploadUrl: "/api/profile/documents/upload",
        contentType: f.type,
      });
      // Refresh list
      const res = await fetch("/api/profile/documents", { cache: "no-store" });
      const data = (await res.json()) as { documents?: DocumentDTO[] };
      if (data.documents) setDocs(data.documents);
      setSuccess(`"${f.name}" הועלה בהצלחה`);
    } catch (err) {
      setError(err instanceof Error ? `העלאה נכשלה: ${err.message}` : "העלאה נכשלה");
    } finally {
      setUploadingType(null);
    }
  }

  async function deleteDoc(doc: DocumentDTO) {
    const ok = window.confirm(`למחוק את "${doc.filename}"? פעולה זו אינה הפיכה.`);
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(
        `/api/profile/documents?pathname=${encodeURIComponent(doc.pathname)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "מחיקה נכשלה");
        return;
      }
      setDocs((prev) => prev.filter((d) => d.pathname !== doc.pathname));
      setSuccess(`"${doc.filename}" נמחק`);
    } catch {
      setError("שגיאת רשת — לא ניתן למחוק כרגע");
    }
  }

  // Group docs by type for nicer rendering.
  const grouped = DOC_TYPES.map((type) => ({
    type,
    label: DOC_TYPE_LABELS[type],
    items: docs.filter((d) => d.type === type),
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-gray-400 hover:text-navy">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-navy">המסמכים שלי</h1>
          <p className="text-gray-500 text-sm mt-1">
            כל המסמכים המקצועיים שלך במקום אחד — קורות חיים, תעודות, מכתבי המלצה ועוד.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_DOC_MIME_TYPES.join(",")}
        className="hidden"
        onChange={onFileChosen}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 text-sm flex items-start gap-3">
          <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grouped.map(({ type, label, items }) => (
          <Card key={type} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center">
                  <FileText size={18} className="text-teal" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-sm">{label}</h2>
                  <p className="text-xs text-gray-400">{items.length} מסמכים</p>
                </div>
              </div>
              <Button
                onClick={() => pickFile(type)}
                disabled={uploadingType !== null}
                className="h-9 px-3 bg-teal hover:bg-teal/90 text-white rounded-xl border-0 text-xs font-bold disabled:opacity-50"
              >
                {uploadingType === type ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    מעלה...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Upload size={12} />
                    העלי
                  </span>
                )}
              </Button>
            </div>

            {items.length > 0 ? (
              <div className="space-y-2">
                {items.map((doc) => (
                  <div
                    key={doc.pathname}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-navy truncate">{doc.filename}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(doc.uploadedAt)} · {formatSize(doc.sizeBytes)}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal hover:text-teal/80 p-1.5 rounded-lg hover:bg-teal/10 transition-colors"
                      aria-label="פתחי מסמך"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => deleteDoc(doc)}
                      className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      aria-label="מחקי מסמך"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic py-2">
                עדיין לא העלית כאן מסמכים. לחצי &quot;העלי&quot; להתחיל.
              </p>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-100">
        <p className="text-xs text-slate-600 leading-relaxed">
          📌 גודל מקסימלי לקובץ: 10MB. סוגי קבצים נתמכים: PDF · DOCX · DOC · JPG · PNG · WEBP.
          המסמכים נגישים רק לך — דרך הקישור הישיר ב-Blob.
        </p>
      </Card>
    </div>
  );
}
