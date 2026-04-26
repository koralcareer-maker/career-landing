"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, PlayCircle, FileText, ExternalLink, ChevronLeft, GraduationCap, Layers } from "lucide-react";
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
          ? "נסה לבחור קטגוריה אחרת או לבחור 'הכל'"
          : "הקורסים יתווספו בקרוב. בנתיים עיין בכלים ומשאבים הזמינים"}
      </p>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function CoursesClient({ courses, categories }: { courses: CourseItem[]; categories: string[] }) {
  const [activeCategory, setActiveCategory] = useState("הכל");

  const allCategories = ["הכל", ...categories];

  const filtered =
    activeCategory === "הכל"
      ? courses
      : courses.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">קורסים ולמידה</h1>
        <p className="text-sm text-gray-500">{courses.length} קורסים זמינים לחברי הקהילה</p>
      </div>

      {/* Category Filter */}
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState filtered={activeCategory !== "הכל"} />
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
