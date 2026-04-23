'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LayoutGrid, Map, Package, LogOut, Banknote } from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  vendorName: string;
  vendorType: 'booth' | 'addon';
  userName: string;
};

export function VendorShell({ children, vendorName, vendorType, userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push('/vendor/login');
  }

  const navItems = [
    { href: '/vendor/dashboard', label: 'Dashboard', icon: LayoutGrid },
    ...(vendorType === 'booth'
      ? [{ href: '/vendor/booths', label: 'Data Booth', icon: Map }]
      : [{ href: '/vendor/addons', label: 'Add-on', icon: Package }]),
    { href: '/vendor/pencairan', label: 'Pencairan', icon: Banknote },
  ];

  const initials = vendorName.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        background: 'linear-gradient(135deg, #050e1f 0%, #0a1f48 30%, #071630 55%, #040c1a 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(19,67,151,0.28) 0%, transparent 55%), radial-gradient(ellipse 70% 40% at 50% 45%, rgba(0,173,238,0.07) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'linear-gradient(180deg, rgba(4,16,31,0.93) 0%, transparent 100%)' }}
      >
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00adee]">Vendor Portal</p>
            <p className="text-sm font-semibold text-white leading-tight">{vendorName}</p>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300"
          >
            <LogOut className="size-3" />
            Keluar
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[720px] px-4 pb-32 pt-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(4,16,31,0.6) 20%)',
        }}
      >
        <div className="mx-auto max-w-[720px] px-4 pb-6 pt-2">
          <div
            className="flex items-center justify-around rounded-[2rem] px-2 py-3"
            style={{
              background: 'rgba(13,28,60,0.82)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.40)',
            }}
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 transition',
                    active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  )}
                  aria-label={item.label}
                >
                  {active ? (
                    <span
                      className="flex items-center gap-2 rounded-full px-4 py-2"
                      style={{ background: 'linear-gradient(135deg, #134397, #00adee)' }}
                    >
                      <item.icon className="size-4 text-white" />
                      <span className="text-xs font-semibold text-white">{item.label}</span>
                    </span>
                  ) : (
                    <item.icon className="size-6 text-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
