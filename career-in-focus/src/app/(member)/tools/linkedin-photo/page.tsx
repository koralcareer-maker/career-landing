import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listUserHistory } from "@/lib/blob";
import { LinkedInPhotoClient } from "./linkedin-photo-client";

export const metadata = { title: "מחולל תמונת לינקדאין | קריירה בפוקוס" };
export const dynamic = "force-dynamic";

export default async function LinkedInPhotoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Load past generations from Vercel Blob so they appear immediately
  // on first paint (no "loading history…" flash). If Blob isn't
  // configured yet (no token), this returns an empty array gracefully.
  let initialHistory: Awaited<ReturnType<typeof listUserHistory>> = [];
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      initialHistory = await listUserHistory(session.user.id, 12);
    } catch (e) {
      console.error("[linkedin-photo/page] failed to load history:", e);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <LinkedInPhotoClient userId={session.user.id} initialHistory={initialHistory} />
    </div>
  );
}
