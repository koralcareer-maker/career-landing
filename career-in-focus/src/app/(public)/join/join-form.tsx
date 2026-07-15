"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import { joinJobBoard } from "@/lib/actions/join";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Bell, CheckCircle2, Briefcase } from "lucide-react";

// The join dropdown uses the site's canonical 32-category taxonomy
// (lib/job-categories) — the exact same list the /jobs board filter
// shows — so a free signup's interests map 1:1 onto the board and the
// daily digest can match jobs to people without any translation layer.
import { JOB_CATEGORIES } from "@/lib/job-categories";
import { ChevronDown, X } from "lucide-react";

export default function JoinForm() {
  const [state, action, isPending] = useActionState(joinJobBoard, null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gender, setGender] = useState<"f" | "m">("f");

  const toggle = (f: string) =>
    setSelected((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e6f7f7] via-[#f0fafa] to-[#d6f0f0] relative overflow-hidden" dir="rtl">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative px-4 py-8 sm:py-12">
        <div className="max-w-md mx-auto flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo.png" alt="קריירה בפוקוס" width={36} height={36} className="rounded-lg" />
            <span className="font-black text-navy text-lg group-hover:text-teal transition-colors">קריירה בפוקוס</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-navy/60 hover:text-teal transition-colors">
            כבר רשומים?
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-teal/10 border border-teal/20 text-teal px-3 py-1 rounded-full text-xs font-bold mb-4">
              <Sparkles size={12} />
              חינם, ללא התחייבות
            </div>
            <h1 className="text-3xl sm:text-[34px] font-black text-navy leading-[1.15] mb-3">
              הצטרפו חינם ללוח המשרות
              <br />
              של קורל
            </h1>
            <p className="text-navy/70 text-sm leading-relaxed">
              נעדכן אתכם במייל רק כשנמצאות משרות חדשות שמתאימות לתחומים שבחרתם.
              <br />
              בלי ספאם ובלי מיילים מיותרים. אלפי משרות מכל התחומים, מתעדכנות מדי יום.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-teal/20 p-4 mb-5 shadow-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <Briefcase size={18} className="text-teal mx-auto mb-1.5" />
                <div className="text-xs font-bold text-navy">אלפי משרות</div>
                <div className="text-[10px] text-navy/60">בכל התחומים</div>
              </div>
              <div>
                <Bell size={18} className="text-teal mx-auto mb-1.5" />
                <div className="text-xs font-bold text-navy">התראות במייל</div>
                <div className="text-[10px] text-navy/60">רק כשיש התאמה</div>
              </div>
              <div>
                <CheckCircle2 size={18} className="text-teal mx-auto mb-1.5" />
                <div className="text-xs font-bold text-navy">חינם לגמרי</div>
                <div className="text-[10px] text-navy/60">ביטול בשנייה</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-md">
            <form action={action} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-navy mb-1.5 block">שם מלא</label>
                <Input name="name" required placeholder="קורל שלו" />
              </div>

              <div>
                <label className="text-sm font-bold text-navy mb-1.5 block">אימייל</label>
                <Input type="email" name="email" required placeholder="you@example.com" dir="ltr" />
              </div>

              <div>
                <label className="text-sm font-bold text-navy mb-1.5 block">טלפון</label>
                <Input type="tel" name="phone" required placeholder="050-1234567" />
              </div>

              <div>
                <label className="text-sm font-bold text-navy mb-2 block">תחומי עניין</label>
                <p className="text-[11px] text-navy/60 mb-3">
                  בחרו אחד או יותר. נעדכן אתכם רק על משרות חדשות מהתחומים שסימנתם.
                </p>

                {/* Dropdown multi-select over the canonical categories */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white hover:border-teal/40 transition-colors"
                  >
                    <span className={selected.length === 0 ? "text-gray-400" : "text-navy font-semibold"}>
                      {selected.length === 0
                        ? "בחרו תחומים מהרשימה..."
                        : `נבחרו ${selected.length} תחומים`}
                    </span>
                    <ChevronDown size={15} className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {JOB_CATEGORIES.map((f) => {
                        const active = selected.includes(f);
                        return (
                          <button
                            type="button"
                            key={f}
                            onClick={() => toggle(f)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-right transition-colors ${
                              active ? "bg-teal/10 text-teal font-bold" : "text-navy/80 hover:bg-gray-50"
                            }`}
                          >
                            <span>{f}</span>
                            {active && <CheckCircle2 size={14} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected categories as removable tags */}
                {selected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 bg-teal text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        {f}
                        <button type="button" onClick={() => toggle(f)} aria-label={`הסרת ${f}`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="hidden" name="fields" value={selected.join(",")} />
              </div>

              <div>
                <label className="text-sm font-bold text-navy mb-2 block">איך לפנות אליכם במיילים?</label>
                <div className="flex gap-2">
                  {(["f", "m"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        gender === g
                          ? "bg-teal text-white border-teal"
                          : "bg-white text-navy/70 border-gray-200"
                      }`}
                    >
                      {g === "f" ? "בלשון נקבה" : "בלשון זכר"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="gender" value={gender} />
              </div>

              {state?.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {state.error}
                </div>
              )}

              <Button type="submit" disabled={isPending || selected.length === 0} size="lg" className="w-full">
                {isPending
                  ? "נרשמים..."
                  : selected.length === 0
                  ? "בחרו לפחות תחום אחד"
                  : "הצטרפו ללוח המשרות"}
              </Button>

              <p className="text-[11px] text-navy/50 text-center leading-relaxed">
                בהרשמה אתם מאשרים לקבל עדכוני משרות רלוונטיות במייל. ניתן לבטל בכל עת בלחיצה על "הסרה" בתחתית כל מייל.
                <br />
                <Link href="/privacy" className="underline hover:text-teal">
                  מדיניות פרטיות
                </Link>
              </p>
            </form>
          </div>

          <div className="text-center mt-8 text-xs text-navy/50">
            רוצים יותר מאשר לוח משרות? מאמנת AI, דרכון קריירה, קורסים.{" "}
            <Link href="/pricing" className="font-bold text-teal underline">
              צפו במסלולים
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
