/**
 * Wildberries: получение карточки товара и отзывов.
 *
 * Эндпойнты:
 *   - https://basket-NN.wbbasket.ru/...../card.json   — карточка товара (нужен imt_id)
 *   - https://feedbacks{1,2}.wb.ru/feedbacks/v2/{imt_id}  — отзывы по карточке-родителю
 *
 * Авторизация не требуется. Сервер всегда отдаёт br/gzip — undici fetch распакует сам.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "*/*",
  "Accept-Language": "ru-RU,ru;q=0.9",
};

/** Номер basket-хоста по vol = floor(nmId/100000). Актуально на 2025-2026. */
function basketHost(nmId: number): string {
  const vol = Math.floor(nmId / 100000);
  let n: number;
  if (vol <= 143) n = 1;
  else if (vol <= 287) n = 2;
  else if (vol <= 431) n = 3;
  else if (vol <= 719) n = 4;
  else if (vol <= 1007) n = 5;
  else if (vol <= 1061) n = 6;
  else if (vol <= 1115) n = 7;
  else if (vol <= 1169) n = 8;
  else if (vol <= 1313) n = 9;
  else if (vol <= 1601) n = 10;
  else if (vol <= 1655) n = 11;
  else if (vol <= 1919) n = 12;
  else if (vol <= 2045) n = 13;
  else if (vol <= 2189) n = 14;
  else if (vol <= 2405) n = 15;
  else if (vol <= 2621) n = 16;
  else if (vol <= 2837) n = 17;
  else if (vol <= 3053) n = 18;
  else if (vol <= 3269) n = 19;
  else if (vol <= 3485) n = 20;
  else if (vol <= 3701) n = 21;
  else if (vol <= 3917) n = 22;
  else if (vol <= 4133) n = 23;
  else if (vol <= 4349) n = 24;
  else n = 25;
  return `basket-${String(n).padStart(2, "0")}.wbbasket.ru`;
}

export type WbCard = {
  imt_id: number;
  imt_name?: string;
  selling?: { brand_name?: string };
  vendor_code?: string;
};

export type WbFeedback = {
  id: string;
  productValuation: number; // 1..5
  text?: string;
  pros?: string;
  cons?: string;
  createdDate: string; // ISO
  updatedDate?: string;
  wbUserDetails?: { name?: string; country?: string };
  photo?: number[] | null;
  /** Полная инфо о фото: id (числовой) + key вида "{shard}/{uuid}" + isReady */
  photos?: WbFeedbackPhoto[] | null;
  video?: WbFeedbackVideo | null;
  answer?: { text?: string; createDate?: string } | null;
  matchingSize?: string;
  color?: string;
  size?: string;
};

export type WbFeedbackPhoto = {
  id: number;
  key: string;        // "{shard}/{uuid}"
  isBlurred?: boolean;
  isReady?: boolean;
};

export type WbFeedbackVideo = {
  id: string;         // "{shard}/{uuid}"
  durationSec?: number;
  isReady?: boolean;
};

/**
 * URL фото отзыва.
 *   key = "{shard}/{uuid}", напр. "2/bac469ee-04ff-4d1a-8e51-bca29b1afa69"
 *   шард → zero-pad до 2 знаков ("2" → "02")
 *   результат: https://feedback-02.wbbasket.ru/{uuid}/{size}.webp
 * Размеры (проверены HEAD-запросами): ms (~256px) и fs (оригинал ~1024px).
 * Промежуточных WB не отдаёт — на ретине thumbnail из ms размывается, поэтому fs.
 */
export function wbFeedbackPhotoUrl(
  photo: { id?: number; key: string },
  size: "ms" | "fs" = "fs"
): string {
  const [shardRaw, uuid] = photo.key.split("/");
  const shard = shardRaw.padStart(2, "0");
  return `https://feedback-${shard}.wbbasket.ru/${uuid}/${size}.webp`;
}

/**
 * URL видео отзыва (HLS-плейлист). У видео отдельный поддомен без дефиса.
 *   id = "{shard}/{uuid}", напр. "6/f08abbe6-daa0-4e46-86bf-c1eea5c38562"
 *   результат: https://videofeedback06.wbbasket.ru/{uuid}/index.m3u8
 * Нативный <video> играет HLS в Safari; в Chrome нужен hls.js (добавим если потребуется).
 */
export function wbFeedbackVideoHlsUrl(video: { id: string }): string {
  const [shardRaw, uuid] = video.id.split("/");
  const shard = shardRaw.padStart(2, "0");
  return `https://videofeedback${shard}.wbbasket.ru/${uuid}/index.m3u8`;
}

export type WbFeedbacksResponse = {
  feedbackCount?: number;
  valuation?: string;
  valuationDistribution?: Record<string, number> | null;
  feedbacks?: WbFeedback[] | null;
};

/** Получить card.json для товара по nmId. Бросает ошибку, если не найден. */
export async function fetchWbCard(nmId: number): Promise<WbCard> {
  const vol = Math.floor(nmId / 100000);
  const part = Math.floor(nmId / 1000);
  const host = basketHost(nmId);
  const url = `https://${host}/vol${vol}/part${part}/${nmId}/info/ru/card.json`;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) {
    throw new Error(`WB card.json HTTP ${r.status} for nmId=${nmId} (${host})`);
  }
  return (await r.json()) as WbCard;
}

/**
 * Получить отзывы по imt_id. Пробуем оба шарда (feedbacks2, feedbacks1) —
 * WB разносит карточки между ними детерминированно, но какой именно — не знаем заранее.
 * Возвращаем первый ответ с непустым feedbackCount.
 */
export async function fetchWbFeedbacksByImt(
  imtId: number | string
): Promise<WbFeedbacksResponse & { shard: string | null }> {
  for (const host of ["feedbacks2.wb.ru", "feedbacks1.wb.ru"] as const) {
    const url = `https://${host}/feedbacks/v2/${imtId}`;
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) continue;
    const j = (await r.json()) as WbFeedbacksResponse;
    const cnt = j.feedbackCount ?? (j.feedbacks?.length ?? 0);
    if (cnt > 0) return { ...j, shard: host };
  }
  return { feedbackCount: 0, feedbacks: [], shard: null };
}

/** Удобная обёртка: nmId → карточка + отзывы. */
export async function fetchWbProductWithFeedbacks(nmId: number): Promise<{
  card: WbCard;
  feedbacks: WbFeedbacksResponse & { shard: string | null };
}> {
  const card = await fetchWbCard(nmId);
  const feedbacks = await fetchWbFeedbacksByImt(card.imt_id);
  return { card, feedbacks };
}

/** Построить публичный URL карточки товара на сайте WB. */
export function wbProductUrl(nmId: number | string): string {
  return `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
}
