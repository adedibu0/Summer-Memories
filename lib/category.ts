import fs from "fs";
import path from "path";
import { DEFAULT_CATEGORIES } from "@/lib/utils";
import { connectToDatabase } from "./mongodb";
import { Category, ICategory } from "@/models/Category";
import mongoose from "mongoose";

export type Category = {
  id: string;
  name: string;
  userId: string;
};

export const getCategories = async (userId: string): Promise<ICategory[]> => {
  await connectToDatabase();
  // Assuming userId passed is a string, convert to ObjectId for querying
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return Category.find({ userId: userObjectId });
};

export const addCategory = async (
  name: string,
  userId: string
): Promise<ICategory> => {
  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const newCategory = new Category({
    name,
    userId: userObjectId,
  });
  await newCategory.save();
  return newCategory;
};

export const updateCategory = async (
  id: string,
  name: string,
  userId: string
): Promise<ICategory | null> => {
  await connectToDatabase();
  // Assuming id and userId are strings, convert to ObjectId for querying
  const categoryObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const updatedCategory = await Category.findOneAndUpdate(
    { _id: categoryObjectId, userId: userObjectId },
    { name: name },
    { new: true }
  );
  return updatedCategory;
};

export const deleteCategory = async (
  id: string,
  userId: string
): Promise<boolean> => {
  await connectToDatabase();
  // Assuming id and userId are strings, convert to ObjectId for querying
  const categoryObjectId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const result = await Category.deleteOne({
    _id: categoryObjectId,
    userId: userObjectId,
  });
  return result.deletedCount === 1;
};

export const initializeDefaultCategoriesForUser = async (userId: string) => {
  await connectToDatabase();
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const userHasCategories = await Category.exists({ userId: userObjectId });
  if (userHasCategories) return; // Don't re-initialize

  const defaultCategories = DEFAULT_CATEGORIES.map((name) => ({
    name,
    userId: userObjectId,
  }));

  await Category.insertMany(defaultCategories);
};

// Helper to get all categories (not filtered)
// This helper might not be needed anymore, depending on usage.
// If needed, it should also query MongoDB.
const getAllCategories = async (): Promise<ICategory[]> => {
  await connectToDatabase();
  return Category.find({});
};
