"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Pencil, X } from "lucide-react"
import { updateInvoiceItem } from "@/actions/finance"
import { Input } from "@/components/ui/input"

type InvoiceItem = {
  id: string
  title: string
  description: string | null
  quantity: number
  quantityLabel: string
  unitPrice: number
  subtotal: number
  itemType: string
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
}

export function InvoiceItemsEditor({
  items,
  grandTotal,
  taxAmount,
}: {
  items: InvoiceItem[]
  grandTotal: number
  taxAmount: number
}) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editPrice, setEditPrice] = React.useState("")
  const [isSaving, startSaving] = React.useTransition()
  const [error, setError] = React.useState("")

  function startEdit(item: InvoiceItem) {
    setEditingId(item.id)
    setEditPrice(String(item.unitPrice))
    setError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setError("")
  }

  function saveEdit(itemId: string) {
    const price = Number(editPrice)
    if (!price || price <= 0) { setError("Harga harus lebih dari 0."); return }
    setError("")
    startSaving(async () => {
      const result = await updateInvoiceItem(itemId, price)
      if (!result.success) { setError(result.error ?? "Gagal menyimpan."); return }
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-neutral-50">
        <tr>
          <th className="px-5 py-3 text-left font-medium text-muted-foreground">Item</th>
          <th className="px-5 py-3 text-right font-medium text-muted-foreground w-16">Qty</th>
          <th className="px-5 py-3 text-right font-medium text-muted-foreground w-36">Harga</th>
          <th className="px-5 py-3 text-right font-medium text-muted-foreground w-36">Subtotal</th>
          <th className="px-5 py-3 w-10" />
        </tr>
      </thead>
      <tbody className="divide-y">
        {items.map((item) => (
          editingId === item.id ? (
            <tr key={item.id} className="bg-blue-50/40">
              <td className="px-5 py-3" colSpan={5}>
                <div className="space-y-2">
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="space-y-1 flex-1 max-w-xs">
                      <label className="text-xs text-muted-foreground">Harga Satuan (Rp)</label>
                      <Input
                        type="number"
                        min={1}
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="pt-5 flex gap-2">
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-xl bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
                        onClick={() => saveEdit(item.id)}
                        disabled={isSaving}
                        type="button"
                      >
                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                      <button
                        className="inline-flex size-9 items-center justify-center rounded-xl border hover:bg-muted"
                        onClick={cancelEdit}
                        type="button"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                </div>
              </td>
            </tr>
          ) : (
            <tr key={item.id}>
              <td className="px-5 py-3">
                <p className="font-medium">{item.title}</p>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              </td>
              <td className="px-5 py-3 text-right text-muted-foreground">{item.quantityLabel}</td>
              <td className="px-5 py-3 text-right text-muted-foreground">{fmt(item.unitPrice)}</td>
              <td className="px-5 py-3 text-right font-medium">{fmt(item.subtotal)}</td>
              <td className="px-3 py-3 text-right">
                <button
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 transition"
                  onClick={() => startEdit(item)}
                  title="Edit harga"
                  type="button"
                >
                  <Pencil className="size-3.5" />
                </button>
              </td>
            </tr>
          )
        ))}
      </tbody>
      <tfoot className="border-t bg-neutral-50/50">
        {taxAmount > 0 && (
          <tr>
            <td colSpan={3} className="px-5 py-2 text-right text-sm text-muted-foreground">Pajak</td>
            <td className="px-5 py-2 text-right text-sm">{fmt(taxAmount)}</td>
            <td />
          </tr>
        )}
        <tr>
          <td colSpan={3} className="px-5 py-3 text-right font-semibold">Total Tagihan</td>
          <td className="px-5 py-3 text-right font-bold text-lg">{fmt(grandTotal)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  )
}
