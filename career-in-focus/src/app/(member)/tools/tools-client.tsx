"use client";

import { useState } from "react";
import { Search, ExternalLink, X, Lightbulb, Wrench } from "lucide-react";
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

export function ToolsClient({ tools }: { tools: ToolItem[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("הכל");
  const [tipModalTool, setTipModalTool] = useState<ToolItem | null>(null);

  const allCategories = ["הכל", ...TOOL_CATEGORIES];

  const filtered = tools.filter((t) => {
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
        <p className="text-sm text-gray-500">{tools.length} כלים ומשאבים לחברי הקהילה</p>
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
