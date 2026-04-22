import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import redis from './redis'

export const SESSION_COOKIE = 'participant-session'
const SESSION_TTL = 60 * 60 * 24 * 7 // 7 hari

export interface ParticipantSession {
  participantId: string
  phone: string
  name: string
  eventSlug: string
}

type MemorySessionEntry = { data: ParticipantSession; expiresAt: number }

const globalForSession = globalThis as unknown as {
  participantSessionStore?: Map<string, MemorySessionEntry>
}
const memSessionStore =
  globalForSession.participantSessionStore ?? new Map<string, MemorySessionEntry>()
if (process.env.NODE_ENV !== 'production') {
  globalForSession.participantSessionStore = memSessionStore
}

export async function createParticipantSession(data: ParticipantSession): Promise<string> {
  const sessionId = randomUUID()
  try {
    await redis.set(`participant:session:${sessionId}`, JSON.stringify(data), 'EX', SESSION_TTL)
  } catch {
    memSessionStore.set(sessionId, { data, expiresAt: Date.now() + SESSION_TTL * 1000 })
  }
  return sessionId
}

export async function getParticipantSessionById(sessionId: string): Promise<ParticipantSession | null> {
  try {
    const raw = await redis.get(`participant:session:${sessionId}`)
    if (!raw) return null
    return JSON.parse(raw) as ParticipantSession
  } catch {
    const entry = memSessionStore.get(sessionId)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      memSessionStore.delete(sessionId)
      return null
    }
    return entry.data
  }
}

export async function getCurrentParticipantSession(): Promise<ParticipantSession | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null
  return getParticipantSessionById(sessionId)
}

export async function deleteParticipantSession(sessionId: string): Promise<void> {
  memSessionStore.delete(sessionId)
  try {
    await redis.del(`participant:session:${sessionId}`)
  } catch {
    // best-effort
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL,
  secure: process.env.NODE_ENV === 'production',
}
