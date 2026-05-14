"use client";

import { useEffect, useState } from "react";
import { Accessibility, X, Sun, Type, MousePointer2, Link2, ZapOff, RotateCcw } from "lucide-react";

/**
 * Accessibility widget — floating button + panel users can use to
 * adjust the platform's presentation to their needs. This is the
 * standard "אייקון הנגישות" Israeli reviewers expect to see on every
 * page (תקנות שוויון זכויות לאנשים עם מוגבלות).
 *
 * Each control toggles a CSS class on <html>. Globals.css picks those
 * up and applies the matching adjustments site-wide. Preferences are
 * persisted in localStorage so the user gets their settings back on
 * the next visit (the law specifically requires that adjustments are
 * "remembered" between sessions — a session-only widget doesn't pass).
 *
 * Controls:
 *   - Font size       — normal / large / x-large
 *   - High contrast   — dark text on white, no gradients
 *   - Disable motion  — kills all animations + transitions
 *   - Underline links — all <a> are underlined and bolder
 *   - Highlight focus — fat outline on every focusable element
 *   - Big cursor      — larger cursor for low-vision users
 *
 * The widget itself uses generous targets (44x44 minimum), strong
 * contrast, and labels for screen readers. It does not depend on
 * mouse hover, JS state in the URL, or third-party services.
 */

type FontSize = "normal" | "large" | "xlarge";

interface Prefs {
  fontSize: FontSize;
  highContrast: boolean;
  noMotion: boolean;
  underlineLinks: boolean;
  focusHighlight: boolean;
  bigCursor: boolean;
}

const DEFAULTS: Prefs = {
  fontSize: "normal",
  highContrast: false,
  noMotion: false,
  underlineLinks: false,
  focusHighlight: false,
  bigCursor: false,
};

const STORAGE_KEY = "a11y-prefs-v1";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function applyPrefs(prefs: Prefs) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("a11y-font-normal", "a11y-font-large", "a11y-font-xlarge");
  root.classList.add(`a11y-font-${prefs.fontSize}`);
  root.classList.toggle("a11y-high-contrast", prefs.highContrast);
  root.classList.toggle("a11y-no-motion", prefs.noMotion);
  root.classList.toggle("a11y-underline-links", prefs.underlineLinks);
  root.classList.toggle("a11y-focus-highlight", prefs.focusHighlight);
  root.classList.toggle("a11y-big-cursor", prefs.bigCursor);
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Hydrate from localStorage on mount. We deliberately apply
  // *immediately* (not waiting for a click) so screen-reader / large-font
  // users land on a page that already matches their saved settings.
  useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    applyPrefs(loaded);
  }, []);

  // Persist + re-apply whenever the user flips a toggle.
  useEffect(() => {
    applyPrefs(prefs);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage can be disabled (private browsing). Skip silently —
      // the settings still apply in-session.
    }
  }, [prefs]);

  // ESC closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  function reset() {
    setPrefs(DEFAULTS);
  }

  return (
    <>
      {/* Floating launcher button. Fixed bottom-left in RTL because
          right is reserved for chat/help bubbles users expect on the
          right side. Always above modals. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="פתיחת תפריט נגישות"
        title="נגישות"
        className="fixed bottom-4 left-4 z-[9998] w-12 h-12 rounded-full bg-teal text-white shadow-xl hover:bg-teal-dark focus:outline-none focus:ring-4 focus:ring-teal/40 flex items-center justify-center transition-colors"
      >
        <Accessibility size={24} aria-hidden="true" />
      </button>

      {open && (
        <>
          {/* Backdrop. Click to close. */}
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-[9998] bg-black/30"
          />

          {/* Panel — keyboard-accessible, role=dialog. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-panel-title"
            dir="rtl"
            className="fixed bottom-20 left-4 z-[9999] w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <header className="flex items-center justify-between p-4 bg-teal text-white">
              <h2 id="a11y-panel-title" className="text-lg font-bold flex items-center gap-2">
                <Accessibility size={20} aria-hidden="true" />
                נגישות
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת תפריט נגישות"
                className="p-1 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="p-4 space-y-4">
              {/* Font size */}
              <fieldset>
                <legend className="text-sm font-bold text-navy mb-2 flex items-center gap-1.5">
                  <Type size={14} aria-hidden="true" />
                  גודל טקסט
                </legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["normal", "large", "xlarge"] as FontSize[]).map((sz) => {
                    const label = sz === "normal" ? "רגיל" : sz === "large" ? "גדול" : "ענק";
                    const active = prefs.fontSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => set("fontSize", sz)}
                        aria-pressed={active}
                        className={`py-2 text-sm font-semibold rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-teal ${
                          active
                            ? "bg-teal text-white border-teal"
                            : "bg-white text-navy border-slate-300 hover:border-teal"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Toggles */}
              <div className="space-y-2">
                <ToggleRow
                  icon={<Sun size={14} />}
                  label="ניגודיות גבוהה"
                  pressed={prefs.highContrast}
                  onToggle={() => set("highContrast", !prefs.highContrast)}
                />
                <ToggleRow
                  icon={<ZapOff size={14} />}
                  label="ביטול אנימציות"
                  pressed={prefs.noMotion}
                  onToggle={() => set("noMotion", !prefs.noMotion)}
                />
                <ToggleRow
                  icon={<Link2 size={14} />}
                  label="הדגשת קישורים"
                  pressed={prefs.underlineLinks}
                  onToggle={() => set("underlineLinks", !prefs.underlineLinks)}
                />
                <ToggleRow
                  icon={<MousePointer2 size={14} />}
                  label="סמן בולט"
                  pressed={prefs.focusHighlight}
                  onToggle={() => set("focusHighlight", !prefs.focusHighlight)}
                />
                <ToggleRow
                  icon={<MousePointer2 size={14} />}
                  label="עכבר גדול"
                  pressed={prefs.bigCursor}
                  onToggle={() => set("bigCursor", !prefs.bigCursor)}
                />
              </div>

              <button
                type="button"
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-navy hover:text-teal py-2 border-t border-slate-200 pt-3 focus:outline-none focus:ring-2 focus:ring-teal rounded"
              >
                <RotateCcw size={14} aria-hidden="true" />
                איפוס הגדרות
              </button>

              <a
                href="/accessibility"
                className="block text-center text-xs font-semibold text-teal hover:text-teal-dark underline"
              >
                הצהרת הנגישות המלאה
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ToggleRow({
  icon, label, pressed, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={pressed}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal ${
        pressed
          ? "bg-teal/10 border-teal text-teal-dark"
          : "bg-white border-slate-300 text-navy hover:border-teal"
      }`}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span
        aria-hidden="true"
        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
          pressed ? "bg-teal" : "bg-slate-300"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${
            pressed ? "translate-x-[-16px]" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
