import { type NextRequest, NextResponse } from "next/server"
import { getMediaItemsByCategory } from "@/lib/media"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const category = searchParams.get("category") || "all"

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const mediaItems = getMediaItemsByCategory(userId, category)

    return NextResponse.json(mediaItems)
  } catch (error) {
    console.error("Error fetching media:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
