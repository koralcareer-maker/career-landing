"use client";

import type { WizardState } from "./types";
import { Field, OptionTiles } from "./form-bits";
import { Activity, Calendar, MessageSquare, Send } from "lucide-react";

interface Props {
  state: WizardState;
  setState: (patch: Partial<WizardState>) => void;
}

export function StepStatus({ state, setState }: Props) {
  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-2xl font-black text-navy mb-1.5 flex items-center gap-2">
          <Activity size={20} className="text-teal" />
          איפה את עומדת היום?
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          זה יעזור לנו להבין איך לשפר את האפקטיביות שלך.
        </p>
      </header>

      <Field label="מצב חיפוש פעיל">
        <OptionTiles
          options={[
            { value: "yes",     label: "כן, מחפשת באופן פעיל" },
            { value: "passive", label: "פתוחה להזדמנויות" },
            { value: "no",      label: "לא בחיפוש כרגע" },
          ]}
          value={state.jsActively}
          onChange={(v) => setState({ jsActively: v as WizardState["jsActively"] })}
        />
      </Field>

      <Field
        label="כמה שבועות את כבר בחיפוש?"
        hint="הערכה גסה. 0 = רק התחלתי"
        icon={Calendar}
      >
        <input
          type="number"
          min={0}
          max={104}
          value={state.jsSearchWeeks ?? ""}
          onChange={(e) =>
            setState({ jsSearchWeeks: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })
          }
          placeholder="0"
          className="w-32 px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="ltr"
        />
      </Field>

      <Field
        label="ראיונות בחודש האחרון"
        hint="כמה ראיונות (טלפוני / וידאו / פנים) היו לך"
        icon={MessageSquare}
      >
        <input
          type="number"
          min={0}
          max={50}
          value={state.jsRecentInterviews ?? ""}
          onChange={(e) =>
            setState({ jsRecentInterviews: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })
          }
          placeholder="0"
          className="w-32 px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="ltr"
        />
      </Field>

      <Field label="שולחת קורות חיים?" icon={Send}>
        <OptionTiles
          options={[
            { value: "yes", label: "כן, באופן קבוע" },
            { value: "no",  label: "עוד לא" },
          ]}
          value={state.jsIsApplying === null ? "" : state.jsIsApplying ? "yes" : "no"}
          onChange={(v) => setState({ jsIsApplying: v === "yes" ? true : v === "no" ? false : null })}
        />
      </Field>
    </div>
  );
}
