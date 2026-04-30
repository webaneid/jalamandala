import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@repo/db"
import { participants } from "@repo/db/schema/public"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { DashboardSubpageHeader } from "@/components/public/DashboardSubpageHeader"
import { EditProfilForm } from "@/components/public/EditProfilForm"

export const metadata = {
  title: "Edit Profil",
}

export default async function EditProfilPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, session.participantId),
    columns: { name: true, email: true, phone: true, whatsapp: true },
  })

  if (!participant) redirect(`/${eventSlug}/login`)

  return (
    <div>
      <DashboardSubpageHeader title="Edit Profil" subtitle="Perbarui informasi kontak Anda." />
      <div className="px-4 pt-5 pb-8">
        {/* White card — same pattern as profil page cards. Explicit text overrides
            because FieldShell labels are text-white/80 (dark theme default). */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [&_input]:!text-slate-900 [&_label]:!text-slate-700 [&_p.text-xs]:!text-slate-500">
          <EditProfilForm defaultValues={participant} eventSlug={eventSlug} />
        </div>
      </div>
    </div>
  )
}
