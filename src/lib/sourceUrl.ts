/**
 * Построение публичной ссылки на источник отзыва (где он лежит на площадке).
 *
 * Для WB ведём на страницу отзывов карточки. Якоря/feedbackId в URL у WB не стабильны
 * (рендерятся клиентом) — поэтому даём максимум что точно работает: лента всех отзывов товара.
 * Для OZON ссылка строится по product_id, как только заведём первую OZON-карточку.
 */

type ReviewWithProduct = {
  externalId: string;
  product: {
    externalId: string;
    imtId: string | null;
    url: string | null;
    marketplace: { code: string };
  };
};

export function reviewSourceUrl(r: ReviewWithProduct): string | null {
  const code = r.product.marketplace.code;
  if (code === "wb") {
    const nm = r.product.externalId;
    const imt = r.product.imtId;
    if (!nm) return null;
    const params = imt ? `?imtId=${imt}` : "";
    return `https://www.wildberries.ru/catalog/${nm}/feedbacks${params}`;
  }
  if (code === "ozon") {
    // r.product.url уже хранит ссылку на карточку, если она была заполнена при добавлении.
    // OZON-эндпойнт страницы отзывов:
    return `https://www.ozon.ru/product/${r.product.externalId}/reviews/`;
  }
  return r.product.url;
}
