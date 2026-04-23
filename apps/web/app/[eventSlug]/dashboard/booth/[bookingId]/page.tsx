import Link from "next/link"
import { notFound } from "next/navigation"
import { eq, inArray } from "drizzle-orm"
import { db, createTenantDb } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { vendorAddonAssignments, vendors } from "@repo/db/schema/public"
import { boothBookings, invoices } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"

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
  title: "Detail Booth",
};

export default async function BoothDetailPage({
  params,
}: {
  params: Promise<{ eventSlug: string; bookingId: string }>
}) {
  const { eventSlug, bookingId } = await params
  const session = await getCurrentParticipantSession()

  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  const booking = await tenantDb.query.boothBookings.findFirst({
    where: eq(boothBookings.id, bookingId),
    with: {
      booth: {
        columns: { code: true, description: true },
        with: {
          zone: { columns: { name: true, colorCode: true, description: true } },
          facilities: {
            with: { facility: { columns: { name: true, description: true } } },
          },
        },
      },
    },
  })

  if (!booking) notFound()

  // Verify ownership via business → participant
  const business = await db.query.participantBusinesses.findFirst({
    where: eq(participantBusinesses.id, booking.businessId),
    columns: { id: true, companyName: true, brandName: true, participantId: true },
  })

  if (!business || business.participantId !== session!.participantId) notFound()

  // Get latest invoice with items
  const invoice = await tenantDb.query.invoices.findFirst({
    where: eq(invoices.businessId, booking.businessId),
    with: {
      items: {
        columns: { itemType: true, referenceId: true, title: true, quantity: true, unitPrice: true, subtotal: true },
      },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  const boothItem = invoice?.items.find((i) => i.itemType === "booth")
  const addonItems = invoice?.items.filter((i) => i.itemType === "addon") ?? []

  // Get vendor info for add-ons (public schema, match by eventAddonId = referenceId)
  const addonRefIds = addonItems
    .map((i) => i.referenceId)
    .filter((id): id is string => !!id)

  type VendorInfo = { name: string; whatsapp: string; eventAddonId: string }
  let vendorMap: Record<string, VendorInfo> = {}

  if (addonRefIds.length > 0) {
    const assignments = await db.query.vendorAddonAssignments.findMany({
      where: inArray(vendorAddonAssignments.eventAddonId, addonRefIds),
      with: { vendor: { columns: { name: true, whatsapp: true } } },
    })
    for (const a of assignments) {
      if (a.vendor) {
        vendorMap[a.eventAddonId] = {
          name: a.vendor.name,
          whatsapp: a.vendor.whatsapp,
          eventAddonId: a.eventAddonId,
        }
      }
    }
  }

  const facilities = booking.booth?.facilities ?? []
  const status = STATUS_MAP[invoice?.status ?? ""] ?? null
  const zoneColor = booking.booth?.zone?.colorCode

  return (
    <div className="min-h-full pb-8">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-6"
        style={{ background: zoneColor ? `linear-gradient(135deg, ${zoneColor}22, ${zoneColor}08)` : undefined }}
      >
        <Link
          href={`/${eventSlug}/dashboard/booth`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-4"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Kembali
        </Link>

        <div className="flex items-start gap-3">
          {zoneColor && (
            <div className="size-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/60 shadow-sm"
              style={{ backgroundColor: `${zoneColor}30` }}>
              <svg className="size-6" fill="none" stroke={zoneColor} strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Booth Dipesan</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              Booth {booking.booth?.code ?? "—"}
            </h1>
            <p className="text-sm font-medium text-slate-600 mt-0.5">
              Zona {booking.booth?.zone?.name ?? "—"}
            </p>
          </div>
        </div>

        {status && (
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.class}`}>
            {status.label}
          </span>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Usaha */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Usaha</p>
          <div className="flex items-center gap-3 px-4 pb-4">
            <div className="size-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{business.companyName.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{business.companyName}</p>
              {business.brandName && business.brandName !== business.companyName && (
                <p className="text-xs text-slate-500">{business.brandName}</p>
              )}
            </div>
          </div>
        </section>

        {/* Lokasi & Zona */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Lokasi Booth</p>
          <div className="px-4 pb-4 space-y-2">
            <div className="flex items-center gap-3">
              {zoneColor && <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />}
              <div>
                <p className="text-sm font-bold text-slate-900">Zona {booking.booth?.zone?.name ?? "—"} · Booth {booking.booth?.code ?? "—"}</p>
                {booking.booth?.zone?.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{booking.booth.zone.description}</p>
                )}
              </div>
            </div>
            {booking.booth?.description && (
              <p className="text-xs text-slate-500 pl-6">{booking.booth.description}</p>
            )}
          </div>
        </section>

        {/* Fasilitas */}
        {facilities.length > 0 && (
          <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
            <p className="px-4 pt-4 pb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Fasilitas Booth</p>
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {facilities.map((f, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{f.facility?.name ?? "Fasilitas"}</p>
                    {f.facility?.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{f.facility.description}</p>
                    )}
                    {f.value && (
                      <p className="text-[10px] text-primary font-medium mt-0.5">{f.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rincian pesanan */}
        <section className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Rincian Pesanan</p>

          {/* Booth */}
          {boothItem && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{boothItem.title}</p>
                <p className="text-xs text-slate-400">Sewa booth</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">{fmt(boothItem.subtotal)}</p>
            </div>
          )}

          {/* Add-ons */}
          {addonItems.map((item, i) => {
            const vendor = item.referenceId ? vendorMap[item.referenceId] : undefined
            return (
              <div key={i} className="px-4 py-3 border-t border-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {item.quantity > 1 && <span className="font-bold">{item.quantity}× </span>}
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmt(item.unitPrice)} / unit</p>
                    {vendor && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                        <svg className="size-3 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M5.337 21.875a16.013 16.013 0 01-2.257-2.257A15.978 15.978 0 011 11.958 15.956 15.956 0 0116 0a15.956 15.956 0 0115 11.958 15.978 15.978 0 01-1.08 7.66 16.013 16.013 0 01-2.257 2.257L16 24l-10.663-2.125z" />
                        </svg>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-emerald-800 truncate">{vendor.name}</p>
                          <a
                            href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-600 underline"
                          >
                            {vendor.whatsapp}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 shrink-0">{fmt(item.subtotal)}</p>
                </div>
              </div>
            )
          })}

          {/* Grand total */}
          {invoice?.grandTotal && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-900">Total</span>
              <span className="text-base font-bold text-primary">{fmt(invoice.grandTotal)}</span>
            </div>
          )}
        </section>

        {/* Actions */}
        {invoice?.publicToken && (
          <Link
            href={`/invoice/${invoice.publicToken}`}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <svg className="size-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 12h6M9 16h4M5 3h14a1 1 0 011 1v16l-2-1.5L16 20l-2 1.5L12 20l-2 1.5L8 20l-2 1.5V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Lihat Invoice
          </Link>
        )}
        {booking.bookingStatus === "booked" && (
          <Link
            href={`/${eventSlug}/usaha/${booking.businessId}/epass`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3.5 text-sm font-semibold text-white shadow-sm"
          >
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="3" />
              <path d="M7 7h3v3H7zM7 14h.01M14 7h.01M11 11h.01M14 14h3v3h-3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            E-Pass Booth
          </Link>
        )}
      </div>
    </div>
  )
}
