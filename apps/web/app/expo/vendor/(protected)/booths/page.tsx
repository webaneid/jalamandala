import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { MapPin } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorBoothData } from '@/actions/vendors';
import { VendorExportButton } from '@/components/vendor/VendorExportButton';

export const metadata = {
  title: "Booth Saya",
};

export default async function VendorBoothsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });

  if (!vendor || vendor.vendorType !== 'booth') {
    redirect('/vendor/dashboard');
  }

  const data = await getVendorBoothData(vendor.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00adee]">Data Booth</p>
          <h1 className="mt-0.5 text-2xl font-bold text-white">Daftar Tenant</h1>
          <p className="mt-1 text-sm text-white/40">{data.length} booth dari zona Anda</p>
        </div>
        {data.length > 0 && <VendorExportButton type="booth" vendorId={vendor.id} />}
      </div>

      {data.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-3xl py-20 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <MapPin className="size-10 text-white/20" />
          <p className="text-sm text-white/40">Belum ada booth yang terisi di zona Anda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((row, i) => (
            <div
              key={i}
              className="rounded-2xl px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-lg bg-[#134397]/60 px-2.5 py-1 font-mono text-xs font-bold text-[#00adee]">
                  {row.boothCode}
                </span>
                <span className="text-xs text-white/35">{row.zoneName}</span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-white">{row.companyName}</p>
              {row.tenantBoothName && row.tenantBoothName !== row.companyName && (
                <p className="text-xs text-white/50">{row.tenantBoothName}</p>
              )}
              <p className="mt-1 text-xs text-white/35">Pemesan: {row.participantName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
