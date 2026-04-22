import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { getVendorsForDisbursement } from '@/actions/disbursements';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { DisbursementForm } from '@/components/admin/finance/DisbursementForm';

export default async function TambahPencairanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/admin/login');

  const vendorsResult = await getVendorsForDisbursement();
  const vendors = vendorsResult.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Keuangan · Pencairan Dana"
        title="Buat Permohonan Pencairan"
        description="Isi detail pengeluaran dan rekening tujuan transfer."
      />
      <DisbursementForm
        currentUserId={session.user.id}
        currentUserName={session.user.name}
        vendors={vendors}
      />
    </div>
  );
}
