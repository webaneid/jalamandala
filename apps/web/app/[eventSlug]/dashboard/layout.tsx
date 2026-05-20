import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { DashboardBottomNav } from "@/components/public/DashboardBottomNav"

interface Props {
  children: React.ReactNode
  params: Promise<{ eventSlug: string }>
}

function isBusinessComplete(biz: {
  legalEntity: string | null
  businessCategory: string | null
  businessSector: string | null
  brandName: string | null
  companyDescription: string | null
  companyAddress: string | null
  productTags: string[] | null
  partnershipConcepts: string[] | null
}) {
  return !!(
    biz.legalEntity &&
    biz.businessCategory &&
    biz.businessSector &&
    biz.brandName &&
    biz.companyDescription &&
    biz.companyAddress &&
    biz.productTags && biz.productTags.length > 0 &&
    biz.partnershipConcepts && biz.partnershipConcepts.length > 0
  )
}

export default async function DashboardLayout({ children, params }: Props) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  // Gate: jika ada business yang belum lengkap, paksa lengkapi dulu
  const businesses = await db.query.participantBusinesses.findMany({
    where: eq(participantBusinesses.participantId, session.participantId),
    columns: {
      id: true,
      legalEntity: true,
      businessCategory: true,
      businessSector: true,
      brandName: true,
      companyDescription: true,
      companyAddress: true,
      productTags: true,
      partnershipConcepts: true,
    },
  })

  const firstIncomplete = businesses.find((b) => !isBusinessComplete(b))
  if (firstIncomplete) {
    redirect(`/${eventSlug}/usaha/${firstIncomplete.id}/lengkapi?next=/${eventSlug}/dashboard`)
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
