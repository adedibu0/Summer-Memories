import fs from "fs";
import path from "path";
import ExifReader from "exifreader";
import { analyzeMediaWithGemini } from "@/lib/geminiVision";
import { createUserContent, Type } from "@google/genai";
import calculatePhash from "sharp-phash";
import { v2 as cloudinary } from "cloudinary";
import mongoose, { Document, Schema } from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// MongoDB Connection
const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the DATABASE_URL environment variable inside .env.local"
  );
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = {
    conn: null,
    promise: null,
  };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const mediaDir = path.join(process.cwd(), "data", "media");

// Define interface for the expected AI suggestion format
export interface SuggestedGroup {
  name: string;
  items: string[];
}

export interface MediaItem extends Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  userId: string;
  filename: string;
  type: "image" | "video";
  mimeType: string;
  categories: (string | { id: string; name: string; userId: string })[];
  description: string;
  createdAt: string;
  journal?: string;
  phash?: string;
  gpsData?: { latitude: number; longitude: number };
  url: string;
}

// Mongoose Schema for MediaItem
const MediaItemSchema = new Schema<MediaItem>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    filename: { type: String, required: true },
    type: { type: String, required: true },
    mimeType: { type: String, required: true },
    categories: { type: [Schema.Types.Mixed], required: true }, // Use Mixed for flexible types
    description: { type: String, required: true },
    createdAt: { type: String, required: true },
    journal: { type: String },
    phash: { type: String },
    gpsData: { type: { latitude: Number, longitude: Number } },
    url: { type: String, required: true },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Mongoose Model for MediaItem
const MediaItemModel =
  mongoose.models.MediaItem ||
  mongoose.model<MediaItem>("MediaItem", MediaItemSchema);

export const getMediaItems = async (userId: string): Promise<MediaItem[]> => {
  await connectToDatabase();
  const mediaItems = await MediaItemModel.find({ userId }).lean();
  if (!mediaItems) {
    throw new Error("No media items found");
  }
  return mediaItems.map((item: any) => ({
    id: item._id.toString(),
    userId: item.userId,
    filename: item.filename,
    type: item.type,
    mimeType: item.mimeType,
    categories: item.categories,
    description: item.description,
    createdAt: item.createdAt,
    journal: item.journal,
    phash: item.phash,
    gpsData: item.gpsData,
    url: item.url,
  })) as MediaItem[];
};

export const saveMediaItem = async (
  userId: string,
  file: File,
  type: "image" | "video",
  categories: string[],
  description: string
): Promise<MediaItem> => {
  try {
    await connectToDatabase(); // Ensure DB connection

    const buffer = Buffer.from(await file.arrayBuffer());
    let phash: string | undefined;
    let gpsData: { latitude: number; longitude: number } | undefined;

    // Calculate perceptual hash for images BEFORE uploading
    if (type === "image") {
      try {
        phash = await calculatePhash(buffer);
        console.log(`Calculated pHash for ${file.name}:`, phash);
      } catch (phashError) {
        console.error(`Error calculating pHash for ${file.name}:`, phashError);
      }
    }

    // Extract GPS data for images BEFORE uploading
    if (type === "image") {
      try {
        const tags = await ExifReader.load(buffer);

        if (tags.GPSLatitude && tags.GPSLongitude) {
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
          }
        }
      } catch (exifError) {
        console.error(
          `Error extracting EXIF data for ${file.name}:`,
          exifError
        );
      }
    }

    // Upload file to Cloudinary - AWAITING the result
    const uploadResult = await cloudinary.uploader.upload(
      `data:${file.type};base64,${buffer.toString("base64")}`,
      { resource_type: type === "video" ? "video" : "image" }
    );

    if (!uploadResult || !uploadResult.secure_url || !uploadResult.public_id) {
      throw new Error("Cloudinary upload failed");
    }

    // Create and save media item in MongoDB with all data
    const newItem = new MediaItemModel({
      id: uploadResult.public_id, // Use Cloudinary public_id as id
      userId,
      filename: file.name,
      type,
      mimeType: file.type,
      categories,
      description,
      createdAt: new Date().toISOString(),
      url: uploadResult.secure_url,
      ...(phash ? { phash } : {}),
      ...(gpsData ? { gpsData } : {}),
    });

    const savedItem = await newItem.save(); // Save to MongoDB

    return savedItem;
  } catch (error) {
    console.error("Error saving media item:", error);
    throw error; // Re-throw the error after logging
  }
};

export const updateMediaItem = async (
  userId: string,
  mediaId: string,
  updates: Partial<MediaItem>
): Promise<MediaItem> => {
  await connectToDatabase(); // Ensure DB connection
  const updatedItem = await MediaItemModel.findOneAndUpdate(
    { userId, _id: mediaId },
    updates,
    { new: true }
  );

  if (!updatedItem) {
    throw new Error("Media item not found");
  }

  return updatedItem;
};

export const deleteMediaItem = async (
  userId: string,
  mediaId: string
): Promise<void> => {
  await connectToDatabase(); // Ensure DB connection
  const deletedItem = await MediaItemModel.findOneAndDelete({
    userId,
    id: mediaId,
  });

  if (!deletedItem) {
    throw new Error("Media item not found");
  }

  // Optionally, delete the file from Cloudinary as well
  try {
    // Extract the public_id from the deleted item's url or id field
    const publicId = deletedItem.id; // Assuming id is the Cloudinary public_id
    if (publicId) {
      // Determine resource type (image/video) from mimeType or type field if available
      // For simplicity, assuming 'image' for now, you might need to adjust this
      const resourceType = deletedItem.type === "video" ? "video" : "image";
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      console.log(`Deleted item ${publicId} from Cloudinary`);
    }
  } catch (error) {
    console.error(`Error deleting item from Cloudinary:`, error);
    // Continue even if Cloudinary deletion fails, the MongoDB record is gone.
  }
};

export const getMediaItemsByCategory = async (
  userId: string,
  category: string
): Promise<MediaItem[]> => {
  await connectToDatabase();

  if (category === "all") {
    const items = await MediaItemModel.find({ userId }).lean();
    return items.map((item: any) => ({
      id: item._id.toString(),
      userId: item.userId,
      filename: item.filename,
      type: item.type,
      mimeType: item.mimeType,
      categories: item.categories,
      description: item.description,
      createdAt: item.createdAt,
      journal: item.journal,
      phash: item.phash,
      gpsData: item.gpsData,
      url: item.url,
    })) as MediaItem[];
  } else {
    // Need to handle both string and object categories in the query
    const items = await MediaItemModel.find({
      userId,
      $or: [
        { categories: category }, // Check for string category
        { "categories.name": category }, // Check for object category name
      ],
    }).lean();
    return items.map((item: any) => ({
      id: item._id.toString(),
      userId: item.userId,
      filename: item.filename,
      type: item.type,
      mimeType: item.mimeType,
      categories: item.categories,
      description: item.description,
      createdAt: item.createdAt,
      journal: item.journal,
      phash: item.phash,
      gpsData: item.gpsData,
      url: item.url,
    })) as MediaItem[];
  }
};

export const suggestGroups = async (
  userId: string
): Promise<{ name: string; items: string[] }[]> => {
  const mediaItems = await getMediaItems(userId);

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

export { connectToDatabase, MediaItemModel };
