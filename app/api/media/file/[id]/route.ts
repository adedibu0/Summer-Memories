import { type NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getMediaItems } from "@/lib/media";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const mediaId = await params.id;
    const mediaItems = getMediaItems(userId);
    const mediaItem = mediaItems.find((item) => item.id === mediaId);

    if (!mediaItem) {
      return NextResponse.json(
        { message: "Media item not found" },
        { status: 404 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "data",
      "media",
      userId,
      mediaItem.filename
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType = mediaItem.type === "image" ? "image/jpeg" : "video/mp4";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error serving media file:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
