"use client";

import type { WizardState } from "./types";
import { REGIONS, WORK_TYPE_OPTIONS, INDUSTRIES } from "./types";
import { Compass, Building2, MapPin, Home } from "lucide-react";
import { Field, ChipMultiSelect, MultiTiles } from "./form-bits";
import { createGenderT, type Gender } from "@/lib/gender";

interface Props {
  state: WizardState;
  setState: (patch: Partial<WizardState>) => void;
  gender: Gender;
}

export function StepDirection({ state, setState, gender }: Props) {
  const t = createGenderT(gender);
  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-2xl font-black text-navy mb-1.5 flex items-center gap-2">
          <Compass size={20} className="text-teal" />
          {t("לאן את רוצה להתקדם?", "לאן אתה רוצה להתקדם?")}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          נשתמש בזה כדי למצוא לך משרות ולהכווין אותך בצורה מדויקת יותר.
        </p>
      </header>

      <Field
        label="תפקיד היעד"
        hint={t("התפקיד הבא שאת מכוונת אליו — אפשר להיות ספציפי או כללי", "התפקיד הבא שאתה מכוון אליו — אפשר להיות ספציפי או כללי")}
      >
        <input
          type="text"
          value={state.targetRole}
          onChange={(e) => setState({ targetRole: e.target.value })}
          placeholder='לדוגמה: מנהלת מוצר, אנליסטית BI, מנהל פרויקטים'
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="rtl"
        />
      </Field>

      <Field
        label="תעשיות שמעניינות אותך"
        hint={t("בחרי 2-4 תעשיות — נשלב אותן בהמלצות. לא צריך 'הכל'", "בחר 2-4 תעשיות — נשלב אותן בהמלצות. לא צריך 'הכל'")}
        icon={Building2}
      >
        <ChipMultiSelect
          options={INDUSTRIES as readonly string[] as string[]}
          selected={state.industries}
          onChange={(industries) => {
            // First selected becomes the canonical desiredField for legacy
            // matchers that read a single string.
            setState({
              industries,
              desiredField: industries[0] ?? "",
            });
          }}
        />
      </Field>

      <Field
        label="אזורי עבודה"
        hint="אפשר לבחור יותר מאחד — למשל מרכז + שפלה"
        icon={MapPin}
      >
        <MultiTiles
          options={REGIONS.map((r) => ({ value: r, label: r }))}
          value={state.region}
          onChange={(region) => setState({ region })}
        />
      </Field>

      <Field
        label="פורמט עבודה"
        hint="אפשר לבחור יותר מאחד — למשל היברידי + מהבית"
        icon={Home}
      >
        <MultiTiles
          options={WORK_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={state.workType}
          onChange={(workType) => setState({ workType })}
        />
      </Field>
    </div>
  );
}
