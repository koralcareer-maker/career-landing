"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  saveProfile, saveQuestionnaire, generateCareerPassport,
  saveCvAnalysis, markCvUploaded, type CvAnalysisResult
} from "@/lib/actions/profile";
import { getInitials } from "@/lib/utils";
import { User, Star, Zap, BookOpen, CheckCircle, Camera, Check, X, FileText, Sparkles, Loader2, ChevronDown, Upload, TrendingUp, MessageSquare, AlertCircle } from "lucide-react";
import { PassportHero } from "./passport-hero";

// ─── Industry list ────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "הייטק / תוכנה", "פינטק", "ביוטכנולוגיה / פארמה", "בריאות / רפואה",
  "חינוך / אקדמיה", "בנקאות / פיננסים", "נדל\"ן", "ייעוץ / עסקים",
  "שיווק / פרסום", "מדיה / תקשורת", "מסחר אלקטרוני / קמעונאות",
  "לוגיסטיקה / שרשרת אספקה", "תעשייה / ייצור", "הנדסה / בנייה",
  "ממשלה / מגזר ציבורי", "עמותות / מגזר שלישי", "תיירות / אירוח",
  "ספורט / פנאי", "אחר",
];

// ─── Dropdown multi-select ────────────────────────────────────────────────────

function IndustryMultiSelect({ name, defaultValue, label = "תחום רצוי" }: { name: string; defaultValue: string[]; label?: string }) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(ind: string) {
    setSelected(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-sm text-right hover:border-teal/50 focus:outline-none focus:border-teal/50 transition-colors"
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-navy font-medium"}>
          {selected.length === 0
            ? "בחר תחומים..."
            : selected.length === 1
              ? selected[0]
              : `${selected.length} תחומים נבחרו`}
        </span>
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Selected chips (shown below trigger) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(ind => (
            <span key={ind} className="inline-flex items-center gap-1 bg-teal/10 text-teal text-xs font-medium px-2.5 py-1 rounded-full border border-teal/20">
              {ind}
              <button type="button" onClick={() => toggle(ind)} className="hover:text-red-400 transition-colors ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {INDUSTRIES.map(ind => (
            <button
              key={ind}
              type="button"
              onClick={() => toggle(ind)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-right hover:bg-gray-50 transition-colors ${
                selected.includes(ind) ? "text-teal font-semibold bg-teal/5" : "text-gray-700"
              }`}
            >
              <span>{ind}</span>
              {selected.includes(ind) && <Check size={14} className="text-teal shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <input type="hidden" name={name} value={selected.join(", ")} />
    </div>
  );
}

// ─── Confirm chips (AI suggestions) ──────────────────────────────────────────

function ConfirmChips({
  label, items, onChange, color = "teal"
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  color?: "teal" | "orange";
}) {
  const [custom, setCustom] = useState("");

  function toggle(item: string) {
    onChange(items.includes(item) ? items.filter(i => i !== item) : [...items, item]);
  }
  function addCustom() {
    const val = custom.trim();
    if (val && !items.includes(val)) {
      onChange([...items, val]);
    }
    setCustom("");
  }

  const activeClass = color === "teal"
    ? "bg-teal text-white border-teal"
    : "bg-orange-500 text-white border-orange-500";
  const inactiveClass = color === "teal"
    ? "bg-white text-gray-500 border-gray-200 hover:border-teal/50 line-through opacity-50"
    : "bg-white text-gray-500 border-gray-200 hover:border-orange-300 line-through opacity-50";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      <p className="text-xs text-gray-400">לחץ על פריט כדי להוסיף/להסיר. ירוק = נבחר, מחוק = לא נבחר</p>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const active = items.includes(item);
          return (
            <button key={item} type="button" onClick={() => toggle(item)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? activeClass : inactiveClass}`}>
              {active && <Check size={10} className="inline ml-1" />}
              {item}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="הוסף בעצמך..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal/50"
        />
        <button type="button" onClick={addCustom}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">
          + הוסף
        </button>
      </div>
    </div>
  );
}

// ─── Compact CV upload strip (used inside profile tab) ───────────────────────

interface CvUploadStripProps {
  onAnalyzed: (result: CvAnalysisResult) => void;
  noCV: boolean;
  onToggleNoCV: (v: boolean) => void;
}

function CvUploadStrip({ onAnalyzed, noCV, onToggleNoCV }: CvUploadStripProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileName, setFileName]   = useState("");
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAnalyzing(true);
    setError("");
    setDone(false);
    try {
      // FileReader → reliable base64 for any file size
      const b64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const mimeType = file.type || "application/pdf";

      // Call Edge API route (30s timeout) instead of server action (10s limit)
      const resp = await fetch("/api/profile/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data: b64, mimeType }),
      });
      const result = await resp.json() as CvAnalysisResult & { error?: string };

      if (!resp.ok || result.error) {
        setError(result.error ?? "הניתוח נכשל — נסה שנית");
        return;
      }

      onAnalyzed(result);
      setDone(true);
      // Persist that a CV was uploaded so the AI Coach + readiness score reflect reality.
      // The analyze-cv route runs on edge runtime and can't write to Prisma directly.
      await markCvUploaded(file.name);
    } catch {
      setError("שגיאת רשת — נסה שנית");
    } finally {
      setAnalyzing(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-teal/20 bg-gradient-to-l from-teal/5 to-white p-4">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center shrink-0">
          {analyzing
            ? <Loader2 size={18} className="text-teal animate-spin" />
            : done
              ? <CheckCircle size={18} className="text-green-500" />
              : <Upload size={18} className="text-teal" />
          }
        </div>

        <div className="flex-1 min-w-0">
          {analyzing && (
            <>
              <p className="text-sm font-semibold text-teal">מנתח קורות חיים...</p>
              <p className="text-xs text-gray-400">ממלא את הפרטים שלך אוטומטית</p>
            </>
          )}
          {!analyzing && done && (
            <>
              <p className="text-sm font-semibold text-green-700">✓ {fileName}</p>
              <p className="text-xs text-gray-400">הפרטים עודכנו — בדוק ועדכן אם נדרש</p>
            </>
          )}
          {!analyzing && !done && !noCV && (
            <>
              <p className="text-sm font-semibold text-navy">העלה קורות חיים לשליפה אוטומטית</p>
              <p className="text-xs text-gray-400">PDF / DOC / DOCX — AI ימלא את כל הפרטים</p>
            </>
          )}
          {!analyzing && !done && noCV && (
            <>
              <p className="text-sm font-semibold text-amber-700">ממלא ידנית</p>
              <p className="text-xs text-gray-400">מלא את הפרטים — לאחר שמירה תוכל לייצר קורות חיים</p>
            </>
          )}
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>

        {!analyzing && !noCV && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 px-3 py-1.5 bg-teal text-white text-xs font-bold rounded-lg hover:bg-teal/90 transition-colors"
          >
            {done ? "החלף" : "העלה"}
          </button>
        )}
        {!analyzing && noCV && (
          <button
            type="button"
            onClick={() => onToggleNoCV(false)}
            className="shrink-0 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            יש לי CV
          </button>
        )}
      </div>

      {!done && !noCV && (
        <button
          type="button"
          onClick={() => onToggleNoCV(true)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
        >
          אין לי קורות חיים — אמלא ידנית
        </button>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileType {
  fullName?: string | null; phone?: string | null; currentRole?: string | null;
  targetRole?: string | null; yearsExperience?: number | null; desiredField?: string | null;
  careerTransitionGoal?: string | null; mainChallenge?: string | null;
  strengths: string[]; missingSkills: string[];
  preferredSalaryMin?: number | null; preferredSalaryMax?: number | null;
  linkedinUrl?: string | null; resumeUrl?: string | null;
  imageUrl?: string | null; questionnaireCompleted: boolean;
  q_workStyle?: string | null; q_teamOrSolo?: string | null; q_motivators?: string | null;
  q_biggestFear?: string | null; q_idealDay?: string | null; q_pastAchievement?: string | null;
  q_learningStyle?: string | null; q_shortTermGoal?: string | null; q_longTermGoal?: string | null;
  q_networkingLevel?: string | null; q_remotePreference?: string | null;
  q_valuesAtWork: string[]; q_industryInterests: string[];
}

interface Passport {
  jobMatchScore: number; strengths: string[]; skillGaps: string[];
  recommendations: string[]; likelyFitRoles: string[];
  recommendedIndustries: string[]; nextBestActions: string[];
  summary?: string | null; generatedAt: string;
}

interface Props {
  user: { email: string; name: string; photoUpgradeStatus: string };
  profile: ProfileType | null;
  passport: Passport | null;
  readinessScore: number;
}

type TabId = "profile" | "questionnaire" | "passport";

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfileClient({ user, profile, passport, readinessScore }: Props) {
  const [tab, setTab] = useState<TabId>("profile");
  const [generating, setGenerating] = useState(false);
  const [passportResult, setPassportResult] = useState(passport);

  // CV upload state — for filling form fields automatically
  const [formKey, setFormKey]           = useState(0);
  const [noCV, setNoCV]                 = useState(false);
  const [cvFeedback, setCvFeedback]     = useState<string[]>([]);
  const [marketSkills, setMarketSkills] = useState<string[]>([]);
  const [formDefaults, setFormDefaults] = useState({
    fullName:            profile?.fullName            ?? "",
    phone:               profile?.phone               ?? "",
    currentRole:         profile?.currentRole         ?? "",
    targetRole:          profile?.targetRole          ?? "",
    yearsExperience:     profile?.yearsExperience?.toString() ?? "",
    linkedinUrl:         profile?.linkedinUrl         ?? "",
    preferredSalaryMin:  profile?.preferredSalaryMin?.toString()  ?? "",
    preferredSalaryMax:  profile?.preferredSalaryMax?.toString()  ?? "",
    careerTransitionGoal: profile?.careerTransitionGoal ?? "",
    mainChallenge:       profile?.mainChallenge        ?? "",
  });

  function handleCvAnalyzed(result: CvAnalysisResult) {
    setFormDefaults(prev => ({
      ...prev,
      currentRole:     result.currentRole     || prev.currentRole,
      targetRole:      result.targetRole      || prev.targetRole,
      yearsExperience: result.yearsExperience ? result.yearsExperience.toString() : prev.yearsExperience,
    }));
    setCvFeedback(result.cvFeedback   ?? []);
    setMarketSkills(result.marketSkills ?? []);
    setFormKey(k => k + 1); // re-mount form with new defaults
  }

  const [profileState, profileAction, profilePending] = useActionState(saveProfile, null);
  const [questState, questAction, questPending] = useActionState(saveQuestionnaire, null);

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateCareerPassport();
    setGenerating(false);
    if (!result?.error) window.location.reload();
  }

  const TABS = [
    { id: "profile" as TabId,       label: "פרופיל קריירה",   icon: User },
    { id: "questionnaire" as TabId, label: "שאלון",           icon: BookOpen },
    { id: "passport" as TabId,      label: "דרכון קריירה",    icon: Star },
  ];

  return (
    <div className="space-y-5">
      {/* Passport Hero — shown only when the user has a generated passport.
          Sits at the very top so the visual artefact is the first thing they
          see on every profile visit, not a settings page. */}
      {passportResult && (
        <PassportHero
          passport={passportResult}
          user={{
            name: profile?.fullName || user.name,
            imageUrl: profile?.imageUrl,
            targetRole: profile?.targetRole,
            currentRole: profile?.currentRole,
          }}
        />
      )}

      {/* Readiness bar */}
      <div className="bg-gradient-to-l from-teal-pale to-white rounded-2xl p-5 border border-teal/20">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-navy">השלמת פרופיל</div>
          <div className="text-sm font-black text-teal">{readinessScore}%</div>
        </div>
        <div className="h-2.5 bg-teal/10 rounded-full overflow-hidden">
          <div className="h-full bg-teal rounded-full transition-all duration-700" style={{ width: `${readinessScore}%` }} />
        </div>
        {readinessScore < 80 && (
          <p className="text-xs text-gray-400 mt-1.5">מלא את כל הפרטים לקבלת ניתוח קריירה מלא</p>
        )}
      </div>

      {/* Documents shortcut */}
      <a
        href="/profile/documents"
        className="flex items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl px-5 py-3.5 hover:border-teal/40 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal/10 rounded-xl flex items-center justify-center group-hover:bg-teal/20 transition-colors">
            <BookOpen size={18} className="text-teal" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy">המסמכים שלי</p>
            <p className="text-xs text-gray-400">קורות חיים, תעודות, מכתבי המלצה ועוד</p>
          </div>
        </div>
        <span className="text-teal text-xs font-bold">פתח →</span>
      </a>

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
              }`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-teal" />
              <CardTitle>פרופיל קריירה</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* CV Upload Strip — always shown at top */}
            <CvUploadStrip
              onAnalyzed={handleCvAnalyzed}
              noCV={noCV}
              onToggleNoCV={setNoCV}
            />

            {/* Avatar */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative">
                <div className="w-20 h-20 bg-teal/20 rounded-2xl flex items-center justify-center text-teal text-2xl font-black">
                  {profile?.imageUrl
                    ? <img src={profile.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    : getInitials(profile?.fullName ?? user.name)}
                </div>
                <button className="absolute -bottom-1 -left-1 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-white shadow-md">
                  <Camera size={11} />
                </button>
              </div>
              <div>
                <p className="font-bold text-navy">{profile?.fullName ?? user.name}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>

            {/* Form — re-mounts (key) when AI fills defaults */}
            <form key={formKey} action={profileAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="fullName" label="שם מלא" defaultValue={formDefaults.fullName} placeholder="ישראל ישראלי" />
                <Input name="phone" label="טלפון" defaultValue={formDefaults.phone} placeholder="050-1234567" />
                <Input name="currentRole" label="תפקיד נוכחי" defaultValue={formDefaults.currentRole} placeholder="כגון: מנהל מוצר" />
                <Input name="targetRole" label="תפקיד יעד" defaultValue={formDefaults.targetRole} placeholder="כגון: UX Designer" />
                <Input name="yearsExperience" type="number" label="שנות ניסיון" defaultValue={formDefaults.yearsExperience} placeholder="5" min="0" max="40" />
                <Input name="linkedinUrl" type="url" label="LinkedIn" defaultValue={formDefaults.linkedinUrl} placeholder="https://linkedin.com/in/..." dir="ltr" />
                <Input name="preferredSalaryMin" type="number" label="שכר מינימום (₪)" defaultValue={formDefaults.preferredSalaryMin} placeholder="15000" />
                <Input name="preferredSalaryMax" type="number" label="שכר מקסימום (₪)" defaultValue={formDefaults.preferredSalaryMax} placeholder="25000" />
              </div>
              <IndustryMultiSelect
                name="desiredField"
                defaultValue={profile?.desiredField ? profile.desiredField.split(",").map(s => s.trim()).filter(Boolean) : []}
              />
              <Textarea name="careerTransitionGoal" label="מטרת מעבר קריירה" defaultValue={formDefaults.careerTransitionGoal} placeholder="תאר את המעבר שאתה מחפש ולמה" rows={2} />
              <Textarea name="mainChallenge" label="האתגר העיקרי בחיפוש עבודה" defaultValue={formDefaults.mainChallenge} placeholder="מה מקשה עליך הכי הרבה?" rows={2} />

              {profileState?.error && <p className="text-sm text-red-500">{profileState.error}</p>}
              {profileState?.success && <p className="text-sm text-green-600">✓ הפרופיל נשמר בהצלחה</p>}
              <Button type="submit" loading={profilePending}>שמור פרופיל</Button>
            </form>

            {/* Market skills — show only after successful analysis */}
            {marketSkills.length >= 2 && (
              <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-blue-600" />
                  <p className="text-sm font-bold text-blue-800">🔥 מיומנויות חמות לתפקיד זה ב-2025</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {marketSkills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* CV Feedback — show only when we have real AI tips (not error stubs) */}
            {cvFeedback.length >= 2 && !cvFeedback[0].includes("לא ניתן") && (
              <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className="text-purple-600" />
                  <p className="text-sm font-bold text-purple-800">✍️ פידבק לשיפור קורות החיים שלך</p>
                </div>
                <ul className="space-y-2">
                  {cvFeedback.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2.5 bg-white rounded-lg border border-purple-100 text-sm text-gray-700">
                      <span className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No-CV path: offer to generate CV after profile is saved */}
            {noCV && profileState?.success && (
              <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">הפרטים נשמרו!</p>
                  <p className="text-xs text-amber-600 mt-0.5">מלא גם את השאלון לדרכון קריירה מלא, ובהמשך נוסיף גם ייצור קורות חיים.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Questionnaire Tab ── */}
      {tab === "questionnaire" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-teal" />
              <CardTitle>שאלון דרכון קריירה</CardTitle>
            </div>
            {profile?.questionnaireCompleted && <Badge variant="green">✓ הושלם</Badge>}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-5">מלא שאלון זה כדי לקבל ניתוח קריירה מעמיק ומדויק יותר</p>
            <form action={questAction} className="space-y-4">
              <Select name="q_workStyle" label="סגנון עבודה מועדף" defaultValue={profile?.q_workStyle ?? ""}
                options={[
                  { value: "", label: "בחר..." },
                  { value: "structured", label: "מובנה עם הנחיות ברורות" },
                  { value: "autonomous", label: "עצמאי עם גמישות" },
                  { value: "mixed", label: "שילוב של השניים" },
                ]}
              />
              <Select name="q_teamOrSolo" label="העדפת עבודה" defaultValue={profile?.q_teamOrSolo ?? ""}
                options={[
                  { value: "", label: "בחר..." },
                  { value: "team", label: "בצוות" },
                  { value: "solo", label: "עצמאי" },
                  { value: "mixed", label: "שניהם" },
                ]}
              />
              <Select name="q_remotePreference" label="עבודה מרחוק" defaultValue={profile?.q_remotePreference ?? ""}
                options={[
                  { value: "", label: "בחר..." },
                  { value: "remote", label: "רק מרחוק" },
                  { value: "hybrid", label: "היברידי" },
                  { value: "office", label: "רק ממשרד" },
                  { value: "flexible", label: "גמיש" },
                ]}
              />
              <Textarea name="q_motivators" label="מה מניע אותך?" defaultValue={profile?.q_motivators ?? ""} placeholder="מה גורם לך לקום בבוקר ולהתלהב מהעבודה?" rows={2} />
              <Textarea name="q_biggestFear" label="החשש הכי גדול שלך" defaultValue={profile?.q_biggestFear ?? ""} placeholder="מה הכי מפחיד אותך בשינוי קריירה?" rows={2} />
              <Textarea name="q_pastAchievement" label="הישג מקצועי שגאה בו" defaultValue={profile?.q_pastAchievement ?? ""} placeholder="תאר הישג שמרגיש לך משמעותי" rows={2} />
              <Textarea name="q_shortTermGoal" label="יעד לשנה הקרובה" defaultValue={profile?.q_shortTermGoal ?? ""} placeholder="היכן אתה רוצה להיות בעוד שנה?" rows={2} />
              <Textarea name="q_longTermGoal" label="יעד ל-5 שנים" defaultValue={profile?.q_longTermGoal ?? ""} placeholder="מה החזון המקצועי שלך לטווח ארוך?" rows={2} />
              <Select name="q_networkingLevel" label="רמת הנטוורקינג שלך" defaultValue={profile?.q_networkingLevel ?? ""}
                options={[
                  { value: "", label: "בחר..." },
                  { value: "low", label: "נמוכה — קשה לי לפנות לאנשים" },
                  { value: "medium", label: "בינונית — מתנסה בכך" },
                  { value: "high", label: "גבוהה — נוח לי לעשות נטוורקינג" },
                ]}
              />
              <Input name="q_valuesAtWork" label="ערכים בעבודה (מופרדים בפסיק)" defaultValue={profile?.q_valuesAtWork?.join(", ") ?? ""} placeholder="אתגר, מנטורינג, חדשנות, יצירתיות..." />
              <IndustryMultiSelect
                name="q_industryInterests"
                defaultValue={profile?.q_industryInterests ?? []}
                label="תעשיות מעניינות (ניתן לבחור כמה)"
              />

              {questState?.error && <p className="text-sm text-red-500">{questState.error}</p>}
              {questState?.success && <p className="text-sm text-green-600">✓ השאלון נשמר</p>}
              <Button type="submit" loading={questPending}>שמור שאלון</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Career Passport Tab ── */}
      {tab === "passport" && (
        <div className="space-y-5">
          <div className="bg-gradient-to-l from-navy to-navy-light rounded-2xl p-6 text-white text-center">
            <div className="w-14 h-14 bg-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star size={28} className="text-teal" />
            </div>
            <h3 className="text-xl font-black mb-2">דרכון הקריירה שלך</h3>
            <p className="text-white/60 text-sm mb-5">ניתוח AI מעמיק של חוזקות, פערים ותפקידים מומלצים</p>
            {!profile?.questionnaireCompleted && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-4 text-yellow-200 text-sm">
                💡 מלא את שאלון הדרכון קודם לניתוח מדויק יותר
              </div>
            )}
            <Button onClick={handleGenerate} loading={generating} size="lg" className="bg-teal hover:bg-teal-dark text-white mx-auto">
              {passportResult ? "🔄 עדכן דרכון קריירה" : "✨ צור דרכון קריירה"}
            </Button>
          </div>

          {passportResult && (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <CardContent className="p-5 text-center">
                  <div className="text-5xl font-black text-teal mb-1">{passportResult.jobMatchScore}%</div>
                  <div className="text-sm text-gray-500">ציון התאמה לשוק העבודה</div>
                  {passportResult.summary && (
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-lg mx-auto">{passportResult.summary}</p>
                  )}
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-green-700">💪 חוזקות</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {passportResult.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-orange-600">⚠️ פערי מיומנויות</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {passportResult.skillGaps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-4 h-4 rounded-full bg-orange-100 border border-orange-300 shrink-0 mt-0.5" />{s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-blue-700">🎯 תפקידים מומלצים</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {passportResult.likelyFitRoles.map((r, i) => (
                        <Badge key={i} variant={i === 0 ? "teal" : "gray"}>{r}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-purple-700">🏢 תעשיות מומלצות</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {passportResult.recommendedIndustries.map((r, i) => (
                        <Badge key={i} variant="purple">{r}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>📋 המלצות לפעולה</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {passportResult.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 bg-cream rounded-xl">
                        <span className="w-5 h-5 bg-teal text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span className="text-sm text-gray-700">{r}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-navy border-navy">
                <CardHeader><CardTitle className="text-white">🚀 הצעדים הבאים שלך</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {passportResult.nextBestActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
                        <Zap size={14} className="text-teal mt-0.5 shrink-0" />{a}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
