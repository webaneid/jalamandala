import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, asc } from "drizzle-orm"

import { PublicBookingClient } from "@/components/public/PublicBookingClient"
import { PublicAddonStep } from "@/components/public/PublicAddonStep"
import { PublicTermsStep } from "@/components/public/PublicTermsStep"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { getPublicZoneForBooking, getPublicAddons } from "@/lib/public-booth-data"
import { getActiveTermsPage } from "@/actions/terms-approval"
import { db, createTenantDb } from "@repo/db"
import { participants, participantBusinesses } from "@repo/db/schema/public"
import { zones } from "@repo/db/schema/tenant"

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

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>
  searchParams?: Promise<{
    zone?: string
    businessId?: string
    boothId?: string
    termsStep?: string
    addons?: string
  }>
}) {
  const { eventSlug } = await params
  const sp = await searchParams
  const zoneSlug = sp?.zone ?? ""
  const selectedBusinessId = sp?.businessId ?? ""
  const selectedBoothId = sp?.boothId ?? ""
  const showTermsStep = sp?.termsStep === "1"
  const selectedAddons = parseAddonsParam(sp?.addons)

  const session = await getCurrentParticipantSession()
  if (!session || session.eventSlug !== eventSlug) {
    const next = `/${eventSlug}/booking${zoneSlug ? `?zone=${encodeURIComponent(zoneSlug)}` : ""}`
    redirect(`/${eventSlug}/login?next=${encodeURIComponent(next)}`)
  }

  // Load participant + businesses in parallel with zones
  const [participantData, businesses, tenantDb] = await Promise.all([
    db.query.participants.findFirst({
      where: eq(participants.id, session.participantId),
      columns: { id: true, organizationGroupSlug: true },
    }),
    db.query.participantBusinesses.findMany({
      where: eq(participantBusinesses.participantId, session.participantId),
      columns: { id: true, companyName: true, boothName: true, productTags: true, requestedBoothCategorySlug: true },
    }),
    createTenantDb(TENANT_SCHEMA),
  ])

  if (businesses.length === 0) {
    const nextParam = `next=booking${zoneSlug ? `&zone=${encodeURIComponent(zoneSlug)}` : ""}`
    redirect(`/${eventSlug}/usaha/baru?${nextParam}`)
  }

  const activeBusiness = businesses.find((b) => b.id === selectedBusinessId) ?? null
  const bookingBase = `/${eventSlug}/booking${zoneSlug ? `?zone=${encodeURIComponent(zoneSlug)}` : ""}`

  // Load zones + terms page in parallel
  const [allZones, termsPage] = await Promise.all([
    tenantDb.query.zones.findMany({
      where: eq(zones.isActive, true),
      orderBy: [asc(zones.sortOrder)],
      columns: { id: true, name: true, slug: true, colorCode: true },
    }),
    getActiveTermsPage(eventSlug),
  ])

  // Load zone + booth data when business + zone are selected
  const zoneData =
    activeBusiness && zoneSlug
      ? await getPublicZoneForBooking(
          zoneSlug,
          { organizationGroupSlug: participantData?.organizationGroupSlug ?? null },
          { requestedBoothCategorySlug: activeBusiness.requestedBoothCategorySlug ?? null }
        )
      : null

  const selectedBooth = selectedBoothId && zoneData
    ? zoneData.booths.find((b) => b.id === selectedBoothId) ?? null
    : null

  const addons = selectedBooth && !showTermsStep ? await getPublicAddons() : []

  const boothChangeHref = `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}`

  // Determine current step (1-based)
  const currentStep = showTermsStep ? 5
    : selectedBoothId && zoneSlug && selectedBusinessId ? 4
    : zoneSlug && selectedBusinessId ? 3
    : selectedBusinessId ? 2
    : 1

  const STEPS = ["Usaha", "Zona", "Booth", "Add-on", "S&K"]

  const backHref = currentStep === 1 ? `/${eventSlug}/dashboard`
    : currentStep === 2 ? `/${eventSlug}/booking`
    : currentStep === 3 ? `/${eventSlug}/booking?businessId=${selectedBusinessId}`
    : currentStep === 4 ? `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}`
    : `/${eventSlug}/booking?zone=${encodeURIComponent(zoneSlug)}&businessId=${selectedBusinessId}&boothId=${selectedBoothId}`

  const stepTitle = currentStep === 1 ? "Pilih Usaha"
    : currentStep === 2 ? "Pilih Zona"
    : currentStep === 3 ? `Pilih Booth${zoneData ? ` · Zona ${zoneData.name}` : ""}`
    : currentStep === 4 ? "Tambah Add-on"
    : "Syarat & Ketentuan"

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-3">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={backHref}
              className="flex items-center justify-center size-8 rounded-full bg-slate-100 hover:bg-slate-200 transition shrink-0"
            >
              <svg className="size-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Booking Booth</p>
              <p className="text-sm font-bold text-slate-800 truncate">{stepTitle}</p>
            </div>
          </div>

          {/* Step progress bar */}
          <div className="flex items-center gap-1">
            {STEPS.map((label, i) => {
              const stepNum = i + 1
              const done = stepNum < currentStep
              const active = stepNum === currentStep
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1">
                  <div className={[
                    "h-1 w-full rounded-full transition-all",
                    done ? "bg-primary" : active ? "bg-primary/40" : "bg-slate-200",
                  ].join(" ")} />
                  <span className={[
                    "text-[9px] font-semibold",
                    done || active ? "text-primary" : "text-slate-300",
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
      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">

        {/* STEP 1 — Pilih Usaha */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Pilih usaha yang akan booking booth.</p>
            {businesses.map((biz) => {
              const href = `/${eventSlug}/booking?businessId=${biz.id}`
              return (
                <Link
                  key={biz.id}
                  href={href}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm active:scale-[.99] transition"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <span className="text-sm font-bold text-primary">
                      {biz.companyName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{biz.companyName}</p>
                    {biz.boothName && biz.boothName !== biz.companyName && (
                      <p className="text-xs text-slate-500 truncate">{biz.boothName}</p>
                    )}
                    {(biz.productTags?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {biz.productTags!.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <svg className="size-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                  </svg>
                </Link>
              )
            })}

            <Link
              href={`/${eventSlug}/usaha/baru?next=booking`}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-500 hover:border-primary hover:text-primary transition"
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
            {/* Selected biz recap */}
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-xs font-bold text-primary">{activeBusiness.companyName.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">Usaha dipilih</p>
                <p className="font-semibold text-slate-800 truncate">{activeBusiness.companyName}</p>
              </div>
              <Link href={`/${eventSlug}/booking`} className="text-xs font-medium text-primary shrink-0">Ganti</Link>
            </div>

            <p className="text-xs text-slate-500 pt-1">Pilih zona yang ingin Anda booking.</p>
            <div className="space-y-3">
              {allZones.map((z) => {
                const href = `/${eventSlug}/booking?zone=${encodeURIComponent(z.slug)}&businessId=${selectedBusinessId}`
                return (
                  <Link
                    key={z.id}
                    href={href}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm active:scale-[.99] transition"
                  >
                    <span
                      className="size-4 shrink-0 rounded-full"
                      style={{ backgroundColor: z.colorCode ?? "#94a3b8" }}
                    />
                    <p className="flex-1 font-semibold text-slate-800">{z.name}</p>
                    <svg className="size-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 3 — Pilih Booth */}
        {currentStep === 3 && activeBusiness && zoneData && (
          <div className="space-y-3">
            {/* Recap */}
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <span
                className="size-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: zoneData.colorCode ?? "#94a3b8" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">Zona dipilih</p>
                <p className="font-semibold text-slate-800">{zoneData.name}</p>
              </div>
              <Link
                href={`/${eventSlug}/booking?businessId=${selectedBusinessId}`}
                className="text-xs font-medium text-primary shrink-0"
              >
                Ganti
              </Link>
            </div>
            <p className="text-xs text-slate-500 pt-1">Tap booth yang tersedia pada peta di bawah.</p>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden p-4">
              <PublicBookingClient
                businessId={selectedBusinessId}
                eventSlug={eventSlug}
                zone={zoneData}
              />
            </div>
          </div>
        )}

        {/* STEP 4 — Add-on */}
        {currentStep === 4 && activeBusiness && selectedBooth && zoneData && !showTermsStep && (
          <div className="space-y-3">
            {/* Recap */}
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <svg className="size-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-slate-400">Booth dipilih</p>
                <p className="font-semibold text-slate-800">Zona {zoneData.name} · Booth {selectedBooth.code}</p>
              </div>
              <Link href={boothChangeHref} className="text-xs font-medium text-primary shrink-0">Ganti</Link>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
              <PublicAddonStep
                addons={addons}
                booth={selectedBooth}
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
        {currentStep === 5 && activeBusiness && selectedBooth && zoneData && (
          <div className="space-y-3">
            {/* Recap */}
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <svg className="size-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-semibold text-slate-800 flex-1">
                {activeBusiness.companyName} · Zona {zoneData.name} · Booth {selectedBooth.code}
              </p>
            </div>

            {termsPage ? (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
                <PublicTermsStep
                  addons={selectedAddons}
                  booth={selectedBooth}
                  businessId={selectedBusinessId}
                  eventSlug={eventSlug}
                  participantId={session.participantId}
                  termsPage={termsPage}
                  zone={zoneData}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                Dokumen syarat & ketentuan belum tersedia. Hubungi admin untuk melanjutkan booking.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
