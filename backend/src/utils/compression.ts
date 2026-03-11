import { gzipSync, gunzipSync } from "zlib";

/** Minimum size required by Synapse SDK for upload. We only store compressed when result meets this. */
export const MIN_UPLOAD_SIZE = 127;

/**
 * Compress buffer with gzip. Returns compressed buffer if smaller than original and >= MIN_UPLOAD_SIZE; otherwise original.
 */
export function compressForStorage(buffer: Buffer): { data: Buffer; compressed: boolean } {
  if (buffer.length === 0) return { data: buffer, compressed: false };
  const compressed = gzipSync(buffer, { level: 6 });
  if (
    compressed.length < buffer.length &&
    compressed.length >= MIN_UPLOAD_SIZE
  ) {
    console.log(
      "[compression] Applied gzip: original=%d bytes, compressed=%d bytes",
      buffer.length,
      compressed.length
    );
    return { data: compressed, compressed: true };
  }
  return { data: buffer, compressed: false };
}

/**
 * Decompress a gzip-compressed buffer. Use when dataset was stored with compressed: true.
 */
export function decompressFromStorage(buffer: Buffer): Buffer {
  return gunzipSync(buffer);
}
