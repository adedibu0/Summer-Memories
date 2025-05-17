import { type NextRequest, NextResponse } from "next/server";
import { saveMediaItem, getMediaItems } from "@/lib/media";
import { analyzeImageWithGemini, bufferToBase64 } from "@/lib/geminiVision";
import { getImagePhash, hammingDistance } from "@/lib/perceptualHash";

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

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = bufferToBase64(buffer);

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
    if (type === "image") {
      try {
        const aiResult = await analyzeImageWithGemini({ imageBase64 });
        console.log("ai result", aiResult);
        aiLabels = aiResult.labels || [];
        aiCaption = aiResult.caption || "";
      } catch (e) {
        console.error("Gemini Vision error:", e);
      }
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
