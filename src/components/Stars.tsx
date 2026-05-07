/**
 * Звёзды + опциональное численное значение.
 * Цвет звёзд меняется по тону (рейтинг 1-2 → красный, 3 → жёлтый, 4-5 → зелёный/жёлтый).
 */
export function Stars({
  value,
  showNumber = false,
  size = "sm",
}: {
  value: number;
  showNumber?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const v = Math.max(0, Math.min(5, value));
  const filled = Math.round(v);
  const sizeClass =
    size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass} font-mono`}
      title={`${value.toFixed(1)} из 5`}
    >
      <span style={{ color: `var(--rating-${filled || 1})` }}>
        {"★".repeat(filled)}
        <span className="text-[var(--color-border-strong)]">
          {"★".repeat(5 - filled)}
        </span>
      </span>
      {showNumber && (
        <span className="tabular-nums text-[var(--color-fg)]">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
