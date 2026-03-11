import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 32;

/**
 * Derive a 32-byte key from secret (for AES-256).
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN);
}

/**
 * Encrypt a dataset buffer with AES-256-GCM.
 * Format: salt (32) + iv (16) + authTag (16) + ciphertext.
 */
export function encryptDataset(buffer: Buffer, key: string): Buffer {
  const salt = randomBytes(SALT_LEN);
  const keyBuf = deriveKey(key, salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, keyBuf, iv);
  const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, authTag, enc]);
}

/**
 * Decrypt a buffer produced by encryptDataset.
 */
export function decryptDataset(ciphertext: Buffer, key: string): Buffer {
  const salt = ciphertext.subarray(0, SALT_LEN);
  const iv = ciphertext.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const authTag = ciphertext.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + 16);
  const enc = ciphertext.subarray(SALT_LEN + IV_LEN + 16);
  const keyBuf = deriveKey(key, salt);
  const decipher = createDecipheriv(ALGO, keyBuf, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
