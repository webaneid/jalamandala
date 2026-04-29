# Arsitektur Pembayaran — Jalamandala
> **Event:** FORBIS NATIONAL ECONOMIC SUMMIT AND EXPO 2026
> **Dokumen terkait:** `arsitektur-pendaftaran.md`, `arsitektur-whatsapp.md`, `CLAUDE.md`

---

## 1. Prinsip Utama

1. Invoice berlaku sesuai setting admin (`dueInvoiceDays`, default 3 hari). Selama masa aktif, booth berstatus `reserved`.
2. Peserta boleh membayar **lunas** atau **DP minimal 50%** dalam masa invoice.
3. Jika tidak ada pembayaran sampai invoice expired → invoice batal, booth kembali `open`.
4. Jika DP ≥50% terbayar → booth tetap `reserved`, pelunasan diberi tenggang 7 hari.
5. Lewat 7 hari belum lunas → negosiasi tim akuisisi. Perpanjangan bisa dilakukan dari admin, **tercatat siapa yang memperpanjang, kapan, dan alasannya**.
6. Pembatalan oleh peserta → DP dikembalikan 50%, 50% disumbang ke FORBIS. Alur via disbursement.
7. WA reminder dikirim setiap 2 hari sekali di jam yang sama dengan waktu invoice dibuat, sampai status `paid`, `cancelled`, atau `refunded`.

---

## 2. Status Invoice (Extended)

```
waiting_for_payment
    │
    ├── [tidak bayar sampai due_date]
    │       → expired  (booth kembali open)
    │
    ├── [bayar lunas, upload bukti]
    │       → waiting_confirmation
    │               │
    │               ├── [admin verifikasi] → paid  (booth → booked)
    │               └── [admin tolak]      → waiting_for_payment
    │
    └── [bayar DP ≥50%, upload bukti]
            → dp_waiting_confirmation
                    │
                    ├── [admin verifikasi] → dp_paid  (booth tetap reserved)
                    │       │
                    │       ├── [dalam 7 hari, bayar lunas, upload]
                    │       │       → balance_waiting_confirmation
                    │       │               │
                    │       │               ├── [admin verifikasi] → paid  (booth → booked)
                    │       │               └── [admin tolak]      → dp_paid
                    │       │
                    │       └── [lewat 7 hari tidak bayar]
                    │               → balance_overdue  (menunggu negosiasi/ekstensi)
                    │                       │
                    │                       ├── [admin perpanjang] → dp_paid (balance_due_date diupdate)
                    │                       └── [tidak ada kesepakatan] → cancelled (refund 50% DP)
                    │
                    └── [admin tolak DP] → waiting_for_payment
```

**Status lengkap:**

| Status | Keterangan | Status Booth |
|--------|-----------|--------------|
| `waiting_for_payment` | Invoice aktif, belum ada pembayaran | `reserved` |
| `waiting_confirmation` | Bukti bayar lunas diupload, menunggu verifikasi | `reserved` |
| `dp_waiting_confirmation` | Bukti DP diupload, menunggu verifikasi | `reserved` |
| `dp_paid` | DP terverifikasi, menunggu pelunasan | `reserved` |
| `balance_waiting_confirmation` | Bukti pelunasan diupload, menunggu verifikasi | `reserved` |
| `balance_overdue` | DP sudah bayar, tapi lewat 7 hari belum lunas | `reserved` |
| `paid` | Lunas terverifikasi | `booked` |
| `expired` | Invoice kadaluarsa tanpa pembayaran apapun | `open` |
| `cancelled` | Dibatalkan (setelah DP), proses refund | `open` |
| `refunding` | Disbursement refund sedang diproses | `open` |
| `refunded` | Refund selesai | `open` |

---

## 3. Alur Pembayaran Detail

### 3A. Pembayaran Lunas (Full Payment)

```
Peserta buka invoice
  → Upload bukti transfer (full amount)
  → Invoice: waiting_for_payment → waiting_confirmation
  → Admin verifikasi: paid
  → Booth: reserved → booked
  → WA notifikasi peserta: konfirmasi lunas
  → WA reminder berhenti
```

### 3B. Pembayaran DP + Pelunasan

```
Peserta buka invoice
  → Upload bukti transfer DP (≥50% dari grandTotal)
  → Invoice: waiting_for_payment → dp_waiting_confirmation
  → Admin verifikasi:
      - Cek amount ≥ 50%: dp_paid
      - Jika amount < 50%: tolak → kembali waiting_for_payment + notif peserta
  → booth tetap reserved
  → balance_due_date = dp_paid_at + 7 hari
  → WA notifikasi DP diterima + deadline pelunasan

  [Dalam 7 hari:]
  → Peserta upload bukti pelunasan
  → Invoice: dp_paid → balance_waiting_confirmation
  → Admin verifikasi: paid
  → Booth: reserved → booked
  → WA konfirmasi lunas

  [Lewat 7 hari:]
  → Cron ubah ke balance_overdue
  → WA ke peserta: segera hubungi tim
  → Admin bisa perpanjang atau proses pembatalan
```

### 3C. Pembatalan & Refund

```
[Hanya bisa dilakukan jika status dp_paid atau balance_overdue]

Admin buka invoice → Klik "Batalkan & Refund"
  → Konfirmasi: isi alasan pembatalan
  → Invoice: → cancelled
  → Booth: reserved → open
  → Hitung refund_amount = dp_amount * 50% (50% dari DP kembali ke peserta)
  → Buat disbursementRequest (purposeType: "refund", amount: refund_amount)
  → Admin akuisisi input rekening tujuan peserta
  → Proses pencairan seperti biasa di /admin/keuangan/pencairan
  → Status: cancelling → refunding → refunded
  → WA ke peserta: info pembatalan + nominal refund yang akan diterima
```

---

## 4. Skema Database

### 4A. Perubahan Tabel `invoices` (tenant schema)

Kolom baru yang ditambahkan:

```sql
-- Pengaturan DP
payment_type          text DEFAULT 'full'    -- 'full' | 'installment'
dp_minimum_percent    integer DEFAULT 50     -- minimum persentase DP (default 50%)
dp_amount             integer DEFAULT 0      -- nominal DP minimum (dihitung saat invoice dibuat: grandTotal * dp_minimum_percent / 100)
dp_paid_at            timestamptz            -- kapan DP terverifikasi

-- Deadline
balance_due_date      timestamptz            -- dp_paid_at + 7 hari (dihitung otomatis saat DP diverifikasi)
reservation_extended_until  timestamptz     -- jika admin perpanjang melewati balance_due_date

-- Jejak perpanjangan (audit trail)
extended_by_user_id   text                   -- userId admin yang memperpanjang
extended_by_name      text                   -- snapshot nama admin (untuk audit)
extended_at           timestamptz
extension_notes       text

-- Pembatalan
cancelled_by_user_id  text
cancelled_by_name     text
cancelled_at          timestamptz
cancellation_reason   text
refund_amount         integer DEFAULT 0      -- nominal yang dikembalikan ke peserta

-- WA Reminder
next_reminder_at      timestamptz            -- kapan reminder berikutnya harus dikirim
last_reminder_sent_at timestamptz

-- CS Follow Up H-1
cs_notified_h1        boolean DEFAULT false  -- sudah kirim notif ke CS H-1 sebelum balance_due_date?
```

### 4B. Perubahan Tabel `invoicePayments` (tenant schema)

Kolom baru:

```sql
payment_sequence  text DEFAULT 'full'  -- 'full' | 'dp' | 'balance'
```

### 4C. Status Invoice (enum update)

```
waiting_for_payment
waiting_confirmation
dp_waiting_confirmation   ← baru
dp_paid                   ← baru
balance_waiting_confirmation  ← baru
balance_overdue           ← baru
paid
expired
cancelled
refunding                 ← baru
refunded                  ← baru
```

---

## 5. Mekanisme Perpanjangan Reservasi

**Kapan digunakan:** Peserta sudah bayar DP tapi belum lunas setelah 7 hari (`balance_overdue`).

**Flow admin:**
1. Admin buka halaman detail invoice (`/admin/keuangan/{id}`)
2. Jika status `balance_overdue`, muncul banner merah + tombol "Perpanjang Reservasi"
3. Modal: isi tanggal deadline baru + catatan kesepakatan
4. Sistem catat: `extended_by_user_id`, `extended_by_name`, `extended_at`, `extension_notes`, `reservation_extended_until`
5. Status kembali ke `dp_paid`, `balance_due_date` diupdate ke tanggal baru
6. WA ke peserta: info perpanjangan + deadline baru

**Penting:** Perpanjangan adalah keputusan bisnis yang tercatat secara permanen di invoice. Tidak bisa dihapus, hanya bisa diperpanjang lagi atau diakhiri dengan pembatalan.

---

## 6. Mekanisme Pembatalan & Refund

**Syarat pembatalan:** Status harus `dp_paid` atau `balance_overdue`.
Invoice yang belum ada DP tidak perlu mekanisme refund — cukup dihapus biasa.

**Kalkulasi refund:**
```
dp_amount_paid = total amount dari invoicePayments dengan payment_sequence = 'dp' (yang sudah verified)
refund_to_participant = dp_amount_paid * 50%  (dibulatkan ke bawah)
donated_to_forbis = dp_amount_paid - refund_to_participant
```

**Flow:**
1. Admin klik "Batalkan & Refund" di detail invoice
2. Konfirmasi: "Pembatalan akan mengembalikan Rp X ke peserta dan Rp Y disumbang ke FORBIS. Masukkan alasan."
3. Admin isi rekening tujuan peserta (nama bank, nomor, atas nama)
4. `cancelInvoiceWithRefund()` dipanggil:
   - Update invoice: status → `cancelled`, simpan `cancelled_by_*`, `cancellation_reason`, `refund_amount`
   - Release booth: status → `open`
   - Buat `disbursementRequest` (purposeType: `refund`, amount: refund_to_participant, dengan info rekening)
   - WA ke peserta: info pembatalan + nominal refund
5. Admin proses disbursement di `/admin/keuangan/pencairan` seperti biasa
6. Setelah transfer dikonfirmasi: invoice status → `refunded`

---

## 7. WA Reminder Otomatis

### Jadwal

Reminder dikirim **setiap 2 hari** di jam yang sama dengan waktu invoice dibuat (`invoices.createdAt`), sampai status berubah ke `paid`, `cancelled`, `refunded`, atau `expired`.

Contoh: Invoice dibuat 29 April 2026 pukul 14:32 WIB
- Reminder ke-1: 1 Mei 2026 pukul 14:32 WIB
- Reminder ke-2: 3 Mei 2026 pukul 14:32 WIB
- dst.

### Implementasi

**Mekanisme:** `next_reminder_at` disimpan di tabel `invoices`. Saat invoice dibuat, `next_reminder_at = createdAt + 2 hari`. Setiap kali reminder terkirim, `next_reminder_at += 2 hari`.

**Cron:** `/api/cron/payment-reminders` — berjalan setiap 30 menit, ambil invoice dengan `next_reminder_at <= now` dan status aktif (`waiting_for_payment`, `dp_waiting_confirmation`, `dp_paid`, `balance_waiting_confirmation`, `balance_overdue`).

**Tambahkan ke crontab:**
```
*/30 * * * * curl -s "https://app.forbis.id/api/cron/payment-reminders?secret=<SECRET>" >> /var/log/cron-jalamandala.log 2>&1
```

### Template WA per Status

**`waiting_for_payment` (belum bayar sama sekali):**
```
[nama], invoice booth Anda belum dibayar 🔔

No. Invoice: [invoice_number]
Booth: [booth_codes] — Zona [zone_name]
Total Tagihan: [grandTotal]
Jatuh Tempo: [due_date]

Bayar sekarang:
https://expo.forbis.id/invoice/[public_token]

Segera bayar agar booth tidak dilepas ke peserta lain.
```

**`dp_paid` (DP sudah, menunggu pelunasan):**
```
[nama], jangan lupa selesaikan pelunasan booth Anda 🔔

No. Invoice: [invoice_number]
Booth: [booth_codes] — Zona [zone_name]
DP Terbayar: [dp_amount]
Sisa Pelunasan: [grandTotal - dp_amount]
Deadline Pelunasan: [balance_due_date]

Bayar sekarang:
https://expo.forbis.id/invoice/[public_token]
```

**`balance_overdue` (lewat deadline pelunasan):**
```
[nama], batas waktu pelunasan booth Anda telah lewat ⚠️

No. Invoice: [invoice_number]
Sisa Pelunasan: [grandTotal - dp_amount]

Segera hubungi tim kami untuk melanjutkan pemesanan atau memproses pembatalan.
https://expo.forbis.id/invoice/[public_token]
```

---

## 8. Notifikasi CS — H-1 Deadline Pelunasan

Satu hari sebelum `balance_due_date`, sistem mengirim WA ke tim CS agar mereka bisa proaktif follow up peserta untuk negosiasi pelunasan.

### Penerima

Nomor CS diambil dari tabel `wa_rotator_agents` (tenant schema) — semua agen dengan `isActive = true`. Ini tabel yang sama yang dipakai untuk routing WA publik (bottom nav). Tidak perlu field baru di `expoEvents` — cukup query `wa_rotator_agents` saat cron berjalan.

Jika tidak ada agen aktif di rotator → skip notifikasi CS (log warning).

### Trigger

Cron `payment-reminders` yang sudah berjalan setiap 30 menit juga mengecek:
- Status invoice = `dp_paid`
- `balance_due_date` jatuh antara **sekarang + 23 jam** s/d **sekarang + 25 jam** (window ±1 jam untuk menghindari kirim dua kali)
- Belum pernah kirim notif H-1 ini (`cs_notified_h1 = false`)

Setelah terkirim, set `cs_notified_h1 = true` di tabel `invoices` agar tidak dikirim ulang.

Kolom baru di `invoices` (sudah ada di bagian 4A):
```sql
cs_notified_h1  boolean DEFAULT false  -- flag agar tidak kirim dua kali
```

Tidak ada perubahan di `expoEvents` — nomor CS sudah ada di `wa_rotator_agents`.

### Template WA ke CS

```
⏰ *Reminder Follow Up Pelunasan — H-1*

Peserta berikut memiliki deadline pelunasan *besok*:

Nama Peserta : [participant_name]
No. Invoice  : [invoice_number]
Booth Dipesan: [booth_codes] — Zona [zone_name]
DP Dibayar   : [dp_amount_paid]
Sisa Lunas   : [grandTotal - dp_amount_paid]
Deadline     : [balance_due_date] WIB
WA Peserta   : [participant_whatsapp]

Segera hubungi untuk follow up pelunasan atau negosiasi perpanjangan.
Detail: https://app.forbis.id/admin/keuangan/[invoice_id]
```

Jika ada beberapa invoice jatuh tempo di hari yang sama, dikirim **satu pesan yang berisi semua** (bukan per-invoice terpisah), dipisah dengan baris `---`.

---

## 10. Perubahan UI

### 8A. Halaman Invoice Publik (`/invoice/[token]`)

- **Bagian pembayaran:** Tampilkan dua opsi jika invoice belum ada pembayaran:
  - Tombol "Bayar Lunas" (default)
  - Tombol "Bayar DP dulu (min 50%)" — expand ke form upload dengan info nominal minimal DP
- **Jika status `dp_paid`:** Tampilkan progress bar (DP terbayar vs total), deadline pelunasan, form upload bukti pelunasan
- **Jika status `balance_overdue`:** Banner merah, nomor kontak tim akuisisi
- **Jika status `cancelled`/`refunding`/`refunded`:** Banner info pembatalan + nominal refund

### 8B. Halaman Admin Detail Invoice (`/admin/keuangan/[invoiceId]`)

- **Banner `balance_overdue`:** Tombol "Perpanjang Reservasi" (modal + form)
- **Banner `dp_paid`:** Progress pembayaran, deadline pelunasan
- **Tombol "Batalkan & Refund":** Muncul jika status `dp_paid` atau `balance_overdue`
- **Audit trail perpanjangan:** Section terpisah menampilkan siapa yang memperpanjang, kapan, dan alasannya

### 8C. Verifikasi Pembayaran Admin

Saat admin verifikasi payment, sistem harus:
- Cek apakah `payment.amount >= invoice.grandTotal * dp_minimum_percent / 100`
- Jika ya: status → `dp_paid`, set `dp_paid_at`, hitung `balance_due_date = now + 7 hari`
- Jika tidak: tolak dengan pesan "Jumlah tidak mencapai DP minimum X%"
- Jika status sudah `dp_paid` dan ini pembayaran balance: cek `amount + dp_amount_paid >= grandTotal`

---

## 11. File Implementasi

### Yang perlu dibuat baru:

| File | Keterangan |
|------|-----------|
| `apps/web/app/api/cron/payment-reminders/route.ts` | Cron WA reminder tiap 30 menit |
| `apps/web/components/admin/finance/InvoiceExtensionModal.tsx` | Modal perpanjangan reservasi |
| `apps/web/components/admin/finance/CancelWithRefundModal.tsx` | Modal pembatalan + refund |
| `apps/web/components/public/invoice/DpPaymentSection.tsx` | UI opsi DP di halaman invoice publik |

### Yang perlu dimodifikasi:

| File | Perubahan |
|------|-----------|
| `packages/db/src/schema/tenant/finance.ts` | Tambah kolom baru di `invoices` dan `invoicePayments` |
| `packages/db/src/provision-tenant.ts` | Tambah `ALTER TABLE IF NOT EXISTS` untuk kolom baru |
| `apps/web/actions/finance.ts` | Update `verifyPaymentConfirmation()`, tambah `cancelInvoiceWithRefund()`, `extendReservation()`, `expireOverdueInvoices()` handle `balance_overdue` |
| `apps/web/app/invoice/[token]/page.tsx` | UI DP option, balance payment section |
| `apps/web/app/admin/(protected)/keuangan/[invoiceId]/page.tsx` | Banner overdue, extend button, cancel+refund button |
| `CLAUDE.md` | Update Invoice & Payment Flow section |

---

## 12. Urutan Implementasi

1. ✅ **Schema & provision** — tambah kolom ke `invoices` + `invoicePayments`, jalankan `db:provision:tenant`
2. ✅ **`verifyPaymentConfirmation`** — deteksi DP vs full, set status yang benar
3. ✅ **`expireOverdueInvoices`** — deteksi `dp_paid` yang lewat `balance_due_date` → `balance_overdue`
4. ✅ **Cron reminder** — endpoint + template WA (4 template: dp_diterima, payment_reminder, dp_reminder, balance_overdue_reminder)
5. ✅ **UI invoice publik** — opsi DP, progress bar, pelunasan section
6. ✅ **UI admin** — `DpProgressBanner`: progress bar, deadline, extend modal, cancel+refund modal
7. ✅ **`cancelInvoiceWithRefund`** + `extendReservation` (server actions di `actions/finance.ts`)
8. **Test end-to-end** — deploy ke server, jalankan `db:provision:tenant` + `db:seed:wa-templates`

---

## 13. Aturan Bisnis Kritis (Tidak Boleh Dilanggar)

- DP minimum **50%**. Sistem **otomatis tolak** verifikasi jika amount < 50% grandTotal.
- Refund ke peserta selalu **50% dari nominal DP yang sudah terbayar**, bukan 50% dari grandTotal.
- Perpanjangan reservasi hanya bisa dilakukan oleh admin yang login — **wajib tercatat**.
- Invoice yang belum ada DP sama sekali tidak punya refund — hapus biasa via `deleteInvoiceCompletely`.
- `next_reminder_at` harus di-set saat invoice dibuat dan di-update setiap reminder terkirim.
- Cron reminder hanya kirim ke status aktif: `waiting_for_payment`, `dp_waiting_confirmation`, `dp_paid`, `balance_waiting_confirmation`, `balance_overdue`.

---

*Dokumen ini adalah arsitektur rencana — implementasi mengikuti urutan di bagian 10. Update dokumen ini setiap ada perubahan keputusan bisnis.*
