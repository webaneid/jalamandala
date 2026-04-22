import { redirect } from 'next/navigation'
import { getCurrentParticipantSession } from '@/lib/participant-session'

interface Props {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}

export default async function ParticipantDashboardLayout({ children, params }: Props) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}
