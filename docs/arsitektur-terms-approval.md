# Arsitektur Terms Approval

Dokumen ini mendefinisikan arsitektur khusus untuk **persetujuan digital Syarat dan Ketentuan** pada front-end publik Jalamandala.

Tujuan dokumen ini adalah memisahkan domain `terms approval` dari arsitektur front-end umum, agar implementasi database, audit trail, QR code, dan guard booking bisa dirancang dengan presisi.

---

## 1. Tujuan

Setiap orang yang ingin booking booth **wajib**:

1. login / verifikasi nomor WhatsApp
2. membaca atau minimal membuka dokumen syarat dan ketentuan aktif
3. memberi persetujuan digital

Sistem harus bisa membuktikan bahwa:

- siapa yang menyetujui
- dokumen apa yang disetujui
- versi isi dokumen yang mana
- kapan persetujuan dilakukan
- persetujuan itu terjadi dalam konteks event yang benar

Dokumen ini menjadi sumber konteks untuk:

- model data approval
- audit trail
- integrasi ke `Pages`
- integrasi ke booking flow
- payload QR verifikasi

---

## 2. Sumber Dokumen

Syarat dan ketentuan **tidak** ditulis hardcoded di front-end.

Sumber utamanya harus dari modul `Pages`:

- `public.event_pages`
- `page_type = 'legal_tnc'`

Artinya:

- admin mengedit dokumen legal dari modul laman
- front-end publik membaca dokumen legal aktif dari sumber yang sama
- approval selalu merujuk ke dokumen legal resmi event

---

## 3. Prinsip Desain

Prinsip yang dipakai:

1. persetujuan harus tercatat sebagai record audit, bukan sekadar checkbox
2. persetujuan harus terkait ke participant dan event
3. persetujuan harus terkait ke versi dokumen yang benar-benar disetujui
4. timestamp persetujuan harus disimpan dalam konteks **WIB / Asia-Jakarta**
5. booking booth tidak boleh lanjut jika approval belum ada atau tidak lagi valid
6. QR code approval adalah sarana verifikasi audit, bukan pengganti database

---

## 4. Bahasa Domain

Istilah yang dipakai:

- `terms page`: halaman legal aktif dari modul Pages
- `terms approval`: persetujuan digital user atas dokumen legal aktif
- `terms checksum`: hash konten dokumen legal yang disetujui
- `approval token`: token audit / signature yang mewakili persetujuan
- `approval qr payload`: payload verifikasi yang diubah menjadi QR code
- `active approval`: approval yang masih valid untuk booking

---

## 5. Kebutuhan Produk

### 5.1 Kewajiban Persetujuan

User publik tidak boleh booking booth sebelum menyetujui syarat dan ketentuan.

Ini berarti approval menjadi **gate operasional** sebelum:

- pilih booth
- checkout
- pembuatan invoice dari flow publik

### 5.2 Bukti Persetujuan

Sistem harus bisa menampilkan atau memproduksi bukti bahwa peserta:

- menyetujui S&K tertentu
- pada tanggal dan jam tertentu
- untuk event tertentu

### 5.3 Persetujuan Harus Bisa Diaudit

Kalau nanti ada dispute, admin harus bisa menelusuri:

- dokumen mana yang berlaku
- siapa yang setuju
- kapan setujunya
- versi kontennya apa

---

## 6. Model Data

### 6.1 Tabel Baru

Tabel baru yang disarankan:

- `public.participant_terms_approvals`

Karena approval ini lintas modul tenant operasional dan identitas user publik, posisi paling aman adalah di **public schema**.

### 6.2 Kolom yang Disarankan

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary key |
| `event_id` | `uuid` | FK ke `expo_events.id` |
| `participant_id` | `uuid` | FK ke `participants.id` |
| `terms_page_id` | `uuid` | FK ke `event_pages.id` |
| `terms_page_slug` | `text` | Snapshot slug saat approve |
| `terms_page_title` | `text` | Snapshot title saat approve |
| `terms_content_checksum` | `text` | Hash isi dokumen yang disetujui |
| `terms_content_format` | `text` | `tiptap_json` atau format lain bila nanti berubah |
| `approved_at` | `timestamp with time zone` | Waktu persetujuan UTC canonical |
| `approved_at_wib` | `timestamp` | Snapshot waktu lokal WIB |
| `approved_timezone` | `text` | Default `Asia/Jakarta` |
| `ip_address` | `text null` | IP request |
| `user_agent` | `text null` | User agent request |
| `approval_source` | `text` | contoh: `public_web` |
| `approval_token` | `text` | signature / hash audit |
| `qr_payload` | `jsonb` | payload verifikasi QR |
| `is_active` | `boolean` | status approval aktif |
| `superseded_by_id` | `uuid null` | self reference jika ada approval baru |
| `created_at` | `timestamp` | waktu row dibuat |

### 6.3 Kenapa Perlu Snapshot Field

Kolom seperti:

- `terms_page_slug`
- `terms_page_title`

disimpan sebagai snapshot karena page legal bisa berubah judul atau slug internalnya.

Audit approval tidak boleh bergantung penuh pada state dokumen saat ini.

### 6.4 Kenapa Perlu Dua Waktu

Disarankan simpan dua representasi:

- `approved_at` sebagai canonical server time
- `approved_at_wib` sebagai snapshot audit operasional

Karena kebutuhan Anda eksplisit:

- waktu persetujuan harus tercatat dalam **WIB**

### 6.5 Kenapa `is_active` dan `superseded_by_id` Dibutuhkan

Karena approval lama bisa digantikan approval baru jika:

- dokumen legal berubah
- user diminta approve ulang

Jadi approval lama tidak perlu dihapus; cukup dinonaktifkan dan ditautkan ke approval baru.

---

## 7. Checksum Dokumen

### 7.1 Tujuan Checksum

Checksum dipakai untuk mengikat approval ke **isi dokumen legal yang benar-benar disetujui**.

Tanpa checksum, kita hanya tahu user menyetujui page tertentu, tetapi tidak tahu isi versinya.

### 7.2 Sumber Checksum

Checksum sebaiknya dibentuk dari:

- `event_pages.id`
- `event_pages.content`
- `event_pages.updated_at`
- atau lebih aman dari serialisasi final konten legal

Rekomendasi:

- pakai hash `sha256` atas payload konten legal yang telah dinormalisasi

Contoh konseptual:

```ts
checksum = sha256(JSON.stringify(normalizedTermsContent))
```

### 7.3 Kapan Checksum Dibuat

Checksum tidak harus disimpan permanen di `event_pages` dulu.

Untuk fase awal:

- checksum bisa dihitung saat halaman persetujuan dibuka atau saat submit approval

Kalau nanti ingin lebih efisien, bisa ditambah kolom cache di modul page.

---

## 8. Approval Token

### 8.1 Fungsi

`approval_token` dipakai sebagai jejak audit yang lebih sulit dipalsukan.

Token ini bukan token login. Ini adalah token verifikasi approval.

### 8.2 Bahan Token

Secara arsitektur, token bisa dibentuk dari gabungan:

- `participant_id`
- `event_id`
- `terms_page_id`
- `terms_content_checksum`
- `approved_at_wib`

lalu ditandatangani dengan secret server.

### 8.3 Bentuk Token

Bisa salah satu dari:

- signed hash
- HMAC signature
- JWT internal singkat

Rekomendasi untuk fase awal:

- HMAC signature sederhana

karena:

- lebih ringan
- cukup untuk audit internal
- tidak perlu overengineer

---

## 9. QR Payload

### 9.1 Tujuan QR

QR code dipakai agar admin / panitia bisa memverifikasi bahwa approval tertentu memang ada.

QR ini bukan media penyimpanan utama, hanya pembawa payload verifikasi.

### 9.2 Isi Payload

Payload minimum yang disarankan:

```json
{
  "type": "terms_approval",
  "approvalId": "uuid",
  "eventId": "uuid",
  "participantId": "uuid",
  "termsPageId": "uuid",
  "checksum": "sha256:xxxx",
  "approvedAtWib": "2026-04-21T14:35:11+07:00",
  "approvalToken": "signed-token"
}
```

### 9.3 Yang Tidak Perlu Masuk QR

Tidak perlu memasukkan:

- isi lengkap syarat dan ketentuan
- data pribadi sensitif berlebihan
- IP address
- user agent

QR cukup membawa pointer audit, bukan semua data mentah.

### 9.4 Verifikasi QR

Saat QR diverifikasi, sistem:

1. baca `approvalId`
2. ambil record approval dari DB
3. cocokkan `approvalToken`
4. cocokkan checksum
5. tampilkan hasil verifikasi

---

## 10. Aturan Approval Aktif

Satu participant dalam satu event idealnya hanya punya **satu approval aktif** untuk dokumen legal aktif.

### 10.1 Definisi Approval Aktif

Approval dianggap aktif jika:

- `is_active = true`
- event sama
- participant sama
- checksum sama dengan checksum `legal_tnc` aktif saat ini

### 10.2 Jika Dokumen Legal Berubah

Jika `legal_tnc` berubah dan checksum berubah:

- approval lama tidak lagi dianggap cukup
- sistem bisa meminta user approve ulang

Cara kerjanya:

- approval lama diset `is_active = false`
- approval baru dibuat saat user menyetujui versi baru

---

## 11. Guard Flow Booking

### 11.1 Posisi Guard

Guard approval harus dicek sebelum user boleh:

- membuka booking flow final
- checkout
- membuat invoice publik dari booking

### 11.2 Urutan Guard

Urutan yang disarankan:

1. user sudah login
2. nomor WA sudah verified
3. participant profile tersedia
4. approval terms aktif ada
5. baru boleh lanjut ke booking

### 11.3 Jika Approval Belum Ada

Redirect user ke:

- halaman persetujuan syarat dan ketentuan

### 11.4 Jika Approval Sudah Stale

Jika checksum legal aktif berubah:

- tandai approval lama stale
- paksa user approve ulang sebelum booking baru

---

## 12. UI/UX Publik

### 12.1 Halaman Persetujuan

Route konseptual yang disarankan:

- `/{eventSlug}/terms-approval`

Atau bisa menjadi bagian dari onboarding flow.

### 12.2 Komponen UI

Halaman ini minimal memuat:

- judul dokumen
- ringkasan / preview isi syarat
- tombol lihat dokumen penuh
- checkbox:
  - `Saya telah membaca dan menyetujui Syarat dan Ketentuan`
- tombol `Saya Setuju`

### 12.3 Informasi yang Ditampilkan ke User

Saat user klik setuju, UI sebaiknya menegaskan:

- persetujuan akan dicatat secara digital
- persetujuan terkait event ini
- waktu persetujuan dicatat

### 12.4 Bukti Persetujuan

Setelah berhasil:

- tampilkan status `Syarat & Ketentuan telah disetujui`
- tampilkan tanggal/jam WIB
- jika diperlukan, tampilkan tombol lihat bukti approval / QR

---

## 13. Admin & Audit

### 13.1 Yang Perlu Bisa Dilihat Admin

Admin sebaiknya nanti bisa melihat:

- participant mana yang sudah approve
- kapan approved
- dokumen mana yang disetujui
- apakah approval masih aktif

### 13.2 Kegunaan Operasional

Fungsi audit approval:

- pembuktian kepatuhan sebelum booking
- verifikasi dispute
- keperluan legal / panitia
- pengecekan saat pengeluaran E-Pass bila dibutuhkan

---

## 14. Server Actions / API yang Dibutuhkan

Minimal nanti butuh:

- `getActiveTermsPage(eventSlug)`
- `getParticipantTermsApproval(participantId, eventId)`
- `createTermsApproval(payload)`
- `verifyTermsApprovalQr(payload)`
- `hasActiveTermsApproval(participantId, eventId)`

Kalau mau lebih rapi, domain ini bisa diletakkan di:

- `apps/web/actions/terms-approval.ts`

---

## 15. Strategi Implementasi

Urutan implementasi yang paling aman:

1. buat tabel `participant_terms_approvals`
2. buat helper checksum dokumen legal
3. buat helper approval token
4. buat server action create/check approval
5. pasang halaman persetujuan publik
6. pasang guard sebelum booking
7. tambahkan QR verification bila UI audit sudah siap

---

## 16. Keputusan Arsitektural yang Direkomendasikan

Keputusan yang direkomendasikan:

1. approval disimpan di tabel khusus `participant_terms_approvals`
2. sumber dokumen approval berasal dari `event_pages.page_type = legal_tnc`
3. approval harus menyimpan checksum versi dokumen
4. approval harus mencatat waktu dalam konteks **WIB**
5. booking flow wajib mengecek approval aktif
6. QR code dipakai sebagai payload verifikasi audit
7. approval lama tidak dihapus, tetapi bisa disupersede

---

## 17. Ringkasan

Terms approval di Jalamandala bukan checkbox biasa. Ia adalah:

- gerbang wajib sebelum booking
- bukti persetujuan legal digital
- record audit berbasis participant, event, dan versi dokumen
- sumber payload QR untuk verifikasi internal

Kalau implementasinya benar, sistem akan bisa membuktikan:

**peserta A menyetujui dokumen S&K event B pada tanggal dan jam WIB tertentu, dengan versi dokumen yang tepat, dan approval itu dapat diverifikasi kembali.**
