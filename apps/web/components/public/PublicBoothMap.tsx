"use client"

import * as React from "react"
import type { PublicBooth, PublicZoneData } from "@/lib/public-booth-data"

type Props = {
  zone: PublicZoneData
  onConfirm: (booths: PublicBooth[]) => void
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

type LayoutProps = { zone: PublicZoneData; selected: Set<string>; onSelect: (b: PublicBooth) => void }

function VipLayout({ zone, selected, onSelect }: LayoutProps) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  // VIP7-12 di atas, VIP1-6 di bawah
  const rows = [sorted.slice(6, 12), sorted.slice(0, 6)]
  return (
    <div className="rounded-[30px] bg-slate-50 p-4 ring-1 ring-slate-200/90">
      <div className="overflow-x-auto">
        <div className="grid min-w-[380px] gap-3">
          {rows.map((row, ri) => (
            <div className="grid grid-cols-[1fr_52px_1fr] items-stretch gap-2" key={ri}>
              <div className="grid grid-cols-3 gap-0">
                {row.slice(0, 3).map((b) => (
                  <BoothCell key={b.id} booth={b} isSelected={selected.has(b.id)} onSelect={onSelect}
                    sizeClass="min-h-[60px] min-w-[72px]"
                    className="first:rounded-l-[14px] last:rounded-r-[14px]" />
                ))}
              </div>
              <div className="flex items-center justify-center rounded-[18px] border border-dashed border-slate-300/90 bg-white/60">
                <p className="rotate-180 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 [writing-mode:vertical-rl]">Gang</p>
              </div>
              <div className="grid grid-cols-3 gap-0">
                {row.slice(3, 6).map((b) => (
                  <BoothCell key={b.id} booth={b} isSelected={selected.has(b.id)} onSelect={onSelect}
                    sizeClass="min-h-[60px] min-w-[72px]"
                    className="first:rounded-l-[14px] last:rounded-r-[14px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PremiumCol({ booths, selected, onSelect }: { booths: PublicBooth[]; selected: Set<string>; onSelect: (b: PublicBooth) => void }) {
  // booths already sorted high→low (top display first)
  return (
    <div className="flex flex-col gap-0">
      {booths.map((b, i) => (
        <BoothCell
          key={b.id}
          booth={b}
          isSelected={selected.has(b.id)}
          onSelect={onSelect}
          sizeClass="min-h-[60px] min-w-[78px]"
          className={`${i === 0 ? "rounded-t-[16px]" : ""} ${i === booths.length - 1 ? "rounded-b-[16px]" : ""}`}
        />
      ))}
    </div>
  )
}

function PremiumLayout({ zone, selected, onSelect }: LayoutProps) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  // P1-P8: kiri-dalam, P9-P16: kanan-dalam, P17-P24: kanan-luar, P25-P32: kiri-luar
  // Tampil dari atas ke bawah: nomor besar dulu (P8→P1, P16→P9, dst)
  const innerLeft  = sorted.slice(0, 8).reverse()
  const innerRight = sorted.slice(8, 16).reverse()
  const outerRight = sorted.slice(16, 24).reverse()
  const outerLeft  = sorted.slice(24, 32).reverse()

  return (
    <div className="rounded-[30px] bg-slate-50 p-4 ring-1 ring-slate-200/90">
      <div className="overflow-x-auto">
        <div className="flex min-w-[560px] flex-col gap-3">
          {/* Stage — berdiri sendiri di atas, tengah, kiri-kanan kosong */}
          <div className="flex items-center justify-center px-8">
            <div className="rounded-xl border-2 border-slate-400 bg-slate-200 px-12 py-2.5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Stage</p>
            </div>
          </div>

          {/* 4 kolom booth di bawah stage */}
          <div className="flex items-start justify-center gap-2">
            <PremiumCol booths={outerLeft} selected={selected} onSelect={onSelect} />
            <PremiumCol booths={innerLeft} selected={selected} onSelect={onSelect} />
            <div className="w-10 shrink-0" />
            <PremiumCol booths={innerRight} selected={selected} onSelect={onSelect} />
            <PremiumCol booths={outerRight} selected={selected} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FestivalWestLayout({ zone, selected, onSelect }: LayoutProps) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const rightTop = sorted.slice(0, 5)
  const block1 = sorted.slice(5, 10)
  const block2 = sorted.slice(10, 15)
  const block3 = sorted.slice(15, 21)
  const block4 = sorted.slice(21, 27)

  const gangway = (
    <div className="flex h-7 items-center px-1">
      <div className="w-full border-b border-dashed border-slate-300" />
    </div>
  )

  function Block({ booths }: { booths: PublicBooth[] }) {
    return (
      <div className="grid gap-0">
        {booths.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected.has(b.id)} onSelect={onSelect} sizeClass="min-h-[64px] min-w-[72px]" className="first:rounded-t-[16px] last:rounded-b-[16px]" />)}
      </div>
    )
  }

  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div className="mx-auto max-h-[700px] w-[156px] overflow-y-auto rounded-[24px]">
        <div className="flex w-[156px] flex-col">
          <div className="self-end grid gap-0">
            {rightTop.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected.has(b.id)} onSelect={onSelect} sizeClass="min-h-[64px] min-w-[72px]" className="first:rounded-t-[16px] last:rounded-b-[16px]" />)}
          </div>
          <div className="self-start">
            <Block booths={block1} />
            {gangway}
            <Block booths={block2} />
            {gangway}
            <Block booths={block3} />
            <div className="h-8" />
            <Block booths={block4} />
          </div>
        </div>
      </div>
    </div>
  )
}

function FestivalNorthLayout({ zone, selected, onSelect }: LayoutProps) {
  const sorted = [...zone.booths].sort((a, b) => extract(a.code) - extract(b.code))
  const blocks = Array.from({ length: Math.ceil(sorted.length / 5) }, (_, i) => sorted.slice(i * 5, i * 5 + 5))
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const drag = React.useRef({ active: false, startX: 0, scrollLeft: 0 })

  function onMouseDown(e: React.MouseEvent) {
    drag.current = { active: true, startX: e.pageX, scrollLeft: scrollRef.current?.scrollLeft ?? 0 }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current.active || !scrollRef.current) return
    e.preventDefault()
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (e.pageX - drag.current.startX)
  }
  function onDragEnd() { drag.current.active = false }

  return (
    <div className="rounded-[30px] bg-slate-50 p-5 ring-1 ring-slate-200/90">
      <div
        ref={scrollRef}
        className="h-[152px] w-full cursor-grab overflow-x-auto overflow-y-hidden rounded-[24px] select-none active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        <div className="flex w-max gap-5">
          {blocks.map((block, bi) => (
            <div className="flex gap-0" key={bi}>
              {block.map((b) => <BoothCell key={b.id} booth={b} isSelected={selected.has(b.id)} onSelect={onSelect} sizeClass="min-h-[72px] min-w-[72px]" className="first:rounded-l-[20px] last:rounded-r-[20px]" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoneMap({ zone, selected, onSelect }: LayoutProps) {
  switch (zone.slug) {
    case "vip": return <VipLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "premium": return <PremiumLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "festival-west": return <FestivalWestLayout zone={zone} selected={selected} onSelect={onSelect} />
    case "festival-north": return <FestivalNorthLayout zone={zone} selected={selected} onSelect={onSelect} />
    default: return <div className="text-sm text-slate-500">Layout zona belum tersedia.</div>
  }
}

// ─── Confirmation toast ────────────────────────────────────────────────────────

function ConfirmationBar({
  booths,
  zone,
  onClear,
  onConfirm,
  isSubmitting,
}: {
  booths: PublicBooth[]
  zone: PublicZoneData
  onClear: () => void
  onConfirm: (bs: PublicBooth[]) => void
  isSubmitting: boolean
}) {
  const total = zone.price * booths.length
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-2xl shadow-primary-900/10 ring-1 ring-primary-100">
        <div className="flex items-start justify-between gap-4 bg-primary-50 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">
              {booths.length} Booth Dipilih
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {booths.map((b) => b.code).join(", ")}
            </p>
            <p className="mt-0.5 text-xl font-bold text-primary-700">{fmt(total)}</p>
            {zone.pricePhase !== "free" && (
              <p className="text-xs text-slate-500">
                {fmt(zone.price)} × {booths.length} booth · Harga {PHASE_LABEL[zone.pricePhase] ?? zone.pricePhase}
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
            Hapus Pilihan
          </button>
          <button
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => onConfirm(booths)}
            type="button"
          >
            {isSubmitting ? "Memproses..." : `Lanjutkan ${booths.length > 1 ? `(${booths.length})` : ""} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PublicBoothMap({ zone, onConfirm }: Props) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const openCount = zone.booths.filter((b) => b.isAvailable && b.isEligible).length
  const selectedBooths = zone.booths.filter((b) => selectedIds.has(b.id))

  function handleSelect(booth: PublicBooth) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(booth.id)) next.delete(booth.id)
      else next.add(booth.id)
      return next
    })
  }

  function handleConfirm(booths: PublicBooth[]) {
    setIsSubmitting(true)
    onConfirm(booths)
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
      <div className="relative space-y-5">
        {/* Info: image + price + facilities — compact horizontal strip */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="aspect-video w-full overflow-hidden rounded-2xl sm:w-48 sm:shrink-0">{image}</div>
          <div className="space-y-3">
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
        </div>

        {/* Map — full width below */}
        <ZoneMap zone={zone} selected={selectedIds} onSelect={handleSelect} />

        {selectedBooths.length > 0 && (
          <ConfirmationBar
            booths={selectedBooths}
            zone={zone}
            onClear={() => setSelectedIds(new Set())}
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
      <div className="aspect-video overflow-hidden rounded-2xl">{image}</div>

      {/* Booth map */}
      <ZoneMap zone={zone} selected={selectedIds} onSelect={handleSelect} />

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

      {selectedBooths.length > 0 && (
        <ConfirmationBar
          booths={selectedBooths}
          zone={zone}
          onClear={() => setSelectedIds(new Set())}
          onConfirm={handleConfirm}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
