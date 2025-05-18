import { type NextRequest, NextResponse } from "next/server";
import { getMediaItems } from "@/lib/media";
import { analyzeMediaWithGemini, bufferToBase64 } from "@/lib/geminiVision";
import { createUserContent } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

export async function POST(request: NextRequest) {
  try {
    const { mediaId, suggestionType, userId } = await request.json();

    if (!mediaId || !suggestionType || !userId) {
      return NextResponse.json(
        { message: "Missing mediaId, suggestionType, or userId" },
        { status: 400 }
      );
    }

    const validSuggestionTypes = ["gps", "mood", "poetic"];
    if (!validSuggestionTypes.includes(suggestionType)) {
      return NextResponse.json(
        { message: "Invalid suggestionType" },
        { status: 400 }
      );
    }

    // Retrieve media item details
    const mediaItems = getMediaItems(userId);
    const mediaItem = mediaItems.find((item) => item.id === mediaId);

    if (!mediaItem) {
      return NextResponse.json(
        { message: "Media item not found" },
        { status: 404 }
      );
    }

    // Handle GPS suggestion separately
    if (suggestionType === "gps") {
      if (mediaItem.type !== "image" || !mediaItem.gpsData) {
        return NextResponse.json(
          { message: "No GPS data found for this media item." },
          { status: 404 }
        );
      }

      const { latitude, longitude } = mediaItem.gpsData;

      const promptText = `Given the GPS coordinates Latitude: ${latitude}, Longitude: ${longitude}, provide a short, human-readable description of the likely location. For example, "Near Eiffel Tower, Paris" or "In Central Park, New York City". Keep it concise.`;

      // No need to read the file for GPS enrichment if we already stored the coordinates
      // However, analyzeMediaWithGemini expects content including the media file.
      // We will need to read the file buffer anyway to pass it to the model.

      // Construct file path
      const mediaFilePath = path.join(
        process.cwd(),
        "uploads",
        mediaItem.filename
      );

      // Read file content
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

      const base64Data = bufferToBase64(fileBuffer);

      const mediaInputPart = {
        inlineData: {
          data: base64Data,
          mimeType: mediaItem.mimeType,
        },
      };

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
                "AI analysis returned empty response for GPS enrichment.",
            },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { suggestion: aiResultText.trim() },
          { status: 200 }
        );
      } catch (aiError) {
        console.error("Gemini analysis error for GPS enrichment:", aiError);
        return NextResponse.json(
          { message: "Failed to get AI GPS suggestion" },
          { status: 500 }
        );
      }
    }

    // Handle mood and poetic suggestions (existing logic)

    // Construct file path
    const mediaFilePath = path.join(
      process.cwd(),
      "uploads",
      mediaItem.filename
    );

    // Read file content
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(mediaFilePath);
    } catch (readError) {
      console.error("Error reading media file:", readError);
      return NextResponse.json(
        { message: "Failed to read media file" },
        { status: 500 }
      );
    }

    const base64Data = bufferToBase64(fileBuffer);

    const mediaInputPart = {
      inlineData: {
        data: base64Data,
        mimeType: mediaItem.mimeType,
      },
    };

    let promptText = "";
    if (suggestionType === "mood") {
      promptText = `Analyze the mood in this ${mediaItem.type} and summarize it in one short sentence.`;
    } else if (suggestionType === "poetic") {
      promptText = `Generate a short poetic caption for this ${mediaItem.type}.`;
    }

    const contents = createUserContent([mediaInputPart, { text: promptText }]);

    try {
      const aiResultText = await analyzeMediaWithGemini(contents);

      // Gemini should return plain text for these prompts, not JSON
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
  } catch (error) {
    console.error("API handler error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
