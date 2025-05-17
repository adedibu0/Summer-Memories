import { GoogleGenAI, Part } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export async function analyzeImageWithGemini({
  imageBase64,
}: {
  imageBase64: string;
}) {
  // Gemini API expects base64-encoded image content as a Part
  const imagePart: Part = {
    inlineData: {
      data: imageBase64,
      mimeType: "image/jpeg", // Assuming JPEG. You might need to infer actual mime type.
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using gemini-pro-vision model for image understanding
      contents: [
        imagePart,
        { text: "Describe this image and list key objects." },
      ], // Adding a text prompt to get a description and objects
    });

    // Process the response to extract relevant information
    const textResponse = response.text;

    // Simple approach: assume the model will list objects/labels in the text.
    // More advanced parsing would be needed for structured output (e.g., JSON) if requested.

    // For simplicity, let's just return the generated text as the caption and try to infer labels.
    // A real application might need more sophisticated parsing or prompt engineering.
    const caption = textResponse;
    const labels: string[] = []; // Gemini API text response doesn't provide structured labels like Vision API by default

    // Note: Extracting structured labels and bounding boxes would require specific prompt engineering
    // to ask the model to output in a parseable format (e.g., JSON) and potentially using
    // function calling if available for structured outputs with this model.
    // The current implementation provides a text description.

    return { labels, caption };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze image with Gemini API");
  }
}

// Helper to convert a buffer to base64
export function bufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}
