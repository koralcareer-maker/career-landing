"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, PlayCircle, FileText, ExternalLink, ChevronLeft, GraduationCap, Layers, Search, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseContentItem {
  id: string;
  format: string;
  title: string | null;
  sortOrder: number;
}

export interface CourseItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  formatType: string | null;
  accessType: string;
  imageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  contents: CourseContentItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accessTypeConfig(type: string): { label: string; variant: "green" | "teal" | "navy" | "gray" | "yellow" } {
  switch (type) {
    case "FREE":
      return { label: "חינמי", variant: "green" };
    case "INCLUDED":
      return { label: "כלול בחברות", variant: "teal" };
    case "DISCOUNTED":
      return { label: "מוזל לחברים", variant: "yellow" };
    case "PAID":
      return { label: "בתשלום", variant: "navy" };
    default:
      return { label: type, variant: "gray" };
  }
}

function FormatIcon({ format }: { format: string }) {
  switch (format) {
    case "VIDEO":
      return <PlayCircle size={13} className="text-purple-500" />;
    case "PDF":
    case "DOWNLOAD_BUNDLE":
      return <FileText size={13} className="text-blue-500" />;
    case "EXTERNAL_LINK":
    case "EXTERNAL_PLATFORM":
      return <ExternalLink size={13} className="text-teal" />;
    default:
      return <BookOpen size={13} className="text-gray-400" />;
  }
}

const FORMAT_LABELS: Record<string, string> = {
  TEXT: "טקסט",
  PDF: "PDF",
  VIDEO: "וידאו",
  EXTERNAL_LINK: "קישור חיצוני",
  EMBEDDED: "מוטמע",
  EXTERNAL_PLATFORM: "פלטפורמה חיצונית",
  DOWNLOAD_BUNDLE: "חבילת הורדה",
};

// ─── Course Card ─────────────────────────────────────────────────────────────

function CourseCard({ course }: { course: CourseItem }) {
  const access = accessTypeConfig(course.accessType);
  const lessonCount = course.contents.length;
  const formats = [...new Set(course.contents.map((c) => c.format))];

  return (
    <Card hover className="flex flex-col h-full overflow-hidden">
      {/* Color header strip */}
      <div className="h-1.5 bg-gradient-to-l from-teal to-navy -mx-5 -mt-5 mb-5" />

      <CardContent className="flex flex-col flex-1 pt-0">
        {/* Category + Access */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          {course.category && (
            <Badge variant="gray" size="sm">
              {course.category}
            </Badge>
          )}
          <Badge variant={access.variant} size="sm">
            {access.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-bold text-navy text-base mb-2 leading-snug">{course.title}</h3>

        {/* Description */}
        {course.description && (
          <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-3 flex-1">
            {course.description}
          </p>
        )}

        {!course.description && <div className="flex-1" />}

        {/* Format types */}
        {formats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {formats.map((fmt) => (
              <span
                key={fmt}
                className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1"
              >
                <FormatIcon format={fmt} />
                {FORMAT_LABELS[fmt] ?? fmt}
              </span>
            ))}
          </div>
        )}

        {/* Lesson count + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Layers size={12} />
            <span>
              {lessonCount} {lessonCount === 1 ? "שיעור" : "שיעורים"}
            </span>
          </div>
          {course.ctaUrl ? (
            <a
              href={course.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:text-teal-dark transition-colors"
            >
              {course.ctaText ?? "פתח קורס"}
              <ChevronLeft size={14} />
            </a>
          ) : (
            <span className="text-xs text-gray-300">בקרוב</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-teal-pale rounded-2xl flex items-center justify-center mx-auto mb-4">
        <GraduationCap size={28} className="text-teal" />
      </div>
      <h3 className="font-bold text-navy text-lg mb-2">
        {filtered ? "אין קורסים בקטגוריה זו" : "אין קורסים זמינים כרגע"}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs mx-auto">
        {filtered
          ? "נסה לשנות את הסינון או לנקות אותו"
          : "הקורסים יתווספו בקרוב. בנתיים עיין בכלים ומשאבים הזמינים"}
      </p>
    </div>
  );
}

// ─── Topic Groups ─────────────────────────────────────────────────────────────

const TOPIC_GROUPS: { label: string; categories: string[] }[] = [
  {
    label: "קורסים למציאת עבודה",
    categories: ["חיפוש עבודה", "ראיונות"],
  },
  {
    label: "קורסי העשרה",
    categories: ["העשרה", "בינה מלאכותית", "ניתוח נתונים", "שיווק דיגיטלי", "שיווק ממומן", "ניהול סושיאל מדיה"],
  },
  {
    label: "פיתוח מיומנויות אישיותיות",
    categories: ["מנהיגות", "מנהיגות ולידרשיפ", "מיומנויות ארגוניות"],
  },
  {
    label: "פיתוח מיומנויות מקצועיות",
    categories: ["כלים מקצועיים", "אנגלית מקצועית", "משאבי אנוש", "ניהול פרויקטים", "הנדסה", "ניהול מוצר", "פיתוח תוכנה", "עיצוב UX/UI"],
  },
  {
    label: "שיפור תדמית מקצועית",
    categories: ["שיווק אישי", "יכולות מכירה", "קשרי לקוחות"],
  },
];

// ─── Main Client Component ────────────────────────────────────────────────────

export function CoursesClient({ courses }: { courses: CourseItem[]; categories: string[] }) {
  const [activeGroup, setActiveGroup] = useState("הכל");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = courses;

    // Filter by topic group
    if (activeGroup !== "הכל") {
      const group = TOPIC_GROUPS.find((g) => g.label === activeGroup);
      if (group) {
        result = result.filter((c) => group.categories.includes(c.category ?? ""));
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [courses, activeGroup, searchQuery]);

  const isFiltered = activeGroup !== "הכל" || searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">קורסים ולמידה</h1>
        <p className="text-sm text-gray-500">{courses.length} קורסים זמינים לחברי הקהילה</p>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Topic group dropdown */}
        <div className="relative">
          <select
            value={activeGroup}
            onChange={(e) => setActiveGroup(e.target.value)}
            className="appearance-none w-full sm:w-64 bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal cursor-pointer"
          >
            <option value="הכל">כל הנושאים</option>
            {TOPIC_GROUPS.map((g) => (
              <option key={g.label} value={g.label}>
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Free text search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש קורס..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          />
        </div>

        {/* Clear filters */}
        {isFiltered && (
          <button
            onClick={() => { setActiveGroup("הכל"); setSearchQuery(""); }}
            className="text-sm text-gray-400 hover:text-teal transition-colors px-2 whitespace-nowrap"
          >
            נקה סינון
          </button>
        )}
      </div>

      {/* Active filter label */}
      {isFiltered && (
        <p className="text-sm text-gray-500">
          מציג <span className="font-semibold text-navy">{filtered.length}</span> קורסים
          {activeGroup !== "הכל" && <> בנושא <span className="font-semibold text-teal">{activeGroup}</span></>}
          {searchQuery.trim() && <> עבור &quot;{searchQuery.trim()}&quot;</>}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState filtered={isFiltered} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
