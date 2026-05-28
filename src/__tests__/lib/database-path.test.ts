/**
 * Tests for database path resolution
 * Ensures DATABASE_URL is correctly resolved to prevent duplicate database files.
 *
 * Prisma CLI resolves "file:./" relative to the prisma/ directory (where schema.prisma lives).
 * Our runtime and seed resolution must match so all code reads/writes the same DB file.
 */
import path from "path";

describe("Database Path Resolution", () => {
  const projectRoot = process.cwd();
  const schemaDir = path.resolve(projectRoot, "prisma");

  /**
   * Simulates the path resolution logic from src/lib/prisma.ts and prisma/seed.ts.
   * Matches Prisma CLI behavior: resolve "file:./" relative to the prisma/ directory.
   */
  function resolveDatabasePath(databaseUrl: string): string {
    if (!databaseUrl.startsWith("file:./")) {
      return databaseUrl;
    }

    const relativePath = databaseUrl.slice(7); // Remove "file:./"
    const absolutePath = path.resolve(schemaDir, relativePath);
    return `file:${absolutePath}`;
  }

  describe("Standard format (file:./dev.db)", () => {
    it("resolves relative to prisma/ directory", () => {
      const result = resolveDatabasePath("file:./dev.db");
      expect(result).toBe(`file:${path.join(schemaDir, "dev.db")}`);
    });

    it("resolves custom database names", () => {
      const result = resolveDatabasePath("file:./test.db");
      expect(result).toBe(`file:${path.join(schemaDir, "test.db")}`);
    });

    it("resolves to prisma/dev.db from project root perspective", () => {
      const result = resolveDatabasePath("file:./dev.db");
      expect(result).toBe(`file:${path.join(projectRoot, "prisma", "dev.db")}`);
    });
  });

  describe("Subdirectory paths", () => {
    it("resolves subdirectories relative to prisma/", () => {
      const result = resolveDatabasePath("file:./data/dev.db");
      expect(result).toBe(`file:${path.join(schemaDir, "data", "dev.db")}`);
    });
  });

  describe("Non-relative paths", () => {
    it("does not modify absolute paths", () => {
      const absolutePath = "file:/absolute/path/to/dev.db";
      const result = resolveDatabasePath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it("does not modify PostgreSQL URLs", () => {
      const pgUrl = "postgresql://user:pass@localhost:5432/mydb";
      const result = resolveDatabasePath(pgUrl);
      expect(result).toBe(pgUrl);
    });
  });

  describe("Database file location", () => {
    it("should always resolve to prisma/dev.db", () => {
      const result = resolveDatabasePath("file:./dev.db");
      // Should contain /prisma/dev.db
      expect(result).toContain("/prisma/dev.db");
      // Should end with /prisma/dev.db
      expect(result).toMatch(/\/prisma\/dev\.db$/);
    });

    it("should never create database at project root", () => {
      const result = resolveDatabasePath("file:./dev.db");
      const resolvedPath = result.replace("file:", "");
      
      // The resolved path should be inside prisma/ folder
      expect(resolvedPath).toContain("/prisma/");
      
      // The parent directory should be "prisma", not project root
      const parentDir = path.basename(path.dirname(resolvedPath));
      expect(parentDir).toBe("prisma");
    });
  });

  describe("Edge cases", () => {
    it("handles empty string", () => {
      const result = resolveDatabasePath("");
      expect(result).toBe("");
    });
  });
});

describe("Database Configuration", () => {
  it("DATABASE_URL in .env.example should use file:./dev.db (relative to prisma/)", async () => {
    const fs = await import("fs");
    const envExample = fs.readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf-8"
    );
    
    // Should contain the correct format: file:./dev.db (resolved relative to prisma/)
    expect(envExample).toContain('DATABASE_URL="file:./dev.db"');
  });
});
