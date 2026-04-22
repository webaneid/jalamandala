import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { userRoles, vendors } from '@repo/db/schema/public';
import { getVendorBoothData, getVendorAddonData } from '@/actions/vendors';

function escapeCell(value: string | number) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, session.user.id))
    .limit(1);

  if (!role.some((r) => r.role === 'vendor')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });

  if (!vendor || !vendor.isActive) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const type = request.nextUrl.searchParams.get('type');
  let csv = '';
  let filename = '';

  if (type === 'booth') {
    const data = await getVendorBoothData(vendor.id);
    const rows: string[][] = [
      ['No', 'Kode Booth', 'Zona', 'Nama Booth', 'Nama Usaha', 'Pemesan'],
      ...data.map((r, i) => [
        String(i + 1),
        r.boothCode,
        r.zoneName,
        r.tenantBoothName,
        r.companyName,
        r.participantName,
      ]),
    ];
    csv = toCsv(rows);
    filename = `vendor-booth-${vendor.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
  } else if (type === 'addon') {
    const data = await getVendorAddonData(vendor.id);
    const rows: string[][] = [
      ['No', 'Add-on', 'Kode Booth', 'Nama Usaha', 'Pemesan', 'WhatsApp', 'Qty', 'Harga/Unit', 'Tagihan'],
      ...data.map((r, i) => [
        String(i + 1),
        r.addonName,
        r.boothCode,
        r.companyName,
        r.participantName,
        r.whatsapp,
        String(r.quantity),
        r.vendorPrice != null ? String(r.vendorPrice) : '-',
        r.vendorSubtotal != null ? String(r.vendorSubtotal) : '-',
      ]),
    ];
    csv = toCsv(rows);
    filename = `vendor-addon-${vendor.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
