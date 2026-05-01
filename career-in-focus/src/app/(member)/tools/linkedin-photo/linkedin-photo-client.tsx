"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Sparkles, Download, RefreshCw, User, ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type PhotoEntry = { file: File; preview: string };

async function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
        else        { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("הדפדפן לא תומך בעיבוד תמונות")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64 = dataUrl.split(",")[1];
      if (!base64) { reject(new Error("עיבוד התמונה נכשל")); return; }
      resolve(base64);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("טעינת התמונה נכשלה")); };
    img.src = url;
  });
}

const STYLES = [
  { value: "formal",   label: "פורמלי",        desc: "חליפה / בלייזר, רקע סטודיו" },
  { value: "casual",   label: "קז'ואל מקצועי",   desc: "לבוש נינוח, רקע חמים" },
  { value: "creative", label: "קריאטיב",        desc: "סגנון עריכה קולנועי" },
] as const;

export function LinkedInPhotoClient() {
  const [photos, setPhotos]     = useState<PhotoEntry[]>([]);
  const [gender, setGender]     = useState<"woman" | "man">("woman");
  const [style, setStyle]       = useState<"formal" | "casual" | "creative">("formal");
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<string[]>([]);
  const [error, setError]       = useState("");
  const [progress, setProgress] = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setError("");
    const fresh: PhotoEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      if (photos.length + fresh.length >= 3) break;
      const f = files[i];
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError(`קובץ "${f.name}" — סוג לא נתמך. רק JPG / PNG / WEBP.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(`קובץ "${f.name}" — גדול מ-${MAX_FILE_BYTES / 1024 / 1024}MB.`);
        continue;
      }
      fresh.push({ file: f, preview: URL.createObjectURL(f) });
    }
    if (fresh.length) {
      setPhotos((prev) => [...prev, ...fresh].slice(0, 3));
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function generate() {
    if (photos.length !== 3) {
      setError("יש להעלות בדיוק 3 תמונות לפני יצירה");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);

    try {
      setProgress("מעבד תמונות...");
      let base64s: string[];
      try {
        base64s = await Promise.all(photos.map((p) => compressToBase64(p.file)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "עיבוד התמונות נכשל");
        return;
      }

      setProgress("יוצר תמונות תדמית עם AI (20-45 שניות)...");
      let res: Response;
      try {
        res = await fetch("/api/tools/linkedin-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: base64s, gender, style }),
        });
      } catch {
        setError("שגיאת רשת — בדקי חיבור אינטרנט ונסי שנית");
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { images?: string[]; error?: string; partialErrors?: string[] }
        | null;

      if (!res.ok) {
        setError(data?.error ?? `שגיאת שרת (${res.status}) — נסי שוב בעוד דקה`);
        return;
      }
      if (!data) {
        setError("השרת החזיר תשובה לא תקינה — נסי שוב");
        return;
      }
      if (!data.images || data.images.length === 0) {
        setError(data.error ?? "לא נוצרו תמונות הפעם — נסי שוב");
        return;
      }

      setResults(data.images);
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  async function downloadImage(url: string, idx: number) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `linkedin-headshot-${idx + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError("ההורדה נכשלה — נסי לחיצה ימנית → שמירה כתמונה");
    }
  }

  const canGenerate = photos.length === 3 && !loading;

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
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
          <p className="text-gray-500 text-sm mt-1 mr-11">העלי 3 תמונות פנים ברורות — AI ייצור תמונת פרופיל מקצועית</p>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-navy mb-1">שלב 1 — העלי 3 תמונות</h2>
        <p className="text-xs text-gray-400 mb-4">
          זוויות שונות = תוצאה מדויקת יותר. JPG / PNG / WEBP עד 5MB.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, idx) => {
            const photo = photos[idx];
            if (photo) {
              return (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden border-2 border-teal/50 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    aria-label="הסר תמונה"
                    className="absolute top-1.5 left-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <div className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                    ✓
                  </div>
                </div>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={() => inputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-teal/50 hover:bg-teal-pale/30 transition-all flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-teal cursor-pointer"
              >
                <Upload size={22} />
                <span className="text-xs font-medium">העלי תמונה {idx + 1}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          {photos.length === 3 ? (
            <span className="text-teal font-bold">✓ 3 תמונות מוכנות</span>
          ) : (
            <>{photos.length} / 3 תמונות הועלו</>
          )}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold text-navy mb-4">שלב 2 — הגדרות</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">מגדר</p>
            <div className="flex gap-2">
              {[
                { value: "woman" as const, label: "אישה" },
                { value: "man" as const,   label: "גבר" },
              ].map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
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

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">סגנון</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
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

      <Button
        onClick={generate}
        disabled={!canGenerate}
        className="w-full h-12 text-base font-bold bg-gradient-to-l from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl border-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            {progress || "מייצר..."}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles size={16} />
            {photos.length === 3 ? "יצרי תמונת לינקדאין" : `העלי ${3 - photos.length} תמונות נוספות`}
          </span>
        )}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">משהו לא הסתדר</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-navy text-lg">התוצאות שלך ✨</h2>
          <p className="text-sm text-gray-500">לחצי על &quot;הורד&quot; כדי לשמור את התמונה המועדפת עלייך</p>
          <div className="grid grid-cols-2 gap-4">
            {results.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`תמונה ${idx + 1}`} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
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
            type="button"
            onClick={generate}
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-teal/40 hover:text-teal text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            ייצרי גרסאות חדשות
          </button>
        </div>
      )}
    </div>
  );
}
