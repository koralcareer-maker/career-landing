import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { getUserCompletions } from "@/lib/actions/completions";
import Link from "next/link";
import { Lock, ExternalLink, BookOpen, PlayCircle, GraduationCap, Target, ChevronLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillCompletionButton } from "./skill-completion-button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearningResource {
  name: string;
  description: string;
  url: string;
  type: "youtube" | "linkedin" | "udemy" | "coursera" | "general";
}

interface SkillCard {
  skill: string;
  why: string;
  priority: "high" | "medium" | "low";
  resources: LearningResource[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildResourcesForSkill(skill: string): LearningResource[] {
  const encoded = encodeURIComponent(skill);
  return [
    {
      name: "YouTube",
      description: `סרטוני הסבר ב-YouTube על ${skill}`,
      url: `https://www.youtube.com/results?search_query=${encoded}`,
      type: "youtube",
    },
    {
      name: "LinkedIn Learning",
      description: `קורסים מקצועיים של LinkedIn Learning בנושא ${skill}`,
      url: `https://www.linkedin.com/learning/search?keywords=${encoded}`,
      type: "linkedin",
    },
    {
      name: "Udemy",
      description: `קורסים מעשיים ב-Udemy ללמידת ${skill} עם תרגולים`,
      url: `https://www.udemy.com/courses/search/?src=ukw&q=${encoded}`,
      type: "udemy",
    },
  ];
}

function assignPriority(
  skill: string,
  targetRole: string | null | undefined,
  index: number
): "high" | "medium" | "low" {
  const lowerSkill = skill.toLowerCase();
  const lowerRole = (targetRole ?? "").toLowerCase();
  // First 2 from passport gaps are high, next 2 medium, rest low
  if (index < 2) return "high";
  if (index < 4) return "medium";
  return "low";
}

function buildSkillReason(skill: string, targetRole: string | null | undefined): string {
  const role = targetRole ?? "התפקיד המבוקש";
  return `מיומנות זו נחשבת לקריטית ל${role}. מעסיקים רבים דורשים ידע ב${skill} כחלק ממינימום הכישורים הנדרשים להצלחה בתפקיד.`;
}

function buildSkillCards(
  skillGaps: string[],
  missingSkills: string[],
  targetRole: string | null | undefined
): SkillCard[] {
  const combined = [...new Set([...skillGaps, ...missingSkills])];
  if (combined.length === 0) return [];

  return combined.map((skill, i) => ({
    skill,
    why: buildSkillReason(skill, targetRole),
    priority: assignPriority(skill, targetRole, i),
    resources: buildResourcesForSkill(skill),
  }));
}

// ─── Resource Icon ────────────────────────────────────────────────────────────

function ResourceIcon({ type }: { type: LearningResource["type"] }) {
  switch (type) {
    case "youtube":
      return <PlayCircle size={14} className="text-red-500" />;
    case "linkedin":
      return <BookOpen size={14} className="text-blue-600" />;
    case "udemy":
      return <GraduationCap size={14} className="text-purple-600" />;
    case "coursera":
      return <GraduationCap size={14} className="text-blue-500" />;
    default:
      return <ExternalLink size={14} className="text-gray-500" />;
  }
}

// ─── Locked State ─────────────────────────────────────────────────────────────

function LockedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
        <Lock size={36} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-black text-navy mb-2">ניתוח הפערים נעול</h2>
      <p className="text-gray-500 max-w-sm mb-2">
        כדי לקבל ניתוח מותאם אישית של פערי המיומנויות שלך, עליך להשלים תחילה את{" "}
        <span className="font-bold text-navy">דרכון הקריירה</span>.
      </p>
      <p className="text-sm text-gray-400 max-w-xs mb-8">
        דרכון הקריירה מנתח את הרקע שלך, מגדיר את יעדיך ומייצר תוכנית אישית לסגירת הפערים.
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 bg-teal text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-dark transition-colors"
      >
        <Target size={16} />
        עבור לפרופיל ובנה דרכון קריירה
        <ChevronLeft size={14} />
      </Link>
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") return <Badge variant="red">עדיפות גבוהה</Badge>;
  if (priority === "medium") return <Badge variant="yellow">עדיפות בינונית</Badge>;
  return <Badge variant="gray">עדיפות נמוכה</Badge>;
}

// ─── Skill Card Component ─────────────────────────────────────────────────────

function SkillCardItem({ card, completed }: { card: SkillCard; completed: boolean }) {
  return (
    <Card hover className="h-full">
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-pale rounded-xl flex items-center justify-center">
              <BookOpen size={16} className="text-teal" />
            </div>
            <h3 className="font-bold text-navy text-base">{card.skill}</h3>
          </div>
          <PriorityBadge priority={card.priority} />
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{card.why}</p>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">
            משאבי למידה מומלצים
          </p>
          <div className="space-y-2">
            {card.resources.map((res) => (
              <a
                key={res.name}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-teal-pale transition-colors group"
              >
                <ResourceIcon type={res.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-navy">{res.name}</p>
                  <p className="text-xs text-gray-400 truncate">{res.description}</p>
                </div>
                <ExternalLink
                  size={12}
                  className="text-gray-300 group-hover:text-teal transition-colors shrink-0"
                />
              </a>
            ))}
          </div>
        </div>
        <SkillCompletionButton skillName={card.skill} initialCompleted={completed} />
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SkillsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [profile, passport, completions] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.careerPassport.findUnique({ where: { userId } }),
    // Tolerate the table not being migrated yet — we just won't show
    // anything as completed in that case.
    getUserCompletions().catch(() => ({ courseIds: new Set<string>(), skills: new Set<string>() })),
  ]);

  if (!passport) {
    return (
      <div dir="rtl">
        <LockedState />
      </div>
    );
  }

  const skillGaps = parseJsonArray(passport.skillGaps);
  const missingSkills = parseJsonArray(profile?.missingSkills);
  const targetRole = profile?.targetRole;
  const likelyFitRoles = parseJsonArray(passport.likelyFitRoles);

  const allCards = buildSkillCards(skillGaps, missingSkills, targetRole);

  const highPriority = allCards.filter((c) => c.priority === "high");
  const mediumPriority = allCards.filter((c) => c.priority === "medium");
  const lowPriority = allCards.filter((c) => c.priority === "low");

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-teal/10 to-teal-pale rounded-2xl p-6 border border-teal/20">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-navy mb-1">ניתוח פערי מיומנויות</h1>
            <p className="text-sm text-gray-600">
              מבוסס על הפרופיל שלך ודרכון הקריירה
              {targetRole && (
                <span className="font-semibold text-teal"> · יעד: {targetRole}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {likelyFitRoles.slice(0, 3).map((role) => (
              <Badge key={role} variant="teal">
                {role}
              </Badge>
            ))}
          </div>
        </div>

        {allCards.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-500">{highPriority.length}</p>
              <p className="text-xs text-gray-500">עדיפות גבוהה</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-yellow-600">{mediumPriority.length}</p>
              <p className="text-xs text-gray-500">עדיפות בינונית</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-gray-500">{lowPriority.length}</p>
              <p className="text-xs text-gray-500">עדיפות נמוכה</p>
            </div>
          </div>
        )}
      </div>

      {allCards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target size={24} className="text-green-600" />
            </div>
            <h3 className="font-bold text-navy text-lg mb-2">לא זוהו פערי מיומנויות</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              מצוין! לפי הפרופיל שלך, אין פערים מיוחדים שזוהו כרגע. המשך לעדכן את הפרופיל שלך.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* High Priority */}
          {highPriority.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <h2 className="text-base font-bold text-navy">עדיפות גבוהה — טפל בהן ראשון</h2>
                <span className="text-xs text-gray-400">({highPriority.length} מיומנויות)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highPriority.map((card) => (
                  <SkillCardItem key={card.skill} card={card} completed={completions.skills.has(card.skill)} />
                ))}
              </div>
            </section>
          )}

          {/* Medium Priority */}
          {mediumPriority.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <h2 className="text-base font-bold text-navy">עדיפות בינונית — חשוב לפתח</h2>
                <span className="text-xs text-gray-400">({mediumPriority.length} מיומנויות)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mediumPriority.map((card) => (
                  <SkillCardItem key={card.skill} card={card} completed={completions.skills.has(card.skill)} />
                ))}
              </div>
            </section>
          )}

          {/* Low Priority */}
          {lowPriority.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <h2 className="text-base font-bold text-navy">עדיפות נמוכה — שווה ללמוד</h2>
                <span className="text-xs text-gray-400">({lowPriority.length} מיומנויות)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowPriority.map((card) => (
                  <SkillCardItem key={card.skill} card={card} completed={completions.skills.has(card.skill)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Tip Banner */}
      <div className="bg-navy text-white rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap size={16} />
          </div>
          <div>
            <p className="font-bold mb-0.5">טיפ מהמנטורים שלנו</p>
            <p className="text-sm text-white/80">
              אל תנסה ללמוד הכל בבת אחת. התמקד ב-1-2 מיומנויות בכל פעם, השקיע 30 דקות ביום,
              ותוך חודש תראה תוצאות ממשיות. עקביות עדיפה על פרצי לימוד אינטנסיביים.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
