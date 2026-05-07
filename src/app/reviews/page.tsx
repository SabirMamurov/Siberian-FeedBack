import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { SyncButton } from "@/components/SyncButton";
import { ReviewFilters } from "@/components/ReviewFilters";
import { ReviewCard } from "@/components/ReviewCard";
import { FilterChips } from "@/components/FilterChips";
import { RatingBar } from "@/components/RatingBar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Distribution = Record<1 | 2 | 3 | 4 | 5, number>;

function pickStr(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function buildOrder(sort: string | null): Prisma.ReviewOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { publishedAt: "asc" };
    case "rating-asc":
      return { rating: "asc" };
    case "rating-desc":
      return { rating: "desc" };
    default:
      return { publishedAt: "desc" };
  }
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const where: Prisma.ReviewWhereInput = {};

  const marketplace = pickStr(sp.marketplace);
  const productIdStr = pickStr(sp.productId);
  if (productIdStr) {
    const productId = Number(productIdStr);
    if (Number.isFinite(productId)) where.productId = productId;
  } else if (marketplace) {
    where.product = { marketplace: { code: marketplace } };
  }

  const ratingStr = pickStr(sp.rating);
  if (ratingStr) {
    const list = ratingStr
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (list.length) where.rating = { in: list };
  }

  const complaint = pickStr(sp.complaint);
  if (complaint === "true") where.isComplaint = true;
  else if (complaint === "false") where.isComplaint = false;

  const media = pickStr(sp.media);
  if (media === "any") where.OR = [{ hasPhoto: true }, { hasVideo: true }];
  else if (media === "photo") where.hasPhoto = true;
  else if (media === "video") where.hasVideo = true;

  const page = Math.max(1, Number(pickStr(sp.page) || "1") || 1);
  const q = pickStr(sp.q)?.trim().toLowerCase();
  const sort = pickStr(sp.sort);
  const orderBy = buildOrder(sort);

  type ReviewWithProduct = Prisma.ReviewGetPayload<{
    include: { product: { include: { marketplace: true } } };
  }>;
  let items: ReviewWithProduct[];
  let total: number;

  if (q) {
    // Cyrillic-friendly substring filter в JS
    const all = await prisma.review.findMany({
      where,
      include: { product: { include: { marketplace: true } } },
      orderBy,
    });
    const filtered = all.filter((r) => {
      const hay = `${r.text || ""} ${r.pros || ""} ${r.cons || ""}`.toLowerCase();
      return hay.includes(q);
    });
    total = filtered.length;
    items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { product: { include: { marketplace: true } } },
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.review.count({ where }),
    ]);
  }

  // Распределение по фильтру (для бара). Если q задан — считаем по items, иначе из БД.
  let distribution: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalForBar = 0;
  let weightedSum = 0;
  if (q) {
    for (const r of items) {
      distribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      weightedSum += r.rating;
      totalForBar++;
    }
  } else {
    const groups = await prisma.review.groupBy({
      by: ["rating"],
      where,
      _count: { _all: true },
    });
    for (const g of groups) {
      const v = g.rating as 1 | 2 | 3 | 4 | 5;
      distribution[v] = g._count._all;
      weightedSum += v * g._count._all;
      totalForBar += g._count._all;
    }
  }
  const average = totalForBar > 0 ? weightedSum / totalForBar : 0;

  // Список товаров для фильтра + map id → name для FilterChips
  const products = await prisma.product.findMany({
    include: { marketplace: true },
    orderBy: { name: "asc" },
  });
  const productMap: Record<string, string> = {};
  for (const p of products) productMap[p.id.toString()] = p.name;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Отзывы</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {total.toLocaleString("ru-RU")}{" "}
            {pluralize(total, "отзыв", "отзыва", "отзывов")} в выборке
          </p>
        </div>
        <SyncButton />
      </header>

      {/* Сводка по выборке: средняя + распределение */}
      {totalForBar > 0 && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                Средний рейтинг
              </div>
              <div
                className="mt-1 text-4xl font-semibold tabular-nums"
                style={{
                  color: `var(--rating-${Math.max(1, Math.min(5, Math.round(average)))})`,
                }}
              >
                {average.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">
                из 5 баллов
              </div>
            </div>
            <RatingBar
              distribution={distribution}
              total={totalForBar}
              average={average}
              compact
            />
          </div>
        </section>
      )}

      <ReviewFilters products={products} />
      <FilterChips products={productMap} />

      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id}>
            <ReviewCard r={r} />
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-elev-2)] text-[var(--color-muted)]">
              ⌕
            </div>
            <p className="text-sm text-[var(--color-fg)]">
              По текущим фильтрам ничего не нашлось
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Попробуйте сбросить фильтры или{" "}
              <Link
                href="/products"
                className="text-[var(--color-accent)] hover:underline"
              >
                добавить новые товары
              </Link>{" "}
              на мониторинг.
            </p>
          </li>
        )}
      </ul>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} sp={sp} />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: Record<string, string | string[] | undefined>;
}) {
  const linkFor = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v === undefined) continue;
      next.set(k, Array.isArray(v) ? v[0]! : v);
    }
    next.set("page", String(p));
    return `/reviews?${next.toString()}`;
  };

  // Урезанный диапазон номеров — без бесконечного списка для больших каталогов.
  const pages = pageRange(page, totalPages);
  const cls =
    "min-w-[34px] rounded-md border px-2 py-1 text-sm tabular-nums transition-colors";

  return (
    <nav className="flex items-center justify-center gap-1.5">
      <PagItem
        href={page > 1 ? linkFor(page - 1) : null}
        disabled={page === 1}
      >
        ← пред
      </PagItem>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-1 text-[var(--color-muted)]">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={linkFor(p)}
            className={
              cls +
              " " +
              (p === page
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-fg-strong)]"
                : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]")
            }
          >
            {p}
          </Link>
        )
      )}
      <PagItem
        href={page < totalPages ? linkFor(page + 1) : null}
        disabled={page === totalPages}
      >
        след →
      </PagItem>
    </nav>
  );
}

function PagItem({
  href,
  disabled,
  children,
}: {
  href: string | null;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "rounded-md border px-3 py-1 text-sm transition-colors " +
    (disabled
      ? "border-[var(--color-border)] text-[var(--color-muted)]/40"
      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]");
  if (!href) return <span className={cls}>{children}</span>;
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)
    return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}
