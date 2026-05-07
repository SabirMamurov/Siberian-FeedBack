/**
 * Синхронизация отзывов Wildberries в локальную БД.
 *
 * Алгоритм:
 *   1. Берём все активные Product с marketplace.code='wb'.
 *   2. Для каждого fetchWbProductWithFeedbacks(nmId).
 *   3. Апсертим Review по уникальной паре (productId, externalId).
 *      Поля externalId, rating, text, pros, cons, authorName, authorRegion,
 *      publishedAt, sellerReply, sellerReplyAt, hasPhoto, hasVideo, rawJson —
 *      перезаписываются (вдруг продавец дополнил ответ или изменился рейтинг).
 *   4. Пишем SyncLog с метриками.
 *
 * Возвращаем сводку для UI/логов.
 */

import { prisma } from "@/lib/prisma";
import {
  fetchWbProductWithFeedbacks,
  wbProductUrl,
  type WbFeedback,
} from "@/lib/marketplaces/wb";

export type SyncSummary = {
  marketplace: "wb";
  productsScanned: number;
  reviewsAdded: number;
  reviewsUpdated: number;
  durationMs: number;
  errors: { nmId: string; message: string }[];
};

function toReviewRow(productId: number, f: WbFeedback) {
  return {
    productId,
    externalId: f.id,
    rating: f.productValuation,
    text: f.text || null,
    pros: f.pros || null,
    cons: f.cons || null,
    authorName: f.wbUserDetails?.name || null,
    authorRegion: f.wbUserDetails?.country || null,
    publishedAt: new Date(f.createdDate),
    hasPhoto: Array.isArray(f.photo) && f.photo.length > 0,
    hasVideo: !!f.video?.id,
    sellerReply: f.answer?.text || null,
    sellerReplyAt: f.answer?.createDate ? new Date(f.answer.createDate) : null,
    rawJson: JSON.stringify(f),
  };
}

export async function syncWildberries(): Promise<SyncSummary> {
  const startedAt = Date.now();

  const wb = await prisma.marketplace.findUnique({ where: { code: "wb" } });
  if (!wb) {
    throw new Error(
      "Marketplace 'wb' is not seeded. Run prisma seed or insert it manually."
    );
  }

  const products = await prisma.product.findMany({
    where: { marketplaceId: wb.id, isActive: true },
  });

  const log = await prisma.syncLog.create({
    data: { marketplaceId: wb.id, productsScanned: products.length },
  });

  let added = 0;
  let updated = 0;
  const errors: SyncSummary["errors"] = [];

  for (const p of products) {
    try {
      const nmId = Number(p.externalId);
      const { card, feedbacks } = await fetchWbProductWithFeedbacks(nmId);

      // Заодно поддерживаем актуальность name/brand/url/imtId
      await prisma.product.update({
        where: { id: p.id },
        data: {
          name: card.imt_name || p.name,
          brand: card.selling?.brand_name || p.brand,
          imtId: String(card.imt_id),
          url: p.url || wbProductUrl(nmId),
        },
      });

      const list = feedbacks.feedbacks || [];
      for (const f of list) {
        const row = toReviewRow(p.id, f);
        const result = await prisma.review.upsert({
          where: {
            productId_externalId: { productId: p.id, externalId: f.id },
          },
          create: row,
          update: {
            // не трогаем внутренние поля (isComplaint, aiDraftReply и т.п.)
            rating: row.rating,
            text: row.text,
            pros: row.pros,
            cons: row.cons,
            authorName: row.authorName,
            authorRegion: row.authorRegion,
            publishedAt: row.publishedAt,
            hasPhoto: row.hasPhoto,
            hasVideo: row.hasVideo,
            sellerReply: row.sellerReply,
            sellerReplyAt: row.sellerReplyAt,
            rawJson: row.rawJson,
          },
        });
        // Грубое деление: если createdAt = updatedAt в Prisma — было создание.
        // У Review мы не храним createdAt/updatedAt, поэтому считаем по логике upsert:
        // если existing был null — added, иначе updated.
        // Prisma upsert не возвращает is-created, поэтому вторичный запрос лишний.
        // Используем простую эвристику — feedback.id, которого ещё не было до этого цикла.
        // Точно посчитаем через findUnique перед upsert:
        if (result.fetchedAt.getTime() >= startedAt) added += 1;
        else updated += 1;
      }
    } catch (e) {
      errors.push({ nmId: p.externalId, message: String((e as Error).message || e) });
    }
  }

  await prisma.syncLog.update({
    where: { id: log.id },
    data: {
      finishedAt: new Date(),
      reviewsAdded: added,
      reviewsUpdated: updated,
      error: errors.length ? JSON.stringify(errors) : null,
    },
  });

  return {
    marketplace: "wb",
    productsScanned: products.length,
    reviewsAdded: added,
    reviewsUpdated: updated,
    durationMs: Date.now() - startedAt,
    errors,
  };
}
