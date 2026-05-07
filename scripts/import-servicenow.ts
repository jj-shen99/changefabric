/**
 * Import Change Requests from a ServiceNow instance into the local database.
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/import-servicenow.ts
 */

import { PrismaClient } from "@prisma/client";
import { syncChangeRequests } from "../src/lib/integrations/servicenow";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Syncing change requests from ServiceNow …");

  const result = await syncChangeRequests(prisma);

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log(`  Fetched:   ${result.fetched}`);
  console.log(`  Upserted:  ${result.upserted}`);
  console.log(`  Errors:    ${result.errors}`);
  if (result.errorDetails.length > 0) {
    result.errorDetails.forEach((e) => console.log(`    ❌ ${e}`));
  }
  console.log("═══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
