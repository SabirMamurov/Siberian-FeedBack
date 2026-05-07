"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ReviewFilters({
  products,
}: {
  products: { id: number; name: string; marketplace: { code: string } }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") || "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    start(() => router.push(`/reviews?${next.toString()}`));
  };

  const ratings = (sp.get("rating") || "").split(",").filter(Boolean);
  const toggleRating = (r: string) => {
    const has = ratings.includes(r);
    const next = has ? ratings.filter((x) => x !== r) : [...ratings, r];
    set("rating", next.length ? next.sort().join(",") : null);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    set("q", q.trim() || null);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-4">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <Field label="Площадка">
          <select
            value={sp.get("marketplace") || ""}
            onChange={(e) => set("marketplace", e.target.value || null)}
            className={inputClass}
          >
            <option value="">все</option>
            <option value="wb">Wildberries</option>
            <option value="ozon">Ozon</option>
          </select>
        </Field>

        <Field label="Товар" className="min-w-[260px] flex-1">
          <select
            value={sp.get("productId") || ""}
            onChange={(e) => set("productId", e.target.value || null)}
            className={inputClass}
          >
            <option value="">все товары</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.marketplace.code}] {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Оценка">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => {
              const active = ratings.includes(String(r));
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRating(String(r))}
                  className={
                    "h-8 w-9 rounded-md border text-xs font-medium tabular-nums transition-colors " +
                    (active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-fg-strong)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]")
                  }
                  style={
                    active
                      ? {
                          borderColor: `var(--rating-${r})`,
                          color: `var(--rating-${r})`,
                          background: "transparent",
                        }
                      : undefined
                  }
                >
                  {r}★
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Рекламации">
          <select
            value={sp.get("complaint") || ""}
            onChange={(e) => set("complaint", e.target.value || null)}
            className={inputClass}
          >
            <option value="">все</option>
            <option value="true">только отмеченные</option>
            <option value="false">кроме отмеченных</option>
          </select>
        </Field>

        <Field label="Медиа">
          <select
            value={sp.get("media") || ""}
            onChange={(e) => set("media", e.target.value || null)}
            className={inputClass}
          >
            <option value="">все</option>
            <option value="any">с фото или видео</option>
            <option value="photo">только с фото</option>
            <option value="video">только с видео</option>
          </select>
        </Field>

        <Field label="Сортировка">
          <select
            value={sp.get("sort") || "newest"}
            onChange={(e) =>
              set("sort", e.target.value === "newest" ? null : e.target.value)
            }
            className={inputClass}
          >
            <option value="newest">сначала новые</option>
            <option value="oldest">сначала старые</option>
            <option value="rating-asc">сначала низкие</option>
            <option value="rating-desc">сначала высокие</option>
          </select>
        </Field>

        <Field label="Поиск по тексту" className="min-w-[200px]">
          <form onSubmit={submitSearch} className="flex gap-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="часть слова…"
              className={inputClass + " flex-1"}
            />
            <button
              type="submit"
              className="rounded-md border border-[var(--color-border)] px-2.5 text-xs hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              title="Искать"
            >
              ⌕
            </button>
          </form>
        </Field>
      </div>
    </div>
  );
}

const inputClass =
  "h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-elev-1)] px-2.5 text-sm outline-none focus:border-[var(--color-accent)]";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col " + (className || "")}>
      <label className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
