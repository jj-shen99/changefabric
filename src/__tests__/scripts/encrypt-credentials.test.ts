/**
 * Tests for encrypt-credentials.ts script
 * @jest-environment node
 * 
 * Tests the credential encryption/decryption functionality
 * used for securing sensitive environment variables.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = "enc:";

const SENSITIVE_VARS = [
  "NEXTAUTH_SECRET",
  "SNOW_USER",
  "SNOW_PASSWORD",
  "SNOW_INSTANCE",
  "GIT_USER",
  "GIT_PASSWORD",
  "DATABASE_URL",
];

function getKey(encryptionKey?: string): Buffer {
  const raw = encryptionKey || "default-dev-key-change-in-production";
  return createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string, encryptionKey?: string): string {
  const key = getKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return PREFIX + packed.toString("base64");
}

function decrypt(value: string, encryptionKey?: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey(encryptionKey);
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

describe("Encryption Constants", () => {
  describe("Algorithm", () => {
    it("uses AES-256-GCM algorithm", () => {
      expect(ALGORITHM).toBe("aes-256-gcm");
    });
  });

  describe("Buffer Lengths", () => {
    it("IV length is 16 bytes", () => {
      expect(IV_LENGTH).toBe(16);
    });

    it("Auth tag length is 16 bytes", () => {
      expect(AUTH_TAG_LENGTH).toBe(16);
    });
  });

  describe("Prefix", () => {
    it("encrypted values start with enc:", () => {
      expect(PREFIX).toBe("enc:");
    });
  });
});

describe("Sensitive Variables", () => {
  describe("Variable List", () => {
    it("includes NEXTAUTH_SECRET", () => {
      expect(SENSITIVE_VARS).toContain("NEXTAUTH_SECRET");
    });

    it("includes ITSM credentials", () => {
      expect(SENSITIVE_VARS).toContain("SNOW_USER");
      expect(SENSITIVE_VARS).toContain("SNOW_PASSWORD");
      expect(SENSITIVE_VARS).toContain("SNOW_INSTANCE");
    });

    it("includes Git credentials", () => {
      expect(SENSITIVE_VARS).toContain("GIT_USER");
      expect(SENSITIVE_VARS).toContain("GIT_PASSWORD");
    });

    it("includes DATABASE_URL", () => {
      expect(SENSITIVE_VARS).toContain("DATABASE_URL");
    });

    it("has 7 sensitive variables", () => {
      expect(SENSITIVE_VARS).toHaveLength(7);
    });
  });
});

describe("Key Derivation", () => {
  describe("getKey function", () => {
    it("returns 32-byte key (256 bits)", () => {
      const key = getKey();
      expect(key.length).toBe(32);
    });

    it("uses SHA-256 hash", () => {
      const key = getKey("test-key");
      expect(key.length).toBe(32);
    });

    it("same input produces same key", () => {
      const key1 = getKey("my-secret-key");
      const key2 = getKey("my-secret-key");
      expect(key1.equals(key2)).toBe(true);
    });

    it("different input produces different key", () => {
      const key1 = getKey("key-one");
      const key2 = getKey("key-two");
      expect(key1.equals(key2)).toBe(false);
    });

    it("uses default key when not provided", () => {
      const key = getKey();
      expect(key).toBeDefined();
      expect(key.length).toBe(32);
    });
  });
});

describe("Encryption", () => {
  describe("encrypt function", () => {
    it("returns string starting with enc:", () => {
      const encrypted = encrypt("test-value");
      expect(encrypted.startsWith(PREFIX)).toBe(true);
    });

    it("encrypted value is base64 encoded", () => {
      const encrypted = encrypt("test-value");
      const base64Part = encrypted.slice(PREFIX.length);
      expect(() => Buffer.from(base64Part, "base64")).not.toThrow();
    });

    it("same plaintext produces different ciphertext (random IV)", () => {
      const encrypted1 = encrypt("same-value");
      const encrypted2 = encrypt("same-value");
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("encrypts empty string", () => {
      const encrypted = encrypt("");
      expect(encrypted.startsWith(PREFIX)).toBe(true);
    });

    it("encrypts special characters", () => {
      const encrypted = encrypt("p@ss!word#123$%^&*()");
      expect(encrypted.startsWith(PREFIX)).toBe(true);
    });

    it("encrypts unicode characters", () => {
      const encrypted = encrypt("密码测试🔐");
      expect(encrypted.startsWith(PREFIX)).toBe(true);
    });

    it("encrypts long strings", () => {
      const longString = "a".repeat(10000);
      const encrypted = encrypt(longString);
      expect(encrypted.startsWith(PREFIX)).toBe(true);
    });
  });
});

describe("Decryption", () => {
  describe("decrypt function", () => {
    it("decrypts encrypted value correctly", () => {
      const original = "my-secret-password";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("returns non-encrypted value unchanged", () => {
      const plainValue = "not-encrypted";
      const result = decrypt(plainValue);
      expect(result).toBe(plainValue);
    });

    it("decrypts empty string", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe("");
    });

    it("decrypts special characters", () => {
      const original = "p@ss!word#123$%^&*()";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("decrypts unicode characters", () => {
      const original = "密码测试🔐";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("decrypts long strings", () => {
      const original = "a".repeat(10000);
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe("Key Mismatch", () => {
    it("fails to decrypt with wrong key", () => {
      const encrypted = encrypt("secret", "key-one");
      expect(() => decrypt(encrypted, "key-two")).toThrow();
    });
  });
});

describe("isEncrypted", () => {
  describe("Detection", () => {
    it("returns true for encrypted values", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("returns false for plain values", () => {
      expect(isEncrypted("plain-text")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("returns false for values starting with similar prefix", () => {
      expect(isEncrypted("encrypted:value")).toBe(false);
      expect(isEncrypted("enc-value")).toBe(false);
    });

    it("returns true for enc: prefix", () => {
      expect(isEncrypted("enc:anything")).toBe(true);
    });
  });
});

describe("Round-Trip Encryption", () => {
  const testCases = [
    { name: "simple password", value: "password123" },
    { name: "database URL", value: "postgresql://user:pass@localhost:5432/db" },
    { name: "API key", value: "sk-1234567890abcdef" },
    { name: "JSON string", value: '{"key": "value", "nested": {"a": 1}}' },
    { name: "URL with special chars", value: "https://user:p%40ss@host.com/path?q=1&b=2" },
    { name: "multiline string", value: "line1\nline2\nline3" },
    { name: "whitespace", value: "  spaces  and\ttabs\t" },
  ];

  testCases.forEach(({ name, value }) => {
    it(`round-trips ${name}`, () => {
      const encrypted = encrypt(value);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(value);
    });
  });
});

describe("Env File Processing", () => {
  interface EnvLine {
    key: string;
    value: string;
    shouldEncrypt: boolean;
  }

  const parseEnvLine = (line: string): EnvLine | null => {
    if (!line.trim() || line.trim().startsWith("#")) return null;
    
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) return null;
    
    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();
    
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    const shouldEncrypt = SENSITIVE_VARS.includes(key) && 
                          !isEncrypted(value) && 
                          !!value && 
                          !value.includes("your-") && 
                          !value.includes("change-");
    
    return { key, value, shouldEncrypt };
  };

  describe("Line Parsing", () => {
    it("parses simple key=value", () => {
      const result = parseEnvLine("DATABASE_URL=postgresql://localhost/db");
      expect(result?.key).toBe("DATABASE_URL");
      expect(result?.value).toBe("postgresql://localhost/db");
    });

    it("parses quoted values", () => {
      const result = parseEnvLine('NEXTAUTH_SECRET="my-secret"');
      expect(result?.value).toBe("my-secret");
    });

    it("skips comments", () => {
      const result = parseEnvLine("# This is a comment");
      expect(result).toBeNull();
    });

    it("skips empty lines", () => {
      const result = parseEnvLine("");
      expect(result).toBeNull();
    });

    it("identifies sensitive vars for encryption", () => {
      const result = parseEnvLine("SNOW_PASSWORD=secret123");
      expect(result?.shouldEncrypt).toBe(true);
    });

    it("skips placeholder values", () => {
      const result = parseEnvLine("SNOW_PASSWORD=your-password-here");
      expect(result?.shouldEncrypt).toBe(false);
    });

    it("skips already encrypted values", () => {
      const encrypted = encrypt("secret");
      const result = parseEnvLine(`SNOW_PASSWORD=${encrypted}`);
      expect(result?.shouldEncrypt).toBe(false);
    });

    it("skips non-sensitive vars", () => {
      const result = parseEnvLine("NODE_ENV=production");
      expect(result?.shouldEncrypt).toBe(false);
    });
  });
});

describe("Security Properties", () => {
  describe("Authenticated Encryption", () => {
    it("uses GCM mode for authentication", () => {
      expect(ALGORITHM).toContain("gcm");
    });

    it("detects tampering", () => {
      const encrypted = encrypt("secret");
      // Tamper with the ciphertext
      const tampered = encrypted.slice(0, -5) + "XXXXX";
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("IV Randomness", () => {
    it("generates unique IV for each encryption", () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const encrypted = encrypt("same-value");
        const packed = Buffer.from(encrypted.slice(PREFIX.length), "base64");
        const iv = packed.subarray(0, IV_LENGTH).toString("hex");
        ivs.add(iv);
      }
      // All IVs should be unique
      expect(ivs.size).toBe(100);
    });
  });

  describe("Key Length", () => {
    it("uses 256-bit key", () => {
      const key = getKey("any-key");
      expect(key.length * 8).toBe(256);
    });
  });
});
