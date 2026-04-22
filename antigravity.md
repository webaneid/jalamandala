# Antigravity System Memory: Jalamandala
> File memori pusat untuk AI Developer (Antigravity) dalam membangun platform Jalamandala buatan Webane Indonesia.

## 1. Identitas Proyek
- **Nama Proyek:** Jalamandala
- **Pembuat:** Webane Indonesia
- **Deskripsi:** Platform multi-tenant untuk registrasi tenant booth expo.
- **Tujuan Dokumen:** Menjadi *"Source of Truth"* (pusat memori) agar Antigravity selalu mengingat konteks, standar koding, arsitektur, dan progress proyek tanpa kehilangan memori seiring berjalannya percakapan.

---

## 1B. Konteks Bisnis Utama (FORBIS EXPO 2026)
Aplikasi Jalamandala ini pertama kali dibangun untuk event **"FORBIS NATIONAL ECONOMIC SUMMIT AND EXPO, 2026, Road to 100 tahun Gontor"**.
- **Dokumen Khusus Alur Pendaftaran:** Terdapat di `docs/arsitektur-pendaftaran.md` (Mengatur skema *seeding* data dari Excel untuk auto-populate form anggota FORBIS, serta skema spesifik *fields* pendaftaran).

## 1C. Rujukan Desain Antarmuka (UI/UX)
- **Arsitektur UI Admin:** Terdapat di `docs/arsitektur-ui-admin.md`. Dokumen ini menjadi pedoman utama dalam menyusun tata letak (*App Shell*) Tenant & Superadmin, komponen UI (shadcn), serta standarisasi warna/tema agar terlihat elegan dan premium.

---

## 2. Kritikan & Evaluasi Arsitektur Awal (dari Claude)
Arsitektur awal di `docs/arsitektur-jalamandala.md` sangat solid dan modern. Namun, sebagai developer profesional, ada beberapa hal krusial yang perlu kita antisipasi dan perbaiki:

### 🟢 Kelebihan Arsitektur Saat Ini
1. **Tech Stack Sangat Modern:** Next.js 15, Bun, Drizzle, Tailwind v4 adalah pilihan *cutting-edge* yang cepat dan efisien.
2. **Schema-per-Tenant:** Pilihan cerdas untuk isolasi data. Menghindari kebocoran data antar event/expo dan membuat backup/restore per event menjadi sangat mudah.
3. **Playwright untuk PDF:** Menjamin hasil cetak e-pass/invoice identik dengan desain HTML.

### 🔴 Risiko & Rekomendasi Perbaikan (The "Gotchas")
1. **Manajemen Migrasi Drizzle pada Multi-Schema:**
   - *Masalah:* Saat ada perubahan schema table booth, kita harus melakukan migrasi ke ratusan schema `expo_*`. Drizzle kurang memiliki dukungan native out-of-the-box untuk migrasi multi-schema dinamis.
   - *Solusi:* Kita harus membuat skrip custom (`migrate.ts`) yang tangguh untuk me-loop seluruh schema aktif dan mengaplikasikan Drizzle migrations secara bersamaan.
2. **Kinerja Playwright di Container Next.js:**
   - *Masalah:* Menyatukan Playwright (yang mendownload Chromium) ke dalam container Next.js akan membuat image Docker membengkak (>1.5GB) dan memakan banyak RAM. Jika banyak user mendownload e-pass bersamaan, Next.js bisa crash.
   - *Solusi:* Ekstrak service PDF menjadi microservice terpisah (misal: menggunakan image khusus atau memanfaatkan *Gotenberg* API), ATAU pastikan instance memiliki RAM besar dengan queue system.
3. **Connection Pooling PostgreSQL:**
   - *Masalah:* Next.js App Router (Serverless/Edge) dengan banyak schema bisa membuat koneksi database cepat habis (Connection Exhaustion).
   - *Solusi:* Wajib menambahkan **PgBouncer** di infrastruktur (Docker Compose) agar koneksi ke database lebih stabil.
4. **Task Scheduling (Cron Jobs):**
   - *Masalah:* Di arsitektur disebutkan "otomatis kembali available via cron job". Next.js tidak memiliki sistem cron bawaan yang berjalan stabil jika di-deploy di beberapa instance.
   - *Solusi:* Integrasikan sistem antrian yang solid, misalnya menggunakan **BullMQ** (via Redis) atau cron service eksternal yang memanggil endpoint aman Next.js.
5. **Keamanan Presigned URL:**
   - *Masalah:* Generate URL setiap kali dirender bisa lambat jika ada banyak gambar.
   - *Solusi:* Pertimbangkan proxy endpoint dengan caching internal untuk gambar non-sensitif.

---

## 3. Standar Koding (Antigravity Standards)
Saat menulis kode, kita akan mematuhi aturan berikut:
- **TypeScript Strict Mode:** Tidak ada tipe `any`. Semua harus strongly typed.
- **Server Actions First:** Gunakan Server Actions untuk semua mutasi, letakkan di layer `lib/actions/`.
- **Reusable UI:** Selalu gunakan komponen dari `packages/ui` (shadcn). Hindari styling ad-hoc.
- **Atomic Commits & Docs:** Setiap fitur selesai, dokumentasi dan file `antigravity.md` ini wajib di-update.

---

## 4. Rencana Kerja (Development Roadmap)

- [ ] **Fase 1: Setup Infrastruktur & Monorepo**
  - [ ] Inisialisasi Turborepo, Next.js 15, dan Bun.
  - [ ] Setup ESLint, Prettier, dan Tailwind v4.
  - [ ] Konfigurasi Docker Compose (Postgres, MinIO, tambah PgBouncer/Redis jika perlu).
- [ ] **Fase 2: Database Layer & Multi-Tenant Setup**
  - [ ] Setup Drizzle ORM dengan kapabilitas Schema-per-Tenant.
  - [ ] Buat skrip migrasi multi-schema.

- [ ] **Fase 3: Autentikasi & Core Services**
  - [ ] Setup Better Auth.
  - [ ] Integrasi S3/MinIO client.
- [x] **Fase 4: Pembangunan Modul Utama (Registrasi)**
  - [x] UI Komponen Dasar (shadcn).
  - [x] Dashboard Admin (Pengaturan Event & Booth - *Partial*).
  - [x] Front-end Public & Registrasi Tenant (Normalisasi 1:N Peserta-Usaha).
- [ ] **Fase 5: Pembayaran & Ekspor PDF**
  - [ ] Integrasi Payment Gateway.
  - [ ] Servis PDF untuk Invoice & E-Pass.

---

## 5. Keputusan Arsitektur Berjalan (Diskusi & Konsep)

**A. Strategi Subdomain (Diputuskan: Opsi A - Single App with Middleware Rewrite)**
- `app.jalamandala.id` -> Di-rewrite oleh middleware ke rute internal `/admin` (Dashboard Admin & Superadmin).
- `expo.jalamandala.id` -> Di-rewrite oleh middleware ke rute internal `/expo` (Front-end Event Publik).
- `api.jalamandala.id` -> Di-rewrite ke rute internal `/api`.
- *Catatan:* Semua berjalan di 1 instance Next.js (`apps/web`) demi efisiensi resource.

**B. Framework Frontend (Next.js vs Bun)**
- **Next.js** = Framework React (untuk UI, Routing, SSR).
- **Bun** = Mesin penggerak (Runtime & Package Manager) pengganti Node.js.
- Keputusan: Kita menggunakan keduanya (Next.js yang dijalankan di atas Bun).

**C. Arsitektur Data Pendaftaran (Relasi 1:N)**
Berdasarkan kebutuhan di lapangan, arsitektur data pendaftar dipisah menjadi dua entitas agar lebih fleksibel:
1. **Tabel `participants`**: Menyimpan data identitas personal (Nama, Telepon, WA, Status KMI, ID Forbis).
2. **Tabel `participant_businesses`**: Menyimpan profil bisnis (Nama Perusahaan, Kategori, Produk, dsb). Merujuk ke `participants` via `participant_id`.
*Benefit:* Satu peserta dapat mendaftarkan/memiliki lebih dari satu usaha tanpa harus mengisi ulang data pribadinya.

**D. Pola Antarmuka Pendaftaran (Progresif)**
- Formulir dipisah menjadi form mandiri (`ParticipantForm.tsx` & `BusinessForm.tsx`).
- Alur admin tidak menggunakan step-by-step wizard yang kaku, melainkan alur progresif: Menyimpan data personal terlebih dahulu, kemudian opsi "Tambah Usaha" akan muncul dan dapat dipanggil berkali-kali.

---
*Catatan: Dokumen ini akan terus saya baca (recall) dan saya update seiring berjalannya pengembangan aplikasi Jalamandala.*
