import { type NextRequest, NextResponse } from "next/server";
import { getMediaItems } from "@/lib/media";
import { analyzeMediaWithGemini, bufferToBase64 } from "@/lib/geminiVision";
import { createUserContent } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { icons } from "lucide-react";
export async function POST(request: NextRequest) {
  try {
    const { mediaId, suggestionType, userId } = await request.json();

    if (!mediaId || !suggestionType || !userId) {
      return NextResponse.json(
        { message: "Missing mediaId, suggestionType, or userId" },
        { status: 400 }
      );
    }

    const validSuggestionTypes = ["mood", "poetic", "special-day"];
    if (!validSuggestionTypes.includes(suggestionType)) {
      return NextResponse.json(
        { message: "Invalid suggestionType" },
        { status: 400 }
      );
    }

    // Retrieve media item details
    const mediaItems = await getMediaItems(userId);
    const mediaItem = mediaItems.find((item) => item.id === mediaId);

    if (!mediaItem) {
      return NextResponse.json(
        { message: "Media item not found" },
        { status: 404 }
      );
    }

    // --- Read file content and determine mimeType (common logic) ---
    const mediaFilePath = path.join(
      process.cwd(),
      "data",
      "media",
      userId,
      mediaItem.filename
    );

    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(mediaFilePath);
    } catch (readError) {
      console.error("Error reading media file:", readError);
      return NextResponse.json(
        { message: "Failed to read media file for analysis" },
        { status: 500 }
      );
    }

    // Determine the correct mimeType for the API call (prioritize supported types, fallback to stored or infer)
    let itemMimeType = mediaItem.mimeType;
    const fileExtension = path.extname(mediaItem.filename).toLowerCase();
    const genericMimeTypes = ["application/octet-stream"]; // Add other generic types if needed

    // *** Strict check for video/mp4 to override potentially incorrect stored mimeType ***
    if (mediaItem.type === "video" && fileExtension === ".mp4") {
      itemMimeType = "video/mp4";
    } else if (
      mediaItem.type === "image" &&
      (fileExtension === ".jpg" || fileExtension === ".jpeg")
    ) {
      itemMimeType = "image/jpeg"; // Also strictly set common image types
    } else if (mediaItem.type === "image" && fileExtension === ".png") {
      itemMimeType = "image/png";
    } else if (mediaItem.type === "image" && fileExtension === ".gif") {
      itemMimeType = "image/gif";
    } else if (genericMimeTypes.includes(itemMimeType) || !itemMimeType) {
      // Fallback: if stored mime is generic/missing and not caught by strict checks, infer from extension
      if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
        itemMimeType = "image/jpeg";
      } else if (fileExtension === ".png") {
        itemMimeType = "image/png";
      } else if (fileExtension === ".gif") {
        itemMimeType = "image/gif";
      } else if (fileExtension === ".mp4") {
        itemMimeType = "video/mp4";
      }
      // Add other image/video extensions here if needed for inference
    }

    // Basic check if the *final* determined mimeType is supported by Gemini
    const supportedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
    ]; // Add other supported types if needed
    if (!itemMimeType || !supportedMimeTypes.includes(itemMimeType)) {
      console.error(
        `Unsupported mimeType for Gemini API: ${itemMimeType} for file ${mediaItem.filename}`
      );
      return NextResponse.json(
        {
          message: `Unsupported media type for AI analysis: ${itemMimeType}. Please upload supported media types.`,
        },
        { status: 400 }
      );
    }

    const base64Data = bufferToBase64(fileBuffer);

    const mediaInputPart = {
      inlineData: {
        data: base64Data,
        mimeType: itemMimeType,
      },
    };

    // --- Logic for Special Day suggestion ---
    if (suggestionType === "special-day") {
      const createdAtDate = new Date(mediaItem.createdAt);
      const formattedDate = createdAtDate.toLocaleDateString();

      const promptText = `Examine the content of this ${mediaItem.type} created on ${formattedDate}. Does it appear to capture a special day, holiday, or celebration? If so, describe what kind of event it might be. If not, state that it doesn't seem to be related to a special day.`;

      const contents = createUserContent([
        mediaInputPart,
        { text: promptText },
      ]);

      try {
        const aiResultText = await analyzeMediaWithGemini(contents);

        if (!aiResultText) {
          return NextResponse.json(
            {
              message:
                "AI analysis returned empty response for special day check.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { suggestion: aiResultText.trim() },
          { status: 200 }
        );
      } catch (aiError) {
        console.error("Gemini analysis error for special day check:", aiError);
        return NextResponse.json(
          { message: "Failed to get AI special day suggestion" },
          { status: 500 }
        );
      }
    }

    // --- Logic for Mood and Poetic suggestions ---
    if (suggestionType === "mood" || suggestionType === "poetic") {
      let promptText = "";
      if (suggestionType === "mood") {
        promptText = `Analyze the mood in this ${mediaItem.type} and summarize it in one short sentence.`;
      } else if (suggestionType === "poetic") {
        promptText = `Generate a short poetic caption for this ${mediaItem.type}.`;
      }

      const contents = createUserContent([
        mediaInputPart,
        { text: promptText },
      ]);

      try {
        const aiResultText = await analyzeMediaWithGemini(contents);

        // Gemini should return plain text for these prompts
        if (!aiResultText) {
          return NextResponse.json(
            { message: "AI analysis returned empty response" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { suggestion: aiResultText.trim() },
          { status: 200 }
        );
      } catch (aiError) {
        console.error("Gemini analysis error:", aiError);
        return NextResponse.json(
          { message: "Failed to get AI suggestion" },
          { status: 500 }
        );
      }
    }

    // If suggestionType is not gps, mood, or poetic, this point won't be reached due to initial validation
  } catch (error) {
    console.error("API handler error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
