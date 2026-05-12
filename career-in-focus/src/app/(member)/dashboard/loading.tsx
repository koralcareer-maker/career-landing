// Auto-shown by Next.js App Router during the server render of /dashboard.
// Matches the real layout's silhouette so the page doesn't "flash empty"
// while data loads.
//
// Pure visual — no data, no client-side JS. animate-pulse provides the
// shimmer; the rest is sized to mirror the actual cards on /dashboard.

export default function DashboardLoading() {
  return (
    <div className="min-h-screen relative" aria-busy="true" aria-label="טוענת דשבורד">
      {/* Same ambient blobs the real dashboard uses, dimmed */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute top-96 -left-24 w-80 h-80 rounded-full bg-[#FFB088]/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Greeting card */}
        <div className="bg-white/80 rounded-3xl shadow-sm border border-black/5 p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded-lg w-48" />
              <div className="h-3 bg-gray-100 rounded w-64" />
            </div>
          </div>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/80 rounded-2xl border border-black/5 p-5 animate-pulse"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3" />
              <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Two-column main area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left col — wider */}
          <div className="lg:col-span-2 space-y-6">
            {/* Large content card */}
            <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-40 mb-5" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
              </div>
            </div>

            {/* Job match list */}
            <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-44 mb-5" />
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col — narrower (events / progress / etc.) */}
          <div className="space-y-6">
            <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-5" />
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl bg-gray-50">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-36 mb-5" />
              <div className="h-32 bg-gray-100 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
