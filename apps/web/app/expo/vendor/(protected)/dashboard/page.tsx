import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowRight, Map, Package } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorDashboardStats } from '@/actions/vendors';

export default async function VendorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/expo/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });
  if (!vendor) redirect('/expo/vendor/login');

  const stats = await getVendorDashboardStats(vendor.id);
  const isBoothVendor = vendor.vendorType === 'booth';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border/80 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Selamat datang</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{vendor.name}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isBoothVendor ? 'Vendor Booth' : 'Vendor Add-on'} · FORBIS National Economic Summit 2026
        </p>
        {vendor.notes && (
          <p className="mt-3 rounded-xl bg-neutral-50 px-4 py-2.5 text-sm text-muted-foreground border border-border/60">
            {vendor.notes}
          </p>
        )}
      </div>

      {/* Stats */}
      {stats && isBoothVendor && stats.type === 'booth' && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Zona Ditugaskan" value={String(stats.zones.length)} />
            <StatCard label="Booth Terisi" value={String(stats.totalBooted)} />
            <StatCard label="Total Booth" value={String(stats.totalBooths)} className="col-span-2 sm:col-span-1" />
          </div>

          {stats.zones.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border/60 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ringkasan per Zona</p>
              </div>
              <div className="divide-y divide-border/40">
                {stats.zones.map((z) => (
                  <div key={z.slug} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Map className="size-4" />
                      </div>
                      <span className="font-medium text-sm">{z.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="tabular-nums text-muted-foreground">{z.total} booth</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${z.booked > 0 ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {z.booked} terisi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ActionCard href="/expo/vendor/booths" icon={Map} color="blue" title="Lihat Data Booth" description="Daftar tenant lengkap di zona Anda" />
        </>
      )}

      {stats && !isBoothVendor && stats.type === 'addon' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Add-on Ditugaskan" value={String(stats.addons.length)} />
            <StatCard label="Total Pesanan" value={String(stats.totalOrders)} />
          </div>

          {stats.addons.length > 0 && (
            <div className="rounded-2xl border border-border/80 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-border/60 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ringkasan per Add-on</p>
              </div>
              <div className="divide-y divide-border/40">
                {stats.addons.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Package className="size-4" />
                      </div>
                      <span className="font-medium text-sm">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="tabular-nums text-muted-foreground">{a.orderCount} pesanan</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.totalQty > 0 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {a.totalQty} unit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ActionCard href="/expo/vendor/addons" icon={Package} color="amber" title="Lihat Detail Pesanan" description="Rincian order add-on per booth" />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/80 bg-white p-5 shadow-sm ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function ActionCard({ href, icon: Icon, color, title, description }: {
  href: string; icon: React.ElementType; color: 'blue' | 'amber'; title: string; description: string;
}) {
  const cls = {
    blue: { wrap: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100', icon: 'bg-blue-100 text-blue-600' },
    amber: { wrap: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100', icon: 'bg-amber-100 text-amber-600' },
  }[color];

  return (
    <Link href={href} className={`flex items-center justify-between rounded-2xl border p-5 transition ${cls.wrap}`}>
      <div className="flex items-center gap-4">
        <div className={`inline-flex size-11 items-center justify-center rounded-xl ${cls.icon}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs opacity-70">{description}</p>
        </div>
      </div>
      <ArrowRight className="size-4 opacity-60" />
    </Link>
  );
}
