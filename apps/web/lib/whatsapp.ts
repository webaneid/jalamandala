import { db } from '@repo/db'
import { expoEvents, whatsappConfigs } from '@repo/db/schema/public'
import { eq, asc } from 'drizzle-orm'

export interface SendWAOptions {
  to: string        // nomor tanpa + dan tanpa @s.whatsapp.net
  message: string
  context?: string  // label untuk log
}

interface GowaConfig {
  url: string
  username: string
  password: string
  deviceId: string
}

function normalizeToJid(phone: string): string {
  let cleaned = phone.replace(/[\s\-().+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  return `${cleaned}@s.whatsapp.net`
}

async function resolveGowaConfig(): Promise<GowaConfig | null> {
  // DB-first: cari config aktif dari event yang aktif
  try {
    const configuredSchemaName = process.env.TENANT_SCHEMA?.trim()

    let eventId: string | null = null

    if (configuredSchemaName) {
      const ev = await db.query.expoEvents.findFirst({
        where: eq(expoEvents.schemaName, configuredSchemaName),
      })
      eventId = ev?.id ?? null
    }

    if (!eventId) {
      const ev = await db.query.expoEvents.findFirst({
        where: eq(expoEvents.isActive, true),
      })
      eventId = ev?.id ?? null
    }

    if (!eventId) {
      const ev = await db.query.expoEvents.findFirst({
        orderBy: (t) => [asc(t.createdAt)],
      })
      eventId = ev?.id ?? null
    }

    if (eventId) {
      const cfg = await db.query.whatsappConfigs.findFirst({
        where: eq(whatsappConfigs.eventId, eventId),
      })

      if (cfg?.isActive && cfg.apiBaseUrl && cfg.username && cfg.password && cfg.deviceId) {
        return { url: cfg.apiBaseUrl, username: cfg.username, password: cfg.password, deviceId: cfg.deviceId }
      }
    }
  } catch {
    // DB unavailable — fall through to env vars
  }

  // Fallback: env vars
  const url = process.env.GOWA_URL
  const username = process.env.GOWA_USERNAME
  const password = process.env.GOWA_PASSWORD
  const deviceId = process.env.GOWA_DEVICE_ID

  if (url && username && password && deviceId) {
    return { url, username, password, deviceId }
  }

  return null
}

export async function sendWhatsApp({ to, message, context = 'general' }: SendWAOptions): Promise<boolean> {
  const enabled = process.env.GOWA_ENABLED !== 'false'
  if (!enabled) {
    console.log(`[WA:${context}] GOWA_ENABLED=false — skipped to ${to}`)
    return true
  }

  const config = await resolveGowaConfig()
  if (!config) {
    console.warn(`[WA:${context}] No GOWA config found (DB or env) — skipped`)
    return false
  }

  const jid = normalizeToJid(to)
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')

  try {
    const res = await fetch(`${config.url}/send/message`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'X-Device-Id': config.deviceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: jid, message }),
    })
    if (res.ok) {
      console.log(`[WA:${context}] Sent to ${to}`)
      return true
    }
    console.warn(`[WA:${context}] GOWA ${res.status} to ${to}`)
    return false
  } catch (err) {
    console.error(`[WA:${context}] Failed to ${to}:`, err)
    return false
  }
}

export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-().+]/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  return cleaned
}
