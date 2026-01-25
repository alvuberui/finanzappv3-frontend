"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
  badge?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Navbar({
  subtitle = "Finanzas personales",
}: {
  subtitle?: string;
}) {
  const pathname = usePathname();

  const items: NavItem[] = useMemo(
    () => [
      { href: "/app/tags", label: "Etiquetas" },
      { href: "/app/movements/create", label: "Crear movimiento" },
      { href: "/app/user", label: "Perfil" },
    ],
    []
  );

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <header className="w-full bg-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand */}
          <Link href="/app" className="flex flex-col select-none">
            <span className="text-2xl font-extrabold tracking-tight text-white">
              FinanzApp
            </span>
            <span className="text-[11px] text-gray-400 -mt-1">
              {subtitle}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-wrap items-center gap-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition",
                  isActive(item.href)
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            ))}

            {/* Logout */}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-0 md:ml-2 px-4 py-2 rounded-full text-sm font-semibold transition
                         text-red-300 hover:text-red-200 hover:bg-red-500/10"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>

        {/* Separador sutil */}
        <div className="mt-4 h-px bg-white/5" />
      </div>
    </header>
  );
}
