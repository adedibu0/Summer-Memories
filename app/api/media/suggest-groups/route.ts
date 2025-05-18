import { type NextRequest, NextResponse } from "next/server";
import { suggestGroups } from "@/lib/media";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const suggestedGroups = await suggestGroups(userId);

    return NextResponse.json(suggestedGroups, { status: 200 });
  } catch (error) {
    console.error("Error in suggest-groups API route:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
