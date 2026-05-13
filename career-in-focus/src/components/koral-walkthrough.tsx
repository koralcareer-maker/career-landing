"use client";

/**
 * KoralWalkthrough — a small "Coral talks you through this screen"
 * floating video panel. The user clicks the play button on the "?" pill,
 * Coral's recording starts in a draggable picture-in-picture window in
 * the corner of the screen, and as she advances the system highlights
 * the button/section she's currently talking about.
 *
 * Per Coral's spec ("סרטון הדרכה שלי מדברת בצד בקטן ומסבירה כמו מדריך
 * למשתמש ועוברת בין כפתור לכפתור להסביר מה עושים לפי סדר פעולות"):
 *  - Small floating panel in the corner (~280px), not blocking content.
 *  - Draggable by header; minimisable to a chat-bubble; closable.
 *  - One video per screen. Each "chapter" is a (startSec, selector, label).
 *  - When the video time crosses a chapter boundary we add a spotlight
 *    outline around the matching DOM element via its data-walkthrough-id.
 *  - The user can also click the chapter list to jump to a section.
 */

import { useEffect, useRef, useState } from "react";
import { Play, Pause, X, Minimize2, GripHorizontal } from "lucide-react";

export interface WalkthroughChapter {
  /** Timestamp in the video (seconds) where this chapter begins. */
  startSec: number;
  /** Short label shown in the chapter list (e.g. "הוספת מועמדות"). */
  label: string;
  /** Optional data-walkthrough-id of the element to spotlight while
   *  this chapter plays. The page renders elements like
   *  <button data-walkthrough-id="add-job">. */
  targetId?: string;
}

interface Props {
  videoUrl: string;
  chapters: WalkthroughChapter[];
  /** Called when the panel is closed; let the parent know so it can
   *  reset whatever opens this. */
  onClose: () => void;
}

export function KoralWalkthrough({ videoUrl, chapters, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [minimized, setMinimized] = useState(false);
  // Drag offset from the initial bottom-end position.
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null);

  // Update currentChapter as the video plays. Chapters are sorted by
  // startSec on input (we trust the caller), so we just pick the last
  // one whose startSec <= currentTime.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    function onTime() {
      if (!v) return;
      const t = v.currentTime;
      let idx = 0;
      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].startSec <= t) idx = i;
      }
      setCurrentChapter(idx);
    }
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [chapters]);

  // Spotlight: whenever the active chapter changes, add a glow + scroll
  // its target element into view. Cleaned up when chapter changes again
  // or the panel closes.
  useEffect(() => {
    const target = chapters[currentChapter]?.targetId;
    if (!target) return;
    const el = document.querySelector<HTMLElement>(`[data-walkthrough-id="${target}"]`);
    if (!el) return;
    el.classList.add("koral-walkthrough-spotlight");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => {
      el.classList.remove("koral-walkthrough-spotlight");
    };
  }, [currentChapter, chapters]);

  // Drag handling on the panel header.
  useEffect(() => {
    function move(e: MouseEvent) {
      if (!dragStart.current) return;
      setDrag({
        x: dragStart.current.sx + (e.clientX - dragStart.current.mx),
        y: dragStart.current.sy + (e.clientY - dragStart.current.my),
      });
    }
    function up() {
      dragStart.current = null;
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  function onHeaderMouseDown(e: React.MouseEvent) {
    dragStart.current = { mx: e.clientX, my: e.clientY, sx: drag.x, sy: drag.y };
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play().catch(() => {/* autoplay blocked is fine */});
      setPlaying(true);
    }
  }

  function jumpToChapter(i: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = chapters[i].startSec;
    if (!playing) {
      v.play().catch(() => {});
      setPlaying(true);
    }
  }

  // Minimised state: collapse to a small floating bubble.
  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label="פתח שוב את סרטון ההדרכה"
        className="fixed bottom-6 end-6 z-[100] w-14 h-14 rounded-full bg-teal text-white shadow-2xl hover:scale-105 transition-transform flex items-center justify-center"
        style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
      >
        <Play size={20} fill="currentColor" />
      </button>
    );
  }

  return (
    <>
      {/* Spotlight outline — injected once, applies anywhere the
       *  koral-walkthrough-spotlight class is toggled on. */}
      <style>{`
        .koral-walkthrough-spotlight {
          position: relative;
          z-index: 50;
          box-shadow: 0 0 0 4px rgba(62,207,207,.55), 0 0 0 12px rgba(62,207,207,.20);
          border-radius: 14px;
          animation: koralPulse 1.4s ease-in-out infinite;
        }
        @keyframes koralPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(62,207,207,.55), 0 0 0 12px rgba(62,207,207,.20); }
          50%      { box-shadow: 0 0 0 6px rgba(62,207,207,.75), 0 0 0 18px rgba(62,207,207,.10); }
        }
      `}</style>

      <div
        ref={panelRef}
        className="fixed bottom-6 end-6 z-[100] w-[300px] sm:w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden select-none"
        style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
        dir="rtl"
      >
        {/* Drag handle / header */}
        <div
          onMouseDown={onHeaderMouseDown}
          className="flex items-center justify-between gap-2 px-3 py-2 bg-navy text-white cursor-move"
        >
          <div className="flex items-center gap-1.5">
            <GripHorizontal size={14} className="text-white/50" />
            <span className="text-xs font-bold">סרטון הדרכה · קורל</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="כווץ"
              className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center"
            >
              <Minimize2 size={12} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="סגירה"
              className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            preload="metadata"
            className="w-full aspect-video"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {/* Big play/pause overlay */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "השהיה" : "נגן"}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
          >
            {!playing && (
              <span className="w-12 h-12 rounded-full bg-white/90 text-navy flex items-center justify-center shadow-lg">
                <Play size={20} fill="currentColor" />
              </span>
            )}
            {playing && (
              <span className="w-9 h-9 rounded-full bg-white/0 hover:bg-white/90 text-white hover:text-navy flex items-center justify-center transition-colors opacity-0 hover:opacity-100">
                <Pause size={16} />
              </span>
            )}
          </button>
        </div>

        {/* Chapters */}
        {chapters.length > 0 && (
          <div className="max-h-44 overflow-y-auto">
            {chapters.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToChapter(i)}
                className={`w-full text-right px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors border-t border-slate-100 first:border-t-0 ${
                  i === currentChapter ? "bg-teal/10 text-teal-dark" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  i === currentChapter ? "bg-teal text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {i + 1}
                </span>
                <span className="flex-1">{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
