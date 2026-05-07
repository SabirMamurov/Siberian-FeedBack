/**
 * CLI-обёртка над syncWildberries() — для запуска из крона/руками без подъёма Next.
 *
 *   npm run sync:wb
 *   npx tsx scripts/sync-wb.ts
 */
import { syncWildberries } from "../src/lib/sync/wb";
import { prisma } from "../src/lib/prisma";

async function main() {
  const summary = await syncWildberries();
  console.log("WB sync:", JSON.stringify(summary, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
