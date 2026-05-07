import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Stars } from "@/components/Stars";
import { ComplaintToggle } from "@/components/ComplaintToggle";
import { ReviewPhoto } from "@/components/ReviewPhoto";
import { reviewSourceUrl } from "@/lib/sourceUrl";
import { fmtDate, fmtRelative } from "@/lib/format";
import {
  wbFeedbackPhotoUrl,
  wbFeedbackVideoHlsUrl,
  type WbFeedback,
} from "@/lib/marketplaces/wb";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function ReviewDetailPage({ params }: { params: Params }) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isFinite(id)) notFound();

  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { include: { marketplace: true } } },
  });
  if (!review) notFound();

  const sourceUrl = reviewSourceUrl(review);
  const isWb = review.product.marketplace.code === "wb";

  // Соседние отзывы по тому же товару — для prev/next
  const [prev, next] = await Promise.all([
    prisma.review.findFirst({
      where: {
        productId: review.productId,
        publishedAt: { gt: review.publishedAt },
      },
      orderBy: { publishedAt: "asc" },
      select: { id: true },
    }),
    prisma.review.findFirst({
      where: {
        productId: review.productId,
        publishedAt: { lt: review.publishedAt },
      },
      orderBy: { publishedAt: "desc" },
      select: { id: true },
    }),
  ]);

  let raw: WbFeedback | null = null;
  try {
    if (review.rawJson) raw = JSON.parse(review.rawJson) as WbFeedback;
  } catch {
    raw = null;
  }
  const photos = isWb ? raw?.photos || [] : [];
  const video = isWb ? raw?.video : null;
  const accent = `var(--rating-${review.rating})`;

  return (
    <div className="space-y-5">
      {/* breadcrumb + prev/next */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-[var(--color-muted)]">
          <Link href="/reviews" className="hover:text-[var(--color-fg)]">
            ← все отзывы
          </Link>
          <span>/</span>
          <Link
            href={`/reviews?productId=${review.productId}`}
            className="text-[var(--color-accent)] hover:underline"
          >
            отзывы товара
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <NavBtn
            href={prev ? `/reviews/${prev.id}` : null}
            label="← предыдущий"
          />
          <NavBtn href={next ? `/reviews/${next.id}` : null} label="следующий →" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
        {/* MAIN COLUMN */}
        <article
          className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)]"
          style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
        >
          <div className="space-y-5 p-6">
            {/* header */}
            <header className="flex flex-wrap items-center gap-3">
              <Stars value={review.rating} size="lg" showNumber />
              <span className="rounded-md bg-[var(--color-elev-1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {review.product.marketplace.code}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <ComplaintToggle
                  reviewId={review.id}
                  initial={review.isComplaint}
                />
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                  >
                    ↗ открыть на {review.product.marketplace.code.toUpperCase()}
                  </a>
                )}
              </div>
            </header>

            {/* body */}
            {review.text || review.pros || review.cons ? (
              <div className="space-y-3 text-[15px] leading-relaxed">
                {review.text && (
                  <p className="whitespace-pre-line">{review.text}</p>
                )}
                {review.pros && (
                  <p>
                    <span className="mr-1 font-semibold text-[var(--color-good)]">
                      Достоинства:
                    </span>
                    {review.pros}
                  </p>
                )}
                {review.cons && (
                  <p>
                    <span className="mr-1 font-semibold text-[var(--color-bad)]">
                      Недостатки:
                    </span>
                    {review.cons}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-[var(--color-muted)]">
                Без текста — только оценка.
              </p>
            )}

            {/* photo gallery */}
            {photos.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  Фото · {photos.length}
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((p) => {
                    // Используем fs для обоих — единственная альтернатива (ms)
                    // размывается на ретине, а промежуточных размеров WB не даёт.
                    const url = wbFeedbackPhotoUrl(p, "fs");
                    return (
                      <a
                        key={p.id}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]"
                      >
                        <ReviewPhoto
                          src={url}
                          alt={`Фото отзыва ${p.id}`}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="pointer-events-none absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                          ↗ открыть
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* video */}
            {video && (
              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  Видео{video.durationSec ? ` · ${video.durationSec} с` : ""}
                </h3>
                <video
                  controls
                  preload="metadata"
                  className="w-full max-w-[560px] rounded-lg border border-[var(--color-border)]"
                  src={wbFeedbackVideoHlsUrl(video)}
                />
                <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                  HLS играет нативно в Safari/iOS. В Chrome пока чёрный плеер —{" "}
                  <a
                    href={wbFeedbackVideoHlsUrl(video)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-accent)] hover:underline"
                  >
                    открыть HLS-источник
                  </a>{" "}
                  (откроется в Safari/VLC).
                </p>
              </section>
            )}

            {/* seller reply */}
            {review.sellerReply && (
              <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elev-1)] p-4">
                <h3 className="mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  ↩ Ответ продавца
                  {review.sellerReplyAt && (
                    <span
                      className="text-[var(--color-muted)]"
                      title={fmtDate(review.sellerReplyAt)}
                    >
                      · {fmtRelative(review.sellerReplyAt)}
                    </span>
                  )}
                </h3>
                <p className="whitespace-pre-line text-sm">{review.sellerReply}</p>
              </section>
            )}
          </div>
        </article>

        {/* SIDE INFO */}
        <aside className="space-y-3">
          <SideCard title="Автор">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold"
                style={{
                  background: `color-mix(in srgb, ${accent} 18%, var(--color-elev-1))`,
                  color: accent,
                }}
              >
                {review.authorName?.trim() ? (
                  review.authorName.trim().charAt(0).toUpperCase()
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden
                  >
                    <circle cx="8" cy="6" r="2.6" />
                    <path d="M3 13.5c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="font-medium">
                  {review.authorName?.trim() || (
                    <span className="text-[var(--color-muted)]">без имени</span>
                  )}
                </div>
                {review.authorRegion && (
                  <div className="text-xs text-[var(--color-muted)]">
                    {review.authorRegion.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </SideCard>

          <SideCard title="Опубликован">
            <div className="text-sm">{fmtDate(review.publishedAt)}</div>
            <div className="text-xs text-[var(--color-muted)]">
              {fmtRelative(review.publishedAt)}
            </div>
          </SideCard>

          <SideCard title="Товар">
            <Link
              href={`/reviews?productId=${review.productId}`}
              className="text-sm text-[var(--color-fg)] hover:text-[var(--color-accent)]"
            >
              {review.product.name}
            </Link>
            {review.product.brand && (
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                {review.product.brand}
              </div>
            )}
            <div className="mt-1.5 text-[11px] text-[var(--color-muted)]">
              артикул:{" "}
              {review.product.url ? (
                <a
                  href={review.product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  {review.product.externalId}
                </a>
              ) : (
                <span className="font-mono">{review.product.externalId}</span>
              )}
            </div>
            {(raw?.color || raw?.size) && (
              <div className="mt-1 text-[11px] text-[var(--color-muted)]">
                {raw.color && <>цвет: {raw.color}</>}
                {raw.color && raw.size && " · "}
                {raw.size && <>размер: {raw.size}</>}
              </div>
            )}
          </SideCard>
        </aside>
      </div>
    </div>
  );
}

function NavBtn({ href, label }: { href: string | null; label: string }) {
  const cls =
    "rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs transition-colors " +
    (href
      ? "text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      : "text-[var(--color-muted)]/40");
  if (!href) return <span className={cls}>{label}</span>;
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

function SideCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-4">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}
