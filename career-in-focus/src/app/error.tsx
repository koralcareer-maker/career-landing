"use client";

// Global error boundary — catches any unhandled error in any route segment.
// Next.js auto-mounts this when a server or client component throws and
// nothing closer to the error caught it. Branded so users don't bounce
// off a stack trace.

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the browser console so Coral / devs can grab the digest from
    // Vercel's runtime logs. The digest is the bridge between the user's
    // screen and the server-side stack trace.
    console.error("[unhandled error]", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div
      className="min-h-screen bg-cream flex flex-col items-center justify-center px-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-md border border-black/5 p-8 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={30} className="text-orange-500" />
        </div>

        <h1 className="text-2xl font-black text-navy mb-2">
          תקלה זמנית במערכת
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          קרתה תקלה לא צפויה. רענון הדף לרוב פותר את זה.
          אם הבעיה ממשיכה — אפשר לפנות לקורל בוואטסאפ.
        </p>

        {error.digest && (
          <div className="bg-gray-50 rounded-xl px-4 py-2 mb-6">
            <p className="text-[11px] text-gray-400 font-mono" dir="ltr">
              ref: {error.digest}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-teal hover:bg-teal-dark text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={16} />
            לרענון הדף
          </button>

          <Link
            href="/dashboard"
            className="w-full bg-white hover:bg-gray-50 text-navy font-semibold py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 transition-colors"
          >
            <Home size={16} />
            חזרה לדף הראשי
          </Link>
        </div>

        <a
          href="https://wa.me/972535777005?text=%D7%94%D7%99%D7%99%2C%20%D7%A7%D7%99%D7%91%D7%9C%D7%AA%D7%99%20%D7%A9%D7%92%D7%99%D7%90%D7%94%20%D7%91%D7%90%D7%AA%D7%A8"
          className="inline-block mt-6 text-xs text-gray-400 hover:text-teal hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          לדווח לקורל בוואטסאפ ←
        </a>
      </div>
    </div>
  );
}
