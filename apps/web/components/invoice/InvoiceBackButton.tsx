"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

export function InvoiceBackButton({ fallbackUrl }: { fallbackUrl: string }) {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackUrl)
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
      Kembali
    </button>
  )
}
