import { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import path from "path";

// Decrypt DATABASE_URL before Prisma reads it (Prisma reads process.env.DATABASE_URL directly)
if (process.env.DATABASE_URL?.startsWith("enc:")) {
  process.env.DATABASE_URL = decrypt(process.env.DATABASE_URL);
}

// Resolve relative SQLite paths to absolute paths.
// Prisma CLI resolves "file:./" relative to the prisma/ directory (where schema.prisma lives).
// We do the same here so the runtime client connects to the same database file.
// DATABASE_URL should be "file:./dev.db" which resolves to prisma/dev.db.
if (process.env.DATABASE_URL?.startsWith("file:./")) {
  const relativePath = process.env.DATABASE_URL.slice(7); // Remove "file:./"
  const schemaDir = path.resolve(process.cwd(), "prisma");
  const absolutePath = path.resolve(schemaDir, relativePath);
  process.env.DATABASE_URL = `file:${absolutePath}`;
}

// Auto-detect provider from URL if not set explicitly.
// SQLite: "file:..."   PostgreSQL: "postgresql://..." or "postgres://..."
if (!process.env.DATABASE_PROVIDER) {
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    process.env.DATABASE_PROVIDER = "postgresql";
  } else {
    process.env.DATABASE_PROVIDER = "sqlite";
  }
}

/** Returns "postgresql" | "sqlite" — the active database provider. */
export function getDatabaseProvider(): "postgresql" | "sqlite" {
  return (process.env.DATABASE_PROVIDER as "postgresql" | "sqlite") || "sqlite";
}

/** Returns true when running against a production-grade PostgreSQL DB. */
export function isProductionDatabase(): boolean {
  return getDatabaseProvider() === "postgresql";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
