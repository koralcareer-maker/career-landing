"use client";

/**
 * Drag-and-drop CV uploader for /admin/candidates.
 *
 * Coral can select / drag up to 50 PDF/DOCX/TXT files at once. The
 * client POSTs them one-by-one to /api/admin/candidates/import-from-file
 * with a small concurrency limit (3 in flight) so Gemini's 15 RPM free
 * tier holds. A per-file status row shows created / duplicate / error
 * inline. Re-uploading the same filename produces "duplicate-by-sourceRef".
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, Copy, AlertCircle, X } from "lucide-react";

type FileStatus =
  | { state: "queued" }
  | { state: "uploading" }
  | { state: "done"; status: string; name?: string; matchedBy?: string }
  | { state: "error"; message: string };

interface FileRow {
  file: File;
  status: FileStatus;
}

const MAX_CONCURRENCY = 3;

export function CandidateUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [running, setRunning] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fresh: FileRow[] = Array.from(files).map((f) => ({ file: f, status: { state: "queued" } }));
    setRows((prev) => [...prev, ...fresh]);
    void run(fresh);
  }

  async function uploadOne(row: FileRow, index: number) {
    setRows((cur) => cur.map((r, i) => (r === row ? { ...r, status: { state: "uploading" } } : r)));
    const fd = new FormData();
    fd.append("file", row.file);
    fd.append("source", "manual");
    fd.append("sourceRef", `file:${row.file.name}`);
    try {
      const res = await fetch("/api/admin/candidates/import-from-file", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean; status?: string; name?: string; matchedBy?: string;
        error?: string; detail?: string;
      };
      if (res.ok && json.ok) {
        setRows((cur) =>
          cur.map((r) =>
            r === row
              ? { ...r, status: { state: "done", status: json.status ?? "unknown", name: json.name, matchedBy: json.matchedBy } }
              : r,
          ),
        );
      } else {
        setRows((cur) =>
          cur.map((r) =>
            r === row
              ? { ...r, status: { state: "error", message: json.error ?? `HTTP ${res.status}` } }
              : r,
          ),
        );
      }
    } catch (e) {
      setRows((cur) =>
        cur.map((r) =>
          r === row
            ? { ...r, status: { state: "error", message: e instanceof Error ? e.message : String(e) } }
            : r,
        ),
      );
    }
    void index;
  }

  async function run(queue: FileRow[]) {
    setRunning(true);
    // Process with a sliding window of MAX_CONCURRENCY in-flight requests.
    let next = 0;
    const inFlight: Promise<void>[] = [];
    while (next < queue.length || inFlight.length > 0) {
      while (next < queue.length && inFlight.length < MAX_CONCURRENCY) {
        const idx = next++;
        const p = uploadOne(queue[idx]!, idx).then(() => {
          const i = inFlight.indexOf(p);
          if (i >= 0) inFlight.splice(i, 1);
        });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }
    setRunning(false);
    router.refresh();
  }

  const counts = rows.reduce(
    (acc, r) => {
      if (r.status.state === "done") {
        if (r.status.status === "created") acc.created++;
        else if (r.status.status.startsWith("duplicate")) acc.dup++;
      } else if (r.status.state === "error") acc.err++;
      else if (r.status.state === "uploading") acc.up++;
      else acc.q++;
      return acc;
    },
    { created: 0, dup: 0, err: 0, up: 0, q: 0 },
  );

  return (
    <div className="flex flex-col gap-2 items-end max-w-md">
      <button
        type="button"
        onClick={pick}
        disabled={running}
        className="inline-flex items-center gap-1.5 bg-teal hover:bg-teal-dark text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        title="גררי קבצי PDF/DOCX או לחצי לבחירה. עד 50 קבצים בבת אחת."
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {running ? `מעלה ${counts.up + counts.q} קבצים...` : "העלאת קו\"ח (PDF/DOCX)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => onPick(e.target.files)}
        className="hidden"
      />
      {rows.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl text-xs text-gray-700 w-full max-h-96 overflow-y-auto">
          <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between font-bold">
            <span>
              {counts.created} נוספו · {counts.dup} כפילויות · {counts.err} שגיאות
            </span>
            <button onClick={() => setRows([])} className="text-gray-400 hover:text-red-500" title="ניקוי">
              <X size={13} />
            </button>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="px-3 py-1.5 border-b border-gray-50 flex items-center gap-2 text-[11px]">
              <span className="flex-1 truncate font-mono">{r.file.name}</span>
              {r.status.state === "queued" && <span className="text-gray-400">בתור</span>}
              {r.status.state === "uploading" && (
                <span className="flex items-center gap-1 text-teal">
                  <Loader2 size={11} className="animate-spin" /> מעלה
                </span>
              )}
              {r.status.state === "done" && r.status.status === "created" && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 size={11} /> {r.status.name ?? "נוסף"}
                </span>
              )}
              {r.status.state === "done" && r.status.status.startsWith("duplicate") && (
                <span className="flex items-center gap-1 text-amber-600" title={`התאמה: ${r.status.matchedBy ?? "—"}`}>
                  <Copy size={11} /> כפילות ({r.status.name})
                </span>
              )}
              {r.status.state === "error" && (
                <span className="flex items-center gap-1 text-red-600" title={r.status.message}>
                  <AlertCircle size={11} /> שגיאה
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
