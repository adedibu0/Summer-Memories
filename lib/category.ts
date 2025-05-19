import fs from "fs";
import path from "path";
import { DEFAULT_CATEGORIES } from "@/lib/utils";

const categoriesFilePath = path.join(process.cwd(), "data", "categories.json");

// Ensure the data directory and categories file exist
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(categoriesFilePath)) {
    fs.writeFileSync(categoriesFilePath, JSON.stringify([]));
  }
};

export type Category = {
  id: string;
  name: string;
  userId: string;
};

export const getCategories = (userId: string): Category[] => {
  ensureDataDir();
  const categoriesData = fs.readFileSync(categoriesFilePath, "utf-8");
  const allCategories: Category[] = JSON.parse(categoriesData);
  return allCategories.filter((cat) => cat.userId === userId);
};

export const addCategory = (name: string, userId: string): Category => {
  const categories = getAllCategories();
  const id = Date.now().toString();
  const newCategory: Category = { id, name, userId };
  categories.push(newCategory);
  fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 2));
  return newCategory;
};

export const updateCategory = (
  id: string,
  name: string,
  userId: string
): Category | undefined => {
  const categories = getAllCategories();
  const idx = categories.findIndex(
    (cat) => cat.id === id && cat.userId === userId
  );
  if (idx === -1) return undefined;
  categories[idx].name = name;
  fs.writeFileSync(categoriesFilePath, JSON.stringify(categories, null, 2));
  return categories[idx];
};

export const deleteCategory = (id: string, userId: string): boolean => {
  const categories = getAllCategories();
  const newCategories = categories.filter(
    (cat) => !(cat.id === id && cat.userId === userId)
  );
  if (newCategories.length === categories.length) return false;
  fs.writeFileSync(categoriesFilePath, JSON.stringify(newCategories, null, 2));
  return true;
};

export const initializeDefaultCategoriesForUser = (userId: string) => {
  const categories = getAllCategories();
  const userHasCategories = categories.some((cat) => cat.userId === userId);
  if (userHasCategories) return; // Don't re-initialize
  const newCategories = DEFAULT_CATEGORIES.map((name) => ({
    id: `${userId}-${name}`,
    name,
    userId,
  }));
  const updated = [...categories, ...newCategories];
  fs.writeFileSync(categoriesFilePath, JSON.stringify(updated, null, 2));
};

// Helper to get all categories (not filtered)
const getAllCategories = (): Category[] => {
  ensureDataDir();
  const categoriesData = fs.readFileSync(categoriesFilePath, "utf-8");
  return JSON.parse(categoriesData);
};
