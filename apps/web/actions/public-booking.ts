"use server"

import { eq } from "drizzle-orm"
import { createManualInvoice } from "@/actions/finance"
import { getCurrentParticipantSession } from "@/lib/participant-session"
import { db } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"

export async function createPublicBoothBooking(payload: {
  addons?: Array<{ addonId: string; quantity: number }>
  boothIds: string[]
  businessId: string
  participantId: string
}): Promise<{ success: boolean; publicToken?: string; error?: string }> {
  const session = await getCurrentParticipantSession()
  if (!session || session.participantId !== payload.participantId) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." }
  }

  if (!payload.boothIds.length) {
    return { success: false, error: "Pilih minimal satu booth." }
  }

  // Verify businessId belongs to this participant
  const business = await db.query.participantBusinesses.findFirst({
    where: eq(participantBusinesses.id, payload.businessId),
    columns: { participantId: true },
  })
  if (!business || business.participantId !== session.participantId) {
    return { success: false, error: "Usaha tidak ditemukan atau bukan milik Anda." }
  }

  const result = await createManualInvoice({
    businessId: payload.businessId,
    participantId: payload.participantId,
    selectedAddons: (payload.addons ?? []).filter((a) => a.quantity > 0),
    selectedBoothIds: payload.boothIds,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const invoice = (result as { success: true; data: { publicToken: string } }).data
  return { success: true, publicToken: invoice.publicToken }
}
