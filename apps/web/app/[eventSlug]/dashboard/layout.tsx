import { redirect } from "next/navigation"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { DashboardBottomNav } from "@/components/public/DashboardBottomNav"

interface Props {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}

export default async function DashboardLayout({ children, params }: Props) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  return (
    // Full-screen overlay — covers public header/footer for app-like feel
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-lg">
          {children}
        </div>
      </div>

      <DashboardBottomNav eventSlug={eventSlug} />
    </div>
  )
}
