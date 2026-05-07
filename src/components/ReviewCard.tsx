import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Stars } from "@/components/Stars";
import { ComplaintToggle } from "@/components/ComplaintToggle";
import { reviewSourceUrl } from "@/lib/sourceUrl";
import { fmtRelative, fmtDate } from "@/lib/format";

type ReviewWithProduct = Prisma.ReviewGetPayload<{
  include: { product: { include: { marketplace: true } } };
}>;

export function ReviewCard({ r }: { r: ReviewWithProduct }) {
  const sourceUrl = reviewSourceUrl(r);
  const hasName = !!r.authorName?.trim();
  const initial = hasName ? r.authorName!.trim().charAt(0).toUpperCase() : null;
  const accent = `var(--rating-${r.rating})`;

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] transition-colors hover:border-[var(--color-border-strong)]"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <div className="p-4">
        {/* meta row */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
          <Avatar letter={initial} accent={accent} />
          <div className="leading-tight">
            <div className="text-[var(--color-fg)]">
              {r.authorName?.trim() || (
                <span className="text-[var(--color-muted)]">без имени</span>
              )}
              {r.authorRegion && (
                <span className="ml-1 text-[var(--color-muted)]">
                  · {r.authorRegion.toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-[10px]" title={fmtDate(r.publishedAt)}>
              {fmtRelative(r.publishedAt)}
            </div>
          </div>

          <Stars value={r.rating} size="md" />

          <span className="rounded-md bg-[var(--color-elev-1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {r.product.marketplace.code}
          </span>
          <Link
            href={`/reviews?productId=${r.productId}`}
            className="text-[var(--color-accent)] hover:underline"
            title={r.product.name}
          >
            {r.product.name}
          </Link>

          {/* status badges */}
          <div className="flex items-center gap-1.5">
            {r.sellerReply && (
              <Badge tone="good" title="Продавец уже ответил">
                ↩ отвечен
              </Badge>
            )}
            {!r.sellerReply && r.rating <= 3 && (
              <Badge tone="warn" title="Низкая оценка без ответа">
                ждёт ответа
              </Badge>
            )}
            {(r.hasPhoto || r.hasVideo) && (
              <Badge tone="muted" title="Есть медиа">
                {r.hasPhoto && r.hasVideo
                  ? "фото · видео"
                  : r.hasPhoto
                    ? "фото"
                    : "видео"}
              </Badge>
            )}
          </div>

          {/* right cluster — actions */}
          <span className="ml-auto flex items-center gap-1.5">
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                title={`Открыть на ${r.product.marketplace.code.toUpperCase()}`}
              >
                ↗ источник
              </a>
            )}
            <ComplaintToggle reviewId={r.id} initial={r.isComplaint} />
          </span>
        </div>

        {/* body — кликабельное в детали */}
        <Link
          href={`/reviews/${r.id}`}
          className="mt-3 block rounded-md transition-colors hover:bg-[var(--color-elev-1)]/40"
          title="Открыть подробности"
        >
          {r.text || r.pros || r.cons ? (
            <div className="space-y-1 p-1 text-sm text-[var(--color-fg)]">
              {r.text && (
                <p className="line-clamp-3 whitespace-pre-line">{r.text}</p>
              )}
              {r.pros && (
                <p className="line-clamp-2">
                  <span className="text-[var(--color-good)]">+ </span>
                  {r.pros}
                </p>
              )}
              {r.cons && (
                <p className="line-clamp-2">
                  <span className="text-[var(--color-bad)]">− </span>
                  {r.cons}
                </p>
              )}
            </div>
          ) : (
            <div className="p-1 text-sm italic text-[var(--color-muted)]">
              Без текста · открыть подробности →
            </div>
          )}
        </Link>

        {r.sellerReply && (
          <details className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-elev-1)]/60 p-2 text-xs">
            <summary className="cursor-pointer text-[var(--color-muted)]">
              Ответ продавца
              {r.sellerReplyAt && ` · ${fmtRelative(r.sellerReplyAt)}`}
            </summary>
            <p className="mt-2 whitespace-pre-line text-[var(--color-fg)]">
              {r.sellerReply}
            </p>
          </details>
        )}
      </div>
    </article>
  );
}

function Avatar({
  letter,
  accent,
}: {
  letter: string | null;
  accent: string;
}) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${accent} 18%, var(--color-elev-1))`,
        color: accent,
      }}
    >
      {letter ?? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="8" cy="6" r="2.6" />
          <path d="M3 13.5c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5z" />
        </svg>
      )}
    </div>
  );
}

function Badge({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: "good" | "warn" | "bad" | "muted";
  title?: string;
}) {
  const cls =
    tone === "good"
      ? "bg-[var(--color-good-soft)] text-[var(--color-good)]"
      : tone === "warn"
        ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
        : tone === "bad"
          ? "bg-[var(--color-bad-soft)] text-[var(--color-bad)]"
          : "bg-[var(--color-elev-1)] text-[var(--color-muted)]";
  return (
    <span
      title={title}
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}
