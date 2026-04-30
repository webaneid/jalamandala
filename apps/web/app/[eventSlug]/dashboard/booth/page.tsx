import Link from "next/link"
import { eq } from "drizzle-orm"
import { db, createTenantDb } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { boothBookings, invoices } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { DashboardSubpageHeader } from "@/components/public/DashboardSubpageHeader"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  paid: { label: "Lunas", class: "bg-emerald-100 text-emerald-700" },
  waiting_for_payment: { label: "Belum Bayar", class: "bg-amber-100 text-amber-700" },
  waiting_confirmation: { label: "Menunggu Konfirmasi", class: "bg-blue-100 text-blue-700" },
  expired: { label: "Kedaluwarsa", class: "bg-slate-100 text-slate-500" },
  cancelled: { label: "Dibatalkan", class: "bg-red-100 text-red-600" },
}


export const metadata = {
  title: "Booth Saya",
};

export default async function DashboardBoothPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const businesses = await db.query.participantBusinesses.findMany({
    where: eq(participantBusinesses.participantId, session!.participantId),
    columns: { id: true, companyName: true, brandName: true, logoAssetId: true },
  })

  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  const businessData = await Promise.all(
    businesses.map(async (biz) => {
      const [bookings, invoice] = await Promise.all([
        tenantDb.query.boothBookings.findMany({
          where: eq(boothBookings.businessId, biz.id),
          columns: { id: true, bookingStatus: true, finalPrice: true },
          with: {
            booth: {
              columns: { code: true },
              with: {
                zone: { columns: { name: true, colorCode: true } },
              },
            },
          },
        }),
        tenantDb.query.invoices.findFirst({
          where: eq(invoices.businessId, biz.id),
          columns: { id: true, status: true, grandTotal: true, publicToken: true },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        }),
      ])
      return { biz, bookings, invoice }
    })
  )

  // Flatten to per-booking entries, group unbooked separately
  const booked: Array<{ biz: typeof businesses[0]; booking: typeof businessData[0]["bookings"][0]; invoice: typeof businessData[0]["invoice"] }> = []
  const unbooked: typeof businessData = []

  for (const item of businessData) {
    if (item.bookings.length === 0) {
      unbooked.push(item)
    } else {
      for (const booking of item.bookings) {
        booked.push({ biz: item.biz, booking, invoice: item.invoice })
      }
    }
  }

  return (
    <div className="min-h-full">
      <DashboardSubpageHeader title="Booth Saya" subtitle={`${booked.length} booth dipesan`} />

      <div className="px-4 py-4 space-y-3">
        {booked.length === 0 && unbooked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="size-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">Belum ada booth dipesan</p>
            <p className="text-sm text-slate-500 mt-1">Daftar usaha dan booking booth untuk tampil di sini.</p>
            <Link href={`/${eventSlug}/booking`} className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white">
              Booking Booth
            </Link>
          </div>
        ) : (
          <>
            {/* Booked */}
            {booked.map(({ biz, booking, invoice }) => {
              const status = STATUS_MAP[invoice?.status ?? ""] ?? null
              const zoneColor = booking.booth?.zone?.colorCode
              return (
                <Link
                  key={booking.id}
                  href={`/${eventSlug}/dashboard/booth/${booking.id}`}
                  className="block rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm active:scale-[.99] transition"
                >
                  {/* Booth location banner */}
                  <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={zoneColor ? { borderLeft: `4px solid ${zoneColor}` } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Lokasi Booth</p>
                      <p className="text-base font-bold text-slate-900">
                        Zona {booking.booth?.zone?.name ?? "—"} · Booth {booking.booth?.code ?? "—"}
                      </p>
                    </div>
                    <svg className="size-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Business + status */}
                  <div className="flex items-center gap-3 border-t border-slate-50 px-4 py-3">
                    {biz.logoAssetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={biz.companyName}
                        className="size-9 rounded-xl object-cover border border-slate-100 shrink-0"
                        src={`/api/media/${biz.logoAssetId}`}
                      />
                    ) : (
                      <div className="size-9 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{biz.companyName.slice(0, 2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{biz.companyName}</p>
                      {biz.brandName && biz.brandName !== biz.companyName && (
                        <p className="text-xs text-slate-400 truncate">{biz.brandName}</p>
                      )}
                    </div>
                    {status && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.class}`}>
                        {status.label}
                      </span>
                    )}
                  </div>

                  {/* Grand total — only show on first booking of this invoice */}
                  {invoice?.grandTotal && (
                    <div className="border-t border-slate-50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Total invoice</span>
                      <span className="text-sm font-bold text-primary">{fmt(invoice.grandTotal)}</span>
                    </div>
                  )}
                </Link>
              )
            })}

            {/* Unbooked businesses */}
            {unbooked.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Belum Booking</p>
                {unbooked.map(({ biz }) => (
                  <Link
                    key={biz.id}
                    href={`/${eventSlug}/booking?businessId=${biz.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white border border-dashed border-slate-200 px-4 py-3 mb-2 hover:border-primary/40 transition"
                  >
                    <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-400">{biz.companyName.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{biz.companyName}</p>
                      <p className="text-xs text-amber-600 font-medium">Belum booking booth</p>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">Booking →</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
