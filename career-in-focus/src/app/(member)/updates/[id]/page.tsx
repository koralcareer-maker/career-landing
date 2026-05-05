import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ChevronRight, ExternalLink, Calendar, Newspaper,
  AlertTriangle, Lightbulb, ArrowRight, Pin, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const CATEGORY_STYLE: Record<string, string> = {
  "שוק העבודה":              "bg-teal/10 text-teal-dark border-teal/30",
  "בינה מלאכותית ותעסוקה":   "bg-purple-100 text-purple-700 border-purple-200",
  "הייטק וטכנולוגיה":         "bg-blue-100 text-blue-700 border-blue-200",
  "גיוסים ופיטורים":          "bg-orange-100 text-orange-700 border-orange-200",
  "שכר ותנאים":              "bg-emerald-100 text-emerald-700 border-emerald-200",
  "מגמות קריירה":             "bg-amber-100 text-amber-700 border-amber-200",
  "מיומנויות מבוקשות":        "bg-pink-100 text-pink-700 border-pink-200",
};

const IMPORTANCE_STYLE: Record<string, string> = {
  "חשוב למחפשי עבודה":   "bg-red-500 text-white",
  "דורש פעולה":          "bg-red-500 text-white",
  "משפיע על שוק העבודה": "bg-amber-500 text-white",
  "מגמה שכדאי להכיר":    "bg-teal text-white",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.marketIntelArticle.findUnique({ where: { id } });
  return {
    title: article ? `${article.hebrewTitle} | קריירה בפוקוס` : "כתבה | קריירה בפוקוס",
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const article = await prisma.marketIntelArticle.findUnique({ where: { id } });
  if (!article || article.status === "DRAFT") notFound();

  // Surface 3 related articles in the same category, recent first.
  const related = await prisma.marketIntelArticle.findMany({
    where: {
      status: "PUBLISHED",
      category: article.category,
      id: { not: article.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const catStyle = CATEGORY_STYLE[article.category] ?? "bg-slate-100 text-slate-700 border-slate-200";
  const impStyle = article.importanceLabel
    ? IMPORTANCE_STYLE[article.importanceLabel] ?? "bg-slate-500 text-white"
    : null;

  function fmtDate(d: Date) {
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="p-4 sm:p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href="/updates"
          className="inline-flex items-center gap-1 text-sm font-bold text-teal hover:text-teal-dark transition-colors"
        >
          <ChevronRight size={14} />
          חזרה לכל הכתבות
        </Link>

        {/* Article hero */}
        <Card className="p-6 sm:p-8">
          {/* Category + importance */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className={`text-xs font-bold rounded-full px-3 py-1 border ${catStyle}`}>
              {article.category}
            </span>
            {impStyle && article.importanceLabel && (
              <span className={`text-xs font-black rounded-full px-3 py-1 ${impStyle}`}>
                {article.importanceLabel}
              </span>
            )}
            {article.isPinned && (
              <span className="text-[11px] font-bold inline-flex items-center gap-1 text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
                <Pin size={11} className="fill-amber-700" /> נעוץ
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-navy leading-tight mb-3">
            {article.hebrewTitle}
          </h1>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-6 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Newspaper size={12} />
              {article.sourceName}
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {fmtDate(article.publishedAt)}
            </span>
            {article.relevanceScore >= 80 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-teal-dark font-bold">
                  <Sparkles size={12} />
                  ציון רלוונטיות {article.relevanceScore}
                </span>
              </>
            )}
          </div>

          {/* Summary */}
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line mb-6">
            {article.summaryHebrew}
          </div>

          {/* Original article CTA */}
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-l from-teal to-teal-dark text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:shadow-md hover:shadow-teal/30 transition-all"
          >
            לקריאת הכתבה המלאה ב{article.sourceName}
            <ExternalLink size={14} />
          </a>
        </Card>

        {/* Why it matters */}
        {article.whyItMatters && (
          <Card className="p-5 bg-gradient-to-l from-amber-50 to-amber-50/30 border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle size={17} />
              </div>
              <div>
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide mb-1">למה זה חשוב לך</p>
                <p className="text-sm text-amber-900 leading-relaxed">{article.whyItMatters}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Job-search insight */}
        {article.jobSearchInsight && (
          <Card className="p-5 border-teal/30 bg-teal-pale/40">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal text-white flex items-center justify-center shrink-0">
                <Lightbulb size={17} />
              </div>
              <div>
                <p className="text-[11px] font-black text-teal-dark uppercase tracking-wide mb-1">תובנה לחיפוש העבודה</p>
                <p className="text-sm text-navy leading-relaxed">{article.jobSearchInsight}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Recommended action */}
        {article.recommendedAction && (
          <Card className="p-5 border-purple-200 bg-purple-50/50">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <ArrowRight size={17} />
              </div>
              <div>
                <p className="text-[11px] font-black text-purple-700 uppercase tracking-wide mb-1">הצעד הבא שלך</p>
                <p className="text-sm font-bold text-navy leading-relaxed">{article.recommendedAction}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="pt-4">
            <h2 className="text-lg font-black text-navy mb-3 inline-flex items-center gap-2">
              <Sparkles size={16} className="text-teal" />
              עוד מ-{article.category}
            </h2>
            <div className="space-y-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/updates/${r.id}`}
                  className="block bg-white rounded-xl border border-slate-100 p-4 hover:border-teal/30 hover:shadow-sm transition-all group"
                >
                  <p className="font-bold text-navy text-sm leading-snug group-hover:text-teal-dark transition-colors">
                    {r.hebrewTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.sourceName} · {fmtDate(r.publishedAt)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
