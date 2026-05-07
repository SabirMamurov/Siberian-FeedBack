"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ComplaintToggle({
  reviewId,
  initial,
}: {
  reviewId: number;
  initial: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = !value;
    setValue(next);
    start(async () => {
      try {
        const r = await fetch(`/api/reviews/${reviewId}/complaint`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isComplaint: next }),
        });
        if (!r.ok) throw new Error(await r.text());
        router.refresh();
      } catch {
        setValue(!next);
      }
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors " +
        (value
          ? "border-[var(--color-bad)] bg-[var(--color-bad-soft)] text-[var(--color-bad)]"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-bad)] hover:text-[var(--color-bad)]")
      }
      title={value ? "Снять метку рекламации" : "Отметить как рекламацию"}
    >
      {value ? "✓ рекламация" : "+ рекламация"}
    </button>
  );
}
