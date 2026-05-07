import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AddProductForm } from "@/components/AddProductForm";
import { ProductActiveToggle } from "@/components/ProductActiveToggle";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      marketplace: true,
      _count: { select: { reviews: true } },
    },
    orderBy: [{ marketplace: { code: "asc" } }, { name: "asc" }],
  });

  const totalActive = products.filter((p) => p.isActive).length;
  const totalReviews = products.reduce((s, p) => s + p._count.reviews, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Товары</h1>
          <p className="text-sm text-[var(--color-muted)]">
            На мониторинге активно: {totalActive} из {products.length} ·{" "}
            {totalReviews.toLocaleString("ru-RU")} отзывов всего
          </p>
        </div>
      </header>

      <AddProductForm />

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-elev-1)] text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <th className="px-4 py-3">МП</th>
              <th className="px-4 py-3">Артикул</th>
              <th className="px-4 py-3">Бренд / название</th>
              <th className="px-4 py-3 text-right">Отзывов</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[var(--color-border)]/60 last:border-0 hover:bg-[var(--color-elev-1)]/40"
              >
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[var(--color-elev-1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    {p.marketplace.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--color-accent)] hover:underline"
                    >
                      {p.externalId} ↗
                    </a>
                  ) : (
                    p.externalId
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.brand && (
                    <div className="text-[11px] text-[var(--color-muted)]">
                      {p.brand}
                    </div>
                  )}
                  <div className="text-[var(--color-fg)]">{p.name}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {p._count.reviews > 0 ? (
                    <Link
                      href={`/reviews?productId=${p.id}`}
                      className="font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {p._count.reviews}
                    </Link>
                  ) : (
                    <span className="text-[var(--color-muted)]">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ProductActiveToggle productId={p.id} initial={p.isActive} />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-[var(--color-muted)]"
                >
                  Пока пусто. Добавьте первый артикул в форме выше.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
