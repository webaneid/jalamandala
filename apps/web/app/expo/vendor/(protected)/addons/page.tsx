import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Package } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorAddonData } from '@/actions/vendors';
import { VendorExportButton } from '@/components/vendor/VendorExportButton';

function fmt(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export const metadata = {
  title: "Add-on Saya",
};

export default async function VendorAddonsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });

  if (!vendor || vendor.vendorType !== 'addon') {
    redirect('/vendor/dashboard');
  }

  const data = await getVendorAddonData(vendor.id);
  const totalQty = data.reduce((sum, r) => sum + r.quantity, 0);
  const grandTagihan = data.reduce((sum, r) => sum + (r.vendorSubtotal ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00adee]">Order Add-on</p>
          <h1 className="mt-0.5 text-2xl font-bold text-white">Daftar Pesanan</h1>
          <p className="mt-1 text-sm text-white/40">{data.length} pesanan · {totalQty} unit</p>
        </div>
        {data.length > 0 && <VendorExportButton type="addon" vendorId={vendor.id} />}
      </div>

      {/* Summary cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-xs text-white/40">Total Unit</p>
            <p className="mt-1 text-3xl font-bold text-white">{totalQty}</p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(0,173,238,0.12)', border: '1px solid rgba(0,173,238,0.25)' }}
          >
            <p className="text-xs text-[#00adee]/80">Total Tagihan</p>
            <p className="mt-1 text-xl font-bold text-[#00adee] leading-tight">{fmt(grandTagihan)}</p>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-3xl py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Package className="size-10 text-white/20" />
          <p className="text-sm text-white/40">Belum ada pesanan add-on untuk Anda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((row, i) => (
            <div
              key={i}
              className="rounded-2xl px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{row.addonName}</p>
                  <p className="text-xs text-white/50">{row.companyName}</p>
                </div>
                <span className="rounded-lg bg-[#134397]/60 px-2.5 py-1 font-mono text-xs font-bold text-[#00adee]">
                  {row.boothCode}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{row.participantName}</span>
                  {row.whatsapp !== '-' && (
                    <a
                      href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {row.whatsapp}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40">{row.quantity} unit</span>
                  {row.vendorSubtotal != null && (
                    <span className="font-semibold text-white">{fmt(row.vendorSubtotal)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total footer */}
      {data.length > 0 && (
        <div
          className="flex items-center justify-between rounded-2xl px-5 py-4"
          style={{ background: 'rgba(19,67,151,0.3)', border: '1px solid rgba(19,67,151,0.5)' }}
        >
          <p className="text-sm font-semibold text-white">Total Tagihan ke FORBIS</p>
          <p className="font-bold text-[#00adee]">{fmt(grandTagihan)}</p>
        </div>
      )}
    </div>
  );
}
