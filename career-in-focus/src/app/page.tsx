import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LandingPage from "./(public)/landing";

export default async function Home() {
  const session = await auth();
  if (session?.user?.accessStatus === "ACTIVE") {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
