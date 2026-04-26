"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { saveProfile, saveQuestionnaire, generateCareerPassport, requestPhotoUpgrade } from "@/lib/actions/profile";
import { getInitials } from "@/lib/utils";
import {
  User, Star, Zap, Target, BookOpen, TrendingUp,
  CheckCircle, Lock, Camera, Link, ExternalLink, Loader2, ChevronDown, ChevronUp
} from "lucide-react";

interface Profile {
  fullName?: string | null; phone?: string | null; currentRole?: string | null;
  targetRole?: string | null; yearsExperience?: number | null; desiredField?: string | null;
  careerTransitionGoal?: string | null; mainChallenge?: string | null;
  strengths: string[]; missingSkills: string[];
  preferredSalaryMin?: number | null; preferredSalaryMax?: number | null;
  preferredCompanyType?: string | null; linkedinUrl?: string | null;
  resumeUrl?: string | null; imageUrl?: string | null; questionnaireCompleted: boolean;
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
  profile: Profile | null;
  passport: Passport | null;
  readinessScore: number;
}

type TabId = "profile" | "passport" | "questionnaire";

export function ProfileClient({ user, profile, passport, readinessScore }: Props) {
  const [tab, setTab] = useState<TabId>("profile");
  const [generating, setGenerating] = useState(false);
  const [passportResult, setPassportResult] = useState(passport);
  const [photoUpgradeState, setPhotoUpgradeState] = useState(user.photoUpgradeStatus);

  const [profileState, profileAction, profilePending] = useActionState(saveProfile, null);
  const [questState, questAction, questPending] = useActionState(saveQuestionnaire, null);

  async function handleGenerate() {
    setGenerating(true);
    const result = await generateCareerPassport();
    setGenerating(false);
    if (!result?.error) {
      window.location.reload();
    }
  }

  async function handlePhotoUpgrade() {
    if (confirm("שדרוג תמונת LinkedIn — ₪49 חד פעמי. האם להמשיך?")) {
      await requestPhotoUpgrade();
      setPhotoUpgradeState("REQUESTED");
    }
  }

  const TABS = [
    { id: "profile" as TabId, label: "פרופיל", icon: User },
    { id: "questionnaire" as TabId, label: "שאלון דרכון", icon: BookOpen },
    { id: "passport" as TabId, label: "דרכון קריירה", icon: Star },
  ];

  return (
    <div className="space-y-5">
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

      {/* Tabs */}
      <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>פרטים אישיים ומקצועיים</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Avatar + Photo upgrade */}
            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-teal/20 rounded-2xl flex items-center justify-center text-teal text-2xl font-black">
                  {profile?.imageUrl
                    ? <img src={profile.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    : getInitials(profile?.fullName ?? user.name)
                  }
                </div>
                <button className="absolute -bottom-1 -left-1 w-6 h-6 bg-teal rounded-full flex items-center justify-center text-white shadow-md">
                  <Camera size={11} />
                </button>
              </div>
              <div>
                <p className="font-bold text-navy">{profile?.fullName ?? user.name}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
                {profile?.imageUrl && photoUpgradeState === "NONE" && (
                  <button
                    onClick={handlePhotoUpgrade}
                    className="mt-2 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    ✨ שדרוג תמונת LinkedIn — ₪49
                  </button>
                )}
                {photoUpgradeState === "REQUESTED" && (
                  <Badge variant="yellow" size="sm" className="mt-2">📸 בקשת שדרוג נשלחה</Badge>
                )}
              </div>
            </div>

            <form action={profileAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="fullName" label="שם מלא" defaultValue={profile?.fullName ?? ""} placeholder="ישראל ישראלי" />
                <Input name="phone" label="טלפון" defaultValue={profile?.phone ?? ""} placeholder="050-1234567" />
                <Input name="currentRole" label="תפקיד נוכחי" defaultValue={profile?.currentRole ?? ""} placeholder="כגון: מנהל מוצר" />
                <Input name="targetRole" label="תפקיד יעד" defaultValue={profile?.targetRole ?? ""} placeholder="כגון: UX Designer" />
                <Input name="yearsExperience" type="number" label="שנות ניסיון" defaultValue={profile?.yearsExperience?.toString() ?? ""} placeholder="5" min="0" max="40" />
                <Input name="desiredField" label="תחום רצוי" defaultValue={profile?.desiredField ?? ""} placeholder="כגון: הייטק, פינטק" />
                <Input name="linkedinUrl" type="url" label="LinkedIn" defaultValue={profile?.linkedinUrl ?? ""} placeholder="https://linkedin.com/in/..." dir="ltr" />
                <Select name="preferredCompanyType" label="סוג חברה מועדף" defaultValue={profile?.preferredCompanyType ?? ""}
                  options={[
                    { value: "", label: "בחר..." },
                    { value: "startup", label: "סטארטאפ" },
                    { value: "scale_up", label: "Scale-up" },
                    { value: "enterprise", label: "תאגיד גדול" },
                    { value: "public_sector", label: "מגזר ציבורי" },
                    { value: "ngo", label: "מגזר שלישי" },
                    { value: "any", label: "לא משנה" },
                  ]}
                />
                <Input name="preferredSalaryMin" type="number" label="שכר מינימום (₪)" defaultValue={profile?.preferredSalaryMin?.toString() ?? ""} placeholder="15000" />
                <Input name="preferredSalaryMax" type="number" label="שכר מקסימום (₪)" defaultValue={profile?.preferredSalaryMax?.toString() ?? ""} placeholder="25000" />
              </div>
              <Textarea name="careerTransitionGoal" label="מטרת מעבר קריירה" defaultValue={profile?.careerTransitionGoal ?? ""} placeholder="תאר את המעבר שאתה מחפש ולמה" rows={2} />
              <Textarea name="mainChallenge" label="האתגר העיקרי בחיפוש עבודה" defaultValue={profile?.mainChallenge ?? ""} placeholder="מה מקשה עליך הכי הרבה?" rows={2} />
              <Input name="strengths" label="חוזקות (מופרדות בפסיק)" defaultValue={profile?.strengths.join(", ") ?? ""} placeholder="מנהיגות, יצירתיות, עבודת צוות" />
              <Input name="missingSkills" label="מיומנויות חסרות (מופרדות בפסיק)" defaultValue={profile?.missingSkills.join(", ") ?? ""} placeholder="Python, ניהול פרויקטים, Figma" />

              {profileState?.error && <p className="text-sm text-red-500">{profileState.error}</p>}
              {profileState?.success && <p className="text-sm text-green-600">✓ הפרופיל נשמר בהצלחה</p>}

              <Button type="submit" loading={profilePending}>שמור פרופיל</Button>
            </form>
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
              <Select name="q_teamOrSolo" label="עדפת עבודה" defaultValue={profile?.q_teamOrSolo ?? ""}
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
              <Textarea name="q_pastAchievement" label="הישג מקצועי שגאה בך" defaultValue={profile?.q_pastAchievement ?? ""} placeholder="תאר הישג שמרגיש לך משמעותי" rows={2} />
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
              <Input name="q_industryInterests" label="תעשיות מעניינות (מופרדות בפסיק)" defaultValue={profile?.q_industryInterests?.join(", ") ?? ""} placeholder="הייטק, בריאות, חינוך, פינטק..." />

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
          {/* CTA */}
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

            <Button
              onClick={handleGenerate}
              loading={generating}
              size="lg"
              className="bg-teal hover:bg-teal-dark text-white mx-auto"
            >
              {passportResult ? "🔄 עדכן דרכון קריירה" : "✨ צור דרכון קריירה"}
            </Button>
          </div>

          {/* Results */}
          {passportResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Score */}
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
                {/* Strengths */}
                <Card>
                  <CardHeader><CardTitle className="text-green-700">💪 חוזקות</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {passportResult.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Skill Gaps */}
                <Card>
                  <CardHeader><CardTitle className="text-orange-600">⚠️ פערי מיומנויות</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {passportResult.skillGaps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <div className="w-4 h-4 rounded-full bg-orange-100 border border-orange-300 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recommended Roles */}
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

                {/* Industries */}
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

              {/* Recommendations */}
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

              {/* Next Best Actions */}
              <Card className="bg-navy border-navy">
                <CardHeader><CardTitle className="text-white">🚀 הצעדים הבאים שלך</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {passportResult.nextBestActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
                        <Zap size={14} className="text-teal mt-0.5 shrink-0" />
                        {a}
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
