"use server"

import { createManualInvoice } from "@/actions/finance"
import { getCurrentParticipantSession } from "@/lib/participant-session"

export async function createPublicBoothBooking(payload: {
  addons?: Array<{ addonId: string; quantity: number }>
  boothId: string
  businessId: string
  participantId: string
}): Promise<{ success: boolean; publicToken?: string; error?: string }> {
  // Verify the caller is a logged-in participant who owns this business
  const session = await getCurrentParticipantSession()
  if (!session || session.participantId !== payload.participantId) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." }
  }

  const result = await createManualInvoice({
    businessId: payload.businessId,
    participantId: payload.participantId,
    selectedAddons: (payload.addons ?? []).filter((a) => a.quantity > 0),
    selectedBoothIds: [payload.boothId],
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  const invoice = (result as { success: true; data: { publicToken: string } }).data
  return { success: true, publicToken: invoice.publicToken }
}
