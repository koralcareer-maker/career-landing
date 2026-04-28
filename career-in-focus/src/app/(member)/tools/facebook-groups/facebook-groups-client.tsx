"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, Users, ExternalLink } from "lucide-react";

interface Group {
  id: string;
  title: string;
  category: string | null;
  externalUrl: string | null;
  notes: string | null;
}

interface Props {
  groups: Group[];
  byCategory: Record<string, Group[]>;
}

const FB_BLUE = "#1877F2";
const FB_DARK = "#0a5dc2";

function FBIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function FacebookGroupsClient({ groups, byCategory }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = Object.keys(byCategory).sort((a, b) => {
    const order = ["כללי", "הייטק", "אדמיניסטרציה", "שיווק ויחצ", "תעשייה", "חינוך וחברה", "סטודנטים", "אנגלית ובינלאומי", "רילוקיישן", "קהילות מיוחדות"];
    const ai = order.indexOf(a), bi = order.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b, "he");
  });

  const filteredGroups = useMemo(() => {
    let result = activeCategory ? (byCategory[activeCategory] ?? []) : groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.title.toLowerCase().includes(q) || (g.category ?? "").toLowerCase().includes(q));
    }
    return result;
  }, [search, activeCategory, groups, byCategory]);

  const showGrouped = !activeCategory && !search.trim();

  return (
    <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${FB_DARK}, ${FB_BLUE})` }} className="text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link href="/tools" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-5 transition-colors">
            <ArrowRight size={14} />
            חזרה לכלים
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <FBIcon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black">קבוצות פייסבוק למשרות</h1>
              <p className="text-white/75 text-sm mt-1">{groups.length} קבוצות · {categories.length} קטגוריות</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            קבוצות הפייסבוק הפעילות ביותר לחיפוש עבודה בישראל — ממוינות לפי תחום.
          </p>
          <div className="mt-6 relative">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              placeholder="חפש לפי שם קבוצה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-xl pr-10 pl-4 py-2.5 text-white placeholder-white/50 text-sm focus:outline-none focus:bg-white/30 transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Category chips */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!activeCategory ? "text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:text-blue-600"}`}
              style={!activeCategory ? { background: FB_BLUE } : {}}
            >
              הכל ({groups.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeCategory === cat ? "text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:text-blue-600"}`}
                style={activeCategory === cat ? { background: FB_BLUE } : {}}
              >
                {cat} ({byCategory[cat].length})
              </button>
            ))}
          </div>
        )}

        {(search || activeCategory) && (
          <p className="text-sm text-slate-500 mb-4">
            נמצאו {filteredGroups.length} קבוצות
            {activeCategory && ` בקטגוריה "${activeCategory}"`}
            {search && ` עבור "${search}"`}
            <button onClick={() => { setSearch(""); setActiveCategory(null); }} className="mr-2 hover:underline" style={{ color: FB_BLUE }}>נקה</button>
          </p>
        )}

        {/* Grouped view */}
        {showGrouped && (
          <div className="space-y-8">
            {categories.map(cat => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={15} style={{ color: FB_BLUE }} />
                  <h2 className="text-sm font-bold text-navy">{cat}</h2>
                  <span className="text-xs text-slate-400">({byCategory[cat].length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {byCategory[cat].map(g => <GroupCard key={g.id} group={g} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flat list */}
        {!showGrouped && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredGroups.map(g => <GroupCard key={g.id} group={g} showCategory />)}
            {filteredGroups.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-400">
                <FBIcon size={40} />
                <p className="mt-3">לא נמצאו קבוצות מתאימות</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, showCategory }: { group: Group; showCategory?: boolean }) {
  return (
    <a
      href={group.externalUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors" style={{ background: "#1877F215" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy truncate">{group.title}</p>
        {showCategory && group.category && (
          <p className="text-xs text-slate-400 mt-0.5">{group.category}</p>
        )}
      </div>
      <ExternalLink size={13} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
    </a>
  );
}
