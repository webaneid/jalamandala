"use client"

import * as React from "react"
import type { PublicBooth, PublicZoneData } from "@/lib/public-booth-data"

type Props = {
  zone: PublicZoneData
  onConfirm: (booth: PublicBooth) => void
}

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const PHASE_LABEL: Record<string, string> = {
  early_bird: "Early Bird",
  pre_sale: "Pre-Sale",
  regular: "Regular",
  free: "Gratis",
}

// ─── Booth card ────────────────────────────────────────────────────────────────

function BoothCell({
  booth,
  isSelected,
  onSelect,
  className = "",
  sizeClass = "min-h-[92px] min-w-[92px]",
}: {
  booth: PublicBooth
  isSelected: boolean
  onSelect: (b: PublicBooth) => void
  className?: string
  sizeClass?: string
}) {
  const canSelect = booth.isAvailable && booth.isEligible
  const isBooked = !booth.isAvailable

  let stateClass = ""
  if (isSelected) {
    stateClass = "border-primary bg-primary-50 ring-2 ring-primary z-10"
  } else if (!canSelect) {
    stateClass = "opacity-50 cursor-not-allowed bg-slate-100 border-slate-200"
  } else {
    stateClass =
      "bg-white border-slate-300 hover:z-10 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer"
  }

  const ineligibleLabel = booth.boothGroup.slug !== "general"
    ? booth.boothGroup.name
    : booth.boothCategory.slug !== "free"
      ? booth.boothCategory.name
      : "Terbatas"

  const badge = isSelected
    ? <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">Dipilih</span>
    : isBooked
      ? <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">Terisi</span>
      : booth.isEligible
        ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">Open</span>
        : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">{ineligibleLabel}</span>

  return (
    <button
      className={`group flex ${sizeClass} flex-col justify-between rounded-none border p-3 text-left shadow-none transition ${stateClass} ${className}`}
      disabled={!canSelect}
      onClick={() => canSelect && onSelect(booth)}
      type="button"
    >
      <div className="flex justify-end">{badge}</div>
      <p className="text-xs font-semibold tracking-[-0.02em] text-slate-950">{booth.code}</p>
    </button>
  )
}

// ─── Zone layouts (mirrors admin) ─────────────────────────────────────────────

function extract(code: string) {
  return Number(code.match(/\d+/)?.[0] ?? 0)
}

function VvipLayout({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const left = sorted.slice(0, 4)
  const right = sorted.slice(4, 8)
  return (
    <div className="overflow-x-auto rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="grid min-w-[900px] grid-cols-[1fr_96px_1fr] items-stretch gap-4">
        <div className="grid grid-cols-4 gap-0">
          {left.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
        </div>
        <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300/90 bg-white/60 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Gangway</p>
          <div className="mt-3 h-16 w-px bg-slate-300" />
        </div>
        <div className="grid grid-cols-4 gap-0">
          {right.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
        </div>
      </div>
    </div>
  )
}

function VipLayout({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const rows = [sorted.slice(0, 8), sorted.slice(8, 16)]
  return (
    <div className="overflow-x-auto rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="grid min-w-[900px] gap-5">
        {rows.map((row, ri) => (
          <div className="grid grid-cols-[1fr_96px_1fr] items-stretch gap-4" key={ri}>
            <div className="grid grid-cols-4 gap-0">
              {row.slice(0, 4).map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
            </div>
            <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300/90 bg-white/60 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Gangway</p>
              <div className="mt-3 h-16 w-px bg-slate-300" />
            </div>
            <div className="grid grid-cols-4 gap-0">
              {row.slice(4, 8).map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PremiumBlock({ left, right, selected, onSelect }: { left: PublicBooth[]; right: PublicBooth[]; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  return (
    <div className="flex items-stretch justify-center">
      <div className="grid gap-0">
        {left.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} sizeClass="min-h-[64px] min-w-[80px]" className="first:rounded-t-[16px] last:rounded-b-[16px]" />)}
      </div>
      <div className="flex w-14 flex-col items-center justify-center border-x border-dashed border-slate-300 bg-white/60">
        <p className="rotate-180 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 [writing-mode:vertical-rl]">Gangway</p>
      </div>
      <div className="grid gap-0">
        {right.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} sizeClass="min-h-[64px] min-w-[80px]" className="first:rounded-t-[16px] last:rounded-b-[16px]" />)}
      </div>
    </div>
  )
}

function PremiumLayout({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const chunkSize = 18
  const blocks = Array.from({ length: Math.ceil(sorted.length / chunkSize) }, (_, i) =>
    sorted.slice(i * chunkSize, i * chunkSize + chunkSize)
  )
  return (
    <div className="rounded-[30px] bg-slate-50 p-4 ring-1 ring-slate-200/90">
      <div className="space-y-4 overflow-y-auto">
        {blocks.map((block, bi) => (
          <PremiumBlock
            key={bi}
            left={block.slice(0, 9)}
            right={block.slice(9, 18)}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
        <div className="flex justify-center py-1">
          <div className="flex h-12 w-44 items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-white/75">
            <p className="text-sm font-semibold text-slate-500">Stage</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FestivalWestLayout({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const blocks = Array.from({ length: Math.ceil(sorted.length / 5) }, (_, i) => sorted.slice(i * 5, i * 5 + 5))
  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="mx-auto max-h-[560px] w-full max-w-[148px] overflow-y-auto rounded-[24px]">
        <div className="grid justify-center gap-5">
          {blocks.map((block, bi) => (
            <div className="grid gap-0" key={bi}>
              {block.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} sizeClass="min-h-[72px] min-w-[72px]" className="first:rounded-t-[20px] last:rounded-b-[20px]" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FestivalNorthLayout({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const blocks = Array.from({ length: Math.ceil(sorted.length / 5) }, (_, i) => sorted.slice(i * 5, i * 5 + 5))
  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="h-[152px] w-full overflow-x-auto overflow-y-hidden rounded-[24px]">
        <div className="flex w-max gap-5">
          {blocks.map((block, bi) => (
            <div className="flex gap-0" key={bi}>
              {block.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected?.id === b.id} onSelect={onSelect} sizeClass="min-h-[72px] min-w-[72px]" className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoneMap({ zone, selected, onSelect }: { zone: PublicZoneData; selected: PublicBooth | null; onSelect: (b: PublicBooth) => void }) {
  switch (zone.slug) {
    case "vvip": return <VvipLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "vip": return <VipLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "premium": return <PremiumLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "festival-west": return <FestivalWestLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "festival-north": return <FestivalNorthLayout zone={zone} selected={selected} onSelect={onSelect} />
    default: return <div className="text-sm text-slate-500">Layout zona belum tersedia.</div>
  }
}

// ─── Confirmation toast ────────────────────────────────────────────────────────

function ConfirmationBar({
  booth,
  zone,
  onClear,
  onConfirm,
  isSubmitting,
}: {
  booth: PublicBooth
  zone: PublicZoneData
  onClear: () => void
  onConfirm: (b: PublicBooth) => void
  isSubmitting: boolean
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-2xl shadow-primary-900/10 ring-1 ring-primary-100">
        <div className="flex items-start justify-between gap-4 bg-primary-50 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">Stand Dipilih</p>
            <p className="mt-1 font-semibold text-slate-900">
              Zona {zone.name} · Booth {booth.code}
            </p>
            <p className="mt-0.5 text-xl font-bold text-primary-700">{fmt(zone.price)}</p>
            {zone.pricePhase !== "free" && (
              <p className="text-xs text-slate-500">
                Harga {PHASE_LABEL[zone.pricePhase] ?? zone.pricePhase}
              </p>
            )}
          </div>
          <button className="mt-0.5 rounded-xl p-2 text-slate-400 hover:bg-primary-100 hover:text-primary-700" onClick={onClear} type="button">
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3 px-5 py-3">
          <button
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={isSubmitting}
            onClick={onClear}
            type="button"
          >
            Pilih Booth Lain
          </button>
          <button
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => onConfirm(booth)}
            type="button"
          >
            {isSubmitting ? "Memproses..." : "Simpan & Lanjutkan →"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PublicBoothMap({ zone, onConfirm }: Props) {
  const [selected, setSelected] = React.useState<PublicBooth | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const openCount = zone.booths.filter((b) => b.isAvailable && b.isEligible).length

  function handleConfirm(booth: PublicBooth) {
    setIsSubmitting(true)
    onConfirm(booth)
  }

  const image = zone.imageAssetId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={zone.name}
      className="h-full w-full object-cover"
      src={`/api/media/${zone.imageAssetId}`}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
      <span className="text-3xl font-bold tracking-tight text-primary-300">{zone.name}</span>
    </div>
  )

  const facilitiesTags = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {zone.facilities.map((f) => (
        <span key={f} className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {f}
        </span>
      ))}
    </div>
  )

  const priceBlock = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Harga Stand</p>
      <p className="mt-1 text-3xl font-bold text-primary-700">{fmt(zone.price)}</p>
      {zone.pricePhase !== "free" && (
        <p className="text-sm text-slate-500">Fase: {PHASE_LABEL[zone.pricePhase] ?? zone.pricePhase}</p>
      )}
      <p className="mt-1 text-sm text-slate-500">
        {openCount} stand tersedia untuk usaha Anda
      </p>
    </div>
  )

  if (zone.isVertical) {
    return (
      <div className="relative">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar: image + info */}
          <div className="space-y-5">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl">{image}</div>
            {priceBlock}
            {zone.facilities.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Fasilitas</p>
                <div className="flex flex-wrap gap-2">
                  {zone.facilities.map((f) => (
                    <span key={f} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div>
            <ZoneMap zone={zone} selected={selected} onSelect={setSelected} />
          </div>
        </div>

        {selected && (
          <ConfirmationBar
            booth={selected}
            zone={zone}
            onClear={() => setSelected(null)}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative space-y-5">
      {/* Featured image — horizontal */}
      <div className="aspect-[21/6] overflow-hidden rounded-2xl sm:aspect-[21/5]">{image}</div>

      {/* Booth map */}
      <ZoneMap zone={zone} selected={selected} onSelect={setSelected} />

      {/* Price + facilities below */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        {priceBlock}
        {zone.facilities.length > 0 && (
          <div className="sm:max-w-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Fasilitas</p>
            {facilitiesTags}
          </div>
        )}
      </div>

      {selected && (
        <ConfirmationBar
          booth={selected}
          zone={zone}
          onClear={() => setSelected(null)}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
