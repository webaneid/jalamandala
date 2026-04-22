import { headers } from 'next/headers';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getDisbursements } from '@/actions/disbursements';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Button } from '@/components/ui/button';
import { DisbursementList } from '@/components/admin/finance/DisbursementList';

export default async function PencairanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const result = await getDisbursements();
  const rows = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Keuangan · Uang Keluar"
          title="Pencairan Dana"
          description="Permohonan pengeluaran kas — dari pengajuan hingga konfirmasi transfer."
        />
        <Link href="/admin/keuangan/pencairan/tambah">
          <Button>
            <Plus className="mr-2 size-4" />
            Buat Permohonan
          </Button>
        </Link>
      </div>

      <DisbursementList
        rows={rows}
        currentUserId={session?.user.id ?? ''}
        currentUserName={session?.user.name ?? ''}
      />
    </div>
  );
}
