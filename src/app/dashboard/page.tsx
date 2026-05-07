import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RatingBar } from "@/components/RatingBar";
import { Stars } from "@/components/Stars";
import { SyncButton } from "@/components/SyncButton";
import { fmtRelative } from "@/lib/format";

export const dynamic = "force-dynamic";

type Distribution = Record<1 | 2 | 3 | 4 | 5, number>;

export default async function DashboardPage() {
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    last7,
    last30,
    complaintsOpen,
    awaitingReply,
    ratingAggregate,
    lastSync,
    recent,
    topProducts,
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { publishedAt: { gte: since7 } } }),
    prisma.review.count({ where: { publishedAt: { gte: since30 } } }),
    prisma.review.count({ where: { isComplaint: true } }),
    prisma.review.count({ where: { sellerReply: null, rating: { lte: 3 } } }),
    prisma.review.groupBy({
      by: ["rating"],
      _count: { _all: true },
    }),
    prisma.syncLog.findFirst({
      orderBy: { startedAt: "desc" },
      include: { marketplace: true },
    }),
    prisma.review.findMany({
      take: 6,
      orderBy: { publishedAt: "desc" },
      include: { product: { include: { marketplace: true } } },
    }),
    prisma.product.findMany({
      include: {
        marketplace: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { reviews: { _count: "desc" } },
      take: 5,
    }),
  ]);

  // Аггрегация распределения 1..5
  const distribution: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let weightedSum = 0;
  let count = 0;
  for (const r of ratingAggregate) {
    const v = r.rating as 1 | 2 | 3 | 4 | 5;
    distribution[v] = r._count._all;
    weightedSum += v * r._count._all;
    count += r._count._all;
  }
  const average = count > 0 ? weightedSum / count : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Сводка по отзывам с маркетплейсов
          </p>
        </div>
        <SyncButton />
      </header>

      {/* Hero metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          title="Всего отзывов"
          value={total.toLocaleString("ru-RU")}
          hint={`+${last7} за 7 дн · +${last30} за 30 дн`}
        />
        <Stat
          title="Средний рейтинг"
          value={average.toFixed(2)}
          hint={<Stars value={average} />}
          accent={average >= 4.5 ? "good" : average >= 3.5 ? "warn" : "bad"}
        />
        <Stat
          title="Рекламации"
          value={complaintsOpen.toLocaleString("ru-RU")}
          hint={
            complaintsOpen > 0 ? (
              <Link
                href="/reviews?complaint=true"
                className="text-[var(--color-accent)] hover:underline"
              >
                открыть список →
              </Link>
            ) : (
              "ничего не отмечено"
            )
          }
          accent={complaintsOpen > 0 ? "bad" : undefined}
        />
        <Stat
          title="Ждут ответа продавца"
          value={awaitingReply.toLocaleString("ru-RU")}
          hint="низкие оценки без ответа"
          accent={awaitingReply > 0 ? "warn" : undefined}
        />
      </section>

      {/* Rating distribution + last sync */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Распределение оценок">
          <RatingBar
            distribution={distribution}
            total={count}
            average={average}
          />
        </Card>
        <Card title="Последняя синхронизация">
          {lastSync ? (
            <div className="space-y-2 text-sm">
              <div className="text-[var(--color-muted)]">
                {lastSync.marketplace.name}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {lastSync.reviewsAdded}
                </span>
                <span className="text-[var(--color-muted)]">
                  новых · {lastSync.reviewsUpdated} обновлено
                </span>
              </div>
              <div className="text-xs text-[var(--color-muted)]">
                {fmtRelative(lastSync.startedAt)}
                {lastSync.finishedAt && (
                  <>
                    {" · "}
                    {Math.round(
                      (lastSync.finishedAt.getTime() -
                        lastSync.startedAt.getTime()) /
                        1000
                    )}{" "}
                    с
                  </>
                )}
              </div>
              {lastSync.error && (
                <div className="rounded border border-[var(--color-bad)]/30 bg-[var(--color-bad-soft)] p-2 text-xs text-[var(--color-bad)]">
                  Были ошибки — см. журнал
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm italic text-[var(--color-muted)]">
              Ещё не запускалась
            </p>
          )}
        </Card>
      </section>

      {/* Two-column: recent + top products */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card
          title="Последние отзывы"
          action={
            <Link
              href="/reviews"
              className="text-xs text-[var(--color-accent)] hover:underline"
            >
              все отзывы →
            </Link>
          }
        >
          <ul className="divide-y divide-[var(--color-border)]">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reviews/${r.id}`}
                  className="-mx-3 block rounded-md px-3 py-2.5 hover:bg-[var(--color-elev-1)]"
                >
                  <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                    <Stars value={r.rating} />
                    <span>{fmtRelative(r.publishedAt)}</span>
                    <span>·</span>
                    <span>{r.authorName || "—"}</span>
                    <span className="ml-auto truncate text-right">
                      {r.product.name}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm">
                    {r.text || r.pros || r.cons || (
                      <span className="italic text-[var(--color-muted)]">
                        без текста — только оценка
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Топ товаров по числу отзывов">
          <ul className="space-y-2.5 text-sm">
            {topProducts.map((p) => {
              const max = topProducts[0]?._count.reviews || 1;
              const pct = (p._count.reviews / max) * 100;
              return (
                <li key={p.id}>
                  <Link
                    href={`/reviews?productId=${p.id}`}
                    className="block rounded-md px-1 py-1 hover:bg-[var(--color-elev-1)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate" title={p.name}>
                        {p.name}
                      </span>
                      <span className="tabular-nums text-[var(--color-muted)]">
                        {p._count.reviews}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--color-elev-1)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
            {topProducts.length === 0 && (
              <li className="text-[var(--color-muted)]">Товаров пока нет</li>
            )}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Stat({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string | number;
  hint?: React.ReactNode;
  accent?: "good" | "warn" | "bad";
}) {
  const accentClass =
    accent === "good"
      ? "text-[var(--color-good)]"
      : accent === "warn"
        ? "text-[var(--color-warn)]"
        : accent === "bad"
          ? "text-[var(--color-bad)]"
          : "";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accentClass}`}>
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-[var(--color-muted)]">{hint}</div>
      )}
    </div>
  );
}
