"use client"

import { useState } from "react"
import { X, ZoomIn } from "lucide-react"

export function ProofImageLightbox({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false)
  const src = `/api/media/${assetId}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
        title="Lihat bukti transfer"
      >
        <ZoomIn className="w-3.5 h-3.5" />
        Lihat
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Bukti Transfer"
            className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
