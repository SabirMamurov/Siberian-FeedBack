/**
 * Распределение оценок 1..5 в виде стопки горизонтальных полосок.
 * Сверху — крупный средний рейтинг и общее число.
 */
export function RatingBar({
  distribution,
  total,
  average,
  compact = false,
}: {
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
  average: number;
  compact?: boolean;
}) {
  const max = Math.max(...Object.values(distribution), 1);
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      {!compact && (
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-semibold tabular-nums">
            {average.toFixed(2)}
          </div>
          <div className="text-sm text-[var(--color-muted)]">
            из 5 · {total} {pluralize(total, "отзыв", "отзыва", "отзывов")}
          </div>
        </div>
      )}
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        {[5, 4, 3, 2, 1].map((r) => {
          const n = distribution[r as 1 | 2 | 3 | 4 | 5] || 0;
          const pct = (n / max) * 100;
          return (
            <div
              key={r}
              className="grid grid-cols-[20px_1fr_auto] items-center gap-2 text-xs"
            >
              <span className="text-[var(--color-muted)] tabular-nums">
                {r}★
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-elev-1)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `var(--rating-${r})`,
                  }}
                />
              </div>
              <span className="w-12 text-right tabular-nums text-[var(--color-muted)]">
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return many;
  if (m10 === 1) return one;
  if (m10 >= 2 && m10 <= 4) return few;
  return many;
}
