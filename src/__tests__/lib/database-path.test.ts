/**
 * Tests for database path resolution
 * Ensures DATABASE_URL is correctly resolved to prevent duplicate database files
 */
import path from "path";

describe("Database Path Resolution", () => {
  const projectRoot = process.cwd();

  /**
   * Simulates the path resolution logic from src/lib/prisma.ts
   */
  function resolveDatabasePath(databaseUrl: string): string {
    if (!databaseUrl.startsWith("file:./")) {
      return databaseUrl;
    }

    let relativePath = databaseUrl.slice(7); // Remove "file:./"
    // Legacy support: if path doesn't include "prisma/", assume it's relative to prisma/ folder
    if (!relativePath.startsWith("prisma/") && !relativePath.includes("/prisma/")) {
      relativePath = `prisma/${relativePath}`;
    }
    const absolutePath = path.resolve(projectRoot, relativePath);
    return `file:${absolutePath}`;
  }

  describe("Standard format (file:./prisma/dev.db)", () => {
    it("resolves to absolute path in prisma folder", () => {
      const result = resolveDatabasePath("file:./prisma/dev.db");
      expect(result).toBe(`file:${path.join(projectRoot, "prisma", "dev.db")}`);
    });

    it("resolves custom database names", () => {
      const result = resolveDatabasePath("file:./prisma/test.db");
      expect(result).toBe(`file:${path.join(projectRoot, "prisma", "test.db")}`);
    });
  });

  describe("Legacy format (file:./dev.db)", () => {
    it("automatically prepends prisma/ folder", () => {
      const result = resolveDatabasePath("file:./dev.db");
      expect(result).toBe(`file:${path.join(projectRoot, "prisma", "dev.db")}`);
    });

    it("handles custom database names", () => {
      const result = resolveDatabasePath("file:./test.db");
      expect(result).toBe(`file:${path.join(projectRoot, "prisma", "test.db")}`);
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
    it("should always resolve to prisma/dev.db, never project root", () => {
      const testCases = [
        "file:./dev.db",
        "file:./prisma/dev.db",
      ];

      for (const url of testCases) {
        const result = resolveDatabasePath(url);
        // Should contain /prisma/dev.db
        expect(result).toContain("/prisma/dev.db");
        // Should end with /prisma/dev.db
        expect(result).toMatch(/\/prisma\/dev\.db$/);
      }
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

    it("handles paths with prisma in the middle", () => {
      const result = resolveDatabasePath("file:./data/prisma/dev.db");
      // Should not double-add prisma/
      expect(result).toBe(`file:${path.join(projectRoot, "data", "prisma", "dev.db")}`);
    });
  });
});

describe("Database Configuration", () => {
  it("DATABASE_URL in .env.example should use prisma/ prefix", async () => {
    const fs = await import("fs");
    const envExample = fs.readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf-8"
    );
    
    // Should contain the correct format
    expect(envExample).toContain('DATABASE_URL="file:./prisma/dev.db"');
    
    // Should NOT contain the legacy format without prisma/
    expect(envExample).not.toMatch(/DATABASE_URL="file:\.\/dev\.db"/);
  });
});
