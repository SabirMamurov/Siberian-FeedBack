"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ProductActiveToggle({
  productId,
  initial,
}: {
  productId: number;
  initial: boolean;
}) {
  const [active, setActive] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const toggle = () => {
    const next = !active;
    setActive(next);
    start(async () => {
      const r = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!r.ok) {
        setActive(!next);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors " +
        (active
          ? "border-[var(--color-good)] bg-[var(--color-good-soft)] text-[var(--color-good)]"
          : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-good)] hover:text-[var(--color-good)]")
      }
    >
      {active ? "● активен" : "○ архив"}
    </button>
  );
}
