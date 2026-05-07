/**
 * Аудит формата ключей фото/видео по всем отзывам в БД.
 * Если все ключи следуют паттерну "{shard}/{uuid}" — значит формула универсальна.
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const all = await prisma.review.findMany({
    where: { OR: [{ hasPhoto: true }, { hasVideo: true }] },
    select: { id: true, rawJson: true, hasPhoto: true, hasVideo: true },
  });

  const photoKeys: string[] = [];
  const videoIds: string[] = [];
  let badPhotoKey = 0;
  let badVideoId = 0;

  for (const r of all) {
    if (!r.rawJson) continue;
    const raw = JSON.parse(r.rawJson);
    if (Array.isArray(raw.photos)) {
      for (const p of raw.photos) {
        photoKeys.push(p.key);
        if (!/^\d+\/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(p.key)) badPhotoKey++;
      }
    }
    if (raw.video?.id) {
      videoIds.push(raw.video.id);
      if (!/^\d+\/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw.video.id)) badVideoId++;
    }
  }

  // Распределение шардов
  const photoShards: Record<string, number> = {};
  for (const k of photoKeys) {
    const shard = k.split("/")[0].padStart(2, "0");
    photoShards[shard] = (photoShards[shard] || 0) + 1;
  }
  const videoShards: Record<string, number> = {};
  for (const v of videoIds) {
    const shard = v.split("/")[0].padStart(2, "0");
    videoShards[shard] = (videoShards[shard] || 0) + 1;
  }

  console.log("Reviews with media:", all.length);
  console.log("Total photos:", photoKeys.length, " malformed keys:", badPhotoKey);
  console.log("Total videos:", videoIds.length, " malformed ids:", badVideoId);
  console.log("Photo shards distribution:", photoShards);
  console.log("Video shards distribution:", videoShards);
  console.log("Sample photo keys:", photoKeys.slice(0, 5));
  console.log("Sample video ids:", videoIds.slice(0, 5));
  await prisma.$disconnect();
}
main();
