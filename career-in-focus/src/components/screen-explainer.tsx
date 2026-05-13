"use client";

/**
 * ScreenExplainer — a small "?" floating button you drop into the
 * top-right of any page. Clicking it opens a modal that explains what
 * the screen does, with an optional embedded video.
 *
 * Coral asked for per-screen explainer videos so members never feel
 * lost ("חייב סרטון הסבר מה זה כל מסך ומה אפשר למצוא בו"). Until she
 * records and uploads the actual clips, the component renders just
 * the text — it's wired so swapping in a YouTube/Vimeo URL is a
 * one-line change.
 */

import { useState, useEffect } from "react";
import { HelpCircle, X, PlayCircle } from "lucide-react";

interface Props {
  /** Page title used inside the modal header. */
  title: string;
  /** 1-3 short paragraphs describing the screen and what to do on it. */
  description: string | string[];
  /** Optional YouTube/Vimeo URL — when provided the modal renders an
   *  embed; when missing it shows just the text. */
  videoUrl?: string;
  /** Anchor side. Defaults to "end" (top-left in RTL = top-end). */
  side?: "start" | "end";
}

export function ScreenExplainer({ title, description, videoUrl, side = "end" }: Props) {
  const [open, setOpen] = useState(false);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const paragraphs = Array.isArray(description) ? description : [description];
  const anchor = side === "end" ? "end-4" : "start-4";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="הסבר על המסך הזה"
        title="הסבר על המסך"
        className={`fixed top-20 ${anchor} z-30 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md hover:shadow-lg hover:border-teal text-slate-500 hover:text-teal flex items-center justify-center transition-all`}
      >
        <HelpCircle size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-navy/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="סגירה"
              className="absolute top-3 start-3 w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-navy flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>

            <div className="p-6 sm:p-7">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center">
                  <PlayCircle size={18} className="text-teal" />
                </div>
                <h2 className="text-lg font-black text-navy">איך משתמשים: {title}</h2>
              </div>

              {videoUrl && (
                <div className="my-4 aspect-video bg-slate-100 rounded-2xl overflow-hidden">
                  <iframe
                    src={videoUrl}
                    title={`הסבר על ${title}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="space-y-3 mt-3">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-slate-600 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>

              {!videoUrl && (
                <p className="text-[11px] text-slate-400 mt-5 leading-relaxed">
                  סרטון הסבר קצר יעלה כאן בקרוב.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
