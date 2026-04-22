import { db } from '@repo/db'
import { expoEvents, messageTemplates } from '@repo/db/schema/public'
import { and, asc, eq } from 'drizzle-orm'

export const WA_KEYS = {
  OTP_VERIFIKASI:          'otp_verifikasi',
  INVOICE_TERBIT:          'invoice_terbit',
  INVOICE_LUNAS:           'invoice_lunas',
  VENDOR_AKUN_DIBUAT:      'vendor_akun_dibuat',
  PENCAIRAN_DISETUJUI:     'pencairan_disetujui',
  PENCAIRAN_DITOLAK:       'pencairan_ditolak',
  PENCAIRAN_DITRANSFER:    'pencairan_ditransfer',
  FINANCE_PENCAIRAN_BARU:  'finance_pencairan_baru',
  TIM_ACARA_CONFIRMED:     'tim_acara_confirmed',
} as const

export type WaKey = typeof WA_KEYS[keyof typeof WA_KEYS]

export type WaVars = {
  nama?: string
  perusahaan?: string
  company_name?: string
  invoice_number?: string
  total?: string
  invoice_total?: string
  jatuh_tempo?: string
  due_date?: string
  jumlah?: string
  bank?: string
  rekening?: string
  atas_nama?: string
  alasan?: string
  waktu?: string
  biaya_transfer?: string
  payment_channel_label?: string
  payment_instruction?: string
  link_invoice?: string
  link_portal?: string
  link_review?: string
  kode_otp?: string
  email?: string
  password?: string
  whatsapp?: string
}

// Variable descriptions — used by UI as reference
export const WA_VAR_LABELS: Record<keyof WaVars, string> = {
  nama:                   'Nama peserta / vendor',
  perusahaan:             'Nama perusahaan',
  company_name:           'Nama perusahaan (alias)',
  invoice_number:         'Nomor invoice',
  total:                  'Total tagihan (format Rp)',
  invoice_total:          'Total tagihan (alias)',
  jatuh_tempo:            'Tanggal jatuh tempo',
  due_date:               'Tanggal jatuh tempo (alias)',
  jumlah:                 'Jumlah pencairan / pembayaran (format Rp)',
  bank:                   'Nama bank tujuan',
  rekening:               'Nomor rekening tujuan',
  atas_nama:              'Nama pemilik rekening',
  alasan:                 'Alasan penolakan',
  waktu:                  'Waktu transfer',
  biaya_transfer:         'Biaya transfer (format Rp)',
  payment_channel_label:  'Label channel pembayaran (nama bank / QRIS)',
  payment_instruction:    'Instruksi pembayaran (nomor rekening / detail)',
  link_invoice:           'URL invoice publik',
  link_portal:            'URL vendor portal / halaman pencairan',
  link_review:            'URL admin review pencairan',
  kode_otp:               'Kode OTP 6 digit',
  email:                  'Email akun vendor',
  password:               'Password sementara vendor',
  whatsapp:               'Nomor WhatsApp peserta / vendor',
}

async function resolveActiveEventId(): Promise<string | null> {
  const schema = process.env.TENANT_SCHEMA?.trim()
  if (schema) {
    const ev = await db.query.expoEvents.findFirst({ where: eq(expoEvents.schemaName, schema) })
    if (ev) return ev.id
  }
  const ev = await db.query.expoEvents.findFirst({ where: eq(expoEvents.isActive, true) })
  if (ev) return ev.id
  const first = await db.query.expoEvents.findFirst({ orderBy: (t) => [asc(t.createdAt)] })
  return first?.id ?? null
}

export async function renderWaTemplate(key: WaKey, vars: WaVars): Promise<string | null> {
  try {
    const eventId = await resolveActiveEventId()
    if (!eventId) return null

    const template = await db.query.messageTemplates.findFirst({
      where: and(
        eq(messageTemplates.eventId, eventId),
        eq(messageTemplates.key, key),
        eq(messageTemplates.isActive, true)
      ),
    })

    if (!template) return null

    return template.bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, v: string) => {
      const val = (vars as Record<string, string | undefined>)[v]
      return val ?? `{{${v}}}`
    })
  } catch {
    return null
  }
}
