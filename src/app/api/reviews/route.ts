import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Список отзывов с фильтрами.
 * Query:
 *   marketplace=wb|ozon
 *   productId=N
 *   rating=1..5  (можно несколько, через запятую: rating=1,2)
 *   complaint=true|false
 *   from=YYYY-MM-DD
 *   to=YYYY-MM-DD
 *   q=substring (по text/pros/cons, без учёта регистра — на JS, чтобы Cyrillic работал)
 *   page=1, pageSize=50
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const where: Prisma.ReviewWhereInput = {};

  const mp = sp.get("marketplace");
  const productIdStr = sp.get("productId");
  if (productIdStr) {
    const productId = Number(productIdStr);
    if (Number.isFinite(productId)) where.productId = productId;
  } else if (mp) {
    where.product = { marketplace: { code: mp } };
  }

  const ratings = sp
    .get("rating")
    ?.split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (ratings && ratings.length) where.rating = { in: ratings };

  const complaint = sp.get("complaint");
  if (complaint === "true") where.isComplaint = true;
  else if (complaint === "false") where.isComplaint = false;

  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    where.publishedAt = {};
    if (from) where.publishedAt.gte = new Date(from);
    if (to) {
      // включительно по дате — добавляем сутки
      const t = new Date(to);
      t.setDate(t.getDate() + 1);
      where.publishedAt.lt = t;
    }
  }

  const page = Math.max(1, Number(sp.get("page") || "1") || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") || "50") || 50));

  // Текстовый поиск делаем на JS (SQLite LIKE не поддерживает Unicode case-insensitivity).
  // Если q задано — берём всю выборку под фильтрами (без пагинации) и фильтруем тут.
  const q = sp.get("q")?.trim().toLowerCase();
  if (q) {
    const all = await prisma.review.findMany({
      where,
      include: { product: { include: { marketplace: true } } },
      orderBy: { publishedAt: "desc" },
    });
    const filtered = all.filter((r) => {
      const hay = `${r.text || ""} ${r.pros || ""} ${r.cons || ""}`.toLowerCase();
      return hay.includes(q);
    });
    const total = filtered.length;
    const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
    return NextResponse.json({ items: slice, total, page, pageSize });
  }

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { product: { include: { marketplace: true } } },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
