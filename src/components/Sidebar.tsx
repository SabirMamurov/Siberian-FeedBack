"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  badge?: number | null;
  icon: React.ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  pendingComplaints = 0,
}: {
  pendingComplaints?: number;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Обзор",
      icon: <IconDashboard />,
    },
    {
      href: "/reviews",
      label: "Отзывы",
      icon: <IconReviews />,
    },
    {
      href: "/reviews?complaint=true",
      label: "Рекламации",
      badge: pendingComplaints || null,
      icon: <IconAlert />,
    },
    {
      href: "/products",
      label: "Товары",
      icon: <IconBox />,
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] flex-col border-r border-[var(--color-border)] bg-[var(--color-elev-1)]">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <IconLogo />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">
            Siberian Feedback
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
            Маркетплейс-отзывы
          </div>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-3">
        {items.map((it) => {
          // активность считаем по pathname (без query)
          const baseHref = it.href.split("?")[0];
          const active = it.href.includes("complaint=true")
            ? false // не подсвечиваем «Рекламации» когда мы на чистом /reviews
            : isActive(pathname, baseHref);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors " +
                (active
                  ? "bg-[var(--color-accent-soft)] text-[var(--color-fg-strong)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-elev-2)] hover:text-[var(--color-fg)]")
              }
            >
              <span
                className={active ? "text-[var(--color-accent)]" : ""}
                aria-hidden
              >
                {it.icon}
              </span>
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span className="rounded-full bg-[var(--color-bad-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-bad)]">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] px-5 py-3 text-[11px] text-[var(--color-muted)]">
        v0.1 · MVP
      </div>
    </aside>
  );
}

/* ─────────── inline icons (16px) — без зависимостей ─────────── */

function IconLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7 3.5-.5 6-3.5 6-7V4L8 1zm0 2.2L12 5v3c0 2.5-1.7 4.7-4 5.2-2.3-.5-4-2.7-4-5.2V5l4-1.8z" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="5" height="6" rx="1" />
      <rect x="9" y="2" width="5" height="3" rx="1" />
      <rect x="2" y="10" width="5" height="4" rx="1" />
      <rect x="9" y="7" width="5" height="7" rx="1" />
    </svg>
  );
}

function IconReviews() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6l-3 2.5V4z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 2L1.5 13.5h13L8 2z" />
      <line x1="8" y1="6" x2="8" y2="9.5" />
      <circle cx="8" cy="11.6" r="0.4" fill="currentColor" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M2 4.5L8 1.5l6 3v7L8 14.5l-6-3v-7z" />
      <path d="M2 4.5l6 3 6-3" />
      <path d="M8 7.5v7" />
    </svg>
  );
}
