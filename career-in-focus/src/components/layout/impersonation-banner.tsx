import { stopImpersonating } from "@/lib/actions/admin";
import { LogOut } from "lucide-react";

interface Props {
  /** Display name of the user the admin is currently viewing as. */
  asName: string;
}

/**
 * Sticky banner shown at the top of every page when an admin is
 * impersonating a member. Clicking "חזור" calls the server action
 * that clears the impersonation cookie and bounces back to /admin/users.
 *
 * Server component (no client JS) — uses a plain form action.
 */
export function ImpersonationBanner({ asName }: Props) {
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <p className="font-bold">
          ⚠️ מצב צפייה כמשתמש: <span className="font-black">{asName}</span>
          <span className="hidden sm:inline opacity-80 font-normal"> · את רואה את המערכת בדיוק כפי שהוא רואה אותה</span>
        </p>
        <form action={stopImpersonating}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-white text-amber-700 hover:bg-amber-50 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={13} />
            חזור לאדמין
          </button>
        </form>
      </div>
    </div>
  );
}
