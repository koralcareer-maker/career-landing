"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Sparkles, Download, RefreshCw, User, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type PhotoSlot = { file: File; preview: string } | null;

const STYLES = [
  { value: "formal",   label: "פורמלי",   desc: "חליפה / בלייזר, רקע לבן" },
  { value: "casual",   label: "קז'ואל מקצועי", desc: "לבוש נינוח-מקצועי" },
  { value: "creative", label: "קריאטיב",  desc: "בסגנון עריכה קינמטית" },
];

export function LinkedInPhotoClient() {
  const [photos, setPhotos]   = useState<[PhotoSlot, PhotoSlot, PhotoSlot]>([null, null, null]);
  const [gender, setGender]   = useState<"woman" | "man">("woman");
  const [style, setStyle]     = useState("formal");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError]     = useState("");
  const [progress, setProgress] = useState("");
  const inputRefs             = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleFile = useCallback((idx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setPhotos(prev => {
      const next = [...prev] as typeof prev;
      if (prev[idx]?.preview) URL.revokeObjectURL(prev[idx]!.preview);
      next[idx] = { file, preview };
      return next;
    });
  }, []);

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const next = [...prev] as typeof prev;
      if (next[idx]?.preview) URL.revokeObjectURL(next[idx]!.preview);
      next[idx] = null;
      return next;
    });
  };

  const onDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(idx, file);
  };

  const generate = async () => {
    const filled = photos.filter(Boolean);
    if (filled.length === 0) return;

    setLoading(true);
    setError("");
    setResults([]);
    setProgress("מעלה תמונות...");

    const fd = new FormData();
    photos.forEach((p, i) => { if (p) fd.append(`photo${i + 1}`, p.file); });
    fd.append("gender", gender);
    fd.append("style", style);

    try {
      setProgress("מעבד עם AI... (זה עשוי לקחת 20-40 שניות)");
      const res = await fetch("/api/tools/linkedin-photo", { method: "POST", body: fd });
      const data = await res.json() as { images?: string[]; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "שגיאה לא ידועה");
      } else {
        setResults(data.images ?? []);
      }
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

  const filledCount = photos.filter(Boolean).length;

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
          <p className="text-gray-500 text-sm mt-1 mr-11">העלי עד 3 תמונות שלך — AI ייצור תמונת פרופיל מקצועית</p>
        </div>
      </div>

      {/* Photo Upload */}
      <Card className="p-5">
        <h2 className="font-bold text-navy mb-1">שלב 1 — העלי תמונות</h2>
        <p className="text-xs text-gray-400 mb-4">מינימום תמונה אחת. יותר תמונות = תוצאה טובה יותר (מספקות זוויות שונות לבינה מלאכותית)</p>
        <div className="grid grid-cols-3 gap-3">
          {([0, 1, 2] as const).map((idx) => (
            <div key={idx}>
              <input
                ref={inputRefs[idx]}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(idx, f); }}
              />
              {photos[idx] ? (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-teal/50 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photos[idx]!.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1.5 left-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <div className="absolute bottom-1.5 right-1.5 bg-teal text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                    ✓
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => inputRefs[idx].current?.click()}
                  onDrop={(e) => onDrop(idx, e)}
                  onDragOver={(e) => e.preventDefault()}
                  className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-teal/50 hover:bg-teal-pale/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-teal cursor-pointer"
                >
                  <Upload size={22} />
                  <span className="text-xs font-medium">תמונה {idx + 1}</span>
                </button>
              )}
            </div>
          ))}
        </div>
        {filledCount > 0 && (
          <p className="text-xs text-teal mt-2 font-medium">{filledCount} תמונה{filledCount !== 1 ? "ות" : ""} נבחרה{filledCount !== 1 ? "ו" : ""}</p>
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
        disabled={loading || filledCount === 0}
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
