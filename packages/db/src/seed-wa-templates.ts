import * as dotenv from 'dotenv'
import { asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

dotenv.config({ path: '../../.env' })

import * as publicSchema from './schema/public'

const DEFAULT_TEMPLATES = [
  {
    key: 'otp_verifikasi',
    title: 'OTP Verifikasi Login',
    sortOrder: 1,
    body: `Kode OTP Anda: *{{kode_otp}}*

Berlaku 5 menit. Jangan bagikan ke siapapun.`,
  },
  {
    key: 'invoice_terbit',
    title: 'Invoice Diterbitkan',
    sortOrder: 2,
    body: `{{nama}}, invoice Anda telah diterbitkan 📄

No. Invoice: *{{invoice_number}}*
Total: *{{total}}*
Jatuh Tempo: {{jatuh_tempo}}

Lihat & bayar:
{{link_invoice}}

Segera selesaikan pembayaran untuk mengamankan booth Anda.`,
  },
  {
    key: 'invoice_lunas',
    title: 'Invoice Lunas / Pembayaran Dikonfirmasi',
    sortOrder: 3,
    body: `{{nama}}, pembayaran Anda telah *DIKONFIRMASI* ✅

No. Invoice: {{invoice_number}}
Jumlah Bayar: *{{jumlah}}*

Sampai jumpa di FORBIS 2026! 🎉
Detail: {{link_invoice}}`,
  },
  {
    key: 'vendor_akun_dibuat',
    title: 'Akun Vendor Dibuat',
    sortOrder: 4,
    body: `Halo {{nama}}!

Akun vendor Anda untuk *FORBIS 2026* telah dibuat.

🔗 Login: {{link_portal}}
📧 Email: {{email}}
🔑 Password: {{password}}

Ganti password setelah login pertama.`,
  },
  {
    key: 'pencairan_disetujui',
    title: 'Pencairan Disetujui',
    sortOrder: 5,
    body: `{{nama}}, pencairan Anda *DISETUJUI* ✅

Jumlah: *{{jumlah}}*
Ke rekening: {{bank}} - {{rekening}} a/n {{atas_nama}}

Dana akan segera ditransfer.
Pantau: {{link_portal}}`,
  },
  {
    key: 'pencairan_ditolak',
    title: 'Pencairan Ditolak',
    sortOrder: 6,
    body: `{{nama}}, pengajuan pencairan *DITOLAK* ❌

Jumlah: {{jumlah}}
Alasan: _{{alasan}}_

Silakan ajukan ulang atau hubungi tim Finance.`,
  },
  {
    key: 'pencairan_ditransfer',
    title: 'Dana Sudah Ditransfer',
    sortOrder: 7,
    body: `{{nama}}, dana Anda telah *DITRANSFER* 💸

Jumlah diterima: *{{jumlah}}*
(setelah biaya transfer {{biaya_transfer}})
Rekening: {{bank}} - {{rekening}}
Waktu: {{waktu}}

Terima kasih telah bermitra di FORBIS 2026! 🙏`,
  },
  {
    key: 'finance_pencairan_baru',
    title: 'Notif Finance — Pencairan Baru',
    sortOrder: 8,
    body: `⚠️ *Pengajuan Pencairan Baru*

Pemohon: {{nama}}
Jumlah: *{{jumlah}}*
Keterangan: {{perusahaan}}
Rekening: {{bank}} - {{rekening}} a/n {{atas_nama}}

Review:
{{link_review}}`,
  },
  {
    key: 'tim_acara_confirmed',
    title: 'Notif Tim Acara — Peserta Terkonfirmasi',
    sortOrder: 9,
    body: `✅ *Peserta Baru Terkonfirmasi*

Perusahaan: {{perusahaan}}
PIC: {{nama}}
WA: {{rekening}}
Invoice: {{invoice_number}}`,
  },
  {
    key: 'pendaftaran_peserta_confirmed',
    title: 'Notif Pendaftaran — Peserta Terkonfirmasi',
    sortOrder: 11,
    body: `✅ *Peserta Baru Terkonfirmasi*

Perusahaan: *{{perusahaan}}*
PIC: {{nama}}
WA: {{whatsapp}}
Invoice: {{invoice_number}}`,
  },
  {
    key: 'finance_invoice_baru',
    title: 'Notif Finance — Invoice Baru Diterbitkan',
    sortOrder: 12,
    body: `📄 *Invoice Baru Diterbitkan*

Peserta: {{nama}}
Perusahaan: {{perusahaan}}
No. Invoice: *{{invoice_number}}*
Total: *{{total}}*
Jatuh Tempo: {{jatuh_tempo}}`,
  },
  {
    key: 'finance_bukti_masuk',
    title: 'Notif Finance — Bukti Pembayaran Masuk',
    sortOrder: 13,
    body: `💰 *Bukti Pembayaran Masuk — Perlu Verifikasi*

Peserta: {{nama}}
Perusahaan: {{perusahaan}}
Invoice: *{{invoice_number}}*
Nominal: *{{total}}*
Atas Nama: {{atas_nama}}
Via: {{payment_channel_label}}

Login untuk verifikasi:
{{link_invoice}}`,
  },
  {
    key: 'invoice_mau_expired',
    title: 'Pengingat Invoice Hampir Kadaluarsa',
    sortOrder: 10,
    body: `⚠️ {{nama}}, invoice Anda akan *KADALUARSA besok*!

No. Invoice: *{{invoice_number}}*
Total: *{{total}}*
Jatuh Tempo: {{jatuh_tempo}}

Jika belum dibayar sebelum jatuh tempo, booth Anda akan *dilepas* dan harus melakukan booking ulang.

Segera bayar sekarang:
{{link_invoice}}`,
  },
]

async function seedWaTemplates() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined')

  const client = postgres(process.env.DATABASE_URL, { max: 1 })
  const db = drizzle(client, { schema: publicSchema })

  const schema = process.env.TENANT_SCHEMA?.trim()
  let event

  if (schema) {
    event = await db.query.expoEvents.findFirst({
      where: eq(publicSchema.expoEvents.schemaName, schema),
    })
  }

  if (!event) {
    event = await db.query.expoEvents.findFirst({
      where: eq(publicSchema.expoEvents.isActive, true),
    })
  }

  if (!event) {
    event = await db.query.expoEvents.findFirst({
      orderBy: (t) => [asc(t.createdAt)],
    })
  }

  if (!event) throw new Error('Tidak ada event ditemukan.')

  console.log(`Seeding WA templates untuk event: ${event.name} (${event.id})`)

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await db.query.messageTemplates.findFirst({
      where: (t, { and, eq }) => and(eq(t.eventId, event!.id), eq(t.key, tpl.key)),
    })

    if (existing) {
      console.log(`  [skip] ${tpl.key} — sudah ada`)
      continue
    }

    await db.insert(publicSchema.messageTemplates).values({
      eventId: event.id,
      key: tpl.key,
      title: tpl.title,
      bodyTemplate: tpl.body,
      isActive: true,
      sortOrder: tpl.sortOrder,
    })
    console.log(`  [insert] ${tpl.key}`)
  }

  console.log('Done.')
  await client.end()
}

seedWaTemplates().catch((err) => {
  console.error(err)
  process.exit(1)
})
