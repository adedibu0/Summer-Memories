import { type NextRequest, NextResponse } from "next/server";
import { getMediaItems } from "@/lib/media";
import { analyzeMediaWithGemini, bufferToBase64 } from "@/lib/geminiVision";
import { createUserContent } from "@google/genai";

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

    // --- Fetch file content from Cloudinary URL (common logic) ---
    let fileBuffer: Buffer;
    try {
      const response = await fetch(mediaItem.url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch media from URL: ${response.statusText}`
        );
      }
      // Get the array buffer and convert to Node.js Buffer
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch (fetchError) {
      console.error("Error fetching media from Cloudinary URL:", fetchError);
      return NextResponse.json(
        { message: "Failed to fetch media file for analysis" },
        { status: 500 }
      );
    }

    // Determine mimeType (keep this logic, maybe simplify based on reliable data from DB)
    // The mimeType is now stored in mediaItem.mimeType from MongoDB.
    // We should primarily trust this, but keep validation if needed.
    let itemMimeType = mediaItem.mimeType;

    // Basic check if the mimeType from DB is supported by Gemini
    const supportedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "image/webp", // Add webp as it's common
    ];
    // Simplified check: use the mimeType from the database
    if (!itemMimeType || !supportedMimeTypes.includes(itemMimeType)) {
      console.error(
        `Unsupported mimeType for Gemini API from DB: ${itemMimeType} for file ${mediaItem.filename}`
      );
      return NextResponse.json(
        {
          message: `Unsupported media type for AI analysis: ${itemMimeType}. Please upload supported media types.`, // Use itemMimeType here
        },
        { status: 400 }
      );
    }
    // No need for complex path/extension logic if mimeType from DB is reliable
    // const fileExtension = path.extname(mediaItem.filename).toLowerCase();
    // const genericMimeTypes = ["application/octet-stream"];
    // ... remove all the old mimeType inference logic ...

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
      const descClause = mediaItem.description
        ? ` and its description ("${mediaItem.description}")`
        : "";

      const promptText = `Review this ${mediaItem.type}${descClause} from ${formattedDate}:
    
    1. If it shows a celebration (birthday, anniversary, festival, holiday), identify the event and mention ${formattedDate}.
    2. Otherwise, if it captures a pleasant outing or personal moment, briefly describe it and note ${formattedDate}.
    3. If neither applies, state that this item from ${formattedDate} doesn’t depict any special event or notable moment.`;

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
        promptText = mediaItem.description
          ? `Analyze the mood in this ${mediaItem.type}with this description: ${mediaItem.description} and summarize it in one short sentence.`
          : `Analyze the mood in this ${mediaItem.type} and summarize it in one short sentence.`;
      } else if (suggestionType === "poetic") {
        promptText = mediaItem.description
          ? `Generate a short poetic caption for this ${mediaItem.type} with this description: ${mediaItem.description}.`
          : `Generate a short poetic caption for this ${mediaItem.type}.`;
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
