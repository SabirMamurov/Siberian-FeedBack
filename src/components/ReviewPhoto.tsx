"use client";

import { useState } from "react";

/**
 * <img> с фолбэком при ошибке загрузки.
 * Используется в галерее /reviews/[id] — чтобы при VPN/региональной блокировке
 * WB CDN пользователь видел осмысленную плашку, а не сломанную иконку с alt-текстом.
 */
export function ReviewPhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={
          "flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--color-elev-1)] p-2 text-center text-[var(--color-muted)] " +
          (className || "")
        }
        title={src}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-[10px] leading-tight">фото недоступно</span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}
