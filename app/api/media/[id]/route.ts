import { type NextRequest, NextResponse } from "next/server"
import { updateMediaItem, deleteMediaItem } from "@/lib/media"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const mediaId = params.id
    const updates = await request.json()

    const updatedItem = updateMediaItem(userId, mediaId, updates)

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating media:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const mediaId = params.id

    deleteMediaItem(userId, mediaId)

    return NextResponse.json({ message: "Media item deleted successfully" })
  } catch (error) {
    console.error("Error deleting media:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
