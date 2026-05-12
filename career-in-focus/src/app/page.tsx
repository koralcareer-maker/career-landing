import { redirect } from "next/navigation";
import { auth } from "@/auth";

// The platform app (app.careerinfocus.co.il) has only two real entry
// states: a logged-in member with an active subscription goes to the
// dashboard, and anyone else goes to the login form. The marketing /
// signup flow lives on the public site (careerinfocus.co.il) — that's
// where new visitors learn about the plans before reaching the app, so
// we don't need a marketing landing here.
export default async function Home() {
  const session = await auth();
  if (session?.user?.accessStatus === "ACTIVE") {
    redirect("/dashboard");
  }
  redirect("/login");
}
