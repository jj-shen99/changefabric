import { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";

// Decrypt DATABASE_URL before Prisma reads it (Prisma reads process.env.DATABASE_URL directly)
if (process.env.DATABASE_URL?.startsWith("enc:")) {
  process.env.DATABASE_URL = decrypt(process.env.DATABASE_URL);
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
