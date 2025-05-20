import { type NextRequest, NextResponse } from "next/server";
// import fs from "fs";
// import path from "path";
import { getMediaItems } from "@/lib/media";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const { id: mediaId } = await params;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const mediaItems = await getMediaItems(userId);
    const mediaItem = mediaItems.find(
      (item: { id: string }) => item.id === mediaId
    );

    if (!mediaItem) {
      return NextResponse.json(
        { message: "Media item not found" },
        { status: 404 }
      );
    }

    // Use the Cloudinary URL instead of the local file path
    if (!mediaItem.url) {
      return NextResponse.json(
        { message: "Media item URL not found" },
        { status: 404 }
      );
    }

    // Redirect to the Cloudinary URL
    return NextResponse.redirect(mediaItem.url);
  } catch (error) {
    console.error("Error serving media file:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
