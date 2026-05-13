"use client";

import type { WizardState } from "./types";
import { Field, TagInput } from "./form-bits";
import { Briefcase, Award, Calendar, Upload } from "lucide-react";
import { CvUploader } from "./cv-uploader";
import { createGenderT, type Gender } from "@/lib/gender";

interface Props {
  state: WizardState;
  setState: (patch: Partial<WizardState>) => void;
  gender: Gender;
}

export function StepBackground({ state, setState, gender }: Props) {
  const t = createGenderT(gender);
  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-2xl font-black text-navy mb-1.5 flex items-center gap-2">
          <Briefcase size={20} className="text-teal" />
          {t("ספרי לנו על הרקע שלך", "ספר לנו על הרקע שלך")}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          הדרך הכי מהירה: להעלות קורות חיים — המערכת תקרא אותם ותמלא את השדות בעצמה.
          אחר כך אפשר לערוך כל שדה שצריך תיקון.
        </p>
      </header>

      {/* CV upload first — Coral's note from a member: when the user
       *  filled the fields by hand and only then uploaded a CV, the CV
       *  analysis overwrote their text. New order:
       *    1) Upload CV. Analyser auto-fills the empty fields below.
       *    2) User reviews and corrects whatever was extracted wrong.
       *  cv-uploader.tsx now MERGES instead of overwriting, so a member
       *  who *does* type something before uploading keeps their text. */}
      <Field label="קורות חיים" hint="המערכת תקרא, תמלא את השדות שלמטה אוטומטית, ותיתן לך ציון התאמה" icon={Upload}>
        <CvUploader
          resumeUrl={state.resumeUrl}
          setState={setState}
          currentState={{
            currentRole: state.currentRole,
            yearsExperience: state.yearsExperience,
            strengths: state.strengths,
          }}
        />
      </Field>

      <Field
        label="תפקיד נוכחי / אחרון"
        hint='איך כותבים את התפקיד בקורות החיים — לדוגמה "מנהלת קופה ראשית" או "Backend Developer"'
      >
        <input
          type="text"
          value={state.currentRole}
          onChange={(e) => setState({ currentRole: e.target.value })}
          placeholder="התפקיד שלך כיום"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="rtl"
        />
      </Field>

      <Field
        label="שנות ניסיון"
        hint="מספר השנים שאת עובדת בתחום (מאפס שנים = סטודנטית/בתחילת הדרך)"
        icon={Calendar}
      >
        <input
          type="number"
          min={0}
          max={50}
          value={state.yearsExperience ?? ""}
          onChange={(e) =>
            setState({ yearsExperience: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })
          }
          placeholder="0"
          className="w-32 px-4 py-3 rounded-xl border border-gray-200 bg-white text-navy text-sm focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          dir="ltr"
        />
      </Field>

      <Field
        label="חוזקות מקצועיות"
        hint="3-5 חוזקות שמייחדות אותך — Enter בין חוזקה לחוזקה"
        icon={Award}
      >
        <TagInput
          value={state.strengths}
          onChange={(strengths) => setState({ strengths })}
          placeholder='לדוגמה: "ניהול צוות", "אנליזה", "תקשורת'
        />
      </Field>
    </div>
  );
}
