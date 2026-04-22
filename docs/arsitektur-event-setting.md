# Arsitektur Event Setting
> Dokumen konteks awal untuk modul event setting FORBIS Expo. Fokusnya adalah konfigurasi inti event yang nanti dipakai oleh modul booth, add-on, keuangan, dan otomasi.

## 1. Tujuan

Event setting adalah fondasi konfigurasi event.

Modul ini harus menampung:

- identitas event
- target event
- timeline event
- channel pembayaran
- WhatsApp gateway
- default message template

Tujuannya:

- semua modul lain membaca satu sumber kebenaran yang sama
- invoice, pembayaran, dan notifikasi tidak menyimpan data event secara liar di banyak tempat

## 2. Ruang Lingkup

Sesuai kebutuhan saat ini, event setting minimal harus memuat:

- nama event
- logo event
- tempat event
- target peserta booth
- target pengunjung
- waktu event
- cara pembayaran
  - rekening pembayaran, bisa lebih dari 1
  - QRIS
  - payment gateway opsional
- setting WhatsApp gateway
- default message template dengan variabel

## 3. Kenapa Event Setting Harus Dokumen Terpisah

Event setting bukan bagian kecil dari finance.

Event setting dipakai oleh banyak domain:

- booth
- add-on
- invoice
- pembayaran
- WhatsApp automation
- halaman publik event

Jadi secara arsitektur:

- finance bergantung pada event setting
- event setting tidak boleh ditanam sebagai subbagian finance

Hubungannya:

- `event setting -> booth / add-on / finance / automation`

## 4. Domain yang Perlu Ada

### 4.1 Event Profile

Data inti event:

- `nama event`
- `logo event`
- `tempat event`
- `target peserta booth`
- `target pengunjung`
- `waktu event`

Fungsi:

- identitas event untuk UI admin dan publik
- dipakai di invoice
- dipakai di pesan otomatis

### 4.2 Payment Configuration

Konfigurasi channel pembayaran:

- daftar rekening manual
- QRIS
- payment gateway opsional

Fungsi:

- invoice tahu uang dikirim ke mana
- peserta melihat instruksi pembayaran yang benar
- finance bisa membedakan pembayaran masuk dari channel mana

### 4.3 WhatsApp Configuration

Konfigurasi automation WhatsApp:

- provider gateway
- sender ID / nomor pengirim
- endpoint atau credential reference
- status aktif

Fungsi:

- kirim notifikasi booking
- kirim invoice
- kirim reminder jatuh tempo
- kirim konfirmasi pembayaran

### 4.4 Message Templates

Template pesan otomatis dengan variabel.

Contoh template:

- booking diterima
- invoice diterbitkan
- invoice jatuh tempo
- pembayaran terverifikasi
- e-pass siap

Contoh variabel:

- `{{participant_name}}`
- `{{company_name}}`
- `{{event_name}}`
- `{{invoice_number}}`
- `{{invoice_total}}`
- `{{due_date}}`
- `{{payment_channel_label}}`
- `{{payment_instruction}}`
- `{{booth_list}}`
- `{{addon_list}}`

## 5. Struktur Data yang Disarankan

Ini proposal struktur awal, belum implementasi.

### 5.1 `event_profiles`

- `eventId`
- `name`
- `logoAssetId`
- `venue`
- `targetBooths`
- `targetVisitors`
- `startDate`
- `endDate`
- `publicDescription`

### 5.2 `payment_channels`

- `id`
- `eventId`
- `type`
- `label`
- `accountName`
- `accountNumber`
- `bankName`
- `qrisAssetId`
- `provider`
- `instruction`
- `isActive`
- `sortOrder`

Tipe channel minimal:

- `bank_account`
- `qris`
- `payment_gateway`

### 5.3 `whatsapp_configs`

- `eventId`
- `provider`
- `apiBaseUrl`
- `senderId`
- `isActive`

Catatan:

- credential sensitif sebaiknya tidak ditaruh mentah di form biasa
- lebih aman memakai secret reference atau env mapping

### 5.4 `message_templates`

- `id`
- `eventId`
- `key`
- `title`
- `bodyTemplate`
- `isActive`

## 6. Hubungan dengan Modul Lain

### 6.1 Keuangan

Finance membaca:

- identitas event untuk invoice
- payment channels untuk tujuan pembayaran
- message templates untuk reminder dan notifikasi

### 6.2 Booth

Booth membaca:

- identitas event
- target booth sebagai acuan operasional

### 6.3 Add-on

Add-on membaca:

- identitas event aktif

### 6.4 Otomasi

Automation membaca:

- WhatsApp config
- template pesan

## 7. Admin UI yang Nanti Dibutuhkan

Halaman `/admin/setting` nanti sebaiknya dipecah menjadi grup berikut:

### 7.1 Profil Event

- nama event
- logo
- tempat
- deskripsi singkat
- target booth
- target pengunjung
- tanggal mulai dan selesai

### 7.2 Payment Channels

- tabel daftar rekening
- tabel daftar QRIS
- tabel daftar gateway
- popup tambah/edit channel

### 7.3 WhatsApp Gateway

- provider
- sender
- status
- test message

### 7.4 Message Templates

- tabel template
- preview variabel
- edit body message

## 8. Urutan Implementasi yang Disarankan

Fase paling masuk akal:

1. `event profile`
2. `payment channels`
3. `whatsapp config`
4. `message templates`

Setelah itu baru:

- invoice
- pembayaran
- reminder otomatis

## 9. Status Sistem Saat Ini

Yang sudah diimplementasi (per April 2026):

### Schema Database (public)

- `expo_events` — nama, slug, schemaName, logoUrl, venue, targetBooths, targetVisitors, startDate, endDate, isActive
- `payment_channels` — bank_account, label, accountName, accountNumber, bankName, isActive, sortOrder
- `qris_configs` — per-event, satu baris, emvPayload, merchantName, merchantCity, expiryMinutes, imageUrl, isEnabled
- `whatsapp_configs` — per-event, satu baris, apiBaseUrl, basicAuth, deviceId, senderId, provider (hardcoded: sumopod), isActive
- `message_templates` — key, title, bodyTemplate, isActive, sortOrder

### Server Actions (`apps/web/actions/event-settings.ts`)

- `updateEventProfile` — update nama, venue, logo, target, tanggal
- `upsertPaymentChannel` — tambah/edit rekening bank
- `deletePaymentChannel`
- `upsertQrisConfig` — simpan EMV payload, parse merchantName/merchantCity otomatis
- `upsertWhatsappConfig` — simpan gateway sumopod
- `upsertMessageTemplate` — tambah/edit template dengan normalisasi key
- `deleteMessageTemplate`

### Admin UI (`/admin/setting`)

- 3 tab: Profile Event, Pembayaran, WhatsApp
- Tab Pembayaran: rekening bank (CRUD inline) + QRIS config (form + EMV parser)
- Tab WhatsApp: form gateway sumopod + CRUD template pesan
- Seed script: `packages/db/src/seed-event-settings.ts` — seed 3 template default (booking_diterima, invoice_terbit, invoice_terbayar)

### Catatan Gap Minor

- Field `senderId` ada di schema `whatsapp_configs` tapi belum diekspos di UI/action (belum dibutuhkan untuk sumopod)
- Field `publicDescription` disebut di proposal struktur tapi belum ada di schema (belum dibutuhkan)
- Payment gateway (selain bank/QRIS) belum diimplementasi di UI

Jadi statusnya:

- **event setting inti sudah selesai dan berfungsi**
- **QRIS dinamis per invoice belum diimplementasi** (butuh integrasi ke flow invoice)

## 10. Kesimpulan

Event setting harus dianggap sebagai domain mandiri.

Ia bukan subfitur finance, tetapi fondasi untuk:

- finance
- booth
- add-on
- automation

Kalau mau urutan paling aman:

- bangun dulu `event setting inti`
- lalu `keuangan`
- lalu `otomasi yang membaca template dan channel`
