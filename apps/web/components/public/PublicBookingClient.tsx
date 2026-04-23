"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PublicBoothMap } from "@/components/public/PublicBoothMap"
import type { PublicBooth, PublicZoneData } from "@/lib/public-booth-data"

type Props = {
  businessId: string
  eventSlug: string
  zone: PublicZoneData
}

export function PublicBookingClient({ businessId, eventSlug, zone }: Props) {
  const router = useRouter()

  function handleConfirm(booths: PublicBooth[]) {
    const ids = booths.map((b) => b.id).join(",")
    router.push(
      `/${eventSlug}/booking?zone=${encodeURIComponent(zone.slug)}&businessId=${businessId}&boothIds=${ids}`
    )
  }

  return <PublicBoothMap zone={zone} onConfirm={handleConfirm} />
}
