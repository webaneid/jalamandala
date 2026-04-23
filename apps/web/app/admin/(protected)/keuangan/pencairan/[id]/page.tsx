import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getDisbursement, getPaymentChannelsForDisbursement } from '@/actions/disbursements';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { DisbursementDetail } from '@/components/admin/finance/DisbursementDetail';


export const metadata = {
  title: "Detail Pencairan",
};

export default async function DisbursementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/admin/login');

  const [result, channelsResult] = await Promise.all([
    getDisbursement(id),
    getPaymentChannelsForDisbursement(),
  ]);

  if (!result.success || !result.data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/keuangan/pencairan"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground hover:bg-neutral-50"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <AdminPageHeader
          eyebrow="Keuangan · Pencairan Dana"
          title="Detail Permohonan"
          description="Rincian pengajuan, status approval, dan konfirmasi transfer."
        />
      </div>

      <DisbursementDetail
        request={result.data}
        paymentChannels={channelsResult.data}
        currentUserId={session.user.id}
        currentUserName={session.user.name}
      />
    </div>
  );
}
