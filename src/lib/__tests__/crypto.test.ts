import { encrypt, decrypt, getSecret, isEncrypted } from "../crypto";

describe("encrypt / decrypt", () => {
  it("round-trips a simple string", () => {
    const plain = "hello world";
    const enc = encrypt(plain);
    expect(decrypt(enc)).toBe(plain);
  });

  it("round-trips an empty string", () => {
    const enc = encrypt("");
    expect(decrypt(enc)).toBe("");
  });

  it("round-trips unicode characters", () => {
    const plain = "日本語テスト 🔑";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("round-trips a long string (10 KB)", () => {
    const plain = "a".repeat(10_000);
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a).not.toBe(b); // different IVs
    expect(decrypt(a)).toBe("same");
    expect(decrypt(b)).toBe("same");
  });

  it("encrypted value starts with enc: prefix", () => {
    expect(encrypt("test").startsWith("enc:")).toBe(true);
  });
});

describe("decrypt edge cases", () => {
  it("returns plain text when value has no enc: prefix", () => {
    expect(decrypt("plain-text")).toBe("plain-text");
  });

  it("returns empty string for empty input", () => {
    expect(decrypt("")).toBe("");
  });

  it("throws on tampered ciphertext", () => {
    const enc = encrypt("secret");
    const tampered = enc.slice(0, -2) + "XX";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws on truncated ciphertext", () => {
    const enc = encrypt("secret");
    const truncated = enc.slice(0, 10);
    expect(() => decrypt(truncated)).toThrow();
  });
});

describe("isEncrypted", () => {
  it("returns true for encrypted values", () => {
    expect(isEncrypted(encrypt("test"))).toBe(true);
  });

  it("returns false for plain values", () => {
    expect(isEncrypted("plain")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });
});

describe("getSecret", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns fallback when env var is missing", () => {
    delete process.env.TEST_SECRET;
    expect(getSecret("TEST_SECRET", "default")).toBe("default");
  });

  it("returns empty string when env var is missing and no fallback", () => {
    delete process.env.TEST_SECRET;
    expect(getSecret("TEST_SECRET")).toBe("");
  });

  it("returns plain value when env var is not encrypted", () => {
    process.env.TEST_SECRET = "plain-value";
    expect(getSecret("TEST_SECRET")).toBe("plain-value");
  });

  it("decrypts encrypted env var", () => {
    process.env.TEST_SECRET = encrypt("my-secret");
    expect(getSecret("TEST_SECRET")).toBe("my-secret");
  });
});
