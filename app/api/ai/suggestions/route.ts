import { type NextRequest, NextResponse } from "next/server"
import { suggestGroups } from "@/lib/media"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 })
    }

    const suggestions = await suggestGroups(userId)

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating AI suggestions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
