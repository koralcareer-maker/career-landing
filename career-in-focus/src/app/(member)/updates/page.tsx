import type { ComponentType } from "react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Pin, ExternalLink, TrendingUp, Rocket, CalendarDays, UserCheck, Megaphone, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    variant: "teal" | "green" | "navy" | "purple" | "yellow" | "gray";
    Icon: ComponentType<{ size?: number; className?: string }>;
  }
> = {
  market: { label: "שוק העבודה", variant: "teal", Icon: TrendingUp },
  launch: { label: "השקה", variant: "green", Icon: Rocket },
  event: { label: "אירוע", variant: "navy", Icon: CalendarDays },
  recruiter: { label: "מגייס", variant: "purple", Icon: UserCheck },
  general: { label: "כללי", variant: "gray", Icon: Megaphone },
};

function getCategoryConfig(category: string | null) {
  const key = category?.toLowerCase() ?? "general";
  return (
    CATEGORY_CONFIG[key] ?? { label: category ?? "כללי", variant: "gray" as const, Icon: Newspaper }
  );
}

// ─── Update Card ──────────────────────────────────────────────────────────────

function UpdateCard({
  update,
}: {
  update: {
    id: string;
    title: string;
    content: string;
    category: string | null;
    isPinned: boolean;
    createdAt: Date;
    imageUrl: string | null;
    ctaText: string | null;
    ctaUrl: string | null;
  };
}) {
  const cfg = getCategoryConfig(update.category);
  const { Icon } = cfg;

  return (
    <Card
      className={`w-full transition-all ${
        update.isPinned ? "ring-2 ring-teal/30 bg-gradient-to-l from-teal/5 to-white" : ""
      }`}
    >
      <CardContent>
        {/* Pinned banner */}
        {update.isPinned && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal mb-3 -mt-1">
            <Pin size={12} className="fill-teal" />
            <span>פוסט נעוץ</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              update.isPinned ? "bg-teal text-white" : "bg-teal-pale text-teal"
            }`}
          >
            <Icon size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge variant={cfg.variant} size="sm">
                {cfg.label}
              </Badge>
            </div>
            <h2 className="font-bold text-navy text-base leading-snug">{update.title}</h2>
          </div>
          <p className="text-xs text-gray-400 shrink-0 mt-0.5">{formatDate(update.createdAt)}</p>
        </div>

        {/* Content */}
        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed mb-3 text-sm whitespace-pre-line ps-13">
          {update.content}
        </div>

        {/* CTA */}
        {update.ctaUrl && (
          <div className="pt-3 border-t border-gray-100 ps-13">
            <a
              href={update.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-dark transition-colors"
            >
              {update.ctaText ?? "לפרטים נוספים"}
              <ExternalLink size={13} />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UpdatesPage() {
  const updates = await prisma.update.findMany({
    where: { isPublished: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  const pinned = updates.filter((u) => u.isPinned);
  const regular = updates.filter((u) => !u.isPinned);

  return (
    <div dir="rtl" className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">עדכונים והודעות</h1>
        <p className="text-sm text-gray-500">
          {updates.length > 0
            ? `${updates.length} עדכונים`
            : "אין עדכונים כרגע"}
        </p>
      </div>

      {/* Empty state */}
      {updates.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-teal" />
          </div>
          <h3 className="font-bold text-navy text-lg mb-2">אין עדכונים עדיין</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            עדכונים ממנהלי הקהילה יופיעו כאן. חזור מאוחר יותר.
          </p>
        </div>
      )}

      {/* Pinned posts */}
      {pinned.length > 0 && (
        <section className="space-y-4">
          {pinned.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </section>
      )}

      {/* Regular posts */}
      {regular.length > 0 && (
        <section className="space-y-4">
          {pinned.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">עדכונים נוספים</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}
          {regular.map((update) => (
            <UpdateCard key={update.id} update={update} />
          ))}
        </section>
      )}
    </div>
  );
}
