import Link from "next/link"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { PublicBookingClient } from "@/components/public/PublicBookingClient"
import { PublicAddonStep } from "@/components/public/PublicAddonStep"
import { PublicTermsStep } from "@/components/public/PublicTermsStep"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { getPublicZoneForBooking, getPublicAddons, getEligibleZonesForBooking } from "@/lib/public-booth-data"
import { getActiveTermsPage } from "@/actions/terms-approval"
import { db } from "@repo/db"
import { participants, participantBusinesses } from "@repo/db/schema/public"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

function parseAddonsParam(raw: string | undefined): Array<{ addonId: string; quantity: number }> {
  if (!raw) return []
  return raw
    .split(",")
    .map((part) => {
      const [addonId, qty] = part.split(":")
      const quantity = parseInt(qty ?? "0", 10)
      return addonId && quantity > 0 ? { addonId, quantity } : null
    })
    .filter((x): x is { addonId: string; quantity: number } => x !== null)
}


export const metadata = {
  title: "Booking Booth",
};

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>
  searchParams?: Promise<{
    zone?: string
    businessId?: string
    boothIds?: string
    termsStep?: string
    addons?: string
  }>
}) {
  const { eventSlug } = await params
  const sp = await searchParams
  const zoneSlug = sp?.zone ?? ""
  const selectedBusinessId = sp?.businessId ?? ""
  const selectedBoothIds = sp?.boothIds?.split(",").filter(Boolean) ?? []
  const showTermsStep = sp?.termsStep === "1"
  const selectedAddons = parseAddonsParam(sp?.addons)

  const session = await getCurrentParticipantSession()
  if (!session || session.eventSlug !== eventSlug) {
    const next = `/${eventSlug}/booking${zoneSlug ? `?zone=${encodeURIComponent(zoneSlug)}` : ""}`
    redirect(`/${eventSlug}/login?next=${encodeURIComponent(next)}`)
  }

  const [participantData, businesses] = await Promise.all([
    db.query.participants.findFirst({
      where: eq(participants.id, session.participantId),
      columns: { id: true, organizationGroupSlug: true },
    }),
    db.query.participantBusinesses.findMany({
      where: eq(participantBusinesses.participantId, session.participantId),
      columns: { id: true, companyName: true, boothName: true, productTags: true, requestedBoothCategorySlug: true },
    }),
  ])

  if (businesses.length === 0) {
    const nextParam = `next=booking${zoneSlug ? `&zone=${encodeURIComponent(zoneSlug)}` : ""}`
    redirect(`/${eventSlug}/usaha/baru?${nextParam}`)
  }

  const activeBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? null
  const bookingBase = `/${eventSlug}/booking${zoneSlug ? `?zone=${encodeURIComponent(zoneSlug)}` : ""}`

  const [allZones, termsPage] = await Promise.all([
    getEligibleZonesForBooking(
      { organizationGroupSlug: participantData?.organizationGroupSlug ?? null },
      { requestedBoothCategorySlug: activeBusiness?.requestedBoothCategorySlug ?? null }
    ),
    getActiveTermsPage(eventSlug),
  ])

  const zoneData =
    activeBusiness && zoneSlug
      ? await getPublicZoneForBooking(
          zoneSlug,
          { organizationGroupSlug: participantData?.organizationGroupSlug ?? null },
          { requestedBoothCategorySlug: activeBusiness.requestedBoothCategorySlug ?? null }
        )
      : null

  const selectedBooths = zoneData
    ? zoneData.booths.filter((b) => selectedBoothIds.includes(b.id))
    : []

  const addons = selectedBooths.length > 0 && !showTermsStep ? await getPublicAddons() : []

  const boothChangeHref = `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}`
  const boothIdsParam = selectedBoothIds.length > 0 ? `&boothIds=${selectedBoothIds.join(",")}` : ""

  const currentStep = showTermsStep ? 5
    : selectedBoothIds.length > 0 && zoneSlug && selectedBusinessId ? 4
    : zoneSlug && selectedBusinessId ? 3
    : selectedBusinessId ? 2
    : 1

  const STEPS = ["Usaha", "Zona", "Booth", "Add-on", "S&K"]

  const backHref = currentStep === 1 ? `/${eventSlug}/dashboard`
    : currentStep === 2 ? `/${eventSlug}/booking`
    : currentStep === 3 ? `/${eventSlug}/booking?businessId=${selectedBusinessId}`
    : currentStep === 4 ? `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}`
    : `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}${boothIdsParam}`

  const stepTitle = currentStep === 1 ? "Pilih Usaha"
    : currentStep === 2 ? "Pilih Zona"
    : currentStep === 3 ? `Pilih Booth${zoneData ? ` · Zona ${zoneData.name}` : ""}`
    : currentStep === 4 ? `Add-on${selectedBooths.length > 1 ? ` · ${selectedBooths.length} Booth` : ""}`
    : "Syarat & Ketentuan"

  return (
    <div className="min-h-screen">
      {/* ── Sticky sub-header (below the main header at top-14) ── */}
      <div className="sticky top-14 z-40 border-b border-white/8 bg-[#04101f]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[720px] px-5 pb-3 pt-3">
          {/* Back + title */}
          <div className="mb-3 flex items-center gap-3">
            <Link
              href={backHref}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/60 transition hover:bg-white/14 hover:text-white"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Booking Booth</p>
              <p className="truncate text-sm font-bold text-white">{stepTitle}</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => {
              const stepNum = i + 1
              const done = stepNum < currentStep
              const active = stepNum === currentStep
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1">
                  <div className={[
                    "h-1 w-full rounded-full transition-all",
                    done ? "bg-[#00adee]" : active ? "bg-[#00adee]/40" : "bg-white/12",
                  ].join(" ")} />
                  <span className={[
                    "text-[9px] font-semibold",
                    done || active ? "text-[#00adee]" : "text-white/25",
                  ].join(" ")}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-[720px] space-y-4 px-5 py-5">

        {/* STEP 1 — Pilih Usaha */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-white/40">Pilih usaha yang akan booking booth.</p>
            {businesses.map((biz) => {
              const href = `/${eventSlug}/booking?businessId=${biz.id}`
              return (
                <Link
                  key={biz.id}
                  href={href}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/5 px-5 py-4 transition active:scale-[.99] hover:bg-white/8"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#134397]/50">
                    <span className="text-sm font-bold text-[#00adee]">
                      {biz.companyName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{biz.companyName}</p>
                    {biz.boothName && biz.boothName !== biz.companyName && (
                      <p className="truncate text-xs text-white/45">{biz.boothName}</p>
                    )}
                    {(biz.productTags?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {biz.productTags!.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/45">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="size-4 shrink-0 text-white/20" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                  </svg>
                </Link>
              )
            })}

            <Link
              href={`/${eventSlug}/usaha/baru?next=booking`}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/12 px-5 py-4 text-sm font-medium text-white/40 transition hover:border-[#00adee]/40 hover:text-[#00adee]"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Tambah Usaha Baru
            </Link>
          </div>
        )}

        {/* STEP 2 — Pilih Zona */}
        {currentStep === 2 && activeBusiness && (
          <div className="space-y-3">
            {/* Recap biz */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#134397]/50">
                <span className="text-xs font-bold text-[#00adee]">{activeBusiness.companyName.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/40">Usaha dipilih</p>
                <p className="truncate font-semibold text-white">{activeBusiness.companyName}</p>
              </div>
              <Link href={`/${eventSlug}/booking`} className="shrink-0 text-xs font-medium text-[#00adee]">Ganti</Link>
            </div>

            <p className="pt-1 text-xs text-white/40">Pilih zona yang ingin Anda booking.</p>
            <div className="space-y-3">
              {allZones.map((z) => {
                const href = `/${eventSlug}/booking?zone=${encodeURIComponent(z.slug)}&businessId=${selectedBusinessId}`
                return (
                  <Link
                    key={z.id}
                    href={href}
                    className="block overflow-hidden rounded-2xl border border-white/8 bg-white/5 transition active:scale-[.99] hover:bg-white/8"
                  >
                    {/* Zone image / color banner */}
                    {z.imageAssetId ? (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={`/api/media/${z.imageAssetId}`}
                          alt={z.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="aspect-video w-full flex items-center justify-center"
                        style={{
                          background: z.colorCode
                            ? `linear-gradient(135deg, ${z.colorCode}30, ${z.colorCode}10)`
                            : "linear-gradient(135deg, rgba(19,67,151,0.30), rgba(0,173,238,0.10))",
                        }}
                      >
                        <span className="text-2xl font-bold" style={{ color: z.colorCode ?? "#00adee" }}>
                          {z.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-5 py-3">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: z.colorCode ?? "#00adee" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{z.name}</p>
                        {z.location && (
                          <p className="mt-0.5 text-xs text-white/40">{z.location}</p>
                        )}
                      </div>
                      <svg className="size-4 shrink-0 text-white/20" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 3 — Pilih Booth */}
        {currentStep === 3 && activeBusiness && zoneData && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <span
                className="size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: zoneData.colorCode ?? "#00adee" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/40">Zona dipilih</p>
                <p className="font-semibold text-white">{zoneData.name}</p>
              </div>
              <Link
                href={`/${eventSlug}/booking?businessId=${selectedBusinessId}`}
                className="shrink-0 text-xs font-medium text-[#00adee]"
              >
                Ganti
              </Link>
            </div>
            {zoneData.location && (
              <p className="pt-1 text-xs text-white/40">{zoneData.location}</p>
            )}
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5 p-4">
              <PublicBookingClient
                businessId={selectedBusinessId}
                eventSlug={eventSlug}
                zone={zoneData}
              />
            </div>
          </div>
        )}

        {/* STEP 4 — Add-on */}
        {currentStep === 4 && activeBusiness && selectedBooths.length > 0 && zoneData && !showTermsStep && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <div className="mb-1 flex items-center gap-2">
                <svg className="size-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
                </svg>
                <p className="text-xs text-white/40">Booth dipilih</p>
                <Link href={boothChangeHref} className="ml-auto text-xs font-medium text-[#00adee]">Ganti</Link>
              </div>
              <p className="font-semibold text-white">
                Zona {zoneData.name} · {selectedBooths.map((b) => b.code).join(", ")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <PublicAddonStep
                addons={addons}
                boothIds={selectedBoothIds}
                boothChangeHref={boothChangeHref}
                businessId={selectedBusinessId}
                eventSlug={eventSlug}
                participantId={session.participantId}
                zone={zoneData}
              />
            </div>
          </div>
        )}

        {/* STEP 5 — S&K */}
        {currentStep === 5 && activeBusiness && selectedBooths.length > 0 && zoneData && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
              <svg className="size-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
              </svg>
              <p className="flex-1 text-sm font-semibold text-white">
                {activeBusiness.companyName} · Zona {zoneData.name} · {selectedBooths.map((b) => b.code).join(", ")}
              </p>
            </div>

            {termsPage ? (
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <PublicTermsStep
                  addons={selectedAddons}
                  booths={selectedBooths}
                  businessId={selectedBusinessId}
                  eventSlug={eventSlug}
                  participantId={session.participantId}
                  termsPage={termsPage}
                  zone={zoneData}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-5 text-sm text-amber-300">
                Dokumen syarat & ketentuan belum tersedia. Hubungi admin untuk melanjutkan booking.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
