/**
 * Seed: справочник площадок + 2 тестовых товара (известные nmId).
 * Имена/бренды будут перезаписаны при первом sync — здесь просто плейсхолдеры.
 *
 * Запуск:
 *   npx tsx prisma/seed.ts
 */
import { prisma } from "../src/lib/prisma";
import { wbProductUrl } from "../src/lib/marketplaces/wb";

async function main() {
  // marketplaces
  const marketplaces = [
    { code: "wb", name: "Wildberries" },
    { code: "ozon", name: "Ozon" },
  ];
  for (const m of marketplaces) {
    await prisma.marketplace.upsert({
      where: { code: m.code },
      create: m,
      update: { name: m.name },
    });
  }
  const wb = await prisma.marketplace.findUniqueOrThrow({ where: { code: "wb" } });

  // тестовые WB-артикулы — имена обновятся синхронизацией
  const samples = [
    { externalId: "208373562", name: "Кедровая комета классическая 7 шт" },
    { externalId: "75781007", name: "Кедровая комета Ассорти 4 вкуса 540 г Premium" },
  ];

  for (const s of samples) {
    await prisma.product.upsert({
      where: {
        marketplaceId_externalId: { marketplaceId: wb.id, externalId: s.externalId },
      },
      create: {
        marketplaceId: wb.id,
        externalId: s.externalId,
        name: s.name,
        brand: "Сибирские конфеты",
        url: wbProductUrl(s.externalId),
      },
      update: {},
    });
  }

  const total = await prisma.product.count();
  console.log(`Seed done. Marketplaces: ${marketplaces.length}, products: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
