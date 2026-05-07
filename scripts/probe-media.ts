import { prisma } from "../src/lib/prisma";

async function main() {
  const photoR = await prisma.review.findFirst({ where: { hasPhoto: true } });
  const videoR = await prisma.review.findFirst({ where: { hasVideo: true } });
  const photoCount = await prisma.review.count({ where: { hasPhoto: true } });
  const videoCount = await prisma.review.count({ where: { hasVideo: true } });
  console.log("PHOTO review id:", photoR?.id, " (total:", photoCount, ")");
  console.log("VIDEO review id:", videoR?.id, " (total:", videoCount, ")");
  await prisma.$disconnect();
}
main();
