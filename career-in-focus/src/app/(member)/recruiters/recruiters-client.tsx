"use client";

import { useState } from "react";
import { Search, Copy, Check, ExternalLink, UserSearch, Building2, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Recruiter {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  type: string;
  field: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  RECRUITER:  "מגייס",
  STAFFING:   "חברת השמה",
  HEADHUNTER: "הד האנטר",
};

const TYPE_VARIANTS: Record<string, "teal" | "navy" | "purple"> = {
  RECRUITER:  "teal",
  STAFFING:   "navy",
  HEADHUNTER: "purple",
};

const TYPE_FILTERS = [
  { key: "הכל",          value: null },
  { key: "מגייסים",      value: "RECRUITER" },
  { key: "חברות השמה",   value: "STAFFING" },
  { key: "הד-האנטרים",   value: "HEADHUNTER" },
];

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — nothing
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal-dark transition-colors font-medium"
      title={`העתק ${label}`}
    >
      {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {copied ? "הועתק!" : label}
    </button>
  );
}

// ─── Recruiter Card ───────────────────────────────────────────────────────────

function RecruiterCard({ r }: { r: Recruiter }) {
  const TypeIcon = r.type === "STAFFING" ? Building2 : r.type === "HEADHUNTER" ? Briefcase : UserSearch;

  return (
    <Card hover className="flex flex-col h-full">
      <CardContent className="flex flex-col h-full gap-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-teal-pale rounded-xl flex items-center justify-center shrink-0">
            <TypeIcon size={18} className="text-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-navy text-sm leading-snug truncate">{r.name}</h3>
            <p className="text-xs text-gray-500 truncate">{r.company}</p>
          </div>
          <Badge variant={TYPE_VARIANTS[r.type] ?? "gray"} size="sm">
            {TYPE_LABELS[r.type] ?? r.type}
          </Badge>
        </div>

        {/* Field */}
        {r.field && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1.5">
            תחום: <span className="font-medium text-gray-600">{r.field}</span>
          </p>
        )}

        {/* Contact */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 mt-auto">
          {r.email && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 truncate max-w-[60%]" dir="ltr">{r.email}</span>
              <CopyButton text={r.email} label="אימייל" />
            </div>
          )}
          {r.phone && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400" dir="ltr">{r.phone}</span>
              <CopyButton text={r.phone} label="טלפון" />
            </div>
          )}
          {r.linkedinUrl && (
            <a
              href={r.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-navy hover:text-teal transition-colors font-medium"
            >
              <ExternalLink size={11} />
              LinkedIn
            </a>
          )}
          {!r.email && !r.phone && !r.linkedinUrl && (
            <p className="text-xs text-gray-300">אין פרטי קשר זמינים</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RecruitersClient({ recruiters }: { recruiters: Recruiter[] }) {
  const [search, setSearch]       = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  const filtered = recruiters.filter(r => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.company.toLowerCase().includes(search.toLowerCase()) ||
      (r.field ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesType = !activeType || r.type === activeType;
    return matchesSearch && matchesType;
  });

  const counts = {
    RECRUITER:  recruiters.filter(r => r.type === "RECRUITER").length,
    STAFFING:   recruiters.filter(r => r.type === "STAFFING").length,
    HEADHUNTER: recruiters.filter(r => r.type === "HEADHUNTER").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy mb-1">ספריית מגייסים</h1>
        <p className="text-sm text-gray-500">מגייסים, חברות השמה והד-האנטרים — הפנייה הנכונה לאדם הנכון</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "מגייסים",      count: counts.RECRUITER,  icon: UserSearch, color: "text-teal" },
          { label: "חברות השמה",   count: counts.STAFFING,   icon: Building2,  color: "text-navy" },
          { label: "הד-האנטרים",   count: counts.HEADHUNTER, icon: Briefcase,  color: "text-purple-600" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <Icon size={16} className={`mx-auto mb-1 ${s.color}`} />
              <p className={`text-xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 end-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, חברה או תחום..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            dir="rtl"
            className="w-full pe-10 ps-4 py-2.5 rounded-xl border border-gray-200 bg-white text-navy text-sm placeholder:text-gray-400 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveType(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeType === f.value
                  ? "bg-teal text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-teal hover:text-teal"
              }`}
            >
              {f.key}
            </button>
          ))}
        </div>

        {(search || activeType) && (
          <p className="text-sm text-gray-500">
            {filtered.length} תוצאות
            <button
              onClick={() => { setSearch(""); setActiveType(null); }}
              className="mr-2 text-teal text-xs hover:underline"
            >
              נקה סינון
            </button>
          </p>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-gray-500">לא נמצאו מגייסים</p>
          <p className="text-xs mt-1">נסה לשנות את החיפוש או הסינון</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <RecruiterCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
