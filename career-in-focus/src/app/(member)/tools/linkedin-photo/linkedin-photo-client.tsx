"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Sparkles, Download, RefreshCw, User, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type PhotoEntry = { file: File; preview: string };

const STYLES = [
  { value: "formal",   label: "פורמלי",   desc: "חליפה / בלייזר, רקע לבן" },
  { value: "casual",   label: "קז'ואל מקצועי", desc: "לבוש נינוח-מקצועי" },
  { value: "creative", label: "קריאטיב",  desc: "בסגנון עריכה קינמטית" },
];

export function LinkedInPhotoClient() {
  const [photos, setPhotos]     = useState<PhotoEntry[]>([]);
  const [gender, setGender]     = useState<"woman" | "man">("woman");
  const [style, setStyle]       = useState("formal");
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<string[]>([]);
  const [error, setError]       = useState("");
  const [progress, setProgress] = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newEntries: PhotoEntry[] = [];
    for (let i = 0; i < files.length && photos.length + newEntries.length < 3; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newEntries.push({ file, preview: URL.createObjectURL(file) });
      }
    }
    setPhotos(prev => [...prev, ...newEntries].slice(0, 3));
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const generate = async () => {
    if (photos.length === 0) return;
    setLoading(true);
    setError("");
    setResults([]);

    const fd = new FormData();
    photos.forEach((p, i) => fd.append(`photo${i + 1}`, p.file));
    fd.append("gender", gender);
    fd.append("style", style);

    const messages = [
      "מעלה תמונות...",
      "מנתח פנים...",
      "מייצר תמונת תדמית מקצועית...",
      "מעבד עם AI...",
      "כמעט מוכן...",
    ];
    let msgIdx = 0;
    setProgress(messages[0]);

    try {
      // Step 1: Submit job (fast — just uploads + queues)
      const submitRes = await fetch("/api/tools/linkedin-photo", { method: "POST", body: fd });
      const submitData = await submitRes.json() as { requestId?: string; error?: string };
      if (!submitRes.ok || submitData.error) {
        setError(submitData.error ?? "שגיאה בהגשת משימה");
        return;
      }
      const requestId = submitData.requestId!;

      // Step 2: Poll from browser every 4s (avoids Vercel timeout)
      const deadline = Date.now() + 150_000; // 2.5 minutes
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 4000));
        msgIdx = Math.min(msgIdx + 1, messages.length - 1);
        setProgress(messages[msgIdx]);

        const pollRes = await fetch(`/api/tools/linkedin-photo/status?requestId=${requestId}`);
        const poll = await pollRes.json() as { status: string; images?: string[]; error?: string };

        if (poll.status === "completed") {
          setResults(poll.images ?? []);
          return;
        }
        if (poll.status === "failed") {
          setError("היצירה נכשלה — נסי שנית");
          return;
        }
        // "pending" → keep polling
      }
      setError("הזמן הוקצב — נסי שנית");
    } catch {
      setError("שגיאת רשת — נסי שנית");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const downloadImage = async (url: string, idx: number) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `linkedin-headshot-${idx + 1}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tools" className="text-gray-400 hover:text-navy transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-navy">מחולל תמונת תדמית לינקדאין</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 mr-11">העלה עד 3 תמונות — AI ייצור תמונת פרופיל מקצועית</p>
        </div>
      </div>

      {/* Photo Upload */}
      <Card className="p-5">
        <h2 className="font-bold text-navy mb-1">שלב 1 — העלה תמונות</h2>
        <p className="text-xs text-gray-400 mb-4">מינימום תמונה אחת. יותר תמונות = תוצאה טובה יותר (מספקות זוויות שונות לבינה מלאכותית)</p>

        {/* Hidden multi-file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
        />

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => {
            const photo = photos[idx];
            if (photo) {
              return (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-teal/50 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1.5 left-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <div className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold shadow">✓</div>
                </div>
              );
            }
            return (
              <button
                key={idx}
                onClick={() => inputRef.current?.click()}
                onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                onDragOver={e => e.preventDefault()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-teal/50 hover:bg-teal-pale/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-teal cursor-pointer"
              >
                <Upload size={22} />
                <span className="text-xs font-medium">העלה</span>
              </button>
            );
          })}
        </div>

        {photos.length > 0 && (
          <p className="text-xs text-teal mt-2 font-medium">{photos.length} תמונות נבחרו</p>
        )}
      </Card>

      {/* Settings */}
      <Card className="p-5">
        <h2 className="font-bold text-navy mb-4">שלב 2 — הגדרות</h2>
        <div className="space-y-4">
          {/* Gender */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">מגדר</p>
            <div className="flex gap-2">
              {[
                { value: "woman", label: "אישה" },
                { value: "man",   label: "גבר" },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value as "woman" | "man")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                    gender === g.value
                      ? "border-teal bg-teal text-white"
                      : "border-gray-200 text-gray-500 hover:border-teal/40"
                  }`}
                >
                  <User size={14} />
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">סגנון</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    style === s.value
                      ? "border-teal bg-teal/5 text-navy"
                      : "border-gray-200 text-gray-500 hover:border-teal/40"
                  }`}
                >
                  <div className="font-bold text-sm">{s.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <Button
        onClick={generate}
        disabled={loading || photos.length === 0}
        className="w-full h-12 text-base font-bold bg-gradient-to-l from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl border-0"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            {progress || "מייצר..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles size={16} />
            יצרי תמונת לינקדאין
          </span>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-navy text-lg">התוצאות שלך ✨</h2>
          <p className="text-sm text-gray-500">לחצי על הורד כדי לשמור את התמונה המועדפת עליך</p>
          <div className="grid grid-cols-2 gap-4">
            {results.map((url, idx) => (
              <div key={idx} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`תמונה ${idx + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => downloadImage(url, idx)}
                    className="flex items-center gap-1.5 bg-white text-navy text-sm font-bold px-4 py-2 rounded-xl shadow-lg"
                  >
                    <Download size={14} />
                    הורד
                  </button>
                </div>
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={generate}
            className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-teal/40 hover:text-teal text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            ייצרי שוב (גרסאות חדשות)
          </button>
        </div>
      )}
    </div>
  );
}
