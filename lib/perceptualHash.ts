import sharp from "sharp";

export async function getImagePhash(buffer: Buffer): Promise<string> {
  const size = 16; // Use a 16x16 grid for hashing
  let data;

  try {
    // Resize, convert to grayscale, and get raw pixel data
    data = await sharp(buffer)
      .resize(size, size)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    console.error("Error processing image with sharp:", error);
    throw new Error("Failed to process image for hashing");
  }

  const pixels = data.data;
  const width = data.info.width;
  const height = data.info.height;
  const totalPixels = width * height;

  // Calculate the average pixel value
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) {
    sum += pixels[i];
  }
  const average = sum / totalPixels;

  // Create the hash based on pixel values relative to the average
  let hash = "";
  for (let i = 0; i < pixels.length; i++) {
    hash += pixels[i] >= average ? "1" : "0";
  }

  // Convert binary hash to hexadecimal
  // We'll process 4 bits (1 hex digit) at a time
  let hexHash = "";
  for (let i = 0; i < hash.length; i += 4) {
    const nibble = hash.substr(i, 4);
    hexHash += parseInt(nibble, 2).toString(16);
  }

  return hexHash;
}

// Helper to compute Hamming distance between two hex hashes
export function hammingDistance(hash1: string, hash2: string): number {
  // Convert hex to binary string
  const bin1 = BigInt("0x" + hash1)
    .toString(2)
    .padStart(hash1.length * 4, "0");
  const bin2 = BigInt("0x" + hash2)
    .toString(2)
    .padStart(hash2.length * 4, "0");
  // Count differing bits
  let dist = 0;
  for (let i = 0; i < bin1.length; i++) {
    if (bin1[i] !== bin2[i]) dist++;
  }
  return dist;
}
