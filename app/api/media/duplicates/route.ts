import { NextRequest, NextResponse } from "next/server";
import { getMediaItems, MediaItem } from "@/lib/media";
import { analyzeMediaWithGemini } from "@/lib/geminiVision";
import { createUserContent, Type } from "@google/genai";

// Function to calculate Hamming distance between two hashes
function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  // Assuming hashes are of the same length (e.g., 16 hex characters for 64-bit hash)
  for (let i = 0; i < hash1.length; i++) {
    // Simple character comparison for demonstration; bitwise comparison is more accurate for binary hashes
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

const DUPLICATE_THRESHOLD = 10; // Threshold for considering images as duplicates

interface DuplicateRecommendation {
  group: string[]; // The IDs of the media items in this duplicate group
  recommendation: string; // Text recommendation from the AI (e.g., "Keep item X, delete item Y and Z")
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const mediaItems = await getMediaItems(userId);

    const imageItemsWithHash = mediaItems.filter(
      (item) => item.type === "image" && item.phash
    );

    const potentialDuplicates: string[][] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < imageItemsWithHash.length; i++) {
      if (processedIndices.has(i)) {
        continue;
      }

      const currentItem = imageItemsWithHash[i];
      const currentDuplicates = [currentItem.id];

      for (let j = i + 1; j < imageItemsWithHash.length; j++) {
        const compareItem = imageItemsWithHash[j];

        // Calculate Hamming distance
        // Note: For a true bitwise Hamming distance on hex strings,
        // you'd convert hex to binary and compare bit by bit.
        const distance = hammingDistance(
          currentItem.phash!,
          compareItem.phash!
        );

        if (distance <= DUPLICATE_THRESHOLD) {
          currentDuplicates.push(compareItem.id);
          processedIndices.add(j);
        }
      }

      if (currentDuplicates.length > 1) {
        potentialDuplicates.push(currentDuplicates);
      }
      processedIndices.add(i);
    }

    // If no potential duplicates found, return early
    if (potentialDuplicates.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // Prepare data and prompt for AI analysis
    const duplicateGroupDetails = potentialDuplicates.map((group) => {
      const itemsInGroup = mediaItems.filter((item) => group.includes(item.id));
      return {
        group: group,
        items: itemsInGroup.map((item) => ({
          id: item.id,
          filename: item.filename,
          description: item.description,
          createdAt: item.createdAt,
        })),
      };
    });

    const promptText = `Analyze these groups of potentially duplicate media items (images) and provide recommendations on which ones to keep or delete within each group. Consider filenames and creation dates when making recommendations. Return the result as a JSON array of objects, each with the 'group' (array of item IDs) and a 'recommendation' string explaining your suggestion for that group.

Here are the potential duplicate groups:
${JSON.stringify(duplicateGroupDetails, null, 2)}

Return ONLY the JSON array.`;

    const contents = createUserContent([{ text: promptText }]);

    // Define the response schema for recommendations
    const recommendationsSchema = {
      type: Type.ARRAY, // Expecting an array
      items: {
        type: Type.OBJECT, // Each item in the array is an object
        properties: {
          group: {
            type: Type.ARRAY, // The group field is an array of strings (IDs)
            items: { type: Type.STRING },
          },
          recommendation: {
            type: Type.STRING, // The recommendation is a string
          },
        },
        required: ["group", "recommendation"], // Both fields are required
      },
    };

    // Call Gemini for recommendations with the specific schema
    const aiResultText = await analyzeMediaWithGemini(contents, {
      responseMimeType: "application/json",
      responseSchema: recommendationsSchema,
    });

    let recommendations: DuplicateRecommendation[] = [];
    if (aiResultText) {
      try {
        recommendations = JSON.parse(aiResultText);
        // Basic validation of the parsed structure
        if (
          !Array.isArray(recommendations) ||
          !recommendations.every(
            (rec) =>
              typeof rec === "object" &&
              Array.isArray(rec.group) &&
              rec.group.every((id) => typeof id === "string") &&
              typeof rec.recommendation === "string"
          )
        ) {
          console.error(
            "Gemini response did not match expected JSON schema:",
            aiResultText
          );
          recommendations = []; // Reset recommendations if validation fails
        }
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        recommendations = []; // Reset recommendations on parse error
      }
    }

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error in duplicate detection endpoint:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
