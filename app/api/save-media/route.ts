import { type NextRequest, NextResponse } from "next/server";
import { saveMediaItem, MediaItemModel } from "@/lib/media";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as "image" | "video";
    const categoriesJson = formData.get("categories") as string;
    const description = formData.get("description") as string;
    // Receive phash from the frontend for images
    const phash = formData.get("phash") as string | undefined;

    if (!file || !userId || !type || !categoriesJson || !description) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    let categories: string[] = [];
    try {
      categories = JSON.parse(categoriesJson);
    } catch {
      return NextResponse.json(
        { message: "Invalid categories format" },
        { status: 400 }
      );
    }

    // If no duplicate warning, proceed with saving
    const mediaItem = await saveMediaItem(
      userId,
      file,
      type,
      categories,
      description
      // phash is now handled within saveMediaItem where the buffer is available
    );

    return NextResponse.json(
      { message: "Media saved successfully", mediaItem },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save media error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
