import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@repo/db"
import { participants } from "@repo/db/schema/public"
import { getCurrentParticipantSession } from "@/lib/participant-session"
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
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Profil</h1>
        <p className="mt-0.5 text-sm text-white/60">Perbarui informasi kontak Anda.</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
        <EditProfilForm defaultValues={participant} eventSlug={eventSlug} />
      </div>
    </div>
  )
}
