/**
 * AES-256-GCM credential encryption/decryption utility.
 *
 * Encrypted values are stored in .env with the prefix "enc:" followed by
 * a base64 string containing iv + authTag + ciphertext.
 *
 * The master key is derived from the ENCRYPTION_KEY env var (or defaults
 * to a machine-specific key for development). In production, ENCRYPTION_KEY
 * must be set to a secure 64-char hex string (32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:";

/** Derive a 32-byte key from the ENCRYPTION_KEY env var */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a plaintext string → "enc:<base64>" */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (16) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + packed.toString("base64");
}

/** Decrypt an "enc:<base64>" string → plaintext. Returns as-is if not encrypted. */
export function decrypt(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;

  const key = getKey();
  const packed = Buffer.from(value.slice(PREFIX.length), "base64");

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Read an env var and decrypt it if it has the enc: prefix */
export function getSecret(envVar: string, fallback: string = ""): string {
  const raw = process.env[envVar] || fallback;
  return decrypt(raw);
}

/** Check if a value is already encrypted */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}
