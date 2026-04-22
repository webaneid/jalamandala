import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { Package } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorAddonData } from '@/actions/vendors';
import { VendorExportButton } from '@/components/vendor/VendorExportButton';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function VendorAddonsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/expo/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });

  if (!vendor || vendor.vendorType !== 'addon') {
    redirect('/expo/vendor/dashboard');
  }

  const data = await getVendorAddonData(vendor.id);

  const totalQty = data.reduce((sum, r) => sum + r.quantity, 0);
  const grandTagihan = data.reduce((sum, r) => sum + (r.vendorSubtotal ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Order Add-on</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">Daftar Pesanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.length} pesanan · total {totalQty} unit
          </p>
        </div>
        {data.length > 0 && (
          <VendorExportButton type="addon" vendorId={vendor.id} />
        )}
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Total Pesanan" value={String(data.length)} />
          <StatCard label="Total Unit" value={String(totalQty)} />
          <StatCard label="Total Tagihan ke FORBIS" value={formatCurrency(grandTagihan)} highlight />
        </div>
      )}

      {data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-white py-20 text-center shadow-sm">
          <Package className="size-10 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">Belum ada pesanan add-on untuk Anda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add-on</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kode Booth</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama Usaha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pemesan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">WhatsApp</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Harga/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-medium">{row.addonName}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{row.boothCode}</td>
                    <td className="px-4 py-3">{row.companyName}</td>
                    <td className="px-4 py-3 text-sm">{row.participantName}</td>
                    <td className="px-4 py-3">
                      {row.whatsapp !== '-' ? (
                        <a
                          href={`https://wa.me/${row.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-green-700 hover:underline"
                        >
                          {row.whatsapp}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.vendorPrice != null ? formatCurrency(row.vendorPrice) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {row.vendorSubtotal != null ? formatCurrency(row.vendorSubtotal) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 bg-neutral-50">
                  <td colSpan={5} className="px-4 py-3 text-sm font-semibold">Total Tagihan</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{totalQty}</td>
                  <td className="px-4 py-3 text-right" />
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-foreground">{formatCurrency(grandTagihan)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${highlight ? 'border-amber-200 bg-amber-50' : 'border-border/80 bg-white'}`}>
      <p className={`text-xs font-medium ${highlight ? 'text-amber-700' : 'text-muted-foreground'}`}>{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight ${highlight ? 'text-amber-800' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
