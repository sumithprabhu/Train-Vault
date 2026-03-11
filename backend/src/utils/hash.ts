import { createHash } from "crypto";

/**
 * Generate provenance hash for reproducibility (SHA256).
 * Inputs: datasetCID, trainingConfigHash, trainingCodeHash.
 */
export function generateProvenanceHash(
  datasetCID: string,
  trainingConfigHash: string,
  trainingCodeHash: string
): string {
  const payload = [datasetCID, trainingConfigHash, trainingCodeHash].join("|");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function computeHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function computeHashString(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
