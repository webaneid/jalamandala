"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Trash2, X, Check } from "lucide-react"
import { deleteInvoicePayment, updateInvoicePayment } from "@/actions/finance"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker"
import { PaymentProofPreviewButton } from "@/components/admin/finance/PaymentProofPreviewButton"

type Payment = {
  id: string
  amount: number
  paidAt: string
  status: string
  method: string | null
  paymentChannelLabel: string | null
  referenceNumber: string | null
  senderName: string | null
  proofAssetId: string | null
}

type RefundDisbursement = {
  id: string
  requestedAmount: number
  status: string
  createdAt: string
}

type PaymentMethod = { key: string; label: string; type: string }

function formatCurrency(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d))
}

function toWibDateTimeLocal(date: string) {
  const d = new Date(date)
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const y = wib.getUTCFullYear()
  const mo = String(wib.getUTCMonth() + 1).padStart(2, "0")
  const day = String(wib.getUTCDate()).padStart(2, "0")
  const h = String(wib.getUTCHours()).padStart(2, "0")
  const mi = String(wib.getUTCMinutes()).padStart(2, "0")
  return `${y}-${mo}-${day}T${h}:${mi}`
}

const REFUND_STATUS_LABEL: Record<string, string> = {
  submitted: "Menunggu Persetujuan",
  approved: "Disetujui",
  transferred: "Sudah Ditransfer",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  draft: "Draft",
}

export function PaymentHistoryEditor({
  payments,
  paymentMethods,
  totalVerified,
  balanceDue,
  refundDisbursements = [],
}: {
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  totalVerified: number
  balanceDue: number
  refundDisbursements?: RefundDisbursement[]
}) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [isSaving, startSaving] = React.useTransition()
  const [error, setError] = React.useState("")

  // Edit state
  const [amount, setAmount] = React.useState("")
  const [paidAt, setPaidAt] = React.useState("")
  const [senderName, setSenderName] = React.useState("")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [paymentMethodKey, setPaymentMethodKey] = React.useState("")
  const [proofAsset, setProofAsset] = React.useState<MediaPickerValue>(null)

  function startEdit(p: Payment) {
    setEditingId(p.id)
    setAmount(String(p.amount))
    setPaidAt(toWibDateTimeLocal(p.paidAt))
    setSenderName(p.senderName ?? "")
    setReferenceNumber(p.referenceNumber ?? "")
    setPaymentMethodKey(
      paymentMethods.find((m) => m.label === p.paymentChannelLabel)?.key ?? ""
    )
    setProofAsset(p.proofAssetId ? { id: p.proofAssetId, url: `/api/media/${p.proofAssetId}`, objectKey: "", fileName: "Bukti transfer", mimeType: "image/*" } : null)
    setError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setError("")
  }

  function confirmDelete(paymentId: string) {
    setConfirmDeleteId(paymentId)
    setError("")
  }

  function handleDelete(paymentId: string) {
    setError("")
    startSaving(async () => {
      const result = await deleteInvoicePayment(paymentId)
      if (!result.success) {
        setError(result.error ?? "Gagal menghapus.")
        setConfirmDeleteId(null)
        return
      }
      setConfirmDeleteId(null)
      router.refresh()
    })
  }

  function saveEdit(paymentId: string) {
    setError("")
    startSaving(async () => {
      const result = await updateInvoicePayment({
        paymentId,
        amount: Number(amount) || 0,
        paidAt,
        senderName,
        referenceNumber,
        paymentMethodKey: paymentMethodKey || undefined,
        proofAssetId: proofAsset?.id ?? null,
      })
      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan.")
        return
      }
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead className="border-b bg-neutral-50">
          <tr>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Atas Nama</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Channel</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bukti</th>
            <th className="px-5 py-3 text-right font-medium text-muted-foreground">Jumlah</th>
            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-5 py-3 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {refundDisbursements.map((d) => (
            <tr key={`refund-${d.id}`} className="bg-red-50/40">
              <td className="px-5 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
              <td className="px-5 py-3 text-red-700 font-medium" colSpan={2}>Pengembalian Kelebihan Bayar</td>
              <td className="px-5 py-3">—</td>
              <td className="px-5 py-3 text-right font-medium text-red-600">−{formatCurrency(d.requestedAmount)}</td>
              <td className="px-5 py-3">
                <Badge className="bg-red-50 text-red-600 ring-1 ring-red-200 text-xs">
                  {REFUND_STATUS_LABEL[d.status] ?? d.status}
                </Badge>
              </td>
              <td className="px-3 py-3" />
            </tr>
          ))}
          {payments.map((p) =>
            editingId === p.id ? (
              <tr key={p.id} className="bg-blue-50/40">
                <td className="px-3 py-3" colSpan={7}>
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Jumlah Transfer</label>
                        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tanggal & Jam (WIB)</label>
                        <Input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
                        <select
                          className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600"
                          value={paymentMethodKey}
                          onChange={(e) => setPaymentMethodKey(e.target.value)}
                        >
                          <option value="">Pilih metode</option>
                          {paymentMethods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Atas Nama Pengirim</label>
                        <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Nama pemilik rekening" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">No. Referensi</label>
                        <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Opsional" />
                      </div>
                      <div className="space-y-1 sm:col-span-2 md:col-span-1">
                        <label className="text-xs font-medium text-muted-foreground">Bukti Transfer</label>
                        <MediaPicker
                          value={proofAsset}
                          onChange={setProofAsset}
                          accept="image"
                          folder="private/payment-proofs"
                          visibility="private"
                          placeholder="Pilih atau upload bukti..."
                        />
                      </div>
                    </div>
                    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={isSaving} onClick={() => saveEdit(p.id)} className="gap-1.5">
                        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Simpan
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="gap-1.5">
                        <X className="size-3.5" />Batal
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(p.paidAt)}</td>
                <td className="px-5 py-3">{p.senderName ?? "-"}</td>
                <td className="px-5 py-3 text-muted-foreground">{p.paymentChannelLabel ?? p.method ?? "-"}</td>
                <td className="px-5 py-3"><PaymentProofPreviewButton assetId={p.proofAssetId} /></td>
                <td className="px-5 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                <td className="px-5 py-3">
                  <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs">Terverifikasi</Badge>
                </td>
                <td className="px-3 py-3 text-right">
                  {confirmDeleteId === p.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs text-red-600 font-medium">Hapus?</span>
                      <button
                        className="inline-flex size-7 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                        onClick={() => handleDelete(p.id)}
                        disabled={isSaving}
                        type="button"
                      >
                        {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3.5" />}
                      </button>
                      <button
                        className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:bg-muted transition"
                        onClick={() => setConfirmDeleteId(null)}
                        type="button"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 transition"
                        onClick={() => startEdit(p)}
                        title="Edit pembayaran"
                        type="button"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition"
                        onClick={() => confirmDelete(p.id)}
                        title="Hapus pembayaran"
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )
          )}
        </tbody>
        <tfoot className="border-t bg-neutral-50/50">
          {refundDisbursements.length > 0 ? (
            <>
              <tr>
                <td colSpan={4} className="px-5 py-2 text-right text-sm text-muted-foreground">Total Diterima</td>
                <td className="px-5 py-2 text-right font-semibold text-emerald-700">{formatCurrency(totalVerified)}</td>
                <td colSpan={2} />
              </tr>
              <tr>
                <td colSpan={4} className="px-5 py-2 text-right text-sm text-muted-foreground">Dikembalikan</td>
                <td className="px-5 py-2 text-right font-semibold text-red-600">
                  −{formatCurrency(refundDisbursements.filter(d => ["submitted","approved","transferred"].includes(d.status)).reduce((s,d) => s + d.requestedAmount, 0))}
                </td>
                <td colSpan={2} />
              </tr>
              <tr className="border-t">
                <td colSpan={4} className="px-5 py-3 text-right font-semibold">Total Efektif</td>
                <td className="px-5 py-3 text-right font-bold text-emerald-700">
                  {formatCurrency(totalVerified - refundDisbursements.filter(d => ["submitted","approved","transferred"].includes(d.status)).reduce((s,d) => s + d.requestedAmount, 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan={4} className="px-5 py-3 text-right font-semibold">Total Terbayar</td>
              <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(totalVerified)}</td>
              <td colSpan={2} />
            </tr>
          )}
          {balanceDue > 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-2 text-right text-sm text-muted-foreground">Sisa Tagihan</td>
              <td className="px-5 py-2 text-right font-semibold text-amber-700">{formatCurrency(balanceDue)}</td>
              <td colSpan={2} />
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  )
}
