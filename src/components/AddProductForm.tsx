"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AddProductForm() {
  const [externalId, setExternalId] = useState("");
  const [code, setCode] = useState("wb");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = externalId.trim();
    if (!id) {
      setError("Укажите артикул");
      return;
    }
    start(async () => {
      const r = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketplaceCode: code, externalId: id }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || `HTTP ${r.status}`);
        return;
      }
      setExternalId("");
      router.refresh();
    });
  };

  // URL карточки WB → извлекаем nmId
  const normalize = (raw: string) => {
    const m = raw.match(/\/catalog\/(\d+)\//) || raw.match(/(\d{6,})/);
    return m ? m[1] : raw;
  };

  const inputClass =
    "h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-elev-1)] px-3 text-sm outline-none focus:border-[var(--color-accent)]";

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elev-2)] p-4"
    >
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <Field label="Площадка">
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          >
            <option value="wb">Wildberries</option>
            <option value="ozon">Ozon</option>
          </select>
        </Field>
        <Field
          label="Артикул или ссылка на карточку"
          className="min-w-[300px] flex-1"
        >
          <input
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(normalize(e.target.value))}
            placeholder="208373562  или  wildberries.ru/catalog/208373562/detail.aspx"
            className={inputClass}
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-[var(--color-accent)] px-4 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Добавляю…" : "Добавить"}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-[var(--color-bad)]">{error}</div>
      )}
    </form>
  );
}

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
