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
    router.push('/expo/vendor/login');
  }

  const navItems = [
    { href: '/expo/vendor/dashboard', label: 'Dashboard', icon: LayoutGrid },
    ...(vendorType === 'booth'
      ? [{ href: '/expo/vendor/booths', label: 'Data Booth', icon: Map }]
      : [{ href: '/expo/vendor/addons', label: 'Order Add-on', icon: Package }]),
    { href: '/expo/vendor/pencairan', label: 'Pencairan Dana', icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Vendor Portal
            </p>
            <p className="text-sm font-semibold text-foreground">{vendorName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{userName}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:text-red-600"
              type="button"
            >
              <LogOut className="size-3" />
              Keluar
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5 pb-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-neutral-100 hover:text-foreground'
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
