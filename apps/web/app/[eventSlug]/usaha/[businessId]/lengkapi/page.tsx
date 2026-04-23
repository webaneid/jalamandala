import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { getBoothFormOptions } from "@/lib/booth-form-options"
import { CompleteBusinessForm } from "@/components/public/CompleteBusinessForm"

interface Props {
  params: Promise<{ eventSlug: string; businessId: string }>
}

export default async function LengkapiUsahaPage({ params }: Props) {
  const { eventSlug, businessId } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  const business = await db.query.participantBusinesses.findFirst({
    where: eq(participantBusinesses.id, businessId),
  })

  if (!business || business.participantId !== session.participantId) {
    notFound()
  }

  const { boothCategories } = await getBoothFormOptions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lengkapi Data Usaha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lengkapi profil usaha <span className="font-medium text-slate-700">{business.companyName}</span> untuk keperluan pameran.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CompleteBusinessForm
          boothCategories={boothCategories}
          businessId={businessId}
          defaultValues={{
            brandName: business.brandName ?? "",
            boothName: business.boothName ?? "",
            companyName: business.companyName,
            requestedBoothCategorySlug: business.requestedBoothCategorySlug ?? "",
            companyDescription: business.companyDescription ?? "",
            companyPhone: business.companyPhone ?? "",
            companyWhatsapp: business.companyWhatsapp ?? "",
            companyAddress: business.companyAddress ?? "",
            companyProvinceCode: business.companyProvinceCode ?? "",
            companyProvinceName: business.companyProvinceName ?? "",
            companyRegencyCode: business.companyRegencyCode ?? "",
            companyRegencyName: business.companyRegencyName ?? "",
            companyDistrictCode: business.companyDistrictCode ?? "",
            companyDistrictName: business.companyDistrictName ?? "",
            companyVillageCode: business.companyVillageCode ?? "",
            companyVillageName: business.companyVillageName ?? "",
            legalEntity: business.legalEntity ?? "",
            businessCategory: business.businessCategory ?? "",
            businessSector: business.businessSector ?? "",
            productTags: business.productTags ?? [],
            partnershipConcepts: business.partnershipConcepts ?? [],
          }}
          eventSlug={eventSlug}
        />
      </div>
    </div>
  )
}
