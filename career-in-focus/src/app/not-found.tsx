// Branded 404 page. Auto-mounts when Next.js can't find a matching route
// or when something calls `notFound()`. Keeps the user on the site instead
// of bouncing them off a default error screen.

import Link from "next/link";
import { Search, Home, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-cream flex flex-col items-center justify-center px-4"
      dir="rtl"
    >
      <Link href="/" className="flex items-center gap-2 mb-8" aria-label="חזרה לדף הבית">
        <div className="w-9 h-9 bg-teal rounded-xl flex items-center justify-center text-white font-bold">
          ק
        </div>
        <span className="font-bold text-navy text-xl">קריירה בפוקוס</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-md border border-black/5 p-8 text-center">
        <div className="text-6xl font-black text-teal mb-2">404</div>
        <h1 className="text-xl font-black text-navy mb-2">הדף לא נמצא</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          הקישור שניסית לפתוח לא קיים או שהוא הוסר.
          אולי תמצאי מה שחיפשת באחד מהמקומות האלה:
        </p>

        <div className="space-y-2 mb-6 text-right">
          <Link
            href="/dashboard"
            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-teal/5 rounded-xl group transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Home size={16} className="text-teal" />
              הדף הראשי
            </span>
            <ChevronLeft size={14} className="text-gray-400 group-hover:text-teal" />
          </Link>
          <Link
            href="/jobs"
            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-teal/5 rounded-xl group transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-navy">
              <Search size={16} className="text-teal" />
              משרות פתוחות
            </span>
            <ChevronLeft size={14} className="text-gray-400 group-hover:text-teal" />
          </Link>
          <Link
            href="/coaching"
            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-teal/5 rounded-xl group transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-navy">
              💬 המאמן האישי שלך
            </span>
            <ChevronLeft size={14} className="text-gray-400 group-hover:text-teal" />
          </Link>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-teal hover:underline"
        >
          ← חזרה לדף הנחיתה
        </Link>
      </div>
    </div>
  );
}
