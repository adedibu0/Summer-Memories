import fs from "fs";
import path from "path";
import ExifReader from "exifreader";
import { analyzeMediaWithGemini } from "@/lib/geminiVision";
import { createUserContent, Type } from "@google/genai";
import calculatePhash from "sharp-phash";

const mediaDir = path.join(process.cwd(), "data", "media");

// Define interface for the expected AI suggestion format
export interface SuggestedGroup {
  name: string;
  items: string[];
}

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
  mimeType: string;
  categories: string[];
  description: string;
  createdAt: string;
  journal?: string;
  phash?: string;
  gpsData?: { latitude: number; longitude: number };
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

      // Calculate perceptual hash for images
      let phash: string | undefined;
      if (type === "image") {
        try {
          phash = await calculatePhash(buffer);
          console.log(`Calculated pHash for ${filename}:`, phash);
        } catch (phashError) {
          console.error(`Error calculating pHash for ${filename}:`, phashError);
          // Continue without pHash if calculation fails
        }
      }

      // Extract GPS data for images using exifreader
      let gpsData: { latitude: number; longitude: number } | undefined;
      if (type === "image") {
        try {
          const tags = await ExifReader.load(buffer);

          // Check for GPS tags
          if (tags.GPSLatitude && tags.GPSLongitude) {
            // exifreader provides .description for the value and .description for the reference
            const latitude =
              parseFloat(tags.GPSLatitude.description) *
              (tags.GPSLatitudeRef?.description === "S" ? -1 : 1);
            const longitude =
              parseFloat(tags.GPSLongitude.description) *
              (tags.GPSLongitudeRef?.description === "W" ? -1 : 1);

            if (!isNaN(latitude) && !isNaN(longitude)) {
              gpsData = {
                latitude,
                longitude,
              };
              console.log(`Extracted GPS data for ${filename}:`, gpsData);
            }
          }
        } catch (exifError) {
          console.error(
            `Error extracting EXIF data for ${filename}:`,
            exifError
          );
          // Continue without GPS data if extraction fails
        }
      }

      // Create media item
      const newItem: MediaItem = {
        id,
        userId,
        filename,
        type,
        mimeType: file.type,
        categories,
        description,
        createdAt: new Date().toISOString(),
        ...(phash ? { phash } : {}),
        ...(gpsData ? { gpsData } : {}),
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

  // Construct the prompt
  const promptText = `Analyze these media items and suggest logical groupings based on their descriptions and categories. Return the result as a JSON array of objects, each with a "name" for the group and "items" array containing the IDs of media items that belong in that group. Here are the media items: ${JSON.stringify(
    mediaDescriptions
  )}`;

  // Define the response schema for grouping suggestions
  const groupingSchema = {
    type: Type.ARRAY, // Expecting an array
    items: {
      type: Type.OBJECT, // Each item in the array is an object
      properties: {
        name: {
          type: Type.STRING, // Group name is a string
        },
        items: {
          type: Type.ARRAY, // The items field is an array
          items: {
            type: Type.STRING, // Each item ID is a string
          },
        },
      },
      required: ["name", "items"], // Both name and items are required in each group object
    },
  };

  const contents = createUserContent([{ text: promptText }]);

  try {
    // Call Gemini for suggestions with the specific schema
    const aiResultText = await analyzeMediaWithGemini(contents, {
      responseMimeType: "application/json",
      responseSchema: groupingSchema,
    });

    if (!aiResultText) {
      console.error(
        "Gemini analysis returned empty response for suggestGroups."
      );
      return [];
    }

    // The prompt asks for JSON output, attempt to parse it
    const suggestedGroups: SuggestedGroup[] = JSON.parse(aiResultText);

    // Basic validation of the parsed structure
    if (
      Array.isArray(suggestedGroups) &&
      suggestedGroups.every(
        (group) =>
          typeof group === "object" &&
          typeof group.name === "string" &&
          Array.isArray(group.items) &&
          group.items.every((item) => typeof item === "string")
      )
    ) {
      return suggestedGroups;
    } else {
      console.error(
        "Gemini response for suggestGroups did not match expected JSON schema:",
        aiResultText
      );
      return [];
    }
  } catch (error) {
    console.error("Error suggesting groups with Gemini:", error);
    return [];
  }
};
