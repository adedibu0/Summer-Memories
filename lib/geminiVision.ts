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

// Define a basic interface for the response configuration
interface GeminiResponseConfig {
  responseMimeType?: string;
  responseSchema?: {
    // This structure depends on the Gemini API documentation for schema objects
    type: Type; // Using the imported Type enum
    properties?: { [key: string]: any }; // Loosely type properties for now
    items?: any; // Loosely type items for array schemas
    required?: string[];
    // Add other schema properties as needed based on API docs
  };
  // Add other config properties if needed, e.g., safetySettings
}

export async function analyzeMediaWithGemini(
  contents: Content,
  config?: GeminiResponseConfig
) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Using a multimodal model like gemini-2.0-flash or gemini-1.5-flash
      contents: contents,
      config: config,
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
