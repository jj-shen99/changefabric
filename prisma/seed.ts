import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDecipheriv, createHash } from "crypto";
import "dotenv/config";

// Decrypt DATABASE_URL if encrypted (mirrors src/lib/crypto.ts logic)
if (process.env.DATABASE_URL?.startsWith("enc:")) {
  const raw = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";
  const key = createHash("sha256").update(raw).digest();
  const packed = Buffer.from(process.env.DATABASE_URL.slice(4), "base64");
  const iv = packed.subarray(0, 16);
  const authTag = packed.subarray(16, 32);
  const ciphertext = packed.subarray(32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  process.env.DATABASE_URL = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Users ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123!", 12);
  const managerPassword = await bcrypt.hash("manager123!", 12);
  const viewerPassword = await bcrypt.hash("viewer123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@servicenow.com" },
    update: { hashedPassword: adminPassword },
    create: {
      email: "admin@servicenow.com",
      name: "System Admin",
      hashedPassword: adminPassword,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@servicenow.com" },
    update: { hashedPassword: managerPassword },
    create: {
      email: "manager@servicenow.com",
      name: "Mike Torres",
      hashedPassword: managerPassword,
      role: "manager",
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@servicenow.com" },
    update: { hashedPassword: viewerPassword },
    create: {
      email: "viewer@servicenow.com",
      name: "Jane Doe",
      hashedPassword: viewerPassword,
      role: "viewer",
    },
  });

  // ── Releases ──────────────────────────────────────────
  await prisma.release.upsert({
    where: { id: "REL-28" },
    update: {},
    create: {
      id: "REL-28",
      name: "Sprint 28 Release",
      version: "4.12.0",
      status: "staging",
      scheduledDate: new Date("2026-03-12T02:00:00Z"),
      overallRisk: 48,
      releaseManager: "Mike Torres",
      notes: "Contains critical payment migration. Extended freeze window planned.",
    },
  });

  await prisma.release.upsert({
    where: { id: "REL-29" },
    update: {},
    create: {
      id: "REL-29",
      name: "Sprint 29 Release",
      version: "4.13.0",
      status: "planning",
      scheduledDate: new Date("2026-03-26T02:00:00Z"),
      overallRisk: 52,
      releaseManager: "Lisa Wang",
      notes: "Database migration requires maintenance window coordination with SRE team.",
    },
  });

  await prisma.release.upsert({
    where: { id: "REL-27" },
    update: {},
    create: {
      id: "REL-27",
      name: "Sprint 27 Release",
      version: "4.11.2",
      status: "completed",
      scheduledDate: new Date("2026-02-26T02:00:00Z"),
      actualDate: new Date("2026-02-26T02:45:00Z"),
      overallRisk: 18,
      releaseManager: "Mike Torres",
    },
  });

  // ── Change Requests ───────────────────────────────────
  // Change requests are now synced from ServiceNow via /api/sync.
  // Mock data removed — schema uses ServiceNow fields (number, sys_id, etc.)

  // Legacy mock change request data removed.
  // Change requests are now synced from ServiceNow via /api/sync or scripts/import-servicenow.ts.

  // ── Dashboard Metrics ─────────────────────────────────
  await prisma.dashboardMetric.deleteMany();
  await prisma.dashboardMetric.create({
    data: {
      totalChanges: 147,
      pendingChanges: 23,
      deployedToday: 8,
      failedDeployments: 2,
      avgRiskScore: 38,
      validationPassRate: 94.2,
      avgDeployTime: "12m 34s",
      rollbackRate: 3.4,
      mttr: "28m",
      changeLeadTime: "4.2 days",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
