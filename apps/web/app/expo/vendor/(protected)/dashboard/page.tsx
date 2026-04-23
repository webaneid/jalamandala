import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Map, Package, Banknote, ArrowRight } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorDashboardStats } from '@/actions/vendors';

export const metadata = {
  title: "Dashboard",
};

export default async function VendorDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });
  if (!vendor) redirect('/vendor/login');

  const stats = await getVendorDashboardStats(vendor.id);
  const isBoothVendor = vendor.vendorType === 'booth';

  const initials = vendor.name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div
        className="relative overflow-hidden rounded-3xl px-5 pt-10 pb-8"
        style={{ background: 'linear-gradient(135deg, #134397 0%, #0a2a6e 100%)' }}
      >
        <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/5" />
        <div className="absolute top-4 -left-8 size-24 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs text-blue-200">Selamat datang,</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">{vendor.name}</h1>
            <p className="mt-0.5 text-xs text-blue-300">
              {isBoothVendor ? 'Vendor Booth' : 'Vendor Add-on'} · FORBIS 2026
            </p>
            {vendor.notes && (
              <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/70">{vendor.notes}</p>
            )}
          </div>
          <div className="flex size-11 items-center justify-center rounded-full border-2 border-white/30 bg-[#00adee] shadow-lg">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && isBoothVendor && stats.type === 'booth' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <DarkStatCard label="Zona" value={String(stats.zones.length)} />
            <DarkStatCard label="Terisi" value={String(stats.totalBooted)} accent />
            <DarkStatCard label="Total" value={String(stats.totalBooths)} />
          </div>

          {stats.zones.length > 0 && (
            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="border-b border-white/8 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                Ringkasan per Zona
              </p>
              <div className="divide-y divide-white/5">
                {stats.zones.map((z) => (
                  <div key={z.slug} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[#00adee]/15">
                        <Map className="size-4 text-[#00adee]" />
                      </div>
                      <span className="text-sm font-medium text-white">{z.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40 tabular-nums">{z.total} booth</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${z.booked > 0 ? 'bg-emerald-400/15 text-emerald-400' : 'bg-white/8 text-white/30'}`}>
                        {z.booked} terisi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DarkActionCard href="/vendor/booths" icon={Map} label="Lihat Data Booth" sub="Daftar tenant di zona Anda" />
        </>
      )}

      {stats && !isBoothVendor && stats.type === 'addon' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <DarkStatCard label="Add-on" value={String(stats.addons.length)} />
            <DarkStatCard label="Pesanan" value={String(stats.totalOrders)} accent />
          </div>

          {stats.addons.length > 0 && (
            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="border-b border-white/8 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                Ringkasan per Add-on
              </p>
              <div className="divide-y divide-white/5">
                {stats.addons.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[#00adee]/15">
                        <Package className="size-4 text-[#00adee]" />
                      </div>
                      <span className="text-sm font-medium text-white">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/40 tabular-nums">{a.orderCount} pesanan</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.totalQty > 0 ? 'bg-[#00adee]/15 text-[#00adee]' : 'bg-white/8 text-white/30'}`}>
                        {a.totalQty} unit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DarkActionCard href="/vendor/addons" icon={Package} label="Lihat Detail Pesanan" sub="Rincian order per booth" />
        </>
      )}

      <DarkActionCard href="/vendor/pencairan" icon={Banknote} label="Pencairan Dana" sub="Ajukan dan cek riwayat pencairan" />
    </div>
  );
}

function DarkStatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: accent ? 'rgba(0,173,238,0.12)' : 'rgba(255,255,255,0.05)',
        border: accent ? '1px solid rgba(0,173,238,0.25)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className={`text-xs font-medium ${accent ? 'text-[#00adee]/80' : 'text-white/40'}`}>{label}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${accent ? 'text-[#00adee]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function DarkActionCard({ href, icon: Icon, label, sub }: {
  href: string; icon: React.ElementType; label: string; sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl px-5 py-4 transition hover:opacity-80 active:scale-[.98]"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#134397]/60">
          <Icon className="size-5 text-[#00adee]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-white/40">{sub}</p>
        </div>
      </div>
      <ArrowRight className="size-4 text-white/30" />
    </Link>
  );
}
