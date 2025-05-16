const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

export async function analyzeImageWithGemini({
  imageBase64,
}: {
  imageBase64: string;
}) {
  // Gemini Vision expects base64-encoded image content
  const body = {
    requests: [
      {
        image: { content: imageBase64 },
        features: [
          { type: "LABEL_DETECTION", maxResults: 10 },
          { type: "WEB_DETECTION", maxResults: 5 },
          { type: "TEXT_DETECTION", maxResults: 1 },
          { type: "IMAGE_PROPERTIES", maxResults: 1 },
          { type: "OBJECT_LOCALIZATION", maxResults: 5 },
          { type: "LANDMARK_DETECTION", maxResults: 2 },
          { type: "LOGO_DETECTION", maxResults: 2 },
          { type: "SAFE_SEARCH_DETECTION", maxResults: 1 },
        ],
      },
    ],
  };

  const res = await fetch(`${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Failed to call Gemini Vision API");
  }
  const data = await res.json();
  const response = data.responses[0];

  // Extract labels
  const labels = (response.labelAnnotations || []).map(
    (l: any) => l.description
  );

  // Try to get a caption from webDetection or best guess label
  let caption = "";
  if (
    response.webDetection &&
    response.webDetection.bestGuessLabels &&
    response.webDetection.bestGuessLabels.length > 0
  ) {
    caption = response.webDetection.bestGuessLabels[0].label;
  } else if (labels.length > 0) {
    caption = `Photo of ${labels.slice(0, 2).join(" and ")}`;
  }

  return { labels, caption };
}

// Helper to convert a buffer to base64
export function bufferToBase64(buffer: Buffer) {
  return buffer.toString("base64");
}
