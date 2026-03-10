import { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";

// Decrypt DATABASE_URL before Prisma reads it (Prisma reads process.env.DATABASE_URL directly)
if (process.env.DATABASE_URL?.startsWith("enc:")) {
  process.env.DATABASE_URL = decrypt(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
