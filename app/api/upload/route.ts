import { type NextRequest, NextResponse } from "next/server";
import { getMediaItems } from "@/lib/media";
import { analyzeMediaWithGemini, bufferToBase64 } from "@/lib/geminiVision";
import { getImagePhash, hammingDistance } from "@/lib/perceptualHash";
import { fetchCategories } from "@/lib/utils";
import { createUserContent } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const type = formData.get("type") as "image" | "video";
    if (!file || !userId || !type) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }
    const categories = await fetchCategories(userId);
    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = bufferToBase64(buffer);

    // Duplicate detection for images
    let phash: string | undefined = undefined;
    if (type === "image") {
      try {
        phash = await getImagePhash(buffer);
        // Check for duplicates
        const existing = getMediaItems(userId).filter(
          (item) => item.type === "image" && item.phash
        );
        const threshold = 10; // Hamming distance threshold for near-duplicate
        for (const item of existing) {
          if (item.phash && hammingDistance(phash, item.phash) <= threshold) {
            return NextResponse.json(
              {
                message: "Duplicate image detected. Upload canceled.",
                duplicateOf: item.id,
              },
              { status: 409 }
            );
          }
        }
      } catch (e) {
        console.error("pHash error:", e);
      }
    }

    // Call Gemini Vision for labels and caption
    let aiLabels: string[] = [];
    let aiCaption = "";

    const promptText = `Analyze this ${type} and provide a short description and relevant categories from the following list: ${JSON.stringify(
      categories.name
    )}. Please output the result as a JSON object with two keys: "description" (string) and "categories" (array of strings from the list provided). For example: { "description": "A photo of...", "categories": ["Nature", "Travel"] }. If no categories are relevant, the "categories" array should be empty.`;

    const mediaInputPart = {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    };

    const contents = createUserContent([mediaInputPart, { text: promptText }]);

    try {
      const aiResultText = await analyzeMediaWithGemini(contents);
      console.log("Gemini analysis result:", aiResultText);

      // Attempt to parse the JSON response from Gemini
      if (aiResultText) {
        try {
          // Clean the string by removing markdown code block formatting if present
          let cleanResultText = aiResultText.trim();
          if (cleanResultText.startsWith("```json")) {
            cleanResultText = cleanResultText.substring("```json\n".length);
          }
          if (cleanResultText.endsWith("```")) {
            cleanResultText = cleanResultText.substring(
              0,
              cleanResultText.length - "```".length
            );
          }

          const resultJson = JSON.parse(cleanResultText);
          if (resultJson && typeof resultJson === "object") {
            if (typeof resultJson.description === "string") {
              aiCaption = resultJson.description;
            }
            if (Array.isArray(resultJson.categories)) {
              aiLabels = resultJson.categories.filter(
                (category: string) =>
                  typeof category === "string" &&
                  categories.name.includes(category)
              );
            }
          }
        } catch (parseError) {
          console.error("Failed to parse Gemini JSON response:", parseError);
          // Fallback: if JSON parsing fails, treat the whole response as the caption
          aiCaption = aiResultText;
          aiLabels = []; // No labels if parsing fails
        }
      } else {
        // Handle cases where aiResultText is null or undefined
        aiCaption = "";
        aiLabels = [];
      }
    } catch (e) {
      console.error("Gemini Vision error:", e);
      // Set aiCaption and aiLabels to default values on error
      aiCaption = "";
      aiLabels = [];
    }

    return NextResponse.json(
      {
        message: "File processed for suggestions",
        suggestions: {
          categories: aiLabels,
          description: aiCaption,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
