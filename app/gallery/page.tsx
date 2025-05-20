import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GalleryLayout from "@/components/gallery-layout";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return <GalleryLayout userId={session.user.id} />;
}
