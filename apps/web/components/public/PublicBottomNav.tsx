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

function IconStore({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 5.5 3h13L21 9.5M3 9.5h18M3 9.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5M9 21V12h6v9" />
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
  const isTenant = pathname.startsWith(`/${eventSlug}/booking`) || pathname.includes("#tenant");
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

          {/* 3. Store → Tenant/Booking */}
          <Link href={`/${eventSlug}#tenant`} className={navClass(isTenant)} aria-label="Tenant Expo">
            <IconStore className="size-6 text-white" />
          </Link>

          {/* 4. Dashboard */}
          <Link href={`/${eventSlug}/dashboard`} className={navClass(isDashboard)} aria-label="Dashboard">
            <IconDashboard className="size-6 text-white" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
