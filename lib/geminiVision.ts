import {
  GoogleGenAI,
  Part,
  createUserContent,
  Content,
  Type,
} from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface ImageInput {
  base64: string;
  mimeType: string;
}

export async function analyzeMediaWithGemini(contents: Content) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using a multimodal model like gemini-2.0-flash or gemini-1.5-flash
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
            },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ["description", "categories"],
        },
      },
    });

    // The response text will contain the model's analysis of all images based on the prompt
    const textResponse = response.text;

    return textResponse;
  } catch (error) {
    console.error("Error calling Gemini API with multiple images:", error);
    throw new Error("Failed to analyze images with Gemini API");
  }
}

// Helper to convert a buffer to base64
export function bufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

// Note: The previous analyzeImageWithGemini function for a single image is replaced.
// You can adapt this new function to handle a single image by passing an array with one element.
