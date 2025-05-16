import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/landing-page";

export default async function Home() {
  const session = await getServerSession(authOptions);
  console.log("session: ", session);

  if (session) {
    redirect("/gallery");
  }

  return <LandingPage />;
}
