import { auth } from "@/auth";
import { getCoachingSession } from "@/lib/actions/coaching";
import { CoachingChat } from "./coaching-chat";
import { Sparkles } from "lucide-react";

export default async function CoachingPage() {
  const session = await auth();
  const { messages, lastAnalysis } = await getCoachingSession();
  const firstName = session!.user.name?.split(" ")[0] ?? "חבר";

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="relative bg-navy rounded-3xl px-7 py-6 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-l from-teal/20 to-transparent" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-teal/10 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-teal rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Sparkles size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">המאמן האישי שלך</h1>
            <p className="text-white/50 text-sm mt-0.5">
              שלום {firstName} — אני כאן לנתח את מצבך ולעזור לך להתקדם
            </p>
          </div>
        </div>
      </div>

      {/* Last analysis card */}
      {lastAnalysis && (
        <div className="bg-teal-pale border border-teal/20 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-teal mb-1">📊 ניתוח אחרון</p>
          <p className="text-sm text-navy/80 leading-relaxed">{lastAnalysis}</p>
        </div>
      )}

      {/* Chat */}
      <CoachingChat initialMessages={messages} />
    </div>
  );
}
