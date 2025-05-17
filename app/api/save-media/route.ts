import { type NextRequest, NextResponse } from "next/server";
import { saveMediaItem } from "@/lib/media";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as "image" | "video";
    const categoriesJson = formData.get("categories") as string;
    const description = formData.get("description") as string;
    // We might also need the phash for images if we want to store it here
    // const phash = formData.get("phash") as string | undefined;

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

    // Re-read the file buffer if necessary, or if the file object is complete
    // In this approach, we are re-sending the file from the frontend.
    // An alternative could be to store the file temporarily after the initial upload
    // and pass a temporary ID here.

    // Note: If duplicate detection was done in the first step, we might not need to re-calculate or pass phash.
    // However, for simplicity in this endpoint, we'll assume we have all needed data.

    const mediaItem = await saveMediaItem(
      userId,
      file,
      type,
      categories,
      description
      // phash // Include phash if available and needed here
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
