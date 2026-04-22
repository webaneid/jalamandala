import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Download, MapPin } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorBoothData } from '@/actions/vendors';
import { VendorExportButton } from '@/components/vendor/VendorExportButton';

export default async function VendorBoothsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/expo/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });

  if (!vendor || vendor.vendorType !== 'booth') {
    redirect('/expo/vendor/dashboard');
  }

  const data = await getVendorBoothData(vendor.id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Data Booth</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">Daftar Tenant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.length} booth dari zona yang ditugaskan.
          </p>
        </div>
        {data.length > 0 && (
          <VendorExportButton type="booth" vendorId={vendor.id} />
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-white py-20 text-center shadow-sm">
          <MapPin className="size-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Belum ada booth yang terisi di zona Anda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Kode Booth
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Zona
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nama Booth
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nama Usaha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pemesan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono font-medium">{row.boothCode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.zoneName}</td>
                    <td className="px-4 py-3">{row.tenantBoothName}</td>
                    <td className="px-4 py-3 font-medium">{row.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.participantName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
