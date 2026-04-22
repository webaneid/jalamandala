import redis from './redis'
import { sendWhatsApp, normalizePhone } from './whatsapp'
import { renderWaTemplate, WA_KEYS } from './whatsapp-template'

const OTP_TTL = 300       // 5 menit
const COOLDOWN_TTL = 60   // 1 menit resend throttle
const MAX_ATTEMPTS = 5
const BAN_TTL = 900       // 15 menit ban setelah 5x salah

type MemoryOtpEntry = {
  code: string
  expiresAt: number
  failCount: number
}

const globalForOtp = globalThis as unknown as {
  otpMemoryStore?: Map<string, MemoryOtpEntry>
  otpCooldownStore?: Map<string, number>
  otpBanStore?: Map<string, number>
}

const otpMemoryStore = globalForOtp.otpMemoryStore ?? new Map<string, MemoryOtpEntry>()
const otpCooldownStore = globalForOtp.otpCooldownStore ?? new Map<string, number>()
const otpBanStore = globalForOtp.otpBanStore ?? new Map<string, number>()

if (process.env.NODE_ENV !== 'production') {
  globalForOtp.otpMemoryStore = otpMemoryStore
  globalForOtp.otpCooldownStore = otpCooldownStore
  globalForOtp.otpBanStore = otpBanStore
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function remainingSeconds(untilMs?: number) {
  if (!untilMs) return 0
  return Math.max(0, Math.ceil((untilMs - Date.now()) / 1000))
}

async function sendOtpViaMemory(phone: string) {
  const banSeconds = remainingSeconds(otpBanStore.get(phone))
  if (banSeconds > 0) {
    return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(banSeconds / 60)} menit.` }
  }

  const cooldownSeconds = remainingSeconds(otpCooldownStore.get(phone))
  if (cooldownSeconds > 0) {
    return { success: false, cooldownSeconds }
  }

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + OTP_TTL * 1000)
  otpMemoryStore.set(phone, { code, expiresAt: expiresAt.getTime(), failCount: 0 })
  otpCooldownStore.set(phone, Date.now() + COOLDOWN_TTL * 1000)

  const rendered = await renderWaTemplate(WA_KEYS.OTP_VERIFIKASI, { kode_otp: code })
  const message = rendered ?? `Kode OTP Anda: *${code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.`
  const sent = await sendWhatsApp({ to: phone, message, context: 'otp-memory' })

  if (!sent) {
    otpMemoryStore.delete(phone)
    otpCooldownStore.delete(phone)
    return { success: false, error: 'Gagal mengirim OTP. Periksa nomor WA atau coba beberapa saat lagi.' }
  }

  return { success: true, expiresAt }
}

export async function sendOtp(
  rawPhone: string
): Promise<{ success: boolean; expiresAt?: Date; cooldownSeconds?: number; error?: string }> {
  try {
    const phone = normalizePhone(rawPhone)

    const banTtl = await redis.ttl(`otp:wa:ban:${phone}`)
    if (banTtl > 0) {
      return { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(banTtl / 60)} menit.` }
    }

    const cooldown = await redis.ttl(`otp:wa:cooldown:${phone}`)
    if (cooldown > 0) {
      return { success: false, cooldownSeconds: cooldown }
    }

    const code = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_TTL * 1000)

    await redis.set(`otp:wa:${phone}`, code, 'EX', OTP_TTL)
    await redis.set(`otp:wa:cooldown:${phone}`, '1', 'EX', COOLDOWN_TTL)
    await redis.del(`otp:wa:fail:${phone}`)

    const rendered = await renderWaTemplate(WA_KEYS.OTP_VERIFIKASI, { kode_otp: code })
    const message = rendered ?? `Kode OTP Anda: *${code}*\nBerlaku 5 menit. Jangan bagikan ke siapapun.`
    const sent = await sendWhatsApp({ to: phone, message, context: 'otp' })

    if (!sent) {
      await redis.del(`otp:wa:${phone}`)
      await redis.del(`otp:wa:cooldown:${phone}`)
      return { success: false, error: 'Gagal mengirim OTP. Periksa nomor WA atau coba beberapa saat lagi.' }
    }

    return { success: true, expiresAt }
  } catch (error) {
    console.error('[OTP] send failed:', error)
    return sendOtpViaMemory(normalizePhone(rawPhone))
  }
}

export async function verifyOtp(rawPhone: string, code: string): Promise<boolean> {
  try {
    const phone = normalizePhone(rawPhone)

    const banTtl = await redis.ttl(`otp:wa:ban:${phone}`)
    if (banTtl > 0) return false

    const stored = await redis.get(`otp:wa:${phone}`)
    if (!stored) return false

    if (stored !== code.trim()) {
      const fails = await redis.incr(`otp:wa:fail:${phone}`)
      if (fails >= MAX_ATTEMPTS) {
        await redis.set(`otp:wa:ban:${phone}`, '1', 'EX', BAN_TTL)
        await redis.del(`otp:wa:${phone}`)
      }
      return false
    }

    await redis.del(`otp:wa:${phone}`)
    await redis.del(`otp:wa:fail:${phone}`)
    return true
  } catch (error) {
    console.error('[OTP] verify failed:', error)
    const phone = normalizePhone(rawPhone)
    const banSeconds = remainingSeconds(otpBanStore.get(phone))
    if (banSeconds > 0) return false

    const entry = otpMemoryStore.get(phone)
    if (!entry || entry.expiresAt < Date.now()) {
      otpMemoryStore.delete(phone)
      return false
    }

    if (entry.code !== code.trim()) {
      entry.failCount += 1
      if (entry.failCount >= MAX_ATTEMPTS) {
        otpBanStore.set(phone, Date.now() + BAN_TTL * 1000)
        otpMemoryStore.delete(phone)
      }
      return false
    }

    otpMemoryStore.delete(phone)
    return true
  }
}
