import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LinkedInPhotoClient } from "./linkedin-photo-client";

export const metadata = { title: "מחולל תמונת לינקדאין | קריירה בפוקוס" };

export default async function LinkedInPhotoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="p-4 sm:p-6">
      <LinkedInPhotoClient />
    </div>
  );
}
