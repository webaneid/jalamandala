# Arsitektur UI Admin (Jalamandala)
> Dokumen ini merupakan Blueprint untuk desain visual, struktur komponen, dan tata letak (*App Shell*) dari Dashboard Admin Jalamandala (Berjalan di subdomain `app.*`).

## 1. Tujuan
- Memastikan antarmuka (*interface*) admin memiliki standar visual yang konsisten, modern, dan terasa "Premium".
- Mendefinisikan kerangka navigasi (*App Shell*) untuk dua aktor utama: **Tenant** dan **Superadmin**.
- Membangun *Design System* berbasis komponen yang bisa digunakan ulang (reusable) di seluruh aplikasi melalui `packages/ui`.

## 2. Prinsip Desain
- **Berbasis Shadcn/UI & Tailwind v4:** Kita tidak membuat komponen primitif dari nol. Kita memanfaatkan `shadcn/ui` yang di-kustomisasi agar terlihat lebih elegan.
- **CSS Variables / Token Strategy:** Pewarnaan tidak di-hardcode (contoh: `bg-blue-500`), melainkan menggunakan token semantik seperti `bg-primary`, `bg-accent`, `text-muted` di `globals.css`. Ini memungkinkan aplikasi di-tema ulang (*white-label*) dengan sangat cepat di masa depan.
- **Responsif & Interaktif:** Admin UI wajib mendukung tampilan *mobile-friendly* (terutama untuk Tenant yang mungkin mendaftar via HP) dan memiliki *micro-animations* saat interaksi.

## 3. Struktur Packages (UI)

Di dalam Turborepo kita, komponen UI akan diisolasi di `packages/ui` agar bisa diakses oleh rute `/admin` maupun `/expo`:

- **Theme & Tokens (Warna Utama FORBIS):** 
  Penyimpanan file CSS yang berisi variabel warna. Berikut adalah *breakdown* warna berdasarkan warna identitas FORBIS:
  
  **1. Primary (Biru Tua - #134397)**
  *Digunakan untuk elemen utama, tombol Submit, Header, dan teks tebal.*
  - `primary-50`  : `#E8EDF6` (Background panel / Hover sangat ringan)
  - `primary-100` : `#C6D4E9` (Background sekunder)
  - `primary-500` : `#336BCA` (Hover state untuk tombol utama)
  - `primary-600` : **`#134397` (BASE - Identitas Utama)**
  - `primary-800` : `#0D2E68` (Active state / Teks tebal)
  - `primary-900` : `#081D41` (Elemen sangat gelap)

  **2. Accent / Secondary (Biru Muda - #00ADEE)**
  *Digunakan untuk Call-to-Action sekunder, ikon, link, dan highlight visual.*
  - `accent-50`   : `#E5F7FD` (Background info / badge terang)
  - `accent-100`  : `#B3E7FA` (Pill / status badge)
  - `accent-500`  : **`#00ADEE` (BASE - Identitas Kedua)**
  - `accent-600`  : `#008BBE` (Hover state tombol accent)
  - `accent-900`  : `#003B52` (Teks accent gelap)

  **3. Base Layout (Light Mode)**
  *Warna netral pendukung dengan *tint* kebiruan agar menyatu dengan brand.*
  - `background`    : `#F8FAFC` (Slate 50 - Putih keabu-abuan untuk *canvas* utama)
  - `card` / `panel`: `#FFFFFF` (Putih murni untuk kotak form/kartu)
  - `border`        : `#E2E8F0` (Garis pemisah elegan)
  - `text-primary`  : `#0F172A` (Hampir hitam untuk teks form/judul)
  - `text-muted`    : `#64748B` (Abu-abu untuk deskripsi pendukung)

  **4. Semantic Colors**
  - `success` : `#10B981` (Status: Paid / Verified)
  - `warning` : `#F59E0B` (Status: Pending / Menunggu Pembayaran)
  - `danger`  : `#EF4444` (Validasi error / Overdue)
- **Primitives (`packages/ui/components`):**
  - Input, Button, Card, Dialog/Modal, Select, Checkbox.
- **Admin Patterns (`packages/ui/blocks`):**
  - **MetricCard:** Kotak ringkasan statistik (contoh: Total Tagihan, Sisa Booth).
  - **DataTable:** Tabel standar dengan fitur filter, paginasi, dan *search*.
  - **FormSection:** Pola formulir yang terbagi per bagian (Informasi Personal, Usaha, dll) agar user tidak terintimidasi oleh form panjang.

## 4. Arsitektur App Shell (Layouting)

Sesuai dengan keputusan arsitektur **Opsi A (Single App with Middleware)**, semua dashboard admin hidup di dalam routing Next.js `apps/web/app/admin/`. Kita memiliki dua bentuk *Layout* (Kerangka) utama:

### A. Tenant Dashboard Shell (`app/admin/(tenant)/layout.tsx`)
*Ditujukan untuk peserta expo (Tenant) yang melakukan pendaftaran.*
- **Top Header:** Logo Event (FORBIS Expo 2026), Nama Tenant, Menu Profil.
- **Sidebar Navigasi (Simple):**
  1. Beranda / Ringkasan
  2. Formulir Pendaftaran (Draft / Completed)
  3. Denah & Pilih Booth
  4. Kustomisasi & Add-ons
  5. Tagihan & Pembayaran
  6. E-Pass & Handbook
- **Main Canvas:** Menggunakan *Card-based layout* yang dipusatkan dengan *max-width* agar form pendaftaran mudah dibaca dan diisi.

### B. Superadmin Dashboard Shell (`app/admin/(superadmin)/layout.tsx`)
*Ditujukan untuk panitia inti penyelenggara expo.*
- **Top Header:** Switcher Event (Jika ada multi-event), Global Search, Notifikasi, Admin Profile.
- **Sidebar Navigasi (Kompleks):**
  1. Overview & Analytics
  2. Kelola Event & Konfigurasi Add-ons
  3. Visual Editor Peta Booth
  4. Data Pendaftar (Tenant) -> Verifikasi & Ekspor Data
  5. Keuangan & Transaksi
- **Main Canvas:** *Full-width layout* untuk memberikan ruang maksimum bagi Tabel Data (*DataGrid*) dan Peta Interaktif.

## 5. Rencana Eksekusi UI (Fase Pembuatan UI Admin)

Saat kita masuk ke pembuatan UI, langkah-langkahnya adalah:
1. **Setup Theme:** Menginjeksi *color tokens* ke `globals.css` untuk menciptakan nuansa *premium*.
2. **Setup Shadcn:** Meng-install komponen primitif yang dibutuhkan (Button, Input, Form, Card, Table).
3. **Membangun Shell:** Merakit komponen Sidebar dan Header, lalu menyatukannya ke dalam file `layout.tsx`.
4. **Mockup Halaman Pendaftaran:** Merancang UI formulir pendaftaran awal (sesuai *arsitektur-pendaftaran.md*) dengan komponen *Card* dan *Input* yang rapi sebelum mengkoneksikannya ke database.
