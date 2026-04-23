"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type PublicEventHeaderProps = {
  event: {
    slug: string;
    name: string;
  };
  logoSrc: string | null;
  menus: Array<{
    id: string;
    label: string;
    href: string;
    openInNewTab?: boolean | null;
  }>;
};

export function PublicEventHeader({ event, logoSrc, menus }: PublicEventHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#081d41]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-5">
          {/* Logo */}
          <Link href={`/${event.slug}`} className="flex items-center" onClick={() => setOpen(false)}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={event.name}
                className="h-8 w-auto max-w-[160px] object-contain object-left"
              />
            ) : (
              <span className="text-sm font-semibold text-white">{event.name}</span>
            )}
          </Link>

          {/* Desktop nav */}
          {menus.length > 0 && (
            <nav className="hidden items-center gap-1 md:flex">
              {menus.map((menu) => (
                <Link
                  key={menu.id}
                  href={menu.href}
                  target={menu.openInNewTab ? "_blank" : undefined}
                  rel={menu.openInNewTab ? "noopener noreferrer" : undefined}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium text-white/60 transition hover:bg-white/8 hover:text-white"
                >
                  {menu.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Mobile hamburger */}
          {menus.length > 0 && (
            <button
              className="flex size-9 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/8 hover:text-white md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile nav drawer */}
      {open && (
        <div className="fixed inset-x-0 top-14 z-40 border-b border-white/8 bg-[#081d41]/95 px-5 py-3 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1">
            {menus.map((menu) => (
              <Link
                key={menu.id}
                href={menu.href}
                target={menu.openInNewTab ? "_blank" : undefined}
                rel={menu.openInNewTab ? "noopener noreferrer" : undefined}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {menu.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
