"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, FileCheck2, AlertCircle, Sparkles } from "lucide-react";
import { markCvUploaded, saveCvAnalysis, type CvAnalysisResult } from "@/lib/actions/profile";
import type { WizardState } from "./types";
import { AtsBadge } from "./ats-badge";

interface Props {
  resumeUrl: string | null;
  /** Patches WizardState — used to store the marker + AI-extracted fields. */
  setState: (patch: Partial<WizardState>) => void;
}

/**
 * CV uploader for wizard step 2. Encodes the file as base64, ships it
 * to /api/profile/analyze-cv (Node runtime, 60s budget), persists the
 * extracted strengths/skills via saveCvAnalysis, and auto-fills the
 * wizard state so the user doesn't have to retype what the AI already
 * pulled out of the document.
 *
 * After a successful analysis we also surface the lightweight ATS
 * traffic-light rating returned by the server — that's the free-tier
 * appetiser that nudges base members toward PRO for the deeper view.
 */
export function CvUploader({ resumeUrl, setState }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">(
    resumeUrl ? "done" : "idle",
  );
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState(resumeUrl ?? "");
  // Last analysis output, kept locally so the ATS badge survives
  // re-renders / step navigation without a refetch.
  const [lastAts, setLastAts] = useState<{ level: "green" | "yellow" | "red"; reasons?: string[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);

    // Client-side guard so the user gets immediate feedback for the
    // common 'file is too big' case instead of waiting for the upload
    // to round-trip and 413 from the route. Cap matches the server.
    if (file.size > 10 * 1024 * 1024) {
      setError("הקובץ גדול מ-10MB. שמרי כ-PDF דחוס או הסירי תמונות מהמסמך.");
      setPhase("error");
      return;
    }
    if (!/\.(pdf|docx?|doc)$/i.test(file.name)) {
      setError("פורמט לא נתמך. תומכים ב-PDF, DOC, DOCX.");
      setPhase("error");
      return;
    }

    setPhase("uploading");

    try {
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const mimeType = file.type || "application/pdf";

      setPhase("analyzing");
      const resp = await fetch("/api/profile/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // fileName lets the server's format detector use the
        // extension as a tiebreaker after signature-byte sniffing.
        body: JSON.stringify({ base64Data: b64, mimeType, fileName: file.name }),
      });

      // Read the body even on non-2xx — the server now returns a
      // friendly Hebrew `error` field on every failure, so we can
      // surface the real reason ('AI service down', 'file invalid',
      // etc.) instead of a generic network message.
      let result: (CvAnalysisResult & { error?: string; detail?: string }) | null = null;
      try {
        result = await resp.json();
      } catch {
        result = null;
      }

      if (!resp.ok || !result || result.error) {
        const reason =
          result?.error ??
          (resp.status === 413 ? "הקובץ גדול מדי. שמרי כ-PDF דחוס יותר." :
           resp.status === 401 ? "פג תוקף הסשן. רענני את הדף ונסי שוב." :
           resp.status === 503 ? "שירות הניתוח לא זמין כרגע. פני לקורל." :
                                 "הניתוח נכשל. נסי שוב בעוד רגע.");
        // Log detail to console for support-side debugging without
        // dumping it to the user.
        if (result?.detail) console.warn("[cv-uploader] detail:", result.detail);
        setError(reason);
        setPhase("error");
        return;
      }

      // Persist the upload + AI-extracted profile fields. Wrap in a
      // try so a DB error here doesn't lose the analysis we already
      // got back — we still show "done" and update the form, the
      // server-side persistence just retries on the next step save.
      try {
        await markCvUploaded(file.name);
        await saveCvAnalysis({
          currentRole: result.currentRole,
          targetRole: result.targetRole,
          yearsExperience: result.yearsExperience,
          strengths: result.strengths,
          missingSkills: result.skillGaps,
        });
      } catch (e) {
        console.warn("[cv-uploader] persist failed (will retry on next-step save):", e);
      }

      // Reflect in wizard state so the form fields update live.
      setState({
        resumeUrl: file.name,
        currentRole: result.currentRole,
        yearsExperience: result.yearsExperience,
        strengths: result.strengths,
      });
      // Cache the lightweight ATS rating so the badge renders below
      // the success state.
      if (result.atsLevel) {
        setLastAts({ level: result.atsLevel, reasons: result.atsReasons });
      }
      setPhase("done");
    } catch (e) {
      console.error("[cv-uploader] upload error:", e);
      setError(
        e instanceof Error && /aborted|timeout|timed out/i.test(e.message)
          ? "הקובץ עלה לאט מדי. נסי קובץ קטן יותר או חיבור אינטרנט יציב."
          : "לא הצלחנו להעלות. בדקי חיבור אינטרנט ונסי שוב.",
      );
      setPhase("error");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFile}
      />

      {phase === "done" ? (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
              <FileCheck2 size={16} />
              קורות חיים נטענו{fileName && ` · ${fileName}`}
            </div>
            <p className="text-xs text-emerald-700/80 leading-relaxed flex items-start gap-1.5">
              <Sparkles size={12} className="mt-0.5 shrink-0" />
              המערכת חילצה אוטומטית את התפקיד, שנות הניסיון והחוזקות שלך — מילאתי לך את השדות.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 text-xs font-bold text-emerald-700 underline hover:no-underline"
            >
              החלפה לקובץ אחר
            </button>
          </div>

          {/* Free-tier traffic-light ATS rating. Only renders when the
              server returned a level — older analyses without the field
              just show the upload-confirmation card. */}
          {lastAts && <AtsBadge level={lastAts.level} reasons={lastAts.reasons} />}
        </>
      ) : phase === "uploading" || phase === "analyzing" ? (
        <div className="rounded-xl border border-teal/20 bg-teal/5 p-4 flex items-center gap-3">
          <Loader2 size={18} className="text-teal animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-teal">
              {phase === "uploading" ? "מעלה קובץ..." : "מנתחת קורות חיים..."}
            </p>
            <p className="text-xs text-teal/70 mt-0.5">{fileName}</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-bold hover:border-teal hover:bg-teal/5 hover:text-teal transition-all"
        >
          <Upload size={16} />
          לחצי כדי להעלות קורות חיים (PDF / DOCX)
        </button>
      )}

      {phase === "error" && error && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-red-700 font-bold">{error}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs text-red-700 underline mt-1"
            >
              לנסות שוב
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
