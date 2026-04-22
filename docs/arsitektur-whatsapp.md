# Arsitektur WhatsApp — Jalamandala

Dokumen ini adalah rencana menyeluruh integrasi WhatsApp untuk **seluruh aplikasi** Jalamandala, mulai dari verifikasi OTP pendaftaran hingga notifikasi operasional semua pihak.

Gateway: **GOWA** (go-whatsapp-web-multidevice by aldinokemal), self-hosted di SumoPod.

---

## 1. Stack & Komponen

| Komponen | Detail |
|---|---|
| Gateway | GOWA — go-whatsapp-web-multidevice |
| Hosting | SumoPod (self-managed container) |
| Auth ke GOWA | HTTP Basic Auth |
| Protocol | REST — `POST /send/message` (JSON) |
| OTP Storage | Redis (sudah ada di infrastruktur) |
| Inbound Webhook | `POST /api/webhook/whatsapp` (opsional, fase lanjut) |

---

## 2. Environment Variables

### Di SumoPod (container GOWA)

```env
APP_BASIC_AUTH=<username>:<password>
APP_ACCOUNT_VALIDATION=false
WEBHOOK_URL=https://<domain-jalamandala>/api/webhook/whatsapp
WHATSAPP_WEBHOOK_SECRET=<secret>
```

### Di Jalamandala `.env`

```env
# --- GOWA Gateway ---
GOWA_URL=https://<subdomain>.sumopod.my.id
GOWA_DEVICE_ID=628xxxxxxxxxxxx
GOWA_USERNAME=<username>
GOWA_PASSWORD=<password>
GOWA_SENDER_NUMBER=628xxxxxxxxxxxx
GOWA_WEBHOOK_SECRET=<secret>
GOWA_ENABLED=true
GOWA_SEND_DELAY_MS=2000
```

**Aturan konsistensi:**
- Semua variabel sisi Jalamandala berawalan `GOWA_`. Tidak ada `WHATSAPP_*` di Next.js.
- `GOWA_ENABLED=false` wajib di environment development/staging agar tidak kirim ke nomor real.
- `GOWA_SEND_DELAY_MS` adalah anti-ban delay antar pesan (default 2000ms).

---

## 3. API GOWA — Send Message

```
POST {GOWA_URL}/send/message
Authorization: Basic base64(GOWA_USERNAME:GOWA_PASSWORD)
X-Device-Id: {GOWA_DEVICE_ID}
Content-Type: application/json

{
  "phone": "628111441942@s.whatsapp.net",
  "message": "Teks pesan"
}
```

Format nomor: `{nomor_tanpa_+}@s.whatsapp.net`
Contoh: `+62 811 144 1942` → `628111441942@s.whatsapp.net`

---

## 4. Abstraksi di Kode

Seluruh pengiriman WA melewati **satu helper**, bukan langsung memanggil GOWA:

```typescript
// apps/web/lib/whatsapp.ts

interface SendWAOptions {
  to: string;        // nomor, tanpa + dan tanpa @s.whatsapp.net
  message: string;
  context?: string;  // label log: "otp", "invoice-paid", "vendor-created", dst
}

export async function sendWhatsApp(opts: SendWAOptions): Promise<boolean>
```

Fungsi ini:
- Cek `GOWA_ENABLED` — kalau false, log dan skip (tidak throw)
- Normalisasi nomor ke format JID
- POST ke GOWA
- Log hasil (sukses/gagal + context)
- **Tidak pernah throw** — gagal kirim WA tidak boleh gagalkan transaksi utama
- Return `boolean` (true = sukses, false = gagal tapi operasi tetap lanjut)

**Khusus OTP:** karena sifatnya sinkronus (user menunggu), dibuat wrapper tersendiri:

```typescript
// apps/web/lib/whatsapp-otp.ts

export async function sendOtp(phone: string): Promise<{ success: boolean; expiresAt: Date }>
export async function verifyOtp(phone: string, code: string): Promise<boolean>
```

OTP disimpan di **Redis** dengan TTL 5 menit. Format key: `otp:wa:{nomor}`.

---

## 5. Dua Kategori Pengiriman

### Kategori A — OTP (Sinkronus, Kritis)

User sedang menunggu. Harus terkirim sebelum user bisa lanjut. Tidak boleh ada delay queue.

| # | Notif | Trigger | Penerima |
|---|---|---|---|
| OTP-1 | Kode OTP verifikasi | Pendaftaran akun baru (input nomor WA) | Calon peserta |
| OTP-2 | Kode OTP login | Login dengan WA OTP (opsional, jika diimplementasi) | User |
| OTP-3 | Kode OTP ganti nomor WA | User update nomor di profil | User |

**Flow OTP Pendaftaran:**
```
User isi nomor WA
  → Sistem generate kode 6 digit
  → Simpan ke Redis: key=otp:wa:{nomor}, value={kode}, TTL=5mnt
  → sendWhatsApp({ to: nomor, message: "Kode OTP: 123456. Berlaku 5 menit." })
  → User input kode
  → verifyOtp() → cocokkan dengan Redis → hapus key setelah match
  → Lanjut pendaftaran
```

---

### Kategori B — Notifikasi (Asinkronus)

Tidak memblok operasi utama. Dikirim setelah transaksi/action berhasil.

---

## 6. Katalog Notifikasi Lengkap

### P — Peserta (Participant Journey)

#### P1 · Registrasi Berhasil
- **Trigger:** `createParticipant()` berhasil, akun aktif
- **Penerima:** Peserta (`participants.whatsapp`)
- **Template:**
```
Halo [nama]! 👋

Pendaftaran Anda di *FORBIS National Economic Summit 2026* telah diterima.

Langkah berikutnya:
1. Tim kami akan memverifikasi data Anda
2. Invoice akan dikirimkan setelah verifikasi
3. Pembayaran menentukan konfirmasi booth Anda

Info & update: https://expo.forbis2026.id

Terima kasih telah bergabung!
```

#### P2 · Invoice Diterbitkan
- **Trigger:** `createInvoiceFromBookedBooths()` atau `createManualInvoice()` berhasil
- **Penerima:** Peserta
- **Template:**
```
[nama], invoice Anda telah diterbitkan 📄

No. Invoice: *[invoice_number]*
Total: *[total_amount]*
Jatuh Tempo: [due_date]

Lihat & bayar:
https://expo.forbis2026.id/invoice/[public_token]

Segera selesaikan pembayaran untuk mengamankan booth Anda.
```

#### P3 · Reminder Pembayaran Jatuh Tempo
- **Trigger:** Cron job — H-3 dan H-1 sebelum `dueDate`, status masih `unpaid`
- **Penerima:** Peserta
- **Template (H-3):**
```
[nama], pembayaran invoice Anda jatuh tempo dalam *3 hari*.

No. Invoice: [invoice_number]
Total: [total_amount]
Jatuh Tempo: [due_date]

Bayar sekarang: https://expo.forbis2026.id/invoice/[public_token]
```

#### P4 · Pembayaran Dikonfirmasi / Lunas
- **Trigger:** `markInvoiceAsPaid()` berhasil
- **Penerima:** Peserta
- **Template:**
```
[nama], pembayaran Anda telah *DIKONFIRMASI* ✅

No. Invoice: [invoice_number]
Booth: [booth_code] — Zona [zona_name]
Jumlah Bayar: [paid_amount]

Sampai jumpa di FORBIS 2026! 🎉
Detail: https://expo.forbis2026.id/invoice/[public_token]
```

#### P5 · E-Pass / QR Siap (Future)
- **Trigger:** Admin generate QR / e-pass peserta
- **Penerima:** Peserta
- **Template:** Link atau gambar QR pass event

---

### V — Vendor

#### V1 · Akun Vendor Dibuat
- **Trigger:** `createVendor()` berhasil
- **Penerima:** Vendor (`vendors.whatsapp`)
- **Catatan:** Password dikirim sebelum di-hash, dalam scope `createVendor`
- **Template:**
```
Halo [nama]!

Akun vendor Anda untuk *FORBIS 2026* telah dibuat.

🔗 Login: https://expo.forbis2026.id/vendor/login
📧 Email: [email]
🔑 Password: [password_sementara]

Ganti password setelah login pertama.
```

#### V2 · Ada Order Add-on Masuk
- **Trigger:** Checkout peserta berhasil, `order_items` terbuat untuk add-on milik vendor ini
- **Penerima:** Vendor add-on bersangkutan
- **Mapping:** `order_items.referenceId` → `event_addons.id` → `vendor_addon_assignments` → `vendors.whatsapp`
- **Template:**
```
[nama_vendor], ada pesanan add-on masuk! 📦

Add-on: *[nama_addon]*
Pemesan: [nama_peserta] / [nama_perusahaan]
Stand: [kode_booth] — Zona [zona]
Qty: [jumlah] unit
WA pemesan: [wa_peserta]

Detail: https://expo.forbis2026.id/vendor/addons
```

#### V3 · Pengajuan Pencairan Disetujui
- **Trigger:** `approveDisbursement()` berhasil
- **Penerima:** Vendor pemohon
- **Template:**
```
[nama_vendor], pencairan Anda *DISETUJUI* ✅

Jumlah: *[requestedAmount]*
Ke rekening: [destBankName] - [destAccountNumber] a/n [destAccountName]

Dana akan segera ditransfer.
Pantau: https://expo.forbis2026.id/vendor/pencairan
```

#### V4 · Pengajuan Pencairan Ditolak
- **Trigger:** `rejectDisbursement()` berhasil
- **Penerima:** Vendor pemohon
- **Template:**
```
[nama_vendor], pengajuan pencairan *DITOLAK* ❌

Jumlah: [requestedAmount]
Alasan: _[rejectionReason]_

Silakan ajukan ulang atau hubungi tim Finance.
```

#### V5 · Dana Sudah Ditransfer
- **Trigger:** `confirmTransfer()` berhasil
- **Penerima:** Vendor pemohon
- **Template:**
```
[nama_vendor], dana Anda telah *DITRANSFER* 💸

Jumlah diterima: *[netAmount]*
(setelah biaya transfer [transferFee])
Rekening: [destBankName] - [destAccountNumber]
Waktu: [transferredAt]

Terima kasih telah bermitra di FORBIS 2026! 🙏
```

---

### F — Finance Team

Penerima dikonfigurasi di `event_settings.finance_wa_numbers[]` — bisa diubah dari UI tanpa deploy.

#### F1 · Pengajuan Pencairan Baru
- **Trigger:** Vendor atau staff submit permohonan pencairan
- **Template:**
```
⚠️ *Pengajuan Pencairan Baru*

Pemohon: [nama_vendor / nama_staff]
Jumlah: *[requestedAmount]*
Keterangan: [purposeDescription]
Rekening: [destBankName] - [destAccountNumber] a/n [destAccountName]

Review:
https://app.forbis2026.id/admin/keuangan/pencairan/[id]
```

#### F2 · Pembayaran Peserta Diterima (Nilai Besar)
- **Trigger:** `markInvoiceAsPaid()`, jika `amount >= threshold` (dikonfigurasi di event settings)
- **Template:**
```
💰 Pembayaran diterima!

Peserta: [nama_perusahaan]
Booth: [booth_code] — Zona [zona]
Jumlah: *[paid_amount]*
Ref: [payment_reference]
```

---

### L — Pimpinan / Ketua

Penerima dikonfigurasi di `event_settings.leader_wa_numbers[]` — multiple, bisa dikurangi/ditambah.

#### L1 · Ringkasan Harian
- **Trigger:** Cron job jam 08:00 setiap pagi hari aktif event
- **Template:**
```
📊 *Ringkasan FORBIS Expo — [tanggal]*

Pendaftaran: [total_peserta] peserta
Booth terisi: [booked]/[total] booth
Pembayaran masuk hari ini: [count] ([total_amount])
Pencairan pending: [count_pending]

Dashboard: https://app.forbis2026.id/admin
```

#### L2 · Booth Terjual Habis (Milestone)
- **Trigger:** Booth terakhir di suatu zona ter-booking
- **Template:**
```
🎉 *Zona [nama_zona] PENUH!*

Semua [total] booth di zona ini telah terbooking.
Total booth terisi sekarang: [total_booked]/[grand_total]
```

---

### E — Tim Acara / Event Team

Penerima dikonfigurasi di `event_settings.event_team_wa_numbers[]`.

#### E1 · Peserta Baru Lunas & Confirmed
- **Trigger:** `markInvoiceAsPaid()` berhasil
- **Template:**
```
✅ *Peserta Baru Terkonfirmasi*

Perusahaan: [nama_perusahaan]
Booth: [booth_code] — Zona [zona]
PIC: [nama_peserta]
WA: [whatsapp_peserta]

Total booth terisi: [booked]/[total]
```

---

## 7. Konfigurasi Penerima Internal

Nomor penerima internal (Finance, Pimpinan, Tim Acara) **tidak hardcode** di env — disimpan di `event_settings` agar bisa dikelola dari UI `/admin/setting`:

```typescript
// Di event_settings (schema yang sudah ada):
financeWaNumbers:  string[]  // array nomor, tanpa +
leaderWaNumbers:   string[]  // array nomor
eventTeamWaNumbers: string[] // array nomor
```

UI sudah sebagian ada (Konfigurasi GOWA di `/admin/setting`). Perlu ditambahkan field nomor per grup penerima.

---

## 8. Prioritas Implementasi

### Fase 1 — Kritis & Blocking (implement dulu)
| Notif | Alasan |
|---|---|
| OTP-1 (verifikasi pendaftaran) | User tidak bisa daftar tanpa ini |
| P2 (invoice terbit) | Peserta tidak tahu harus bayar kemana |
| P4 (konfirmasi lunas) | Kepastian bagi peserta |
| V1 (akun vendor) | Vendor tidak bisa login tanpa ini |
| F1 (pencairan ke finance) | Operasional pembayaran vendor |

### Fase 2 — Penting Tapi Tidak Blocking
| Notif | Alasan |
|---|---|
| P3 (reminder jatuh tempo) | Tingkatkan konversi pembayaran |
| V2 (order add-on masuk) | UX vendor |
| V3–V5 (status pencairan) | Transparansi vendor |
| E1 (peserta confirmed ke tim acara) | Koordinasi event |

### Fase 3 — Operasional & Nice to Have
| Notif | Alasan |
|---|---|
| L1 (ringkasan harian pimpinan) | Monitoring |
| L2 (milestone booth penuh) | Motivasi & update |
| F2 (pembayaran besar) | Monitoring |
| P5 (e-pass) | Fase akhir sebelum event |
| OTP-2, OTP-3 | Fitur keamanan tambahan |

---

## 9. Webhook Inbound (GOWA → Jalamandala)

Belum diimplementasikan. Akan dipakai jika:
- Balas pertanyaan otomatis dari peserta/vendor
- Konfirmasi pembayaran via WA (upload foto struk)

Endpoint rencana: `POST /api/webhook/whatsapp`
Verifikasi: `HMAC_SHA256(GOWA_WEBHOOK_SECRET, body)`

---

## 10. Status Implementasi

### Yang Sudah Aktif

| Item | File | Keterangan |
|---|---|---|
| Redis client | `apps/web/lib/redis.ts` | Singleton ioredis, globalThis cache |
| GOWA helper | `apps/web/lib/whatsapp.ts` | `sendWhatsApp()` DB-first, fallback env vars `GOWA_*`, never throw |
| OTP logic | `apps/web/lib/whatsapp-otp.ts` | `sendOtp()` + `verifyOtp()`, rate limit + ban 15 menit |
| Participant session | `apps/web/lib/participant-session.ts` | Opsi B — session Redis terpisah dari Better Auth |
| OTP API request | `apps/web/app/api/public/otp/request/route.ts` | POST, validasi nomor, kirim OTP |
| OTP API verify | `apps/web/app/api/public/otp/verify/route.ts` | POST, verify OTP, find-or-create participant, set cookie |
| Login page peserta | `apps/web/app/[eventSlug]/login/page.tsx` | Form 2-step: nomor WA → OTP |
| Dashboard peserta | `apps/web/app/[eventSlug]/dashboard/` | Layout guard session + halaman minimal |
| Notif V1 | `apps/web/actions/vendors.ts` | Vendor dibuat → kirim kredensial ke WA |
| Notif P2 | `apps/web/actions/finance.ts` | Invoice terbit → kirim detail & link ke peserta |
| Notif P4 | `apps/web/actions/finance.ts` | Invoice lunas → kirim konfirmasi ke peserta |
| Notif F1 | `apps/web/actions/disbursements.ts` | Pencairan disubmit → kirim ke `financeWaNumbers` |
| Admin setting GOWA | `apps/web/app/admin/(protected)/setting/page.tsx` | Tab WhatsApp: field sesuai `GOWA_*` (username, password, deviceId, senderNumber, webhookSecret, sendDelayMs) |
| Nomor penerima internal | `apps/web/app/admin/(protected)/setting/page.tsx` | Tab Profile Event: `financeWaNumbers`, `leaderWaNumbers`, `eventTeamWaNumbers` |

### Gap yang Masih Terbuka

| Gap | Keterangan |
|---|---|
| Test kirim pesan di UI | `/admin/setting` tab WhatsApp belum punya tombol "Test Kirim" |
| Notif F2, L1, L2 | Fase 2–3, belum dikerjakan |
| Notif F2, L1, L2 | Fase 2–3, belum dikerjakan |
| Onboarding page | `/{eventSlug}/onboarding` belum dibuat |
| Terms approval flow | Belum diimplementasikan |

## 11. Checklist Go-Live

- [ ] GOWA running di SumoPod, nomor WA sudah scan QR
- [ ] `GOWA_DEVICE_ID` dikonfirmasi via `GET {GOWA_URL}/devices`
- [x] `lib/whatsapp.ts` dibuat dengan `sendWhatsApp()`
- [x] `lib/whatsapp-otp.ts` dibuat dengan Redis TTL
- [x] Sumber config GOWA: DB-first (`whatsapp_configs`), fallback env vars `GOWA_*`
- [ ] `GOWA_ENABLED=false` di `.env` development
- [x] OTP-1 terpasang (login peserta)
- [x] V1 terpasang (vendor dibuat)
- [x] P2 terpasang (invoice terbit)
- [x] P4 terpasang (invoice lunas)
- [x] F1 terpasang (pencairan baru → `financeWaNumbers`)
- [x] `financeWaNumbers`, `leaderWaNumbers`, `eventTeamWaNumbers` ada di schema + UI setting
- [x] V3–V5 terpasang (status pencairan vendor)
- [x] E1 terpasang (peserta confirmed → `eventTeamWaNumbers`)

---

## 12. Referensi

- GOWA GitHub: https://github.com/aldinokemal/go-whatsapp-web-multidevice
- Dokumen terkait: `arsitektur-notifikasi-whatsapp.md` (katalog detail per flow)
- Konfigurasi UI: `/admin/setting` → Tab WhatsApp (simpan ke `whatsapp_configs` DB)
- OTP storage: Redis (`REDIS_URL` sudah ada di infrastruktur)
- Participant session: `lib/participant-session.ts` — Opsi B, cookie `participant-session`, Redis key `participant:session:{id}`
