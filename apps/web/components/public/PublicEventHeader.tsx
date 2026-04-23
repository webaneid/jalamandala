"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PublicEventHeaderProps = {
  eventSlug: string;
  eventName: string;
  startDate: string | null;
  participant: { name: string; eventSlug: string } | null;
};

/* ── Countdown logic ── */
function calcCountdown(targetIso: string) {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

function CountdownDisplay({ startDate, eventName }: { startDate: string; eventName: string }) {
  const [cd, setCd] = useState(() => calcCountdown(startDate));

  useEffect(() => {
    const id = setInterval(() => setCd(calcCountdown(startDate)), 60_000);
    return () => clearInterval(id);
  }, [startDate]);

  if (!cd) {
    return (
      <div>
        <p className="text-lg font-bold leading-tight text-white">{eventName}</p>
        <p className="text-[11px] font-medium text-white/45">Sedang berlangsung</p>
      </div>
    );
  }

  const parts: string[] = [];
  if (cd.days > 0) parts.push(`${cd.days} Hari`);
  if (cd.hours > 0 || cd.days > 0) parts.push(`${cd.hours} Jam`);
  if (cd.days === 0) parts.push(`${cd.minutes} Menit`);

  return (
    <div>
      <p className="text-xl font-extrabold leading-tight tracking-tight text-white">
        {parts.join(" ")}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-white/50">
        Menuju {eventName}
      </p>
    </div>
  );
}

/* ── Shop icon ── */
function IconStore({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9.5 5.5 3h13L21 9.5M3 9.5h18M3 9.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5M9 21V12h6v9"
      />
    </svg>
  );
}

/* ── Avatar initials ── */
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/* ── Avatar + dropdown ── */
function AvatarMenu({
  participant,
  eventSlug,
}: {
  participant: { name: string } | null;
  eventSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isLoggedIn = Boolean(participant);
  const initials = participant ? getInitials(participant.name) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/8 transition hover:bg-white/15 active:scale-95"
        aria-label="Akun"
      >
        {isLoggedIn && initials ? (
          <span className="text-xs font-bold text-white">{initials}</span>
        ) : (
          <svg
            className="size-5 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[160px] overflow-hidden rounded-2xl border border-white/12 bg-[#0d2451]/90 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.40)] backdrop-blur-xl">
          {isLoggedIn ? (
            <>
              <div className="border-b border-white/8 px-4 py-2.5">
                <p className="text-xs font-semibold text-white">{participant!.name}</p>
                <p className="text-[10px] text-white/35">Peserta terdaftar</p>
              </div>
              <Link
                href={`/${eventSlug}/dashboard`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <a
                href={`/api/public/logout?next=/${eventSlug}`}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 transition hover:bg-white/8 hover:text-red-300"
              >
                Keluar
              </a>
            </>
          ) : (
            <>
              <Link
                href={`/${eventSlug}/login`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Masuk
              </Link>
              <Link
                href={`/${eventSlug}/login?mode=register`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main header ── */
export function PublicEventHeader({
  eventSlug,
  eventName,
  startDate,
  participant,
}: PublicEventHeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-5 pt-0 sm:h-20 sm:pt-4">

          {/* LEFT — Countdown */}
          <div className="flex-1">
            {startDate ? (
              <CountdownDisplay startDate={startDate} eventName={eventName} />
            ) : (
              <div>
                <p className="text-lg font-bold leading-tight text-white">{eventName}</p>
              </div>
            )}
          </div>

          {/* RIGHT — Actions */}
          <div className="flex items-center gap-2">
            {/* Shop / zones icon */}
            <Link
              href={`/${eventSlug}#tenant`}
              className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/8 transition hover:bg-[#00adee]/20 hover:border-[#00adee]/30 active:scale-95"
              aria-label="Lihat Zona Booth"
            >
              <IconStore className="size-5 text-white/70 group-hover:text-[#00adee]" />
            </Link>

            {/* Avatar / user menu */}
            <AvatarMenu participant={participant} eventSlug={eventSlug} />
          </div>
      </div>
    </header>
  );
}
