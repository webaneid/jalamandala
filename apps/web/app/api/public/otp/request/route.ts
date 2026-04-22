import { NextRequest, NextResponse } from 'next/server'
import { sendOtp } from '@/lib/whatsapp-otp'
import { normalizePhone } from '@/lib/whatsapp'

const PHONE_RE = /^(?:0|62|\+62)[0-9]{8,13}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string }
    const raw = body.phone?.trim() ?? ''

    if (!PHONE_RE.test(raw.replace(/\s/g, ''))) {
      return NextResponse.json(
        { success: false, error: 'Format nomor WhatsApp tidak valid. Contoh: 0812xxxx atau 62812xxxx' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(raw)
    const result = await sendOtp(phone)

    if (!result.success) {
      if (result.cooldownSeconds) {
        return NextResponse.json(
          { success: false, error: `Tunggu ${result.cooldownSeconds} detik sebelum minta OTP lagi.`, cooldownSeconds: result.cooldownSeconds },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { success: false, error: result.error ?? 'Gagal mengirim OTP.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, expiresAt: result.expiresAt })
  } catch {
    return NextResponse.json({ success: false, error: 'Permintaan tidak valid.' }, { status: 400 })
  }
}
