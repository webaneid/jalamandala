import { getCurrentParticipantSession } from "@/lib/participant-session"
import { getBoothFormOptions } from "@/lib/booth-form-options"
import { QuickBusinessForm } from "@/components/public/QuickBusinessForm"

interface Props {
  params: Promise<{ eventSlug: string }>
  searchParams?: Promise<{ next?: string; zone?: string }>
}

export default async function UsahaBaruPage({ params, searchParams }: Props) {
  const { eventSlug } = await params
  const sp = await searchParams
  const session = await getCurrentParticipantSession()

  const { boothCategories: allCategories } = await getBoothFormOptions()
  const boothCategories = allCategories.filter((c) => c.slug !== "free")

  const zone = sp?.zone
  const base = sp?.next === "booking" ? `/${eventSlug}/booking` : undefined
  const nextUrl = base && zone ? `${base}?zone=${encodeURIComponent(zone)}` : base

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tambah Usaha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isi data usaha yang akan didaftarkan untuk pameran.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <QuickBusinessForm
          boothCategories={boothCategories}
          eventSlug={eventSlug}
          nextUrl={nextUrl}
          participantId={session!.participantId}
        />
      </div>
    </div>
  )
}
