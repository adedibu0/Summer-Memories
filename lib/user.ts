import fs from "fs";
import path from "path";
import { hash } from "bcryptjs";
import { initializeDefaultCategoriesForUser } from "@/lib/category";

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

export const getUsers = (): User[] => {
  ensureDataDir();
  const usersData = fs.readFileSync(usersFilePath, "utf-8");
  return JSON.parse(usersData);
};

export const getUserByEmail = (email: string): User | undefined => {
  const users = getUsers();
  return users.find((user) => user.email === email);
};

export const createUser = async (
  name: string,
  email: string,
  password: string
): Promise<User> => {
  const users = getUsers();

  // Check if user already exists
  if (users.some((user) => user.email === email)) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hash(password, 10);

  const newUser: User = {
    id: Date.now().toString(),
    name,
    email,
    password: hashedPassword,
  };

  users.push(newUser);
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

  // Initialize default categories for this user
  initializeDefaultCategoriesForUser(newUser.id);

  return newUser;
};
// import { connectToDatabase } from "./mongodb";
// import { User, IUser } from "@/models/User";

// export async function createUser({ name, email, password }: { name: string; email: string; password: string; }) {
//   await connectToDatabase();
//   const user = new User({ name, email, password });
//   await user.save();
//   return user;
// }

// export async function getUserByEmail(email: string) {
//   await connectToDatabase();
//   return User.findOne({ email });
// }
