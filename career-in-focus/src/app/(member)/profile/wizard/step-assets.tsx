"use client";

import { Linkedin, Globe, Plus, X, Briefcase } from "lucide-react";
import type { WizardState } from "./types";
import { Field } from "./form-bits";

interface Props {
  state: WizardState;
  setState: (patch: Partial<WizardState>) => void;
}

export function StepAssets({ state, setState }: Props) {
  function updateLink(idx: number, key: "label" | "url", value: string) {
    setState({
      additionalLinks: state.additionalLinks.map((l, i) =>
        i === idx ? { ...l, [key]: value } : l,
      ),
    });
  }
  function addLink() {
    setState({ additionalLinks: [...state.additionalLinks, { label: "", url: "" }] });
  }
  function removeLink(idx: number) {
    setState({ additionalLinks: state.additionalLinks.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-2xl font-black text-navy mb-1.5 flex items-center gap-2">
          <Briefcase size={20} className="text-teal" />
          הנכסים המקצועיים שלך
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          נשתמש בזה כדי לעזור לך לבנות נוכחות מקצועית חזקה יותר.
        </p>
      </header>

      <Field
        label="LinkedIn"
        hint="הקישור המלא לפרופיל שלך — מתחיל ב-https://linkedin.com/in/"
        icon={Linkedin}
      >
        <input
          type="url"
          value={state.linkedinUrl}
          onChange={(e) => setState({ linkedinUrl: e.target.value })}
          placeholder="https://linkedin.com/in/..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="ltr"
        />
      </Field>

      <Field
        label="פורטפוליו / אתר אישי"
        hint="אופציונלי — תיק עבודות, אתר עיצוב, GitHub וכד'"
        icon={Globe}
      >
        <input
          type="url"
          value={state.portfolioUrl}
          onChange={(e) => setState({ portfolioUrl: e.target.value })}
          placeholder="https://..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="ltr"
        />
      </Field>

      <Field
        label="קישורים נוספים"
        hint="בלוגים, מאמרים, מצגות, פרסומים — כל מה שמראה את העולם המקצועי שלך"
      >
        <div className="space-y-2">
          {state.additionalLinks.map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="שם הקישור"
                dir="rtl"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                dir="ltr"
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="p-2 text-gray-400 hover:text-red-500"
                aria-label="הסרה"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="flex items-center gap-1.5 text-sm font-bold text-teal hover:text-teal-dark transition-colors"
          >
            <Plus size={14} />
            הוספת קישור
          </button>
        </div>
      </Field>
    </div>
  );
}
