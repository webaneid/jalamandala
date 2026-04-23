"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { PublicAddon, PublicZoneData, PublicBooth } from "@/lib/public-booth-data"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

type Props = {
  addons: PublicAddon[]
  boothIds: string[]
  boothChangeHref: string
  businessId: string
  eventSlug: string
  participantId: string
  zone: PublicZoneData
}

export function PublicAddonStep({
  addons,
  boothIds,
  boothChangeHref,
  businessId,
  eventSlug,
  participantId,
  zone,
}: Props) {
  const router = useRouter()
  const [quantities, setQuantities] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(addons.map((a) => [a.id, 0]))
  )
  function adjust(id: string, delta: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))
  }

  const addonsTotal = addons.reduce((sum, a) => sum + a.price * (quantities[a.id] ?? 0), 0)
  const grandTotal = zone.price + addonsTotal
  const selectedAddons = addons
    .filter((a) => (quantities[a.id] ?? 0) > 0)
    .map((a) => ({ addonId: a.id, quantity: quantities[a.id]! }))

  function buildAddonsParam(items: typeof selectedAddons): string {
    if (items.length === 0) return ""
    return items.map((a) => `${a.addonId}:${a.quantity}`).join(",")
  }

  function submit(withAddons: boolean) {
    const addonsForInvoice = withAddons ? selectedAddons : []
    const addonsParam = buildAddonsParam(addonsForInvoice)
    const url = new URL(`/${eventSlug}/booking`, "http://x")
    url.searchParams.set("zone", zone.slug)
    url.searchParams.set("businessId", businessId)
    url.searchParams.set("boothIds", boothIds.join(","))
    url.searchParams.set("termsStep", "1")
    if (addonsParam) url.searchParams.set("addons", addonsParam)
    router.push(url.pathname + url.search)
  }

  return (
    <div className="space-y-6">
      {/* Selected booth summary */}
      <div className="flex items-center justify-between rounded-2xl border border-primary-100 bg-primary-50 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">{boothIds.length} Stand Dipilih</p>
          <p className="mt-0.5 font-semibold text-slate-900">
            Zona {zone.name}
          </p>
          <p className="text-sm font-medium text-primary-700">{fmt(zone.price * boothIds.length)}</p>
        </div>
        <a
          href={boothChangeHref}
          className="rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition"
        >
          Ganti
        </a>
      </div>

      {/* Add-on list */}
      {addons.length > 0 ? (
        <div className="space-y-3">
          {addons.map((addon) => {
            const qty = quantities[addon.id] ?? 0
            return (
              <div
                key={addon.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{addon.name}</p>
                  {addon.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{addon.description}</p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-primary-700">
                    {fmt(addon.price)}{addon.unitName ? ` / ${addon.unitName}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="flex size-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                    disabled={qty === 0}
                    onClick={() => adjust(addon.id, -1)}
                    type="button"
                  >
                    <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-slate-900">{qty}</span>
                  <button
                    className="flex size-8 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition"
                    onClick={() => adjust(addon.id, 1)}
                    type="button"
                  >
                    <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">Tidak ada add-on tersedia saat ini.</p>
      )}

      {/* Total summary */}
      {addonsTotal > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Stand</span>
            <span>{fmt(zone.price)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 mt-1">
            <span>Add-on</span>
            <span>{fmt(addonsTotal)}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
            <span>Total</span>
            <span className="text-primary-700">{fmt(grandTotal)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          onClick={() => submit(false)}
          type="button"
        >
          Lewati Add-on →
        </button>
        {selectedAddons.length > 0 && (
          <button
            className="flex-1 rounded-2xl bg-secondary py-3 text-sm font-semibold text-white hover:bg-secondary/90 transition"
            onClick={() => submit(true)}
            type="button"
          >
            Tambah Add-on →
          </button>
        )}
      </div>
    </div>
  )
}
