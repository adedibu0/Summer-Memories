import { type NextRequest, NextResponse } from "next/server"
import { saveMediaItem } from "@/lib/media"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const type = formData.get("type") as "image" | "video"
    const categoriesJson = formData.get("categories") as string
    const description = formData.get("description") as string

    if (!file || !userId || !type || !categoriesJson) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const categories = JSON.parse(categoriesJson)

    const mediaItem = await saveMediaItem(userId, file, type, categories, description)

    return NextResponse.json({ message: "Media uploaded successfully", mediaItem }, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
