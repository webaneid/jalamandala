import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import QRCode from "qrcode"
import { db, createTenantDb } from "@repo/db"
import { expoEvents, participants, participantBusinesses } from "@repo/db/schema/public"
import { boothBookings } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

interface Props {
  params: Promise<{ eventSlug: string; businessId: string }>
}

export default async function EPassBoothPage({ params }: Props) {
  const { eventSlug, businessId } = await params
  const session = await getCurrentParticipantSession()

  if (!session || session.eventSlug !== eventSlug) {
    redirect(`/${eventSlug}/login`)
  }

  const [participant, business, event] = await Promise.all([
    db.query.participants.findFirst({
      where: eq(participants.id, session.participantId),
      columns: { name: true, organizationGroupName: true },
    }),
    db.query.participantBusinesses.findFirst({
      where: eq(participantBusinesses.id, businessId),
      columns: {
        participantId: true,
        companyName: true,
        boothName: true,
        brandName: true,
        requestedBoothCategoryName: true,
        logoAssetId: true,
      },
    }),
    db.query.expoEvents.findFirst({
      where: eq(expoEvents.slug, eventSlug),
      columns: { name: true },
    }),
  ])

  if (!business || business.participantId !== session.participantId) {
    notFound()
  }

  const tenantDb = await createTenantDb(TENANT_SCHEMA)
  const booking = await tenantDb.query.boothBookings.findFirst({
    where: eq(boothBookings.businessId, businessId),
    columns: { bookingStatus: true },
    with: {
      booth: {
        columns: { code: true },
        with: {
          zone: { columns: { name: true, colorCode: true } },
        },
      },
    },
  })

  const boothCode = booking?.booth?.code ?? null
  const zoneName = booking?.booth?.zone?.name ?? null
  const zoneColorCode = booking?.booth?.zone?.colorCode ?? null
  const bookingStatus = booking?.bookingStatus ?? null

  // QR code — encode booth code + business ID untuk verifikasi panitia
  const qrContent = boothCode
    ? `${boothCode}|${businessId}`
    : businessId
  const qrSvg = await QRCode.toString(qrContent, {
    type: "svg",
    margin: 0,
    width: 160,
    color: { dark: "#134397", light: "#ffffff" },
  })

  const initials = (participant?.name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  const displayName = business.boothName || business.companyName

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Pass card */}
        <div className="overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-slate-200">

          {/* Header */}
          <div className="bg-[#134397] px-6 pt-8 pb-12 text-center text-white relative">
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-8 size-24 rounded-full bg-white/5" />

            <p className="relative text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
              E-Pass Booth
            </p>
            <p className="relative mt-1 text-lg font-bold tracking-wide">
              {event?.name ?? eventSlug}
            </p>

            {/* Avatar — overlaps into body */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 z-10">
              {business.logoAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={displayName}
                  className="size-20 rounded-full border-4 border-white object-cover shadow-lg bg-white"
                  src={`/api/media/${business.logoAssetId}`}
                />
              ) : (
                <div className="size-20 rounded-full border-4 border-white bg-[#00adee] shadow-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 pt-14 pb-8 text-center space-y-1">
            <p className="text-xl font-bold text-slate-900 leading-tight">{displayName}</p>
            {business.brandName && business.brandName !== displayName && (
              <p className="text-sm text-slate-500">{business.brandName}</p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">{participant?.organizationGroupName ?? ""}</p>

            {/* Booth info grid */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Zona</p>
                <div className="flex items-center justify-center gap-1.5">
                  {zoneColorCode && (
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: zoneColorCode }}
                    />
                  )}
                  <p className="font-semibold text-slate-800 text-sm">
                    {zoneName ?? "—"}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">No. Booth</p>
                <p className="font-bold text-primary text-2xl leading-tight">
                  {boothCode ?? "—"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="mt-3 flex justify-center">
              <StatusChip status={bookingStatus} />
            </div>

            {/* QR Code */}
            <div className="mt-5 flex flex-col items-center gap-2">
              <div
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-inner"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-[10px] text-slate-400 tracking-widest uppercase">Scan untuk verifikasi</p>
            </div>

            {/* Divider + peserta info */}
            <div className="mt-4 border-t border-dashed border-slate-200 pt-4 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Peserta</p>
              <p className="text-sm font-semibold text-slate-700">{participant?.name ?? "—"}</p>
              {business.requestedBoothCategoryName && (
                <p className="text-xs text-slate-400">{business.requestedBoothCategoryName}</p>
              )}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-5">
            <Link
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#134397] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#134397]/90"
              href={`/${eventSlug}/dashboard`}
            >
              Masuk ke Dashboard
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Simpan halaman ini sebagai bukti pendaftaran booth Anda.
        </p>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-400" />
        Menunggu Konfirmasi Pembayaran
      </span>
    )
  }
  if (status === "booked") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Booking Aktif
      </span>
    )
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-600">
        <span className="size-1.5 rounded-full bg-red-400" />
        Dibatalkan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
      <span className="size-1.5 rounded-full bg-slate-400" />
      {status}
    </span>
  )
}
