/** Утилиты форматирования. Чисто, без локалей и зависимостей. */

const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июня",
  "июля",
  "авг",
  "сент",
  "окт",
  "нояб",
  "дек",
];

/** Короткая абсолютная дата вида "23 окт 2025". */
export function fmtDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Относительное время — «3 дня назад», «вчера», «только что». */
export function fmtRelative(d: Date, now: Date = new Date()): string {
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "только что";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "вчера";
  if (day < 7) return `${day} дн назад`;
  if (day < 30) return `${Math.floor(day / 7)} нед назад`;
  if (day < 365) return `${Math.floor(day / 30)} мес назад`;
  return `${Math.floor(day / 365)} г назад`;
}

/** CSS-переменная под цвет рейтинга (1..5 → bad..good). */
export function ratingColorVar(rating: number): string {
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  return `var(--rating-${r})`;
}

/** Имя для категории рейтинга — для бейджей и подсветок. */
export function ratingTone(rating: number): "bad" | "warn" | "good" {
  if (rating <= 2) return "bad";
  if (rating === 3) return "warn";
  return "good";
}
