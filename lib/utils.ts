import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
}

export function isValidFileType(file: File, type: "image" | "video"): boolean {
  if (type === "image") {
    return file.type.startsWith("image/");
  } else if (type === "video") {
    return file.type.startsWith("video/");
  }
  return false;
}

export function isValidFileSize(file: File, type: "image" | "video"): boolean {
  if (type === "image") {
    // 1MB limit for images
    return file.size <= 1024 * 1024;
  } else if (type === "video") {
    // 10MB limit for videos (approx. 30 seconds)
    return file.size <= 10 * 1024 * 1024;
  }
  return false;
}

export const DEFAULT_CATEGORIES = [
  "Beach",
  "Family",
  "Friends",
  "Travel",
  "Food",
  "Nature",
  "Party",
  "Pets",
  "Sports",
  "Other",
];
