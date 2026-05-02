"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { markSkillLearned, unmarkSkillLearned } from "@/lib/actions/completions";

/**
 * Tiny client-side toggle used inside the (otherwise server-rendered)
 * SkillCardItem on /skills. Clicking marks the skill as learned, which
 * triggers a background Career Passport regen so the user's score
 * grows. Optimistic — flips the state immediately and rolls back on
 * server error.
 */
export function SkillCompletionButton({
  skillName,
  initialCompleted,
}: {
  skillName: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [justFlipped, setJustFlipped] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !completed;
    setCompleted(next);
    setJustFlipped(true);
    startTransition(async () => {
      try {
        if (next) {
          await markSkillLearned(skillName);
        } else {
          await unmarkSkillLearned(skillName);
        }
      } catch {
        setCompleted(!next);
      } finally {
        setTimeout(() => setJustFlipped(false), 2400);
      }
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
          completed
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            : "bg-slate-50 text-slate-600 border border-slate-100 hover:border-teal/40 hover:bg-teal/5"
        }`}
      >
        {completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        {completed
          ? (justFlipped ? "כל הכבוד! הדרכון מתעדכן ✨" : "רכשת — בדרכון")
          : "סימני שרכשתי"}
      </button>
      {completed && justFlipped && (
        <p className="text-[10px] text-emerald-600 mt-1.5 text-center flex items-center justify-center gap-1">
          <Sparkles size={10} /> ציון ההתאמה שלך גדל
        </p>
      )}
    </div>
  );
}
