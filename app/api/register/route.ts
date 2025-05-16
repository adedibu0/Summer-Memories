import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/user";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Check if required fields are provided
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create new user
    const user = await createUser(name, email, password);
    // const user = await createUser({ name, email, password });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
