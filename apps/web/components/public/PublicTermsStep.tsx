"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createTermsApproval } from "@/actions/terms-approval"
import { createPublicBoothBooking } from "@/actions/public-booking"
import type { TermsPageData } from "@/actions/terms-approval"
import type { PublicBooth, PublicZoneData } from "@/lib/public-booth-data"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

type Props = {
  addons: Array<{ addonId: string; quantity: number }>
  booths: PublicBooth[]
  businessId: string
  eventSlug: string
  participantId: string
  termsPage: TermsPageData
  zone: PublicZoneData
}

export function PublicTermsStep({
  addons,
  booths,
  businessId,
  eventSlug,
  participantId,
  termsPage,
  zone,
}: Props) {
  const router = useRouter()
  const [agreed, setAgreed] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [approvalResult, setApprovalResult] = React.useState<{
    qrDataUrl: string
    approvedAtWib: string
  } | null>(null)

  const addonsTotal = addons.reduce((sum, a) => sum + a.quantity, 0)
  const hasAddons = addonsTotal > 0

  async function handleAgree() {
    if (!agreed) return
    setError("")
    setIsSubmitting(true)

    // Step 1: create terms approval
    const approvalRes = await createTermsApproval({
      eventId: termsPage.eventId,
      participantId,
      termsPageId: termsPage.id,
      termsPageSlug: termsPage.slug,
      termsPageTitle: termsPage.title,
      termsContentChecksum: termsPage.checksum,
      termsContentFormat: termsPage.contentFormat,
    })

    if (!approvalRes.success) {
      setError(approvalRes.error)
      setIsSubmitting(false)
      return
    }

    // Step 2: show QR briefly, then create invoice
    setApprovalResult({
      qrDataUrl: approvalRes.qrDataUrl,
      approvedAtWib: approvalRes.approvedAtWib,
    })

    // Short pause so user sees the QR
    await new Promise((r) => setTimeout(r, 1200))

    const invoiceRes = await createPublicBoothBooking({
      addons,
      boothIds: booths.map((b) => b.id),
      businessId,
      participantId,
    })

    if (!invoiceRes.success) {
      setError(invoiceRes.error ?? "Gagal membuat invoice.")
      setIsSubmitting(false)
      return
    }

    router.push(`/invoice/${invoiceRes.publicToken}`)
  }

  if (approvalResult) {
    return (
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="size-7 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Persetujuan Tercatat</p>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(approvalResult.approvedAtWib).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "long",
              timeStyle: "short",
            })} WIB
          </p>
        </div>
        <img
          alt="QR Bukti Persetujuan"
          className="size-48 rounded-2xl border border-slate-100 shadow-sm"
          src={approvalResult.qrDataUrl}
        />
        <p className="text-xs text-slate-400">Membuat invoice...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Booking summary */}
      <div className="rounded-2xl border border-primary-100 bg-primary-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">Ringkasan Booking</p>
        <p className="mt-1 font-semibold text-slate-900">
          Zona {zone.name} · {booths.map((b) => b.code).join(", ")}
        </p>
        <p className="text-sm text-primary-700">{fmt(zone.price * booths.length)}</p>
        <p className="text-xs text-slate-500 mt-0.5">{booths.length} booth × {fmt(zone.price)}</p>
        {hasAddons && (
          <p className="text-xs text-slate-500">{addonsTotal} unit add-on dipilih</p>
        )}
      </div>

      {/* T&C content */}
      <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-inner">
        <h3 className="mb-4 text-base font-bold text-slate-900">{termsPage.title}</h3>
        <article
          className="prose prose-sm prose-slate max-w-none font-sans"
          dangerouslySetInnerHTML={{ __html: termsPage.htmlString }}
        />
      </div>

      {/* Checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-primary-200 hover:bg-primary-50/30 transition">
        <input
          checked={agreed}
          className="mt-0.5 size-5 shrink-0 accent-primary"
          onChange={(e) => setAgreed(e.target.checked)}
          type="checkbox"
        />
        <span className="text-sm text-slate-700 leading-relaxed">
          Saya telah membaca, memahami, dan menyetujui{" "}
          <span className="font-semibold text-primary">{termsPage.title}</span>{" "}
          yang berlaku untuk keikutsertaan saya di acara ini.
        </span>
      </label>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
        disabled={!agreed || isSubmitting}
        onClick={handleAgree}
        type="button"
      >
        {isSubmitting
          ? "Menyimpan persetujuan..."
          : "Saya Setuju & Buat Invoice →"}
      </button>

      <p className="text-center text-xs text-slate-400">
        Persetujuan ini dicatat secara digital beserta waktu dan QR verifikasi.
      </p>
    </div>
  )
}
