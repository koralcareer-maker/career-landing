"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MessageCircle, ArrowRight, Users, MapPin } from "lucide-react";

interface Group {
  id: string;
  title: string;
  category: string | null;
  externalUrl: string | null;
  notes: string | null;
  description: string | null;
}

interface Props {
  groups: Group[];
  byIndustry: Record<string, Group[]>;
}

export function WhatsAppGroupsClient({ groups, byIndustry }: Props) {
  const [search, setSearch] = useState("");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  const industries = Object.keys(byIndustry).sort((a, b) => {
    // Hebrew first, then English
    const aHeb = /[֐-׿]/.test(a);
    const bHeb = /[֐-׿]/.test(b);
    if (aHeb && !bHeb) return -1;
    if (!aHeb && bHeb) return 1;
    return a.localeCompare(b, "he");
  });

  const filteredGroups = useMemo(() => {
    let result = activeIndustry ? (byIndustry[activeIndustry] ?? []) : groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.category ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeIndustry, groups, byIndustry]);

  const displayedByIndustry = useMemo(() => {
    if (activeIndustry || search.trim()) {
      // flat list
      return null;
    }
    return byIndustry;
  }, [activeIndustry, search, byIndustry]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#075E54] via-[#128C7E] to-[#25D366] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5 transition-colors">
            <ArrowRight size={14} />
            חזרה לכלים
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <MessageCircle size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black">קבוצות וואטספ למשרות</h1>
              <p className="text-white/75 text-sm mt-1">{groups.length} קבוצות · {industries.length} תחומים</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            אינדקס קבוצות וואטספ מובילות לחיפוש עבודה בישראל — מסוננות לפי תחום מקצועי.
          </p>

          {/* Search */}
          <div className="mt-6 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="חפש לפי שם קבוצה או תחום..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-xl pr-10 pl-4 py-2.5 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/30 transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Industry filter chips */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveIndustry(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !activeIndustry
                  ? "bg-[#25D366] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-[#25D366] hover:text-[#128C7E]"
              }`}
            >
              הכל ({groups.length})
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => setActiveIndustry(activeIndustry === ind ? null : ind)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeIndustry === ind
                    ? "bg-[#25D366] text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-[#25D366] hover:text-[#128C7E]"
                }`}
              >
                {ind} ({byIndustry[ind].length})
              </button>
            ))}
          </div>
        )}

        {/* Results count when searching */}
        {(search || activeIndustry) && (
          <p className="text-sm text-slate-500 mb-4">
            נמצאו {filteredGroups.length} קבוצות
            {activeIndustry && ` בתחום "${activeIndustry}"`}
            {search && ` עבור "${search}"`}
            {(search || activeIndustry) && (
              <button
                onClick={() => { setSearch(""); setActiveIndustry(null); }}
                className="mr-2 text-[#128C7E] hover:underline"
              >
                נקה
              </button>
            )}
          </p>
        )}

        {/* Groups — grouped by industry (default) */}
        {displayedByIndustry && (
          <div className="space-y-8">
            {industries.map((ind) => (
              <div key={ind}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={15} className="text-[#128C7E]" />
                  <h2 className="text-sm font-bold text-navy">{ind}</h2>
                  <span className="text-xs text-slate-400">({byIndustry[ind].length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {byIndustry[ind].map((g) => (
                    <GroupCard key={g.id} group={g} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flat list when searching or filtered */}
        {!displayedByIndustry && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredGroups.map((g) => (
              <GroupCard key={g.id} group={g} showIndustry />
            ))}
            {filteredGroups.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400">
                <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                <p>לא נמצאו קבוצות מתאימות</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, showIndustry }: { group: Group; showIndustry?: boolean }) {
  return (
    <a
      href={group.externalUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 hover:border-[#25D366] hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 bg-[#25D366]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/20 transition-colors">
        <MessageCircle size={16} className="text-[#25D366]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy truncate">{group.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {showIndustry && group.category && (
            <span className="text-xs text-slate-400">{group.category}</span>
          )}
          {group.notes && group.notes !== "כל הארץ" && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MapPin size={10} />
              {group.notes}
            </span>
          )}
          {(!group.notes || group.notes === "כל הארץ") && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MapPin size={10} />
              כל הארץ
            </span>
          )}
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-[#25D366] transition-colors shrink-0 rotate-180" />
    </a>
  );
}
