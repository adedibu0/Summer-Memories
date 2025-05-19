import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GalleryLayout from "@/components/gallery-layout";
import {
  getCategories,
  initializeDefaultCategoriesForUser,
} from "@/lib/category";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  } else {
    const { id } = session?.user;
    const categories = getCategories(id);
    if (categories.length === 0) {
      initializeDefaultCategoriesForUser(id);
    }
  }

  return <GalleryLayout userId={session.user.id} />;
}
