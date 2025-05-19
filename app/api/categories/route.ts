import { NextRequest, NextResponse } from "next/server";
import { getCategories, addCategory } from "@/lib/category";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }
    const categories = getCategories(userId);
    return NextResponse.json(categories);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, userId } = await req.json();
    if (!name || typeof name !== "string" || !userId) {
      return NextResponse.json(
        { error: "Name and userId are required" },
        { status: 400 }
      );
    }
    const category = addCategory(name, userId);
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to add category" },
      { status: 500 }
    );
  }
}
