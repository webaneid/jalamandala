# Arsitektur Pendaftaran & Registrasi Tenant
> **Event:** FORBIS NATIONAL ECONOMIC SUMMIT AND EXPO 2026 (Road to 100 tahun Gontor)
> **Integrasi:** File ini merupakan ekstensi dari `arsitektur-jalamandala.md` dan `antigravity.md`

---

## 1. Konsep Utama Registrasi
Sistem pendaftaran dirancang untuk mengakomodasi dua jenis pendaftar:
1. **Anggota FORBIS (Pre-Seeded):** Data awal (dari Excel) akan di-import/seed ke dalam sistem.
2. **Umum / Non-FORBIS:** Pendaftar baru yang mengisi dari nol.

Tujuan utama pemisahan ini adalah kemudahan bagi anggota FORBIS. Mereka cukup memverifikasi identitas, dan sistem akan melakukan **auto-populate** (pengisian otomatis) pada form pendaftaran.

---

## 2. Alur Registrasi Akun & Pengisian Form

### Fase A: Pembuatan Akun Dasar
1. User baru mengisi identitas pribadi awal:
   - Pilih organisasi
   - Nama lengkap
   - Email opsional
   - Nomor telepon
   - Nomor WhatsApp
   - Status alumni Gontor
   - Password
2. Sistem menyimpan participant dengan `password_hash`, tetapi belum dianggap verified.
3. Sistem mengirim OTP WhatsApp satu kali untuk memverifikasi nomor.
4. Setelah OTP valid, sistem mengisi `participants.whatsapp_verified_at` dan membuat session peserta.
5. Sistem menanyakan / membaca organisasi:
   - **Jika YA:** User diminta memasukkan **ID Anggota FORBIS** (atau verifikasi via No WA/Email yang terdaftar di database).
   - **Jika BUKAN:** Lanjut sebagai pendaftar umum.

Catatan keputusan login publik:

- Peserta lama login memakai email atau nomor WhatsApp + password.
- WhatsApp OTP bukan mekanisme login harian.
- OTP hanya dipakai untuk verifikasi nomor saat registrasi baru atau perubahan nomor.
- Keputusan ini dipilih karena gateway WhatsApp yang dipakai bukan gateway resmi, sehingga login harian tidak boleh bergantung pada gateway.

### Fase B: Auto-Populate & Pengisian Formulir Lengkap
Pada saat masuk ke halaman pengisian formulir:
- Untuk **Anggota FORBIS yang terverifikasi**, form langsung terisi otomatis sesuai data *seeded*. Mereka hanya perlu melakukan pengecekan (*update* data jika ada perubahan).
- Untuk **Umum**, harus mengisi form secara manual.

---

## 3. Skema Data Pendaftaran (Form Fields)

Berikut adalah struktur kolom pendaftaran yang wajib diisi (berdasarkan instruksi), yang nantinya akan di-mapping ke skema database:

### Informasi Personal
- **Pilih Organisasi** *(Wajib)*
  - Sumber opsi: `booth_groups`
  - Field lain terkunci sampai organisasi dipilih.
- **Nama Lengkap** *(Wajib)*
- **Nomor ID FORBIS** *(Opsional)*
  - Hanya tampil jika organisasi yang dipilih adalah `FORBIS`.
  - Disimpan ke `participants.forbis_member_id`.
- **Nomor Telepon/WhatsApp** *(Wajib)*
- **Alumni Pondok Modern Gontor?** *(Wajib - Ya/Tidak)*
- **Tahun Lulus KMI** *(Opsional, kosongkan jika bukan alumni)*

### Informasi Perusahaan / Usaha
- **Nama Perusahaan / Usaha** *(Wajib)*
- **Nama Booth** *(Wajib)*
  - Checkbox: *Sama dengan nama usaha*
- **Jenis Produk untuk Expo** *(Wajib)*
  - Label UI: Makanan siap saji, Makanan dimasak di tempat, Non Makanan
  - Disimpan sebagai `booth_categories.slug`: `fnb_dry_food`, `fnb_kitchen`, `non_fnb`
- **Tentang Perusahaan** *(Wajib)*
  - Keterangan UI: *Jelaskan tentang perusahaan Anda dalam 150 kata saja*
  - Batas validasi: maksimal 150 kata
- **Kontak Perusahaan** *(Opsional)*
  - Nomor kontak perusahaan
  - Nomor WhatsApp perusahaan
- **Alamat Perusahaan** *(Wajib)*
  - Alamat detail
  - Provinsi
  - Kabupaten/Kota
  - Kecamatan
  - Desa/Kelurahan
- **Badan Hukum Usaha** *(Wajib)*
  - Pilihan: CV, PT, PT Perseorangan, Yang lain: `____`
- **Kategori Usaha** *(Wajib)*
- **Bidang Usaha** *(Wajib)*

### Urutan Aktif Form Data Usaha Admin
Urutan ini adalah urutan yang dipakai di `BusinessForm` saat menambah atau mengedit usaha peserta:

1. Upload logo.
2. Nama Perusahaan / Usaha.
3. Nama Booth.
4. Checkbox `Sama dengan nama usaha`.
5. Jenis Produk untuk Expo.
6. Tentang perusahaan.
7. Nomor kontak perusahaan.
8. Nomor WhatsApp perusahaan.
9. Alamat perusahaan.
10. Provinsi.
11. Kabupaten/Kota.
12. Kecamatan.
13. Desa/Kelurahan.
14. Badan Hukum Usaha.
15. Kategori Usaha.
16. Bidang Usaha.
17. Produk/jasa yang akan dibawa.
18. Merk atau brand produk.
19. Konsep & Peluang kemitraan.

### Produk & Kemitraan
- **Produk/Jasa yang dibawa ke pameran** *(Wajib)*
- **Merk / Brand Produk** *(Wajib)*
- **Konsep & Peluang Kemitraan yang ditawarkan** *(Wajib)*
  - Pilihan: Kerjasama Usaha, Pembukaan cabang, Kerjasama distribusi, Kerjasama Reseller, Yang lain: `____`

### Profil Digital
- **Website** *(Opsional)*
- **URL Facebook** *(Opsional)*
- **URL Instagram** *(Opsional)*
- **URL Tiktok** *(Opsional)*

### Persetujuan & Konfirmasi
- **Syarat & Ketentuan** *(Wajib)*
  - Checkbox: *"Bersama ini saya menyatakan bersedia mengikuti FORBIS NATIONAL ECONOMIC SUMMIT AND EXPO, 2026, Road to 100 tahun Gontor dengan segala syarat dan ketentuan yang berlaku."*

---

## 4. Arsitektur Database & UI Pendaftaran (Update 1:N)

Seiring berjalannya pengembangan, arsitektur pendaftaran berevolusi dari format *flat* menjadi **Relasi 1:N (Satu-ke-Banyak)** untuk mendukung fleksibilitas data:

### A. Struktur Database (Relasional)
1. **Tabel `participants` (Identitas Pribadi):**
   - Menyimpan data primer individu (organisasi, Nama, Telepon, WA, Status Alumni KMI, ID Forbis).
   - Berdiri sendiri sebagai entitas *Parent*.
   - Menyimpan snapshot organisasi dari `booth_groups`:
     - `organization_group_id`
     - `organization_group_slug`
     - `organization_group_name`
   - `forbis_member_id` hanya dipakai saat `organization_group_slug = 'forbis'`.
2. **Tabel `participant_businesses` (Profil Usaha):**
   - Menyimpan detail bisnis (Nama Perusahaan, Badan Hukum, Kategori, Produk, dll).
   - Memiliki *Foreign Key* `participant_id` yang merujuk ke tabel `participants`.
   - *Keuntungan:* Satu individu peserta dapat memiliki dan mendaftarkan **lebih dari satu usaha** tanpa harus membuat akun atau mengisi data pribadi berulang kali.
   - Menyimpan snapshot integrasi booth:
     - `booth_name`
     - `requested_booth_category_id`
     - `requested_booth_category_slug`
     - `requested_booth_category_name`
   - Menyimpan profil dan alamat usaha:
     - `company_description`
     - `company_phone`
     - `company_whatsapp`
     - `company_address`
     - `company_province_code/name`
     - `company_regency_code/name`
     - `company_district_code/name`
     - `company_village_code/name`

### B. Kontrak Data Usaha Aktif
Bagian ini adalah referensi cepat ketika perlu recall informasi data usaha.

Lokasi implementasi:
- UI form: `apps/web/components/forms/BusinessForm.tsx`
- Validasi: `apps/web/lib/validations/tambah_peserta.ts`
- Mutasi server: `apps/web/actions/participants.ts`
- Schema DB public: `packages/db/src/schema/public/businesses.ts`
- Provision DB public: `packages/db/src/provision-public.ts`
- API katalog usaha: `apps/web/app/api/business-catalog/route.ts`
- API wilayah: `apps/web/app/api/regions/route.ts`
- Autocomplete wilayah: `apps/web/components/forms/RegionAutocompleteSelect.tsx`

Field inti `participant_businesses`:
- `company_name`: nama legal/usaha.
- `booth_name`: nama tampil booth. Bisa sama dengan `company_name`.
- `requested_booth_category_slug`: mapping ke booth category untuk kebutuhan booking tenant.
- `requested_booth_category_name`: snapshot nama category.
- `company_description`: profil singkat perusahaan, maksimal 150 kata.
- `company_phone`: nomor kontak perusahaan, opsional.
- `company_whatsapp`: nomor WhatsApp perusahaan, opsional.
- `company_address`: alamat detail perusahaan.
- `company_province_code` dan `company_province_name`: snapshot provinsi.
- `company_regency_code` dan `company_regency_name`: snapshot kabupaten/kota.
- `company_district_code` dan `company_district_name`: snapshot kecamatan.
- `company_village_code` dan `company_village_name`: snapshot desa/kelurahan.
- `legal_entity`: badan hukum.
- `business_category`: kategori usaha lama, tetap dipakai untuk klasifikasi bisnis umum.
- `business_sector`: bidang usaha lama, tetap dipakai untuk klasifikasi bisnis umum.
- `brand_name`: merk/brand produk.
- `product_tags`: daftar produk/jasa yang dibawa.
- `partnership_concepts`: daftar peluang kemitraan.
- `logo_url`: logo usaha dari object storage/MinIO.

Mapping `Jenis Produk untuk Expo` ke `booth_categories`:
- `Makanan siap saji` -> `fnb_dry_food`
- `Makanan dimasak di tempat` -> `fnb_kitchen`
- `Non Makanan` -> `non_fnb`

Catatan domain:
- `business_category` dan `business_sector` adalah klasifikasi bisnis umum.
- `requested_booth_category_slug` adalah kebutuhan booth/expo, bukan pengganti `business_category`.
- Data alamat menyimpan kode dan nama wilayah sebagai snapshot agar tetap bisa dibaca cepat walau master wilayah diupdate.

### C. Referensi Wilayah Indonesia

Alamat perusahaan memakai referensi wilayah lokal agar form cepat, stabil, dan tidak bergantung API eksternal saat input.

Sumber data:
- Repo: `https://github.com/cahyadsn/wilayah`
- File aktif: `db/wilayah.sql`
- Basis data: Kepmendagri No. 300.2.2-2138 Tahun 2025
- Catatan: instruksi awal menyebut `cahyadsn/wilayah_indonesia`, tetapi repo aktif yang tersedia adalah `cahyadsn/wilayah`.

Model lokal:
- Tabel: `indonesia_regions`
- Kolom utama:
  - `code`
  - `name`
  - `level`: `province`, `regency`, `district`, `village`
  - `parent_code`
  - `source`
  - `source_updated_at`

Importer:
- Script: `bun run db:seed:regions`
- Mengunduh `wilayah.sql`
- Parse pasangan `kode/nama`
- Derive level dari format kode:
  - `11` -> province
  - `11.01` -> regency
  - `11.01.01` -> district
  - `11.01.01.2001` -> village
- Insert ulang ke `public.indonesia_regions`

UI:
- Provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan berupa select autocomplete bertingkat.
- Kabupaten terkunci sampai provinsi dipilih.
- Kecamatan terkunci sampai kabupaten dipilih.
- Desa/kelurahan terkunci sampai kecamatan dipilih.
- Form usaha menyimpan kode dan nama wilayah sebagai snapshot.

### D. Pola Antarmuka (Progresif & Modular)
- **Form Terpisah:** Formulir tidak lagi digabung dalam satu komponen *monolithic* atau *step-by-step wizard* yang kaku. Formulir dipisah menjadi `ParticipantForm` dan `BusinessForm`.
- **Alur Progresif Admin:** 
  1. Admin mengisi dan menyimpan **Data Pribadi** terlebih dahulu.
  2. Setelah tersimpan, antarmuka **Data Usaha** terbuka. Admin dapat mengklik "Tambah Usaha" berkali-kali untuk entitas bisnis yang berbeda di bawah satu profil peserta.
- **Server Actions:** Proses penyimpanan menggunakan Next.js Server Actions (`createParticipant`, `createBusiness`, `updateParticipant`) yang terhubung langsung dengan Drizzle ORM, sehingga mutasi data berjalan cepat di sisi server tanpa perlu *API Routes* perantara.

## 5. Master Database Anggota FORBIS

Master anggota FORBIS adalah data referensi awal, bukan data pendaftaran final.

Tujuan:
- Memudahkan admin/peserta FORBIS agar tidak mengisi data dari nol.
- Menjadi sumber autocomplete saat organisasi yang dipilih adalah `FORBIS`.
- Mengisi otomatis data pribadi dan data usaha yang tersedia.
- Tetap membolehkan admin/peserta mengubah data sebelum disimpan sebagai pendaftaran final.

### A. Prinsip Data
- Tabel master: `forbis_members`.
- Data master diisi lewat import Excel, bukan input satu per satu.
- Field boleh tidak lengkap karena database anggota FORBIS tidak selalu memiliki semua data usaha.
- Data final expo tetap disimpan ke:
  - `participants`
  - `participant_businesses`
- `forbis_members` tidak menggantikan `participants`.
- Jika data master salah, user boleh mengubah data hasil auto-fill sebelum disimpan.

### B. Field Master `forbis_members`

Field identitas:
- `forbis_member_id`: Nomor ID FORBIS, contoh `2016*****`.
- `name`
- `phone`
- `whatsapp`
- `is_kmi_alumni`
- `kmi_year`

Field usaha:
- `company_name`
- `booth_name`
- `requested_booth_category_slug`
- `company_description`
- `company_phone`
- `company_whatsapp`
- `company_address`
- `company_province_code`
- `company_province_name`
- `company_regency_code`
- `company_regency_name`
- `company_district_code`
- `company_district_name`
- `company_village_code`
- `company_village_name`
- `legal_entity`
- `business_category`
- `business_sector`
- `brand_name`
- `product_tags`
- `partnership_concepts`

Field teknis:
- `import_key`
- `import_batch_id`
- `source_file_name`
- `raw_payload`
- `is_active`
- `created_at`
- `updated_at`

### C. Template Excel

Template Excel harus mengikuti header field `forbis_members`.

Lokasi template aktif:
- `docs/templates/template-import-anggota-forbis.xlsx`

Aturan pengisian:
- Satu baris mewakili satu anggota FORBIS dan satu usaha utama.
- Jika satu anggota punya lebih dari satu usaha, boleh dibuat lebih dari satu baris dengan `forbis_member_id` yang sama.
- `forbis_member_id` dan `name` wajib untuk referensi autocomplete.
- Field usaha boleh kosong jika belum tersedia.
- `product_tags` memakai pemisah koma.
- `partnership_concepts` memakai pemisah koma.
- `requested_booth_category_slug` memakai salah satu:
  - `fnb_dry_food`
  - `fnb_kitchen`
  - `non_fnb`
- Field wilayah disarankan memakai kode wilayah dari `indonesia_regions`; jika kode belum ada, import boleh menyimpan nama tetapi harus ditandai sebagai data yang perlu dibersihkan.

### D. Alur Import

1. Admin mengunduh template Excel.
2. Admin mengisi data anggota FORBIS.
3. Admin menjalankan import Excel.
4. Sistem memvalidasi struktur header.
5. Sistem normalize array field dari comma-separated text.
6. Sistem validasi wilayah jika kode tersedia.
7. Sistem upsert ke `forbis_members` memakai `import_key` internal.
8. Import tidak boleh membuat `participants` atau `participant_businesses` secara otomatis.

Implementasi import saat ini:
- Script: `packages/db/src/import-forbis-members.ts`
- Command: `bun run db:import:forbis-members /path/to/file.xlsx`
- Dry run: `bun run db:import:forbis-members /path/to/file.xlsx --dry-run`
- Rollback test: `bun run db:import:forbis-members /path/to/file.xlsx --rollback-test`

Catatan:
- Import UI/upload belum dibuat; fase awal memakai CLI agar struktur data stabil terlebih dahulu.
- Importer hanya membaca sheet pertama `forbis_members`; sheet `contoh` dan `panduan` di template tidak ikut diimport.

### E. Alur Auto-Fill Pendaftaran

1. Admin memilih organisasi `FORBIS`.
2. Field `Nama Lengkap` berubah menjadi **autocomplete inline** yang mencari anggota FORBIS saat mengetik (debounce 180ms ke `/api/forbis-members?q=...`).
3. Field `Nomor ID FORBIS` muncul di bawah sebagai field terpisah.
4. Anggota yang **sudah terdaftar** di `participants` ditandai badge **"Terdaftar"** (amber) dan tidak bisa dipilih.
5. Admin memilih anggota yang belum terdaftar.
6. Sistem mengisi otomatis:
   - nama lengkap
   - nomor telepon
   - nomor WhatsApp
   - status alumni dan tahun KMI
   - nomor ID FORBIS
   - data usaha jika tersedia
7. Admin tetap bisa mengubah semua field sebelum simpan.
8. Saat disimpan, data masuk ke `participants` dan `participant_businesses`.

Catatan implementasi:
- `ForbisMemberSearch` kini sepenuhnya controlled (`value: string`, `onChange`, `onSelect`) sehingga terintegrasi langsung dengan react-hook-form di field `fullName`.
- Pengecekan `isRegistered` dilakukan di `/api/forbis-members`: join ke `participants` dengan kriteria `organization_group_slug = 'forbis'` dan cocokkan `forbis_member_id` (prioritas) atau `name` (fallback case-insensitive).
- Field pencarian FORBIS terpisah dihapus untuk menyederhanakan UX.

### F. Pencegahan Pendaftaran Ganda

Sistem menerapkan dua lapis perlindungan terhadap duplikat peserta.

#### Lapis 1 — Real-time di Form (UX)

Saat admin mengisi field email, telepon, atau WhatsApp, komponen `ParticipantForm` mengirim permintaan debounce (500ms) ke:

```
GET /api/participants/check?email=x&phone=y&whatsapp=z&excludeId=uuid
```

Response: `{ email: "Nama Pemilik" | null, phone: "..." | null, whatsapp: "..." | null }`

- Jika salah satu field sudah terdaftar, muncul **warning amber** di bawah field tersebut:  
  *"Nomor telepon sudah terdaftar atas nama Ahmad Fulan. Hubungi admin atau gunakan **Lupa Password**."*
- Tombol **Simpan di-disable** selama ada duplikat.
- `excludeId` diisi `participantId` saat mode edit, sehingga peserta yang sedang diedit tidak memblok dirinya sendiri.

Hook: `apps/web/hooks/use-participant-duplicate-check.ts`  
API: `apps/web/app/api/participants/check/route.ts`

#### Lapis 2 — Hard Guard di Server Action

Sebelum `INSERT` atau `UPDATE`, `createParticipant` dan `updateParticipant` memanggil `checkDuplicateContact()` yang meng-query `participants` langsung dari server:

- Cek `email`, `phone`, `whatsapp` dalam satu query `OR`.
- Jika cocok, return `{ success: false, error: "... sudah terdaftar atas nama X." }` tanpa menyentuh database.
- Update (`updateParticipant`) mengecualikan baris milik `id` peserta itu sendiri via `ne(participants.id, excludeId)`.

Implementasi: fungsi `checkDuplicateContact` di `apps/web/actions/participants.ts`.

#### Aturan Pencocokan
- `email`: case-insensitive (`toLowerCase`).
- `phone` dan `whatsapp`: exact match (string). Format normalisasi diserahkan ke input pengguna.
- Pencocokan berlaku untuk **semua peserta** tanpa memandang organisasi — pendaftar non-FORBIS pun tidak bisa memakai kontak yang sudah ada di sistem.

### G. Batasan Saat Ini

- Master FORBIS belum dipakai untuk transaksi booth langsung.
- Master FORBIS hanya sumber prefill.
- Data master tidak dianggap sebagai bukti booking.
- Data master tidak membuat invoice.

### H. Lokasi Implementasi FORBIS Master

- Schema DB: `packages/db/src/schema/public/forbis-members.ts`
- Provision public DB: `packages/db/src/provision-public.ts`
- Importer Excel: `packages/db/src/import-forbis-members.ts`
- API autocomplete: `apps/web/app/api/forbis-members/route.ts`
- Komponen pencarian: `apps/web/components/forms/ForbisMemberSearch.tsx`
- Mapping prefill usaha: `apps/web/lib/forbis-members.ts`
- Form identitas: `apps/web/components/forms/ParticipantForm.tsx`
- Alur tambah peserta: `apps/web/components/admin/peserta/TambahPesertaClient.tsx`
- Tambah usaha di detail peserta: `apps/web/components/admin/peserta/AddBusinessButton.tsx`
- Prefill FORBIS di detail peserta: `apps/web/app/admin/peserta/[id]/page.tsx`

## 6. Status Verifikasi Implementasi

Status terakhir: 20 April 2026 (update).

### Perubahan terbaru (20 April 2026)

- `ForbisMemberSearch` direfaktor menjadi controlled component (`value`/`onChange`/`onSelect`) dan dipasang langsung di field `fullName` form, menggantikan field pencarian terpisah.
- `/api/forbis-members` ditambah query join ke `participants` untuk flag `isRegistered` per anggota.
- Anggota FORBIS yang sudah terdaftar ditampilkan dengan badge "Terdaftar" dan tidak bisa dipilih di autocomplete.
- Ditambah `/api/participants/check` untuk cek duplikat email/telepon/WA secara real-time.
- Ditambah hook `useParticipantDuplicateCheck` di `ParticipantForm` dengan debounce 500ms.
- Hard guard `checkDuplicateContact` ditambah di `createParticipant` dan `updateParticipant`.
- Tombol Simpan di-disable jika ada duplikat terdeteksi di sisi client.

Checklist SQL:
- `forbis_members` sudah dibuat sebagai master database anggota FORBIS:
  - `forbis_member_id`
  - `name`
  - `phone`
  - `whatsapp`
  - `is_kmi_alumni`
  - `kmi_year`
  - semua field usaha dan alamat yang kompatibel dengan `participant_businesses`
  - `import_key`
  - `import_batch_id`
  - `source_file_name`
  - `raw_payload`
  - `is_active`
- `participants` sudah memiliki kolom organisasi dan ID FORBIS:
  - `organization_group_id`
  - `organization_group_slug`
  - `organization_group_name`
  - `forbis_member_id`
  - `is_forbis_member`
- `participant_businesses` sudah memiliki semua kolom data usaha baru:
  - `booth_name`
  - `requested_booth_category_id`
  - `requested_booth_category_slug`
  - `requested_booth_category_name`
  - `company_description`
  - `company_phone`
  - `company_whatsapp`
  - `company_address`
  - `company_province_code`
  - `company_province_name`
  - `company_regency_code`
  - `company_regency_name`
  - `company_district_code`
  - `company_district_name`
  - `company_village_code`
  - `company_village_name`
- `indonesia_regions` sudah terisi dari `cahyadsn/wilayah db/wilayah.sql`:
  - `province`: 38
  - `regency`: 514
  - `district`: 7.285
  - `village`: 83.762
  - total: 91.599

Checklist penyimpanan:
- Import Excel anggota FORBIS masuk ke `forbis_members` dan tidak membuat data pendaftaran final.
- `forbis_members.import_key` dipakai agar re-import baris yang sama tidak menggandakan data.
- API `/api/forbis-members` hanya membaca row aktif dan mengembalikan data untuk autocomplete/prefill.
- `createParticipant` dan `updateParticipant` menyimpan snapshot organisasi dari `booth_groups`.
- `forbis_member_id` hanya disimpan jika `organization_group_slug = 'forbis'`; selain itu dikosongkan.
- `createBusiness` dan `updateBusiness` menyimpan seluruh data usaha ke `participant_businesses`.
- `requested_booth_category_slug` divalidasi terhadap `booth_categories`.
- Provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan divalidasi terhadap `indonesia_regions` dengan relasi parent yang benar.
- Uji insert SQL dilakukan dalam transaksi `ROLLBACK`; hasilnya semua kolom bisa menerima data dan tidak ada row dummy tersisa.

Checklist runtime:
- `bun run check-types` sukses.
- `bun run db:import:forbis-members /tmp/jalamandala-forbis-test/forbis-import-test.xlsx --dry-run` sukses.
- `bun run db:import:forbis-members /tmp/jalamandala-forbis-test/forbis-import-test.xlsx --rollback-test` sukses dan tidak meninggalkan row dummy.
- `/admin/peserta/tambah` di `app.localhost:6250` sukses.
- `/api/regions` di `app.localhost:6250` sukses.
- `/api/forbis-members` di `app.localhost:6250` sukses.
- Middleware sudah mengecualikan path `/api` agar request API tidak di-rewrite ke `/admin/api`.
- Dev server tidak dimatikan dalam proses verifikasi ini.

---
*Dokumen ini merupakan panduan utama khusus untuk form pendaftaran (Fase 4 di Roadmap Antigravity) dan telah di-update sesuai struktur form 1:N progresif yang terbaru.*
