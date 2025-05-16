import fs from "fs";
import path from "path";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const mediaDir = path.join(process.cwd(), "data", "media");

// Ensure the media directory exists
const ensureMediaDir = (userId: string) => {
  const userMediaDir = path.join(mediaDir, userId);
  if (!fs.existsSync(userMediaDir)) {
    fs.mkdirSync(userMediaDir, { recursive: true });
  }

  const mediaDataFile = path.join(userMediaDir, "media.json");
  if (!fs.existsSync(mediaDataFile)) {
    fs.writeFileSync(mediaDataFile, JSON.stringify([]));
  }

  return userMediaDir;
};

export type MediaItem = {
  id: string;
  userId: string;
  filename: string;
  type: "image" | "video";
  categories: string[];
  description: string;
  createdAt: string;
  journal?: string;
  phash?: string;
};

export const getMediaItems = (userId: string): MediaItem[] => {
  ensureMediaDir(userId);
  const mediaDataFile = path.join(mediaDir, userId, "media.json");
  const mediaData = fs.readFileSync(mediaDataFile, "utf-8");
  return JSON.parse(mediaData);
};

export const saveMediaItem = (
  userId: string,
  file: File,
  type: "image" | "video",
  categories: string[],
  description: string,
  phash?: string
): Promise<MediaItem> => {
  return new Promise(async (resolve, reject) => {
    try {
      const userMediaDir = ensureMediaDir(userId);
      const mediaItems = getMediaItems(userId);

      const id = Date.now().toString();
      const filename = `${id}-${file.name}`;
      const filePath = path.join(userMediaDir, filename);

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Create media item
      const newItem: MediaItem = {
        id,
        userId,
        filename,
        type,
        categories,
        description,
        createdAt: new Date().toISOString(),
        ...(phash ? { phash } : {}),
      };

      mediaItems.push(newItem);

      const mediaDataFile = path.join(mediaDir, userId, "media.json");
      fs.writeFileSync(mediaDataFile, JSON.stringify(mediaItems, null, 2));

      resolve(newItem);
    } catch (error) {
      reject(error);
    }
  });
};

export const updateMediaItem = (
  userId: string,
  mediaId: string,
  updates: Partial<MediaItem>
): MediaItem => {
  const mediaItems = getMediaItems(userId);
  const index = mediaItems.findIndex((item) => item.id === mediaId);

  if (index === -1) {
    throw new Error("Media item not found");
  }

  const updatedItem = { ...mediaItems[index], ...updates };
  mediaItems[index] = updatedItem;

  const mediaDataFile = path.join(mediaDir, userId, "media.json");
  fs.writeFileSync(mediaDataFile, JSON.stringify(mediaItems, null, 2));

  return updatedItem;
};

export const deleteMediaItem = (userId: string, mediaId: string): void => {
  const mediaItems = getMediaItems(userId);
  const itemToDelete = mediaItems.find((item) => item.id === mediaId);

  if (!itemToDelete) {
    throw new Error("Media item not found");
  }

  // Delete file
  const filePath = path.join(mediaDir, userId, itemToDelete.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Update media.json
  const updatedItems = mediaItems.filter((item) => item.id !== mediaId);
  const mediaDataFile = path.join(mediaDir, userId, "media.json");
  fs.writeFileSync(mediaDataFile, JSON.stringify(updatedItems, null, 2));
};

export const getMediaItemsByCategory = (
  userId: string,
  category: string
): MediaItem[] => {
  const mediaItems = getMediaItems(userId);
  return mediaItems.filter(
    (item) => item.categories.includes(category) || category === "all"
  );
};

export const suggestGroups = async (
  userId: string
): Promise<{ name: string; items: string[] }[]> => {
  const mediaItems = getMediaItems(userId);

  if (mediaItems.length < 5) {
    return [];
  }

  // Prepare data for AI analysis
  const mediaDescriptions = mediaItems.map((item) => ({
    id: item.id,
    description: item.description,
    type: item.type,
    categories: item.categories,
  }));

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Analyze these media items and suggest logical groupings based on their descriptions and categories. Return the result as a JSON array of objects, each with a "name" for the group and "items" array containing the IDs of media items that belong in that group. Here are the media items: ${JSON.stringify(
        mediaDescriptions
      )}`,
    });

    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting groups:", error);
    return [];
  }
};
