"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-white/70 bg-white/48 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between transition-[height] duration-300 lg:h-28">
          <Link href={`/${event.slug}`} className="flex items-center">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={event.name}
                className="block h-16 w-auto max-w-[320px] object-contain object-left lg:h-[100px] lg:max-w-[420px]"
              />
            ) : (
              <span className="max-w-[200px] truncate font-semibold text-slate-900 sm:max-w-none">
                {event.name}
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            {menus.map((menu) => (
              <Link
                key={menu.id}
                href={menu.href}
                target={menu.openInNewTab ? "_blank" : undefined}
                rel={menu.openInNewTab ? "noopener noreferrer" : undefined}
                className="transition-colors hover:text-slate-900"
              >
                {menu.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
