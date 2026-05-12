"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, X, Lightbulb, Wrench, MessageCircle, ArrowLeft, ChevronLeft, Users, UserSearch, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOOL_TYPE_LABELS, TOOL_CATEGORIES } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: string;
  externalUrl: string | null;
  fileUrl: string | null;
  imageUrl: string | null;
  adminTip: string | null;
  targetRole: string | null;
}

// ─── Admin Tip Modal ──────────────────────────────────────────────────────────

function AdminTipModal({
  tip,
  toolTitle,
  url,
  onClose,
}: {
  tip: string;
  toolTitle: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Lightbulb size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">לפני שפותחים</p>
              <p className="font-bold text-navy text-sm">{toolTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-bold text-yellow-800 mb-1">טיפ מהמנהלים שלנו</p>
          <p className="text-sm text-yellow-700 leading-relaxed">{tip}</p>
        </div>

        <div className="flex gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-teal text-white font-semibold py-2.5 rounded-xl hover:bg-teal-dark transition-colors text-sm"
            onClick={onClose}
          >
            פתח קישור
            <ExternalLink size={14} />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Featured Tool Cube ───────────────────────────────────────────────────────
//
// Vertical cube card for the 5 "headline" tools. Each cube is tinted with its
// brand colour (WhatsApp green / Facebook blue / etc.) so the row reads at a
// glance — no CTA button at the bottom; the entire cube is the link, which
// Coral asked for explicitly ("לא צריך כפתור כניסה לכלי — שילחצו על הקוביה").

function FeaturedToolCube({
  href,
  title,
  description,
  icon,
  tint, // tailwind classes: { card: "bg-X/10 border-X/30", iconBg: "bg-X/15", hover: "hover:border-X" }
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tint: { card: string; iconBg: string; hover: string };
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-2xl p-5 border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 ${tint.card} ${tint.hover}`}
    >
      <div className={`w-12 h-12 rounded-2xl ${tint.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-black text-navy text-base leading-snug mb-1.5">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{description}</p>
    </Link>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onTipOpen }: { tool: ToolItem; onTipOpen: (tool: ToolItem) => void }) {
  const typeLabel = TOOL_TYPE_LABELS[tool.type] ?? tool.type;
  const url = tool.externalUrl || tool.fileUrl;

  function handleOpen() {
    if (!url) return;
    if (tool.adminTip) {
      onTipOpen(tool);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-teal-pale rounded-xl flex items-center justify-center shrink-0">
            <Wrench size={16} className="text-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-navy text-sm leading-snug mb-0.5">{tool.title}</h3>
            {tool.targetRole && (
              <p className="text-xs text-gray-400 truncate">מתאים ל: {tool.targetRole}</p>
            )}
          </div>
          {tool.adminTip && (
            <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center shrink-0" title="יש טיפ מהמנהלים">
              <Lightbulb size={11} className="text-yellow-600" />
            </div>
          )}
        </div>

        {tool.description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3 flex-1">
            {tool.description}
          </p>
        )}

        {!tool.description && <div className="flex-1" />}

        {/* Badges + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="teal" size="sm">
              {typeLabel}
            </Badge>
            {tool.category && (
              <Badge variant="gray" size="sm">
                {tool.category}
              </Badge>
            )}
          </div>
          {url && (
            <Button size="sm" variant="outline" onClick={handleOpen} className="shrink-0">
              פתח
              <ExternalLink size={12} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-16 col-span-full">
      <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Wrench size={28} className="text-teal" />
      </div>
      <h3 className="font-bold text-navy text-lg mb-2">
        {hasFilters ? "לא נמצאו כלים" : "אין כלים זמינים כרגע"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {hasFilters
          ? "נסה לשנות את הסינון או לנקות את החיפוש"
          : "הכלים יתווספו בקרוב. חזור מאוחר יותר"}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ToolsClient({ tools, whatsappCount = 0, facebookCount = 0 }: { tools: ToolItem[]; whatsappCount?: number; facebookCount?: number }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [tipModalTool, setTipModalTool] = useState<ToolItem | null>(null);

  // Exclude WhatsApp/Facebook groups from the main grid — they have their own pages
  const regularTools = tools.filter((t) => t.type !== "WHATSAPP_GROUP" && t.type !== "FACEBOOK_GROUP");
  const allCategories = ["הכל", ...TOOL_CATEGORIES];

  const filtered = regularTools.filter((t) => {
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "הכל" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const hasFilters = !!search || activeCategory !== "הכל";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">כלים ומשאבים</h1>
        <p className="text-sm text-gray-500">כלים ומשאבים לחברי הקהילה</p>
      </div>

      {/* ─── Featured tools — unified cube grid ─────────────────────────
       *
       * Coral asked that *every* tool — including the 5 "headline" tools
       * (WhatsApp / Facebook groups, recruiters, LinkedIn AI photo,
       * networking prompts) — reads as the same cube-shaped card the
       * smaller items below use. The previous layout had each of them as
       * a full-width gradient banner, which made the page feel like 5
       * separate sections stacked vertically. One grid, equal-height
       * cards, same visual rhythm — easier to scan and visually
       * consistent with the cube cards on the group sub-pages.
       */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">כלים ראשיים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeaturedToolCube
            href="/tools/whatsapp-groups"
            title="קבוצות וואטסאפ למשרות"
            description={`${whatsappCount} קבוצות · ממויינות לפי תעשייה`}
            icon={<MessageCircle size={22} className="text-[#128C7E]" />}
            tint={{
              card: "bg-[#dcfce7] border-[#86efac]",
              iconBg: "bg-white",
              hover: "hover:border-[#22c55e]",
            }}
          />
          <FeaturedToolCube
            href="/tools/facebook-groups"
            title="קבוצות פייסבוק למשרות"
            description={`${facebookCount} קבוצות · ממויינות לפי תחום`}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            }
            tint={{
              card: "bg-[#dbeafe] border-[#93c5fd]",
              iconBg: "bg-white",
              hover: "hover:border-[#1877F2]",
            }}
          />
          <FeaturedToolCube
            href="/recruiters"
            title="ספריית מגייסים"
            description="מגייסים, חברות השמה והד-האנטרים · פרטי קשר ישירים"
            icon={<UserSearch size={22} className="text-teal-dark" />}
            tint={{
              card: "bg-teal-pale border-teal/30",
              iconBg: "bg-white",
              hover: "hover:border-teal",
            }}
          />
          <FeaturedToolCube
            href="/tools/linkedin-photo"
            title="מחולל תמונת לינקדאין"
            description="3 תמונות יומיומיות · AI מייצר תמונת פרופיל מקצועית"
            icon={<Camera size={22} className="text-purple-700" />}
            tint={{
              card: "bg-purple-100 border-purple-300",
              iconBg: "bg-white",
              hover: "hover:border-purple-500",
            }}
          />
          <FeaturedToolCube
            href="/tools/networking-prompts"
            title="תבניות נטוורקינג"
            description="12 תבניות · מגייסים, הפניות ופנייה קרה · וואטסאפ, מייל ולינקדאין"
            icon={<Users size={22} className="text-amber-700" />}
            tint={{
              card: "bg-amber-100 border-amber-300",
              iconBg: "bg-white",
              hover: "hover:border-amber-500",
            }}
          />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute top-1/2 -translate-y-1/2 end-3.5 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="חיפוש כלי..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pe-10 ps-4 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm placeholder:text-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
            dir="rtl"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-teal text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-teal hover:text-teal"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {hasFilters && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{filtered.length} תוצאות</span>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("הכל");
              }}
              className="text-teal hover:underline inline-flex items-center gap-1"
            >
              <X size={12} />
              נקה סינון
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onTipOpen={setTipModalTool} />
          ))}
        </div>
      )}

      {/* Admin Tip Modal */}
      {tipModalTool && tipModalTool.adminTip && (tipModalTool.externalUrl || tipModalTool.fileUrl) && (
        <AdminTipModal
          tip={tipModalTool.adminTip}
          toolTitle={tipModalTool.title}
          url={(tipModalTool.externalUrl || tipModalTool.fileUrl)!}
          onClose={() => setTipModalTool(null)}
        />
      )}
    </div>
  );
}
