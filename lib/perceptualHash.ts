import imghash from "imghash";

export async function getImagePhash(buffer: Buffer): Promise<string> {
  // imghash.hashRaw returns a promise with the hash string
  return await imghash.hashRaw(buffer, 16, "hex"); // 16x16 hash, hex format
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
