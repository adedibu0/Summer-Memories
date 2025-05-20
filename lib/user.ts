import fs from "fs";
import path from "path";
import { hash } from "bcryptjs";
import { initializeDefaultCategoriesForUser } from "@/lib/category";
import { connectToDatabase } from "./mongodb";
import { User, IUser } from "@/models/User";

const usersFilePath = path.join(process.cwd(), "data", "users.json");

// Ensure the data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([]));
  }
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export const getUserByEmail = async (email: string) => {
  await connectToDatabase();
  return User.findOne({ email });
};

export const createUser = async ({
  name,
  email,
  password,
  isGoogleSignup = false,
}: {
  name: string;
  email: string;
  password?: string;
  isGoogleSignup?: boolean;
}): Promise<IUser> => {
  await connectToDatabase();

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  let hashedPassword;
  if (isGoogleSignup) {
    // Generate a random password for Google signups
    const randomPassword = Math.random().toString(36).slice(-8);
    hashedPassword = await hash(randomPassword, 10);
  } else if (password) {
    hashedPassword = await hash(password, 10);
  } else {
    throw new Error("Password is required for non-Google signups");
  }

  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // Initialize default categories for this user (assuming it works with the new user ID)
  // You might need to adjust initializeDefaultCategoriesForUser if it expects a different user ID format
  await initializeDefaultCategoriesForUser(newUser._id.toString());

  return newUser;
};
