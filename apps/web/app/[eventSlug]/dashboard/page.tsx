import Link from 'next/link'
import { getCurrentParticipantSession } from '@/lib/participant-session'
import { db } from '@repo/db'
import { participants, participantBusinesses } from '@repo/db/schema/public'
import { eq } from 'drizzle-orm'

interface Props {
  params: Promise<{ eventSlug: string }>
}

export default async function ParticipantDashboardPage({ params }: Props) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  // session guaranteed by layout, cast is safe
  const participantData = await db.query.participants.findFirst({
    where: eq(participants.id, session!.participantId),
    with: { businesses: true },
  })

  const isProfileComplete = participantData && participantData.name !== 'Peserta Baru'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Halo, {participantData?.name ?? 'Peserta'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">{participantData?.whatsapp}</p>
      </div>

      {!isProfileComplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <div className="mt-0.5 size-5 shrink-0 rounded-full bg-amber-400 text-white flex items-center justify-center text-xs font-bold">!</div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Lengkapi profil Anda</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Profil Anda belum lengkap. Lengkapi data peserta untuk dapat memilih booth.
            </p>
            <Link
              href={`/${eventSlug}/onboarding`}
              className="mt-2 inline-block text-sm font-semibold text-amber-800 underline underline-offset-2"
            >
              Lengkapi Sekarang →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Profil Peserta"
          description={isProfileComplete ? participantData.name : 'Belum dilengkapi'}
          href={`/${eventSlug}/profil`}
          status={isProfileComplete ? 'ok' : 'warn'}
        />
        <DashboardCard
          title="Usaha Saya"
          description={`${participantData?.businesses?.length ?? 0} usaha terdaftar`}
          href={`/${eventSlug}/usaha`}
          status={(participantData?.businesses?.length ?? 0) > 0 ? 'ok' : 'empty'}
        />
        <DashboardCard
          title="Invoice"
          description="Lihat tagihan & status pembayaran"
          href={`/${eventSlug}/invoice`}
          status="empty"
        />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  description,
  href,
  status,
}: {
  title: string
  description: string
  href: string
  status: 'ok' | 'warn' | 'empty'
}) {
  const colors = {
    ok: 'border-emerald-200 bg-emerald-50',
    warn: 'border-amber-200 bg-amber-50',
    empty: 'border-slate-200 bg-white',
  }

  return (
    <Link
      href={href}
      className={`block rounded-xl border p-5 transition hover:shadow-md ${colors[status]}`}
    >
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  )
}
