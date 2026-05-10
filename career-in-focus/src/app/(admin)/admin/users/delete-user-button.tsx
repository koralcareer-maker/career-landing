"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  userName: string;
  action: (id: string) => Promise<void>;
}

/**
 * Two-step delete: first click arms the button (turns red), second click
 * within ~5s confirms the deletion. Prevents accidental wipe while
 * staying inline (no modal, no full page reload).
 */
export function DeleteUserButton({ userId, userName, action }: Props) {
  const [armed, setArmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (!armed) {
      setArmed(true);
      // Auto-disarm after 5 seconds so the button doesn't sit "live"
      // forever waiting for the user to come back.
      setTimeout(() => setArmed(false), 5000);
      return;
    }
    startTransition(async () => {
      try {
        await action(userId);
      } catch (e) {
        alert(e instanceof Error ? e.message : "מחיקה נכשלה");
        setArmed(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title={armed ? `לחיצה נוספת תמחק את ${userName}` : `מחיקת ${userName}`}
      aria-label={armed ? `אישור מחיקת ${userName}` : `מחיקת ${userName}`}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        armed
          ? "bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-300"
          : "bg-red-50 text-red-500 hover:bg-red-100"
      }`}
    >
      {isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : armed ? (
        <span className="text-[10px] font-black px-1">לאשר</span>
      ) : (
        <Trash2 size={13} />
      )}
    </button>
  );
}
