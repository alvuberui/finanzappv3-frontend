"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: "dashboard" | "tag" | "plus" | "user";
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function NavIcon({ name }: { name: NavItem["icon"] }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/[0.06] text-slate-300 transition group-hover:bg-violet-400/15 group-hover:text-violet-200">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[17px] w-[17px]"
      >
        {name === "dashboard" ? (
          <>
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </>
        ) : name === "tag" ? (
          <>
            <path d="M20 13.5 13.5 20a2 2 0 0 1-2.8 0L4 13.3V4h9.3L20 10.7a2 2 0 0 1 0 2.8Z" />
            <circle cx="8.5" cy="8.5" r="1" />
          </>
        ) : name === "plus" ? (
          <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v8M8 12h8" />
          </>
        ) : (
          <>
            <circle cx="12" cy="8" r="3" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </>
        )}
      </svg>
    </span>
  );
}

export default function Navbar({ subtitle = "Finanzas personales" }: { subtitle?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const items: NavItem[] = useMemo(
    () => [
      { href: "/app", label: "Resumen", shortLabel: "Inicio", icon: "dashboard" },
      { href: "/app/tags", label: "Etiquetas", shortLabel: "Tags", icon: "tag" },
      { href: "/app/movements/create", label: "Nuevo movimiento", shortLabel: "Nuevo", icon: "plus" },
      { href: "/app/user", label: "Perfil", shortLabel: "Perfil", icon: "user" },
    ],
    []
  );

  const isActive = (href: string) =>
    href === "/app" ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07111f]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/app" className="group flex shrink-0 items-center gap-3" aria-label="Ir al resumen">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-violet-500/20 transition group-hover:scale-105">
            F
          </span>
          <span className="hidden sm:block">
            <span className="block text-[1.05rem] font-extrabold tracking-tight text-white">FinanzApp</span>
            <span className="block text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-500">{subtitle}</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-1" aria-label="Navegación principal">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold sm:px-3",
                isActive(item.href)
                  ? "bg-white/[0.1] text-white shadow-inner shadow-white/[0.04]"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <NavIcon name={item.icon} />
              <span className="hidden lg:inline">{item.label}</span>
              <span className="lg:hidden">{item.shortLabel}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => router.push("/logout")}
          className="hidden rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-3 py-2 text-sm font-semibold text-rose-200 hover:border-rose-300/30 hover:bg-rose-400/10 sm:block"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
