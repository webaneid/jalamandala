"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PublicBottomNavProps = {
  eventSlug: string;
  eventName: string;
  logoSrc: string | null;
};

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.2 8.2 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18s.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.16.25-.64.81-.78.97c-.15.17-.29.19-.53.07c-.26-.13-1.06-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.12-.24-.01-.39.11-.5c.11-.11.27-.29.37-.44c.13-.14.17-.25.25-.41c.08-.17.04-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.3-.01-.47-.01"/>
    </svg>
  );
}

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PublicBottomNav({ eventSlug, eventName, logoSrc }: PublicBottomNavProps) {
  const pathname = usePathname();

  const isHome = pathname === `/${eventSlug}` || pathname === `/${eventSlug}/`;
  const isAgenda = pathname.startsWith(`/${eventSlug}/agenda`);
  const isDashboard = pathname.startsWith(`/${eventSlug}/dashboard`);

  function navClass(active: boolean) {
    return [
      "flex flex-col items-center justify-center gap-1 transition",
      active ? "opacity-100" : "opacity-40 hover:opacity-70",
    ].join(" ");
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50"
      style={{
        background: "linear-gradient(180deg, transparent 0%, rgba(4,16,31,0.6) 20%)",
      }}
    >
      <div className="mx-auto max-w-[720px] px-4 pb-6 pt-2">
        <div
          className="flex items-center justify-around rounded-[2rem] px-2 py-4"
          style={{
            background: "rgba(13,28,60,0.82)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.40)",
          }}
        >
          {/* 1. Logo → Home */}
          <Link href={`/${eventSlug}`} className={navClass(isHome)} aria-label="Beranda">
            {isHome ? (
              <span
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: "linear-gradient(135deg, #134397, #00adee)" }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={eventName}
                    className="h-6 w-auto max-w-[90px] object-contain"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                ) : (
                  <svg className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M3 12L12 4l9 8v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                <span className="text-xs font-semibold text-white">Home</span>
              </span>
            ) : (
              logoSrc ? (
                <img
                  src={logoSrc}
                  alt={eventName}
                  className="h-8 w-auto max-w-[64px] object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <svg className="size-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path d="M3 12L12 4l9 8v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )
            )}
          </Link>

          {/* 2. Calendar → Agenda */}
          <Link href={`/${eventSlug}/agenda`} className={navClass(isAgenda)} aria-label="Agenda">
            <IconCalendar className="size-6 text-white" />
          </Link>

          {/* 3. Dashboard */}
          <Link href={`/${eventSlug}/dashboard`} className={navClass(isDashboard)} aria-label="Dashboard">
            <IconDashboard className="size-6 text-white" />
          </Link>

          {/* 4. WhatsApp Rotator */}
          <a
            href={`/api/wa-rotator/redirect?eventSlug=${eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={navClass(false)}
            aria-label="Hubungi Kami via WhatsApp"
          >
            <IconWhatsApp className="size-6 text-white" />
          </a>
        </div>
      </div>
    </nav>
  );
}
