"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/** Карта названий товаров — приходит с сервера, чтобы чипса показывала имя, а не id. */
type ProductMap = Record<string, string>;

const MARKETPLACE_LABEL: Record<string, string> = {
  wb: "Wildberries",
  ozon: "Ozon",
};

const COMPLAINT_LABEL: Record<string, string> = {
  true: "только рекламации",
  false: "без рекламаций",
};

const MEDIA_LABEL: Record<string, string> = {
  any: "с фото или видео",
  photo: "только с фото",
  video: "только с видео",
};

export function FilterChips({ products }: { products: ProductMap }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [, start] = useTransition();

  const chips: { key: string; label: string }[] = [];

  const mp = sp.get("marketplace");
  if (mp) chips.push({ key: "marketplace", label: MARKETPLACE_LABEL[mp] || mp });

  const productId = sp.get("productId");
  if (productId)
    chips.push({
      key: "productId",
      label: products[productId] || `товар #${productId}`,
    });

  const rating = sp.get("rating");
  if (rating) {
    const list = rating.split(",").sort();
    chips.push({
      key: "rating",
      label: list.length === 1 ? `${list[0]}★` : `оценка: ${list.join(",")}`,
    });
  }

  const complaint = sp.get("complaint");
  if (complaint && COMPLAINT_LABEL[complaint])
    chips.push({ key: "complaint", label: COMPLAINT_LABEL[complaint] });

  const media = sp.get("media");
  if (media && MEDIA_LABEL[media])
    chips.push({ key: "media", label: MEDIA_LABEL[media] });

  const q = sp.get("q");
  if (q) chips.push({ key: "q", label: `поиск: «${q}»` });

  const sort = sp.get("sort");
  if (sort && sort !== "newest") {
    const sortLabels: Record<string, string> = {
      oldest: "сначала старые",
      "rating-asc": "сначала низкие оценки",
      "rating-desc": "сначала высокие оценки",
    };
    chips.push({ key: "sort", label: sortLabels[sort] || sort });
  }

  if (chips.length === 0) return null;

  const remove = (key: string) => {
    const next = new URLSearchParams(sp);
    next.delete(key);
    next.delete("page");
    start(() => router.push(`/reviews?${next.toString()}`));
  };

  const clear = () => {
    start(() => router.push("/reviews"));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-[var(--color-muted)]">Фильтры:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={() => remove(c.key)}
          className="group flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-elev-2)] px-2.5 py-1 hover:border-[var(--color-bad)] hover:text-[var(--color-bad)]"
          title={`Убрать: ${c.label}`}
        >
          <span>{c.label}</span>
          <span className="text-[var(--color-muted)] group-hover:text-[var(--color-bad)]">
            ✕
          </span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={clear}
          className="text-[var(--color-muted)] underline-offset-2 hover:text-[var(--color-fg)] hover:underline"
        >
          сбросить всё
        </button>
      )}
    </div>
  );
}
