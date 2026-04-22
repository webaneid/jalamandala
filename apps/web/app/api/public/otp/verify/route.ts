import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/whatsapp-otp'
import { normalizePhone } from '@/lib/whatsapp'
import {
  createParticipantSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/participant-session'
import { db } from '@repo/db'
import { participants } from '@repo/db/schema/public'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string; code?: string; eventSlug?: string }
    const rawPhone = body.phone?.trim() ?? ''
    const code = body.code?.trim() ?? ''
    const eventSlug = body.eventSlug?.trim() ?? ''

    if (!rawPhone || !code || !eventSlug) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap.' }, { status: 400 })
    }

    const phone = normalizePhone(rawPhone)
    const valid = await verifyOtp(phone, code)

    if (!valid) {
      return NextResponse.json({ success: false, error: 'Kode OTP salah atau sudah kedaluwarsa.' }, { status: 401 })
    }

    const participant = await db.query.participants.findFirst({
      where: eq(participants.whatsapp, phone),
      columns: { id: true, name: true, whatsapp: true },
    })

    if (!participant) {
      return NextResponse.json({ success: false, error: 'Akun peserta tidak ditemukan. Silakan daftar terlebih dahulu.' }, { status: 404 })
    }

    await db
      .update(participants)
      .set({
        whatsappVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(participants.id, participant.id))

    const sessionId = await createParticipantSession({
      participantId: participant.id,
      phone: participant.whatsapp,
      name: participant.name,
      eventSlug,
    })

    const redirectTo = `/${eventSlug}/dashboard`

    const response = NextResponse.json({ success: true, redirectTo })
    response.cookies.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS)
    return response
  } catch (err) {
    console.error('[OTP Verify]', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
