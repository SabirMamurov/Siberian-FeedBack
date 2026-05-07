"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  productsScanned: number;
  reviewsAdded: number;
  reviewsUpdated: number;
  durationMs: number;
  errors: { nmId: string; message: string }[];
};

export function SyncButton() {
  const [pending, start] = useTransition();
  const [last, setLast] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = () => {
    setError(null);
    setLast(null);
    start(async () => {
      try {
        const r = await fetch("/api/sync/wb", { method: "POST" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        setLast(j);
        router.refresh();
      } catch (e) {
        setError(String((e as Error).message || e));
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Spinner spinning={pending} />
        {pending ? "Синхронизация…" : "Обновить (WB)"}
      </button>
      {last && !pending && (
        <span className="text-xs text-[var(--color-muted)]">
          товаров: {last.productsScanned}, новых:{" "}
          <span className="font-medium text-[var(--color-good)]">
            {last.reviewsAdded}
          </span>
          , обновлено: {last.reviewsUpdated}, {(last.durationMs / 1000).toFixed(1)}{" "}
          с
          {last.errors.length > 0 && (
            <span className="text-[var(--color-bad)]">
              {" · ошибок: "}
              {last.errors.length}
            </span>
          )}
        </span>
      )}
      {error && <span className="text-xs text-[var(--color-bad)]">{error}</span>}
    </div>
  );
}

function Spinner({ spinning }: { spinning: boolean }) {
  if (!spinning)
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 8a5 5 0 1 0 1.46-3.54M3 3v3h3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
