"use client";

/**
 * Tiny shared building blocks for the wizard steps. Each step composes
 * these so the steps stay declarative and consistent. All components
 * are presentational — no side effects, no fetches.
 */

import { useState } from "react";
import { ChevronDown, X, type LucideIcon } from "lucide-react";

interface FieldProps {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

export function Field({ label, hint, icon: Icon, children }: FieldProps) {
  return (
    <div>
      <label className="block mb-1.5">
        <span className="text-sm font-bold text-navy flex items-center gap-1.5">
          {Icon && <Icon size={14} className="text-teal" />}
          {label}
        </span>
        {hint && <span className="block text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

interface OptionTileProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}

/** Pill-style single-select used for region + work type. */
export function OptionTiles({ options, value, onChange }: OptionTileProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(active ? "" : opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              active
                ? "border-teal bg-teal text-white shadow-sm"
                : "border-gray-200 text-gray-600 bg-white hover:border-teal/50 hover:text-teal"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/** Dropdown multi-select with chips. */
export function ChipMultiSelect({ options, selected, onChange, placeholder = "בחרי..." }: ChipMultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm hover:border-teal/50 focus:outline-none focus:border-teal/50 focus:ring-2 focus:ring-teal/20 transition-colors"
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-navy font-medium"}>
          {selected.length === 0 ? placeholder : `${selected.length} נבחרו`}
        </span>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 bg-teal/10 text-teal text-xs font-bold px-2.5 py-1 rounded-full border border-teal/20">
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute right-0 left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto z-30">
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-teal/5 transition-colors ${
                  active ? "bg-teal/10 text-teal font-bold" : "text-gray-700"
                }`}
              >
                {active && "✓ "}
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

/** Comma- or Enter-separated tag input — used for skills/strengths. */
export function TagInput({ value, onChange, placeholder = "הקלידי וגעי Enter" }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  return (
    <div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        dir="rtl"
        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 bg-navy/5 text-navy text-xs font-bold px-2.5 py-1 rounded-full border border-navy/10">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
