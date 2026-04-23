import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@repo/db';
import { vendors } from '@repo/db/schema/public';
import { getVendorDisbursements } from '@/actions/disbursements';
import { getVendorClaimableAmount } from '@/actions/vendors';
import { VendorPencairanPage } from '@/components/vendor/VendorPencairanPage';


export const metadata = {
  title: "Pencairan Dana",
};

export default async function PencairanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/vendor/login');

  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.userId, session.user.id),
  });
  if (!vendor) redirect('/vendor/login');

  const [{ data: disbursements }, claimable] = await Promise.all([
    getVendorDisbursements(vendor.id),
    getVendorClaimableAmount(vendor.id),
  ]);

  return (
    <VendorPencairanPage
      vendor={{
        id: vendor.id,
        name: vendor.name,
        bankName: vendor.bankName,
        bankAccount: vendor.bankAccount,
        bankAccountName: vendor.bankAccountName,
      }}
      currentUserId={session.user.id}
      currentUserName={session.user.name}
      disbursements={disbursements}
      claimable={claimable}
    />
  );
}
