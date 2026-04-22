import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, asc } from "drizzle-orm"

import { PublicContainer } from "@/components/public/ui/PublicContainer"
import { SectionHeader } from "@/components/public/ui/SectionHeader"
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

  const stepTitle = showTermsStep && selectedBooth && zoneData
    ? `Persetujuan Syarat & Ketentuan`
    : selectedBooth && zoneData
      ? `Booking Zona ${zoneData.name} · Booth ${selectedBooth.code}`
      : zoneData
        ? `Booking Zona ${zoneData.name}`
        : "Booking Booth"

  return (
    <section className="bg-white py-12 sm:py-16">
      <PublicContainer size="lg">
        <SectionHeader
          eyebrow="Booking Tenant"
          title={stepTitle}
          description="Pilih usaha, tentukan stand, lalu selesaikan booking."
        />

        <div className="mt-10 space-y-6">
          {/* ── Step 1: Pilih Usaha ── */}
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 shadow-sm sm:p-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">
              Langkah 1 — Pilih Usaha
            </p>
            <ul className="space-y-3">
              {businesses.map((biz) => {
                const isActive = biz.id === selectedBusinessId
                const href = `${bookingBase}&businessId=${biz.id}`
                return (
                  <li key={biz.id}>
                    <Link
                      className={[
                        "flex items-start gap-4 rounded-2xl border px-5 py-4 transition",
                        isActive
                          ? "border-primary bg-primary-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/40",
                      ].join(" ")}
                      href={href}
                    >
                      <span className={["mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2", isActive ? "border-primary bg-primary" : "border-slate-300 bg-white"].join(" ")}>
                        {isActive && (
                          <svg className="size-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{biz.companyName}</p>
                        {biz.boothName && biz.boothName !== biz.companyName && (
                          <p className="text-sm text-slate-500">Booth: {biz.boothName}</p>
                        )}
                        {(biz.productTags?.length ?? 0) > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {biz.productTags!.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Link
              className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              href={`/${eventSlug}/usaha/baru?next=booking${zoneSlug ? `&zone=${encodeURIComponent(zoneSlug)}` : ""}`}
            >
              + Tambah Usaha Baru
            </Link>
          </div>

          {/* ── Step 2: Pilih Stand ── */}
          {activeBusiness && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">
                Langkah 2 — Pilih Stand
              </p>

              {/* Zone tabs — hidden when already at terms step */}
              {!selectedBooth && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {allZones.map((z) => {
                    const isActive = z.slug === zoneSlug
                    const href = `/${eventSlug}/booking?zone=${encodeURIComponent(z.slug)}&businessId=${selectedBusinessId}`
                    return (
                      <Link
                        key={z.id}
                        href={href}
                        className={[
                          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                          isActive
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-700",
                        ].join(" ")}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: z.colorCode ?? "#94a3b8" }}
                        />
                        {z.name}
                      </Link>
                    )
                  })}
                </div>
              )}

              {selectedBooth && zoneData ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                  <svg className="size-5 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      Zona {zoneData.name} · Booth {selectedBooth.code}
                    </p>
                    <p className="text-sm text-emerald-700">Stand berhasil dipilih</p>
                  </div>
                  {!showTermsStep && (
                    <Link
                      href={boothChangeHref}
                      className="shrink-0 text-sm font-medium text-primary hover:underline"
                    >
                      Ganti
                    </Link>
                  )}
                </div>
              ) : !zoneSlug ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
                  Pilih zona di atas untuk melihat peta stand.
                </div>
              ) : !zoneData ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Data zona tidak ditemukan.
                </div>
              ) : (
                <PublicBookingClient
                  businessId={selectedBusinessId}
                  eventSlug={eventSlug}
                  zone={zoneData}
                />
              )}
            </div>
          )}

          {/* ── Step 3: Add-on (opsional) — hidden when at terms step ── */}
          {activeBusiness && selectedBooth && zoneData && !showTermsStep && (
            <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">
                  Langkah 3 — Add-on{" "}
                  <span className="ml-2 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 normal-case tracking-normal">
                    Opsional
                  </span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Tambahkan layanan ekstra atau lewati langsung ke langkah berikutnya.
                </p>
              </div>
              <PublicAddonStep
                addons={addons}
                booth={selectedBooth}
                boothChangeHref={boothChangeHref}
                businessId={selectedBusinessId}
                eventId={termsPage?.eventId ?? ""}
                eventSlug={eventSlug}
                participantId={session.participantId}
                termsChecksum={termsPage?.checksum ?? null}
                zone={zoneData}
              />
            </div>
          )}

          {/* ── Step 4: Syarat & Ketentuan ── */}
          {activeBusiness && selectedBooth && zoneData && showTermsStep && termsPage && (
            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-600">
                  Langkah 4 — Persetujuan Syarat & Ketentuan
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Baca dan setujui syarat & ketentuan sebelum invoice diterbitkan.
                </p>
              </div>
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
          )}

          {/* If no terms page configured and at terms step, skip to invoice warning */}
          {activeBusiness && selectedBooth && zoneData && showTermsStep && !termsPage && (
            <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm text-amber-800">
                Dokumen syarat & ketentuan belum tersedia. Hubungi admin untuk melanjutkan booking.
              </p>
            </div>
          )}

          {!selectedBusinessId && (
            <p className="text-center text-sm text-slate-400">Pilih usaha di atas untuk melanjutkan.</p>
          )}
        </div>
      </PublicContainer>
    </section>
  )
}
