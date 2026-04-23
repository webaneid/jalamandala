import Link from "next/link"
import { eq } from "drizzle-orm"
import { db, createTenantDb } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { boothBookings, invoices, invoiceItems } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export default async function DashboardUsahaPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const businesses = await db.query.participantBusinesses.findMany({
    where: eq(participantBusinesses.participantId, session!.participantId),
  })

  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  const businessData = await Promise.all(
    businesses.map(async (biz) => {
      const [booking, invoice] = await Promise.all([
        tenantDb.query.boothBookings.findFirst({
          where: eq(boothBookings.businessId, biz.id),
          columns: { bookingStatus: true },
          with: {
            booth: {
              columns: { code: true, description: true },
              with: {
                zone: { columns: { name: true, colorCode: true, description: true } },
                facilities: {
                  with: { facility: { columns: { name: true } } },
                },
              },
            },
          },
        }),
        tenantDb.query.invoices.findFirst({
          where: eq(invoices.businessId, biz.id),
          columns: { id: true, status: true, grandTotal: true, publicToken: true },
          with: { items: { columns: { title: true, quantity: true, unitPrice: true, subtotal: true, itemType: true } } },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        }),
      ])
      return { biz, booking, invoice }
    })
  )

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-14 pb-5 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">Usaha Saya</h1>
        <p className="text-sm text-slate-500 mt-0.5">{businesses.length} usaha terdaftar</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {businessData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="size-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">Belum ada usaha terdaftar</p>
            <p className="text-sm text-slate-500 mt-1">Daftarkan usaha Anda untuk booking booth.</p>
            <Link
              href={`/${eventSlug}/usaha/baru`}
              className="mt-5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white"
            >
              Daftar Usaha Sekarang
            </Link>
          </div>
        ) : (
          businessData.map(({ biz, booking, invoice }) => {
            const isComplete = !!biz.companyDescription && !!biz.companyAddress
            const addonItems = invoice?.items?.filter((i) => i.itemType === "addon") ?? []
            const boothItem = invoice?.items?.find((i) => i.itemType === "booth")
            const facilities = booking?.booth?.facilities ?? []

            return (
              <div
                key={biz.id}
                className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm"
              >
                {/* Business header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  {biz.logoAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={biz.companyName}
                      className="size-12 rounded-xl object-cover border border-slate-100"
                      src={`/api/media/${biz.logoAssetId}`}
                    />
                  ) : (
                    <div className="size-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
                      <span className="text-base font-bold text-primary">
                        {biz.companyName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{biz.companyName}</p>
                    {biz.brandName && biz.brandName !== biz.companyName && (
                      <p className="text-xs text-slate-500 truncate">{biz.brandName}</p>
                    )}
                    {biz.requestedBoothCategoryName && (
                      <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {biz.requestedBoothCategoryName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Booth info */}
                {booking?.booth ? (
                  <div className="mx-4 mb-3 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                    {/* Lokasi */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                      <svg className="size-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        {booking.booth.zone?.colorCode && (
                          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: booking.booth.zone.colorCode }} />
                        )}
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          Zona {booking.booth.zone?.name ?? "—"} · Booth {booking.booth.code}
                        </span>
                      </div>
                      <InvoiceStatusBadge status={invoice?.status ?? null} />
                    </div>

                    {/* Harga booth */}
                    {boothItem && (
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500">Harga booth</span>
                        <span className="text-xs font-semibold text-slate-700">{fmt(boothItem.subtotal)}</span>
                      </div>
                    )}

                    {/* Fasilitas */}
                    {facilities.length > 0 && (
                      <div className="px-3 py-2.5 border-b border-slate-100">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Fasilitas Booth</p>
                        <div className="flex flex-wrap gap-1.5">
                          {facilities.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                            >
                              {f.facility?.name ?? "Fasilitas"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add-ons */}
                    {addonItems.length > 0 && (
                      <div className="px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Add-on Dibeli</p>
                        <div className="space-y-1.5">
                          {addonItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-xs text-slate-600">
                                {item.quantity > 1 && <span className="font-semibold">{item.quantity}× </span>}
                                {item.title}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">{fmt(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mx-4 mb-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                    <p className="text-xs text-amber-700 font-medium">Belum booking booth</p>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-slate-100 flex">
                  {!isComplete && (
                    <Link
                      href={`/${eventSlug}/usaha/${biz.id}/lengkapi`}
                      className="flex-1 py-3 text-center text-xs font-semibold text-amber-600 border-r border-slate-100"
                    >
                      Lengkapi Data
                    </Link>
                  )}
                  {!booking && (
                    <Link
                      href={`/${eventSlug}/booking?businessId=${biz.id}`}
                      className="flex-1 py-3 text-center text-xs font-semibold text-primary"
                    >
                      Booking Booth
                    </Link>
                  )}
                  {invoice?.publicToken && (
                    <Link
                      href={`/invoice/${invoice.publicToken}`}
                      className="flex-1 py-3 text-center text-xs font-semibold text-slate-600 border-l border-slate-100"
                    >
                      Lihat Invoice
                    </Link>
                  )}
                  {booking?.bookingStatus === "booked" && (
                    <Link
                      href={`/${eventSlug}/usaha/${biz.id}/epass`}
                      className="flex-1 py-3 text-center text-xs font-semibold text-secondary border-l border-slate-100"
                    >
                      E-Pass
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}

        {/* FAB actions */}
        {businesses.length > 0 && (
          <div className="pt-2 pb-6 flex flex-col gap-3">
            <Link
              href={`/${eventSlug}/booking`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-sm"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" />
              </svg>
              Booking Booth Baru
            </Link>
            <Link
              href={`/${eventSlug}/usaha/baru`}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-white px-5 py-3 text-sm font-semibold text-primary"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Tambah Usaha Baru
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, { label: string; class: string }> = {
    paid: { label: "Lunas", class: "bg-emerald-100 text-emerald-700" },
    waiting_for_payment: { label: "Belum Bayar", class: "bg-amber-100 text-amber-700" },
    waiting_confirmation: { label: "Menunggu Konfirmasi", class: "bg-blue-100 text-blue-700" },
    expired: { label: "Kedaluwarsa", class: "bg-slate-100 text-slate-500" },
    cancelled: { label: "Dibatalkan", class: "bg-red-100 text-red-600" },
  }
  const s = map[status] ?? { label: status, class: "bg-slate-100 text-slate-500" }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.class}`}>
      {s.label}
    </span>
  )
}
