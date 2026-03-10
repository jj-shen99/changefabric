#!/usr/bin/env npx tsx
/**
 * CLI tool to encrypt credentials for the .env file.
 *
 * Usage:
 *   npx tsx scripts/encrypt-credentials.ts                  # Interactive: encrypt all sensitive .env vars
 *   npx tsx scripts/encrypt-credentials.ts <value>          # Encrypt a single value
 *   npx tsx scripts/encrypt-credentials.ts --decrypt <enc>  # Decrypt a single value
 *   npx tsx scripts/encrypt-credentials.ts --env            # Read .env, encrypt sensitive vars, write .env
 *
 * Set ENCRYPTION_KEY env var (64-char hex) before running.
 * If not set, a default dev key is used (insecure for production).
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:";

// Env vars that contain secrets and should be encrypted
const SENSITIVE_VARS = [
  "NEXTAUTH_SECRET",
  "SNOW_USER",
  "SNOW_PASSWORD",
  "SNOW_INSTANCE",
  "GIT_USER",
  "GIT_PASSWORD",
  "DATABASE_URL",
];

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + packed.toString("base64");
}

function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
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

function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

// ── Main ──

const args = process.argv.slice(2);

if (args[0] === "--decrypt" && args[1]) {
  console.log(decrypt(args[1]));
  process.exit(0);
}

if (args[0] === "--env") {
  // Encrypt all sensitive vars in .env file
  const envPath = resolve(__dirname, "..", ".env");
  let content: string;
  try {
    content = readFileSync(envPath, "utf8");
  } catch {
    console.error("Error: .env file not found at", envPath);
    process.exit(1);
  }

  const lines = content.split("\n");
  let changed = 0;

  const newLines = lines.map((line) => {
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith("#")) return line;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return line;

    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!SENSITIVE_VARS.includes(key)) return line;
    if (isEncrypted(value)) {
      console.log(`  ✓ ${key} — already encrypted`);
      return line;
    }
    if (!value || value.includes("your-") || value.includes("change-")) {
      console.log(`  ⊘ ${key} — skipped (placeholder value)`);
      return line;
    }

    const encrypted = encrypt(value);
    changed++;
    console.log(`  🔒 ${key} — encrypted`);
    return `${key}="${encrypted}"`;
  });

  if (changed > 0) {
    writeFileSync(envPath, newLines.join("\n"), "utf8");
    console.log(`\n✅ Encrypted ${changed} credential(s) in .env`);
  } else {
    console.log("\n✅ No changes needed — all sensitive vars are already encrypted or empty.");
  }

  process.exit(0);
}

if (args[0] && !args[0].startsWith("--")) {
  // Encrypt a single value
  const encrypted = encrypt(args[0]);
  console.log(encrypted);
  process.exit(0);
}

// Default: show help
console.log(`
Credential Encryption Tool
═══════════════════════════

Usage:
  npx tsx scripts/encrypt-credentials.ts <plaintext>      Encrypt a single value
  npx tsx scripts/encrypt-credentials.ts --decrypt <enc>  Decrypt an encrypted value
  npx tsx scripts/encrypt-credentials.ts --env            Encrypt all sensitive vars in .env

Sensitive env vars that will be encrypted:
${SENSITIVE_VARS.map((v) => `  • ${v}`).join("\n")}

Set ENCRYPTION_KEY in your environment for a custom master key (64-char hex).
If not set, a default development key is used.

Example:
  export ENCRYPTION_KEY=$(openssl rand -hex 32)
  npx tsx scripts/encrypt-credentials.ts --env
`);
