# Arsitektur Front-End Publik

Dokumen ini mendefinisikan arsitektur front-end publik Jalamandala untuk alur peserta umum, mulai dari masuk ke website event, membuat akun peserta, verifikasi nomor WhatsApp satu kali, mengelola data usaha, memilih booth, menerima invoice, melakukan pembayaran, sampai menerima **E-Pass**.

Dokumen ini sengaja fokus pada **alur pengguna publik**, bukan admin dashboard.

---

## 1. Tujuan

Front-end publik harus mendukung alur sederhana yang Anda inginkan:

1. user masuk ke website event
2. login atau daftar akun peserta
3. verifikasi nomor WhatsApp via OTP satu kali saat pendaftaran
4. melengkapi profil peserta
5. menambahkan satu atau lebih usaha
6. melihat booth yang tersedia
7. memilih dan memesan booth yang sesuai
8. sistem menerbitkan invoice
9. user membayar dan mengunggah bukti bayar
10. setelah tervalidasi, user menerima status aktif dan nanti memperoleh **E-Pass**

Jadi front-end publik adalah gabungan:

- marketing site
- pendaftaran peserta
- participant portal
- booking flow
- payment follow-up

---

## 2. Prinsip Desain

Prinsip yang dipakai:

1. identitas login publik memakai email atau nomor WhatsApp + password
2. verifikasi nomor WhatsApp menggunakan OTP hanya saat pendaftaran atau perubahan nomor
3. satu akun publik bisa mewakili satu peserta
4. satu peserta bisa punya banyak usaha
5. satu usaha bisa booking lebih dari satu booth
6. invoice adalah pusat transaksi
7. media privat peserta tidak boleh bocor ke peserta lain
8. E-Pass adalah hasil akhir operasional setelah pembayaran dan validasi selesai

---

## 3. Hubungan dengan Arsitektur yang Sudah Ada

Dokumen ini bergantung pada modul yang sudah didefinisikan sebelumnya:

- [docs/arsitektur-whatsapp.md](/Users/webane/sites/jalamandala/docs/arsitektur-whatsapp.md)
- [docs/arsitektur-booth.md](/Users/webane/sites/jalamandala/docs/arsitektur-booth.md)
- [docs/arsitektur-public-invoice.md](/Users/webane/sites/jalamandala/docs/arsitektur-public-invoice.md)
- [docs/arsitektur-page.md](/Users/webane/sites/jalamandala/docs/arsitektur-page.md)
- [docs/arsitektur-front-end-menu.md](/Users/webane/sites/jalamandala/docs/arsitektur-front-end-menu.md)
- [docs/arsitektur-terms-approval.md](/Users/webane/sites/jalamandala/docs/arsitektur-terms-approval.md)
- [docs/arsitektur-brand-ui.md](/Users/webane/sites/jalamandala/docs/arsitektur-brand-ui.md)

Artinya:

- OTP mengikuti GOWA + Redis, tetapi tidak menjadi mekanisme login harian
- katalog booth mengikuti group, category, zone, dan pricing yang sudah ada
- invoice publik tetap memakai `publicToken`
- halaman publik umum tetap mengikuti modul `Pages`
- persetujuan syarat dan ketentuan wajib mengikuti dokumen `Terms Approval`
- keputusan warna, form primitives, button, border radius, dan utility komponen publik wajib mengikuti dokumen `Brand UI`

Catatan penting:

- dokumen ini menjelaskan journey dan posisi `terms approval` di alur front-end publik
- untuk implementasi detail model data, checksum, approval token, QR payload, audit trail, dan validasi approval aktif, tim harus merujuk ke:
  - [docs/arsitektur-terms-approval.md](/Users/webane/sites/jalamandala/docs/arsitektur-terms-approval.md)
- untuk implementasi visual dan komponen dasar front-end publik, tim harus merujuk ke:
  - [docs/arsitektur-brand-ui.md](/Users/webane/sites/jalamandala/docs/arsitektur-brand-ui.md)

---

## 4. Bahasa Domain

Istilah yang dipakai:

- `public user`: pengunjung yang mengakses website event
- `account`: identitas login publik
- `participant`: identitas peserta pameran yang terhubung ke account
- `business`: usaha/perusahaan milik participant
- `booth booking`: pemesanan booth oleh usaha tertentu
- `invoice`: tagihan pembayaran
- `payment confirmation`: bukti bayar yang diunggah user
- `e-pass`: pass digital peserta/exhibitor setelah status tertentu terpenuhi

Catatan:

- istilah yang tepat untuk akses event di konteks ini adalah **E-Pass**, bukan `passkey`
- `passkey` lebih cocok untuk metode autentikasi modern, sedangkan kebutuhan expo di sini adalah tiket / akses exhibitor / entry pass

---

## 5. Aktor Publik

### 5.1 Visitor

Belum login, hanya melihat website publik.

Bisa:

- melihat landing page
- melihat agenda
- melihat informasi event
- melihat denah booth secara read-only jika nanti dibuka
- mulai pendaftaran

### 5.2 Verified User

Sudah login dan nomor WhatsApp sudah terverifikasi OTP.

Bisa:

- melengkapi profil peserta
- menambahkan usaha
- memilih booth
- menerima invoice
- mengunggah bukti bayar
- melihat status transaksi

### 5.3 Paid Exhibitor

Peserta yang invoice / booking-nya sudah valid.

Bisa:

- melihat status booking final
- mengakses E-Pass
- menerima informasi lanjutan operasional event

---

## 6. Tahapan Journey Publik

Alur besar front-end publik sebaiknya dibagi menjadi 7 tahap:

1. discover
2. identify
3. verify
4. approve terms
5. complete profile
6. choose booth
7. pay invoice
8. receive pass

### 6.1 Discover

User datang dari:

- landing page
- link WhatsApp
- link promosi
- link langsung invoice / booking

Halaman publik utama:

- homepage event
- agenda
- informasi booth
- FAQ
- CTA daftar / booking

### 6.2 Identify

User memilih:

- masuk
- daftar

Secara operasional, flow dipisah:

- peserta lama login memakai email atau nomor WhatsApp + password
- peserta baru mengisi identitas pribadi dan membuat password
- setelah peserta baru tersimpan, sistem mengirim OTP WhatsApp untuk verifikasi nomor

Keputusan ini dipilih karena WhatsApp gateway yang dipakai bukan gateway resmi. Login harian tidak boleh bergantung pada gateway agar peserta tetap bisa masuk meskipun pengiriman OTP sedang bermasalah.

### 6.3 Verify

Setelah peserta baru mengisi data pribadi dan password:

- sistem kirim OTP via GOWA
- user memasukkan 6 digit OTP
- jika valid, `participants.whatsapp_verified_at` diisi
- sesi peserta dibuat

Peserta lama tidak perlu OTP saat login biasa, selama nomor WhatsApp sudah pernah verified.

### 6.4 Complete Profile

Sebelum user boleh lanjut ke pengisian data peserta dan booking booth, sistem harus memastikan user sudah menyetujui **Syarat dan Ketentuan**.

Karena itu, setelah OTP valid, sebenarnya ada satu tahap wajib lebih dulu:

### 6.4 Approve Terms

Setelah login / OTP berhasil:

- sistem menampilkan halaman atau modal persetujuan syarat dan ketentuan
- konten syarat dan ketentuan dibaca dari modul `Pages`
- sumbernya adalah page type:
  - `legal_tnc`

User wajib:

- membaca / membuka ringkasan syarat
- memberi centang persetujuan
- klik tombol `Saya setuju`

Setelah itu sistem membuat catatan persetujuan digital yang memuat:

- `participantId`
- `eventId`
- `termsPageId`
- versi / snapshot dokumen yang disetujui
- waktu persetujuan dalam **WIB**
- IP address
- user agent
- signature token / hash audit

Selama persetujuan ini belum ada:

- user tidak boleh booking booth
- user tidak boleh lanjut ke checkout

Rujukan implementasi:

- detail teknis approval digital tidak menjadi sumber kebenaran utama di dokumen front-end umum ini
- implementasi domain approval wajib mengikuti:
  - [docs/arsitektur-terms-approval.md](/Users/webane/sites/jalamandala/docs/arsitektur-terms-approval.md)

### 6.5 Complete Profile

Jika user baru:

- isi data pribadi
- pilih organisasi
- lengkapi identitas dasar

Jika user lama:

- data diambil dari profil / participant yang sudah ada
- user hanya melengkapi yang belum ada

### 6.6 Add Business

User menambahkan satu atau lebih usaha:

- nama usaha
- nama booth
- kategori produk expo
- alamat usaha
- kontak usaha
- logo usaha
- produk yang dibawa

### 6.7 Choose Booth

Setelah usaha siap:

- user membuka katalog / denah booth
- sistem memfilter booth yang cocok untuk usaha tersebut
- user memilih booth
- sistem menghitung harga berdasarkan zona, group harga, fase harga, dan status keanggotaan

### 6.8 Pay Invoice

Setelah booking / draft order dikonfirmasi:

- invoice diterbitkan
- user memilih metode pembayaran
- user transfer / scan QRIS
- user unggah bukti bayar jika diperlukan

### 6.9 Receive Pass

Jika pembayaran valid dan status operasional terpenuhi:

- sistem menghasilkan E-Pass
- E-Pass bisa dikirim via WhatsApp dan tersedia di dashboard user

---

## 7. Arsitektur Identitas & Login

### 7.1 Identitas Utama

Identitas utama front-end publik:

- nomor WhatsApp

Email:

- opsional
- bukan penghalang login

### 7.2 Bentuk Login yang Disarankan

Flow login publik yang dipakai:

1. user input email atau nomor WhatsApp
2. user input password
3. sistem mencari participant
4. sistem memverifikasi password
5. sistem memastikan `whatsapp_verified_at` sudah ada
6. sistem membuat session peserta

Flow daftar peserta baru:

1. user mengisi data pribadi
2. user membuat password
3. sistem membuat participant dengan `password_hash`
4. sistem mengirim OTP WhatsApp
5. user memasukkan OTP
6. sistem mengisi `whatsapp_verified_at`
7. sistem membuat session peserta

Jadi pendekatan yang dipakai adalah:

- **password login untuk akses harian**
- **WhatsApp OTP untuk verifikasi nomor satu kali**

### 7.3 Hubungan Account dan Participant

Secara logika:

- satu `user account` publik terhubung ke satu `participant`

Namun participant tetap entitas bisnis tersendiri karena:

- dia punya banyak usaha
- dia punya invoice
- dia punya booking
- dia punya media privat

### 7.4 Status Account Publik

Status minimal yang perlu dikenali:

- `anonymous`
- `otp_pending`
- `verified`
- `profile_incomplete`
- `active_participant`

---

## 8. Verifikasi WhatsApp OTP

Verifikasi OTP harus mengikuti [docs/arsitektur-whatsapp.md](/Users/webane/sites/jalamandala/docs/arsitektur-whatsapp.md).

### 8.1 Flow OTP Publik

1. user input nomor WhatsApp
2. sistem normalisasi nomor
3. generate OTP 6 digit
4. simpan di Redis dengan TTL 5 menit
5. kirim via GOWA
6. user input OTP
7. sistem verifikasi
8. jika cocok:
   - tandai nomor terverifikasi di `participants.whatsapp_verified_at`
   - buat session peserta
   - lanjut ke dashboard / onboarding

### 8.2 Syarat OTP

- resend dibatasi cooldown
- retry dibatasi
- nomor harus distandarkan ke format Indonesia
- OTP tidak boleh menjadi hard dependency untuk login harian peserta lama

### 8.3 Kenapa WhatsApp OTP Penting di Front-End

Karena:

- user kita mayoritas mobile
- WhatsApp lebih natural daripada email
- nomor WA nanti dipakai juga untuk notifikasi invoice, pembayaran, dan E-Pass

---

## 9. Data Peserta Publik

Setelah login berhasil, user harus punya `participant profile`.

### 9.1 Data Minimum Participant

Minimal:

- nama lengkap
- nomor WhatsApp
- nomor telepon
- organisasi
- nomor ID FORBIS jika relevan

### 9.2 Integrasi Organisasi

Pilihan organisasi sebaiknya mengikuti data `booth_groups` atau master group yang memang dipakai di sistem booth.

Contoh:

- FORBIS
- FPAG
- FORMAQIN
- Gontor
- Sponsor
- Umum

Namun secara operasional, label publik boleh tetap lebih ramah.

### 9.3 Integrasi Database Anggota FORBIS

Jika user memilih organisasi `FORBIS`:

- sistem bisa menawarkan autocomplete anggota FORBIS
- data dasar bisa diprefill dari database `forbis member`
- user tetap boleh mengedit sebelum final submit

---

## 9A. Persetujuan Syarat dan Ketentuan

Ini adalah syarat operasional wajib sebelum booking.

Rujukan utama implementasi domain ini:

- [docs/arsitektur-terms-approval.md](/Users/webane/sites/jalamandala/docs/arsitektur-terms-approval.md)

### 9A.1 Sumber Dokumen

Dokumen syarat dan ketentuan tidak ditulis hardcoded di front-end.

Sumbernya harus dari modul `Pages`:

- `page_type = legal_tnc`

Dengan begitu:

- admin bisa mengubah isi syarat dari modul laman
- front-end publik selalu membaca dokumen aktif yang sama
- tidak ada duplikasi teks legal di banyak tempat

### 9A.2 Bentuk Persetujuan

Persetujuan harus direkam sebagai **digital approval**, bukan sekadar flag boolean anonim.

Data minimum yang harus tercatat:

- `id`
- `eventId`
- `participantId`
- `termsPageId`
- `termsPageSlug`
- `termsPageTitle`
- `termsContentChecksum`
- `approvedAtWib`
- `approvedTimezone`
- `ipAddress`
- `userAgent`
- `approvalSource`
- `approvalToken`
- `qrPayload`
- `createdAt`

Catatan:

- `approvedAtWib` harus disimpan eksplisit dalam konteks **WIB / Asia-Jakarta**
- `approvedTimezone` tetap disimpan untuk audit, default: `Asia/Jakarta`
- `termsContentChecksum` dipakai untuk menandai versi isi dokumen yang benar-benar disetujui user saat itu

### 9A.3 Kenapa Tidak Cukup Boolean `agreed = true`

Karena kebutuhan Anda bukan cuma validasi UI, tetapi bukti audit.

Kalau hanya boolean:

- tidak tahu dokumen versi mana yang disetujui
- tidak tahu kapan persis disetujui
- tidak bisa diverifikasi ulang
- tidak cukup kuat untuk pembuktian operasional

### 9A.4 QR Code Persetujuan

Saat persetujuan berhasil, sistem harus membentuk payload audit yang kemudian bisa diubah menjadi QR code.

QR code ini bukan untuk publik umum, tetapi untuk:

- validasi internal
- audit operasional
- bukti bahwa participant menyetujui syarat tertentu pada waktu tertentu

Isi payload QR minimal:

- approval id
- participant id
- event id
- terms page id
- checksum dokumen
- approved at WIB
- approval token / signature hash

Contoh payload konseptual:

```json
{
  "type": "terms_approval",
  "eventId": "uuid",
  "participantId": "uuid",
  "termsPageId": "uuid",
  "checksum": "sha256:xxxx",
  "approvedAtWib": "2026-04-21T14:35:11+07:00",
  "approvalToken": "signed-token"
}
```

Catatan:

- QR code tidak harus berisi seluruh isi syarat
- QR code cukup berisi payload verifikasi yang bisa dicocokkan ke database

### 9A.5 Signature / Approval Token

Agar approval bisa diaudit, sistem perlu membuat `approvalToken`.

Secara arsitektur, token ini bisa dibentuk dari hash / signature atas gabungan:

- `participantId`
- `eventId`
- `termsPageId`
- `termsContentChecksum`
- `approvedAtWib`

Tujuannya:

- menghasilkan jejak persetujuan yang tidak mudah dipalsukan
- memudahkan verifikasi QR dan audit internal

### 9A.6 Posisi di Alur Publik

Persetujuan syarat dan ketentuan harus ditempatkan:

- setelah login / OTP berhasil
- sebelum booking booth

Jadi guard flow-nya:

1. user login
2. OTP valid
3. cek approval terms
4. jika belum approve:
   - arahkan ke halaman persetujuan
5. jika sudah approve:
   - user boleh lanjut ke onboarding / dashboard / booking

### 9A.7 Jika Syarat dan Ketentuan Berubah

Kalau isi `legal_tnc` berubah, maka approval lama tidak boleh otomatis dianggap setara tanpa pemeriksaan.

Pendekatan yang disarankan:

- approval terkait ke `termsContentChecksum`
- jika checksum dokumen aktif berubah signifikan, sistem boleh meminta persetujuan ulang

Jadi approval mengikuti versi dokumen, bukan sekadar page id saja.

---

## 10. Data Usaha Publik

Setelah profil peserta siap, user harus bisa mengelola banyak usaha.

### 10.1 Relasi

Relasi yang dipakai:

- satu participant bisa punya banyak business
- satu business bisa booking banyak booth

### 10.2 Data Minimum Business

Minimal:

- nama usaha / perusahaan
- nama booth
- kategori produk expo
- deskripsi perusahaan
- produk yang dibawa
- alamat usaha
- provinsi, kabupaten, kecamatan, desa
- kontak perusahaan
- WhatsApp perusahaan
- logo usaha

### 10.3 Kategori Produk Publik

Di front-end publik, label user-friendly yang dipakai:

- Makanan siap saji
- Makanan dimasak di tempat
- Non Makanan

Tetapi penyimpanan internal tetap terhubung ke `booth_categories`:

- `fnb_dry_food`
- `fnb_kitchen`
- `non_fnb`

Jika ada kategori `free`, itu lebih cocok sebagai properti booth, bukan pilihan utama user.

---

## 11. Arsitektur Pilih Booth

Ini bagian inti front-end.

### 11.1 Tujuan Halaman Booth Publik

User publik harus bisa:

- melihat zona
- memahami perbedaan fasilitas dan harga
- melihat booth mana yang open
- memilih booth yang sesuai usaha

### 11.2 Filter yang Harus Ada

Minimal:

- zona
- booth group
- booth category
- status
- harga

### 11.3 Logika Kecocokan Booth

Saat user memilih usaha, sistem harus membantu memfilter booth yang cocok berdasarkan:

- organisasi / group participant
- kategori produk usaha
- peruntukan booth

Contoh:

- usaha kategori `fnb_kitchen` tidak boleh diarahkan ke booth `non_fnb`
- booth khusus `fpag` tidak boleh diambil user umum
- booth khusus sponsor tidak boleh muncul sebagai booth bebas

### 11.4 Status Booth di Publik

Status minimal:

- `open`
- `booked`

Untuk fase awal, publik cukup melihat:

- booth tersedia
- booth tidak tersedia

### 11.5 Draft Booking vs Direct Booking

Arsitektur yang lebih aman:

- saat user klik booth, sistem membuat **draft booking intent**
- final booking baru terkunci setelah user menyelesaikan checkout / invoice

Jangan langsung menganggap klik booth sebagai booking final tanpa proses transaksi, karena akan rawan deadlock dan ghost booking.

---

## 12. Arsitektur Harga Booth di Front-End

Harga publik tidak boleh hardcoded di UI.

Harga harus diambil dari:

- `zone_price_rules`

Faktor penentu harga:

- zona
- group harga
- phase harga

### 12.1 Group Harga

Saat ini group harga aktif:

- `forbis`
- `public`
- `sponsor`

### 12.2 Penentuan Group Harga di Front-End

Secara arsitektur:

- jika participant organisasi FORBIS / mitra yang setara fasilitas harga FORBIS, gunakan group harga `forbis`
- jika participant umum, gunakan group harga `public`
- jika jalur sponsor, gunakan `sponsor`

Namun keputusan final tetap harus divalidasi di server.

Front-end hanya boleh menampilkan estimasi yang konsisten dengan aturan server.

### 12.3 Phase Harga

Server harus menentukan phase aktif berdasarkan tanggal:

- `early_bird`
- `pre_sale`
- `regular`

Front-end hanya menampilkan hasil final dan keterangan phase aktif.

---

## 13. Cart, Checkout, dan Invoice

### 13.1 Perlu atau Tidak Cart

Untuk fase awal, model yang paling aman:

- tidak perlu shopping cart umum seperti e-commerce penuh
- cukup pakai **booking summary / checkout summary**

Karena objek utama yang dibeli adalah:

- booth
- add-on opsional

### 13.2 Isi Checkout Summary

Minimal:

- participant yang memesan
- business yang dipakai
- booth yang dipilih
- harga booth
- add-on terpilih
- subtotal
- pajak jika ada
- grand total

### 13.3 Hasil Checkout

Setelah checkout:

- sistem membuat invoice
- booth booking terkait ditautkan ke invoice
- user diarahkan ke halaman invoice publik

### 13.4 URL Invoice Publik

Tetap mengikuti:

- `/invoice/[publicToken]`

sesuai [docs/arsitektur-public-invoice.md](/Users/webane/sites/jalamandala/docs/arsitektur-public-invoice.md)

---

## 14. Pembayaran Publik

### 14.1 Kanal Pembayaran

Kanal yang perlu didukung front-end:

- transfer bank
- QRIS
- payment gateway opsional di masa depan

### 14.2 Konfirmasi Pembayaran

Jika pembayaran manual:

- user unggah bukti transfer
- bukti transfer disimpan sebagai media privat
- asset dikaitkan ke participant yang benar

### 14.3 Keamanan Asset Publik

Aturan penting:

- peserta publik tidak boleh menjelajahi media library global
- peserta hanya boleh melihat asset miliknya sendiri
- asset privat invoice harus bisa diakses hanya oleh:
  - owner participant yang sesuai
  - admin

### 14.4 Status Invoice di Front-End

Minimal:

- waiting for payment
- payment submitted
- paid
- expired
- cancelled

---

## 15. Dashboard User Publik

Setelah login, user publik sebaiknya masuk ke dashboard peserta.

### 15.1 Fungsi Dashboard

Dashboard harus menjadi pusat:

- profil peserta
- daftar usaha
- daftar booking booth
- daftar invoice
- status pembayaran
- E-Pass

### 15.2 Section Dashboard Minimum

Minimal:

- Ringkasan akun
- Profil peserta
- Usaha saya
- Booth saya
- Invoice saya
- Pembayaran saya
- E-Pass saya

### 15.3 Kenapa Dashboard Dibutuhkan

Karena invoice publik berbasis token saja tidak cukup untuk jangka panjang.

User perlu:

- melihat histori
- melanjutkan pendaftaran
- memperbaiki data
- mengakses aset dan pass miliknya

---

## 16. E-Pass

### 16.1 Nama yang Dipakai

Istilah yang direkomendasikan:

- `E-Pass`

bukan `passkey`.

### 16.2 Fungsi E-Pass

E-Pass dipakai untuk:

- bukti peserta / exhibitor terdaftar
- akses masuk event
- validasi check-in di lokasi

### 16.3 Kapan E-Pass Terbit

E-Pass tidak otomatis terbit hanya karena akun dibuat.

Minimal syarat:

- participant valid
- business valid jika dibutuhkan
- ada invoice terkait yang sudah `paid`
- booking booth final / aktif

### 16.4 Bentuk E-Pass

Fase awal yang disarankan:

- kode unik
- QR code
- nama peserta
- nama usaha
- daftar booth
- status aktif

### 16.5 Distribusi E-Pass

E-Pass tersedia di:

- dashboard user
- notifikasi WhatsApp

---

## 17. Struktur Route Publik yang Disarankan

Route publik minimum yang disarankan:

- `/{eventSlug}` → homepage
- `/{eventSlug}/agenda` → agenda publik
- `/{eventSlug}/booth` → katalog / denah booth publik
- `/{eventSlug}/daftar` → mulai pendaftaran
- `/{eventSlug}/login` → masuk dengan WhatsApp
- `/{eventSlug}/otp` → verifikasi OTP
- `/{eventSlug}/onboarding` → lengkapi profil awal
- `/{eventSlug}/dashboard` → dashboard peserta
- `/{eventSlug}/dashboard/usaha` → daftar usaha
- `/{eventSlug}/dashboard/usaha/tambah` → tambah usaha
- `/{eventSlug}/dashboard/booking` → booking booth
- `/{eventSlug}/dashboard/invoice` → daftar invoice
- `/invoice/[publicToken]` → invoice publik langsung

Catatan:

- root invoice publik tetap global karena sudah berjalan
- dashboard route berada di bawah event slug agar konsisten dengan konteks event

### 17.1 Catatan Subdomain `expo`

Untuk development dan nanti kemungkinan deployment publik, subdomain `expo` dipakai sebagai pintu masuk website event publik.

Contoh dev:

- `http://expo.localhost:6250`

Perilaku routing yang disarankan:

1. jika user membuka root subdomain `expo`, sistem harus mengarahkan ke homepage event aktif
2. homepage event aktif saat ini tetap dibaca dari route berbasis slug:
   - `/{eventSlug}`
3. jadi secara implementasi awal, `expo.localhost` boleh me-redirect ke:
   - `/{eventSlug}`

Contoh:

- `expo.localhost:6250/` → redirect ke `/expo-forbis2026`

Kenapa ini dipakai:

- lebih aman untuk fase awal
- tetap konsisten dengan route publik berbasis `eventSlug`
- tidak memaksa refactor host-based multi-event terlalu cepat

### 17.2 Kompatibilitas Path Lama `/expo`

Sistem sebelumnya sempat memakai path lama:

- `/expo`

Setelah arsitektur publik dipindah ke route `/{eventSlug}`, path `/expo` tidak lagi menjadi sumber kebenaran.

Karena itu, aturan kompatibilitas yang disarankan:

- pada host `expo.*`, request ke `/expo` atau `/expo/...` harus di-redirect ke root subdomain expo
- lalu root subdomain expo meneruskan user ke homepage event aktif

Tujuannya:

- mencegah 404 dari bookmark / cache lama
- menjaga transisi arsitektur tetap mulus

### 17.3 Sumber Kebenaran Routing Saat Ini

Sampai ada keputusan baru, sumber kebenaran routing publik tetap:

- route utama event: `/{eventSlug}`
- subdomain `expo` hanya menjadi entry point / alias ke event aktif

Artinya:

- `eventSlug` tetap penting
- menu publik, homepage static, dan legal pages tetap dibangun di atas `eventSlug`
- subdomain `expo` belum menggantikan kebutuhan slug di level router internal

---

## 18. State Machine Tingkat Tinggi

State peserta publik yang disarankan:

1. `visitor`
2. `otp_requested`
3. `otp_verified`
4. `terms_pending`
5. `terms_approved`
6. `participant_incomplete`
7. `participant_ready`
8. `business_ready`
9. `booking_pending`
10. `invoice_waiting_payment`
11. `payment_submitted`
12. `paid`
13. `epass_ready`

Gunanya:

- memudahkan redirect flow
- memudahkan CTA yang tepat
- menghindari user nyasar ke step yang belum siap

Contoh:

- kalau belum punya participant profile, setelah login jangan dilempar ke dashboard kosong; arahkan ke onboarding
- kalau belum approve terms, jangan izinkan booking dan arahkan ke halaman persetujuan
- kalau invoice masih menunggu pembayaran, dashboard harus menonjolkan CTA bayar

---

## 19. Komponen Sistem yang Dibutuhkan

### 19.1 Auth & Session

Butuh:

- login WhatsApp OTP
- sesi publik
- relasi `user -> participant`

### 19.2 Public Profile Engine

Butuh:

- create/update participant
- create/update businesses
- validasi organisasi dan kategori produk

### 19.2A Terms Approval Engine

Butuh:

- membaca `legal_tnc` aktif dari modul pages
- membuat checksum dokumen
- mencatat persetujuan digital
- membuat approval token
- menghasilkan QR payload approval
- memblok alur booking jika approval belum ada atau sudah stale

### 19.3 Booth Discovery Engine

Butuh:

- query zona
- query booth open
- filter booth kompatibel
- kalkulasi harga final

### 19.4 Checkout & Invoice Engine

Butuh:

- membuat invoice dari booking + add-on
- menautkan participant, business, booking, invoice

### 19.5 Payment Confirmation Engine

Butuh:

- upload bukti transfer
- kaitkan ke participant
- tampilkan status verifikasi

### 19.6 E-Pass Engine

Butuh:

- generate pass code / QR
- validasi status aktif
- render pass publik / dashboard

---

## 20. Strategi Implementasi Bertahap

Urutan implementasi yang paling aman:

1. **[✅ DONE]** bangun auth publik berbasis WhatsApp OTP
2. bangun onboarding participant
3. **[✅ DONE — minimal]** bangun dashboard user minimal
4. sambungkan business management
5. buka katalog / denah booth publik
6. bangun booking summary + invoice creation
7. sambungkan pembayaran publik
8. baru bangun E-Pass

### 20.1 Roadmap Eksekusi Front-End yang Disarankan

Agar implementasi tidak membingungkan dan tidak loncat antar domain, front-end publik sebaiknya dibangun mengikuti urutan pengalaman user nyata.

Urutan eksekusi yang direkomendasikan:

1. `Landing Page / Homepage Publik`
2. `Login WhatsApp`
3. `OTP Verification`
4. `Terms Approval`
5. `Onboarding Peserta`
6. `Manajemen Usaha`
7. `Katalog / Denah Booth Publik`
8. `Booking Summary / Checkout`
9. `Invoice Publik`
10. `Konfirmasi Pembayaran`
11. `Dashboard Peserta`
12. `E-Pass`

Jawaban praktis untuk urutan kerja:

- **ya, mulai dari landing page dulu lalu masuk pelan-pelan sampai konfirmasi pembayaran adalah urutan yang benar**

Tetapi:

- landing page hanyalah fase pembuka
- setelah cukup hidup, implementasi harus cepat bergerak ke login, OTP, terms approval, onboarding, lalu booking dan pembayaran

### 20.2 Fase Kerja yang Paling Sehat

#### Fase 1 — Public Foundation

Fokus:

- brand UI
- public layout
- container, section header, button, field shell
- routing publik
- homepage event

Output:

- landing page event bisa dibuka rapi
- CTA menuju login / daftar sudah jelas

#### Fase 2 — Entry Flow

Fokus:

- login WhatsApp
- OTP
- approval syarat dan ketentuan

Output:

- user bisa masuk ke sistem dengan alur identitas yang benar

#### Fase 3 — Onboarding

Fokus:

- profil peserta
- organisasi
- usaha
- alamat usaha
- autocomplete penting

Output:

- data peserta dan usaha siap dipakai booking

#### Fase 4 — Booth Booking

Fokus:

- lihat zona
- lihat booth tersedia
- pilih usaha
- pilih booth
- hitung harga
- buat booking summary

Output:

- user bisa sampai ke checkout dengan konteks bisnis yang benar

#### Fase 5 — Invoice & Payment

Fokus:

- invoice publik
- QRIS / transfer
- upload bukti bayar
- histori pembayaran

Output:

- user bisa menyelesaikan alur pembayaran

#### Fase 6 — Participant Portal

Fokus:

- dashboard peserta
- daftar usaha
- daftar invoice
- daftar booth
- status approval
- E-Pass

Output:

- user punya pusat kontrol setelah registrasi dan pembayaran

### 20.3 Urutan Halaman yang Sebaiknya Dikerjakan Nyata

Kalau diterjemahkan ke urutan halaman:

1. `/{eventSlug}`
2. `/{eventSlug}/login`
3. `/{eventSlug}/otp` atau step OTP di halaman login
4. `/{eventSlug}/terms-approval`
5. `/{eventSlug}/onboarding`
6. `/{eventSlug}/dashboard/usaha`
7. `/{eventSlug}/booth`
8. `/{eventSlug}/booking`
9. `/invoice/[publicToken]`
10. `/{eventSlug}/dashboard`

### Status Detail Langkah 1 (Auth Peserta Password + OTP Verifikasi) — DONE/REVISED

File yang sudah dibuat:

| File | Fungsi |
|---|---|
| `apps/web/lib/redis.ts` | Singleton Redis client (ioredis) |
| `apps/web/lib/whatsapp.ts` | `sendWhatsApp()` via GOWA env vars |
| `apps/web/lib/whatsapp-otp.ts` | `sendOtp()` + `verifyOtp()`, rate limit, ban 15 menit |
| `apps/web/lib/participant-session.ts` | Opsi B: session Redis + cookie `participant-session` |
| `apps/web/app/api/public/otp/request/route.ts` | POST: validasi nomor → kirim OTP |
| `apps/web/app/api/public/register/route.ts` | POST: buat participant + password hash → kirim OTP |
| `apps/web/app/api/public/login/route.ts` | POST: login email/WA + password |
| `apps/web/app/api/public/otp/verify/route.ts` | POST: verify OTP → update `whatsapp_verified_at` → set cookie |
| `apps/web/components/public/PublicParticipantAuthForm.tsx` | Form login + daftar + OTP |
| `apps/web/app/[eventSlug]/login/page.tsx` | Halaman login/daftar peserta |
| `apps/web/app/[eventSlug]/dashboard/layout.tsx` | Guard session: redirect ke `/login` jika tidak ada cookie |
| `apps/web/app/[eventSlug]/dashboard/page.tsx` | Dashboard minimal: profil, usaha, invoice cards + CTA onboarding |

Catatan implementasi:

- Pendekatan: **Opsi B** — session peserta terpisah dari Better Auth admin/vendor
- Participant diidentifikasi via `participants.email` atau `participants.whatsapp`
- Password peserta disimpan di `participants.password_hash`
- OTP hanya menandai `participants.whatsapp_verified_at`
- Jika participant belum verified, login password tidak boleh membuat session aktif
- Session TTL: 7 hari, disimpan di Redis key `participant:session:{uuid}`

### Status Detail Langkah 3 (Dashboard Minimal) — DONE

Dashboard sudah berjalan dengan tiga card: Profil Peserta, Usaha Saya, Invoice. Belum ada konten penuh, hanya navigasi awal.

### Langkah Berikutnya

**Langkah 2 — Onboarding Participant** (`/{eventSlug}/onboarding`):
- Form isi nama lengkap, nomor telepon, pilih organisasi
- Update participant dari `'Peserta Baru'` ke data lengkap
- Setelah submit, redirect ke `/{eventSlug}/dashboard`

**Terms Approval** harus diimplementasikan sebelum booking booth aktif — lihat `arsitektur-terms-approval.md`.

Kenapa urutan ini:

- identitas user harus benar dulu
- tanpa participant dan business yang rapi, booking booth akan berantakan
- E-Pass adalah output akhir, bukan fondasi awal

---

## 21. Keputusan Arsitektural yang Direkomendasikan

Keputusan yang disarankan:

1. login publik memakai email/WhatsApp + password
2. peserta baru wajib verifikasi WhatsApp OTP satu kali setelah registrasi
3. user wajib menyetujui `legal_tnc` sebelum bisa booking
4. persetujuan syarat harus dicatat sebagai digital approval yang punya timestamp **WIB**
5. approval harus punya payload audit dan QR code verifikasi
6. email bersifat opsional, tetapi disarankan untuk notifikasi invoice
7. satu account publik terhubung ke satu participant
8. satu participant bisa punya banyak business
9. booking booth dibuat bertahap, tidak langsung final saat klik denah
10. invoice menjadi pusat transaksi publik
11. bukti bayar peserta harus tetap private per participant
12. hasil akhir operasional disebut `E-Pass`

---

## 22. Ringkasan

Front-end publik Jalamandala bukan sekadar landing page event. Ia harus menjadi sistem penuh yang menghubungkan:

- website publik
- autentikasi WhatsApp
- data peserta
- data usaha
- pemilihan booth
- invoice dan pembayaran
- E-Pass

Kalau diringkas, journey pengguna yang benar adalah:

**lihat event → login nomor WA → verifikasi OTP → lengkapi profil → tambah usaha → pilih booth → dapat invoice → bayar → dapat E-Pass**

Itu adalah alur utama yang sebaiknya dijadikan fondasi seluruh implementasi front-end berikutnya.
