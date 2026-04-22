# Arsitektur Modul Laman (Pages)
> Revisi frontend-first. Dokumen ini mendefinisikan modul laman sebagai sumber konten publik event, bukan sekadar CRUD admin.

---

## 1. Tujuan

Modul `Pages` dipakai untuk mengelola konten publik event yang tidak masuk ke alur transaksi booth, misalnya:

- landing page event
- syarat dan ketentuan
- privacy policy
- halaman informasi umum
- halaman statis tambahan seperti FAQ, panduan peserta, atau sponsor info

Karena orientasinya adalah frontend, arsitektur ini harus memastikan:

- data page konsisten dengan `expo_events`
- media asset mengikuti standar `media_library`
- route publik jelas
- tipe halaman penting seperti `landing`, `tnc`, dan `privacy` punya sumber kebenaran tunggal
- format konten aman untuk dirender ulang di frontend

---

## 2. Posisi Modul dalam Sistem

Modul `Pages` masuk ke **public schema**, karena:

- halaman publik bisa diakses tanpa login
- halaman adalah bagian dari identitas event
- halaman dibutuhkan sebelum user masuk ke dashboard admin
- halaman perlu mudah dipakai ulang oleh frontend publik

Relasi utamanya:

- `organization -> expo_events -> event_pages`

Artinya:

- satu event bisa punya banyak page
- satu page hanya milik satu event
- frontend selalu membaca page dalam konteks event

---

## 3. Prinsip Desain

Prinsip yang dipakai:

1. admin hanya mengelola
2. frontend publik adalah konsumen utama
3. tipe halaman tertentu bersifat singleton per event
4. media asset harus tercatat di `media_assets` dan `media_usages`
5. kontrak route publik harus ditetapkan di dokumen, bukan dibiarkan implisit

---

## 4. Bahasa Domain

Istilah yang dipakai:

- `event page`: satu dokumen konten milik satu event
- `page type`: kategori perilaku halaman
- `page status`: status editorial
- `featured image`: gambar utama halaman
- `page blocks`: struktur konten khusus untuk frontend

---

## 5. Model Data

Tabel baru di `public schema`:

- `public.event_pages`

### 5.1 Tabel `event_pages`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary key |
| `event_id` | UUID | FK ke `expo_events.id` |
| `title` | TEXT | Judul halaman |
| `slug` | TEXT | Slug URL, unik per event |
| `page_type` | TEXT | `default` \| `landing` \| `legal_tnc` \| `legal_privacy` |
| `status` | TEXT | `draft` \| `published` \| `archived` |
| `excerpt` | TEXT | Ringkasan pendek untuk listing/SEO |
| `content_format` | TEXT | `tiptap_json` \| `page_blocks` |
| `content` | JSONB | Isi utama halaman |
| `featured_image_asset_id` | UUID | FK ke `media_assets.id` |
| `seo_title` | TEXT | Opsional untuk metadata publik |
| `seo_description` | TEXT | Opsional untuk metadata publik |
| `published_at` | TIMESTAMP | Waktu publish |
| `created_at` | TIMESTAMP | Waktu buat |
| `updated_at` | TIMESTAMP | Waktu update |
| `deleted_at` | TIMESTAMP | Soft delete |

### 5.2 Kenapa `page_type` dipisah

`template` tidak cukup jelas untuk frontend. Yang lebih tepat adalah `page_type`, karena field ini menentukan:

- route publik
- aturan singleton
- format konten
- perilaku renderer

Nilai `page_type` yang disarankan:

- `default`
- `landing`
- `legal_tnc`
- `legal_privacy`

### 5.3 Kenapa `content_format` dibutuhkan

Tidak semua halaman cocok sebagai rich text biasa.

Aturan yang disarankan:

- `default`, `legal_tnc`, `legal_privacy`:
  - `content_format = tiptap_json`
  - cocok untuk konten teks panjang
- `landing`:
  - `content_format = page_blocks`
  - cocok untuk frontend section-based

Jadi `landing page` jangan diperlakukan sebagai artikel biasa.

---

## 6. Aturan Data Penting

### 6.1 Unik per event

Setiap event:

- boleh punya banyak `default` page
- hanya boleh punya satu `landing`
- hanya boleh punya satu `legal_tnc`
- hanya boleh punya satu `legal_privacy`

Jadi selain unique `event_id + slug`, perlu aturan operasional:

- maksimal satu row aktif untuk tiap singleton type per event

Implementasi constraint bisa dilakukan dengan:

- unique partial index pada `event_id + page_type` untuk `landing`, `legal_tnc`, `legal_privacy`
- atau validasi di server action

Secara arsitektur, unique index lebih kuat.

### 6.2 Status halaman

Status yang dipakai:

- `draft`
- `published`
- `archived`

Makna:

- `draft`: belum tampil publik
- `published`: boleh dirender ke frontend
- `archived`: disimpan tapi tidak tampil publik

Frontend publik hanya membaca:

- `status = published`
- `deleted_at IS NULL`

### 6.3 Soft delete

Page tidak dihapus keras saat pertama kali dihapus admin.

Yang benar:

- set `deleted_at`
- ubah `status` ke `archived` atau status internal serupa

Alasannya:

- aman untuk audit
- aman untuk referensi legal
- aman untuk pemakaian media asset

---

## 7. Kontrak Route Publik

Karena modul ini orientasinya frontend, route publik harus didefinisikan sekarang.

### 7.1 Landing Page Event

Route utama event:

- `/{eventSlug}`

Renderer:

- membaca `event_pages` dengan `page_type = landing`
- jika tidak ada landing page published, frontend boleh fallback ke renderer default event profile

### 7.2 Halaman Legal

Route legal yang disarankan:

- `/{eventSlug}/syarat-ketentuan`
- `/{eventSlug}/kebijakan-privasi`

Sumber data:

- `legal_tnc`
- `legal_privacy`

Slug untuk halaman legal sebaiknya **tidak bebas**.

Yang lebih aman:

- `legal_tnc` selalu punya slug internal `syarat-ketentuan`
- `legal_privacy` selalu punya slug internal `kebijakan-privasi`

Tujuannya:

- URL stabil
- frontend tidak perlu menebak slug legal
- link footer dan form registrasi tidak mudah rusak

### 7.3 Halaman Umum

Route:

- `/{eventSlug}/halaman/{slug}`

Ini hanya berlaku untuk `page_type = default`.

---

## 8. Integrasi Event Identity

Setiap page publik dirender dalam konteks event.

Frontend page harus bisa mengakses konteks berikut dari `expo_events`:

- nama event
- slug event
- logo event
- venue
- tanggal event

Artinya page renderer jangan berdiri sendiri tanpa konteks event.

Minimal query publik nanti harus menghasilkan:

- `event`
- `page`
- `featuredImage`

---

## 9. Integrasi Media Library

Modul ini wajib mengikuti standar media library yang sudah aktif.

### 9.1 Relasi asset

Kolom:

- `featured_image_asset_id -> media_assets.id`

### 9.2 Visibility asset

Untuk featured image page publik:

- `visibility = public`

Karena dipakai di frontend publik dan tidak boleh bergantung pada signed URL.

### 9.3 Object key / folder

Jangan hanya memakai folder UI generik seperti `public/page-featured`.

Lebih aman pakai prefix yang kontekstual per event, misalnya:

- `public/events/{eventSlug}/pages/featured/{uuid}.{ext}`

Alasannya:

- lebih rapi di object storage
- lebih mudah audit
- lebih aman untuk migrasi antar event

### 9.4 Media usage

Saat featured image dipilih atau diganti, wajib catat di `media_usages` dengan:

- `module = 'page'`
- `entity_type = 'event_page'`
- `entity_id = {pageId}`
- `field_name = 'featured_image'`

Jika gambar diganti:

- hapus atau update usage lama
- pasang usage baru

Ini penting agar media library tetap konsisten dengan modul lain.

---

## 10. Format Konten

### 10.1 Default / Legal Pages

Untuk:

- `default`
- `legal_tnc`
- `legal_privacy`

Format konten yang tepat:

- `tiptap_json`

Karena halaman jenis ini dominan berupa teks, heading, list, link, dan block content panjang.

### 10.2 Landing Page

Untuk `landing`, format yang lebih tepat:

- `page_blocks`

Contoh block:

- hero
- feature grid
- agenda highlight
- CTA register
- sponsor strip
- gallery
- FAQ
- closing CTA

Kenapa perlu block-based:

- lebih mudah di-render frontend
- lebih konsisten secara desain
- lebih mudah dipetakan ke komponen React
- bisa menggabungkan data statis dan data dinamis

Jadi secara arsitektur:

- `landing` bukan rich text biasa
- `landing` adalah structured page

### 10.3 Landing Page Block Schema v1

Untuk implementasi awal, `landing` memakai struktur:

```json
{
  "blocks": [
    {
      "id": "hero-1",
      "type": "hero",
      "sortOrder": 10,
      "isVisible": true,
      "payload": {}
    }
  ]
}
```

Aturan dasar:

- `id`: identifier blok di level dokumen
- `type`: jenis blok
- `sortOrder`: urutan render
- `isVisible`: toggle tampil/sembunyi
- `payload`: isi data blok

Renderer frontend hanya membaca block yang:

- `isVisible = true`
- dikenal oleh registry block

Jika ada block tidak dikenal:

- frontend harus skip
- jangan sampai halaman rusak total

### 10.4 Block Registry v1

Block awal yang direkomendasikan untuk v1:

- `hero`
- `problem_statement`
- `highlight_cards`
- `agenda_preview`
- `cta_banner`
- `tenant_cta`
- `faq`
- `footer_info`

Blok-blok ini dipilih karena:

- sudah tercermin dari draft awal landing page
- cukup untuk melahirkan landing page event nyata
- tidak terlalu berat untuk implementasi admin pertama

### 10.5 Definisi Block v1

#### A. `hero`

Dipakai untuk section paling atas.

Payload minimum:

```json
{
  "eyebrow": "FORBIS Expo 2026",
  "title": "National Economic Summit & Expo",
  "subtitle": "Darussalam: From Values to Value.",
  "dateLabel": "20 - 24 Juni 2026",
  "primaryCtaLabel": "Amankan Booth Anda",
  "primaryCtaHref": "/booth",
  "secondaryCtaLabel": "Lihat Agenda",
  "secondaryCtaHref": "#agenda",
  "backgroundImageAssetId": "uuid|null"
}
```

Catatan:

- `backgroundImageAssetId` harus mengacu ke `media_assets`
- nama event, logo event, dan tanggal event tidak wajib ditulis ulang jika bisa dibaca dari `expo_events`
- renderer boleh memakai fallback dari `expo_events`

#### B. `problem_statement`

Dipakai untuk menjelaskan keresahan atau narasi dasar event.

Payload:

```json
{
  "sectionEyebrow": "Mengapa Kita Ada Di Sini?",
  "sectionTitle": "Berawal Dari Keresahan yang Sama",
  "items": [
    {
      "title": "Jaringan besar, bisnis berjalan sendiri",
      "description": "Narasi singkat",
      "icon": "network"
    }
  ]
}
```

Catatan:

- `icon` cukup disimpan sebagai slug ikon, bukan SVG mentah
- renderer yang menentukan icon component final

#### C. `highlight_cards`

Dipakai untuk section seperti `Values`, `Connection`, `Value Zone`.

Payload:

```json
{
  "sectionEyebrow": "Pilar Ekosistem",
  "sectionTitle": "3 Zona Utama Event",
  "items": [
    {
      "title": "Values Zone",
      "description": "Narasi singkat",
      "icon": "book-open",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}
```

#### D. `agenda_preview`

Dipakai untuk menampilkan agenda singkat di landing page.

Payload:

```json
{
  "sectionEyebrow": "Rundown Event",
  "sectionTitle": "Agenda 5 Hari",
  "mode": "linked_agenda",
  "itemLimit": 5,
  "ctaLabel": "Lihat Semua Agenda",
  "ctaHref": "/agenda"
}
```

Mode yang didukung:

- `linked_agenda`
- `manual`

Arti mode:

- `linked_agenda`: ambil dari modul `Agenda`
- `manual`: isi sendiri dari payload

Jika `manual`, payload tambahan:

```json
{
  "items": [
    {
      "dayLabel": "Sabtu, 20 Juni 2026",
      "title": "H1 - Pembukaan",
      "points": ["Opening Ceremony", "Leadership Talks"]
    }
  ]
}
```

Rekomendasi:

- v1 tetap mendukung `linked_agenda`
- frontend sebaiknya memprioritaskan data nyata dari modul agenda

#### E. `cta_banner`

Dipakai untuk section promosi atau ajakan penting.

Payload:

```json
{
  "title": "Momentum 100 Tahun Gontor",
  "description": "Narasi banner",
  "buttonLabel": "Lihat Detail",
  "buttonHref": "/halaman/tentang",
  "theme": "primary"
}
```

#### F. `tenant_cta`

Dipakai untuk ajakan booking tenant atau registrasi exhibitor.

Payload:

```json
{
  "title": "Amankan Booth Anda",
  "description": "Ringkasan manfaat untuk exhibitor",
  "buttonLabel": "Booking Tenant",
  "buttonHref": "/booth"
}
```

Catatan:

- block ini harus mudah dihubungkan ke flow booth/pendaftaran nyata

#### G. `faq`

Payload:

```json
{
  "sectionEyebrow": "Pertanyaan Umum",
  "sectionTitle": "Hal yang Sering Ditanyakan",
  "items": [
    {
      "question": "Bagaimana cara booking booth?",
      "answer": "Jawaban singkat"
    }
  ]
}
```

#### H. `footer_info`

Dipakai untuk footer konten event.

Payload:

```json
{
  "contactLabel": "Kontak Panitia",
  "contactValue": "+62...",
  "locationLabel": "Lokasi Event",
  "locationValue": "Lokasi",
  "socialLinks": [
    {
      "label": "Instagram",
      "href": "https://instagram.com/..."
    }
  ],
  "showLegalLinks": true
}
```

Jika `showLegalLinks = true`, frontend otomatis menampilkan:

- link ke `legal_tnc`
- link ke `legal_privacy`

Jadi admin tidak perlu mengetik ulang URL legal.

### 10.6 Data yang Tidak Boleh Diduplikasi

Landing page block boleh fleksibel, tapi jangan menduplikasi data inti yang sudah punya sumber lain.

Data berikut sebaiknya dibaca dari modul lain:

- nama event
- logo event
- venue utama event
- tanggal event
- agenda
- link legal page

Prinsipnya:

- block editor mengelola narasi dan susunan
- data operasional inti tetap berasal dari sumber kebenaran modul lain

### 10.7 Registri Renderer

Frontend perlu punya registry block, misalnya secara konsep:

- `hero -> HeroBlock`
- `problem_statement -> ProblemStatementBlock`
- `highlight_cards -> HighlightCardsBlock`
- `agenda_preview -> AgendaPreviewBlock`

Keputusan penting:

- renderer ditentukan oleh kode frontend
- admin tidak mengedit HTML
- perubahan desain tidak mengubah bentuk data utama kecuali block schema memang berubah

---

## 11. UI Admin

### 11.1 Arsip Laman

Path:

- `/admin/laman`

Tampilan:

- summary cards: total, published, draft
- tabel: judul, tipe halaman, status, updated at
- tombol tambah laman

Catatan:

- `slug` tidak perlu dijadikan informasi utama di tabel
- untuk singleton pages, lebih penting tampilkan badge tipe halaman

### 11.2 Create / Edit Laman

Path:

- `/admin/laman/tambah`
- `/admin/laman/[id]`

Layout:

- dua kolom
- kiri: konten utama
- kanan: konfigurasi publish dan media

#### A. Kolom kiri

- title input
- slug input
  - hanya editable untuk `default`
  - untuk `legal_tnc` dan `legal_privacy`, slug dikunci sistem
- editor konten
  - `tiptap` untuk default/legal
  - block editor sederhana untuk landing, bukan editor artikel biasa

#### B. Kolom kanan

- featured image
- page type
- status
- excerpt
- SEO title
- SEO description
- tombol simpan
- tombol hapus

### 11.3 UX singleton page

Untuk `landing`, `legal_tnc`, dan `legal_privacy`:

- admin tidak membuat banyak entry liar
- sistem sebaiknya menampilkan entry yang sudah ada
- tombol tambah untuk tipe singleton harus berubah menjadi edit jika tipe itu sudah ada

---

## 12. Server Actions

File:

- `apps/web/actions/pages.ts`

Server actions yang dibutuhkan:

- `listEventPages(eventId)`
- `getEventPageDetail(id)`
- `createEventPage(payload)`
- `updateEventPage(id, payload)`
- `deleteEventPage(id)`
- `getPublishedEventPageBySlug(eventSlug, slug)`
- `getPublishedEventLanding(eventSlug)`
- `getPublishedLegalPage(eventSlug, type)`

Catatan:

- action publik sebaiknya terpisah jelas dari action admin
- frontend publik tidak boleh membaca `draft` atau `archived`

---

## 13. Struktur Route

### Admin

| Path | Fungsi |
|------|--------|
| `/admin/laman` | Arsip laman |
| `/admin/laman/tambah` | Tambah laman |
| `/admin/laman/[id]` | Edit laman |

### Publik

| Path | Fungsi |
|------|--------|
| `/{eventSlug}` | Landing page event |
| `/{eventSlug}/syarat-ketentuan` | Halaman legal TNC |
| `/{eventSlug}/kebijakan-privasi` | Halaman legal privacy |
| `/{eventSlug}/halaman/{slug}` | Halaman umum |

---

## 14. Strategi Implementasi

Urutan implementasi yang paling aman:

1. tambah schema `event_pages` di public schema
2. pasang relasi ke `expo_events` dan `media_assets`
3. definisikan server actions admin dan publik
4. bangun admin archive page
5. bangun editor `default/legal` dulu
6. bangun renderer publik `default/legal`
7. baru bangun editor dan renderer `landing` berbasis block

Kenapa begitu:

- halaman legal dan default lebih sederhana
- landing page adalah kasus paling kompleks
- frontend publik tetap bisa jalan bertahap tanpa menunggu block editor matang

---

## 15. Keputusan Penting

Keputusan arsitektural yang sekarang direkomendasikan:

1. `page_type` menggantikan `template`
2. `landing`, `legal_tnc`, `legal_privacy` bersifat singleton per event
3. `landing` memakai `page_blocks`, bukan rich text murni
4. page publik selalu dirender dalam konteks `event`
5. featured image page harus tercatat di `media_usages`
6. route publik harus stabil dan ditentukan dari sekarang

---

## 16. Ringkasan

Modul `Pages` bukan modul artikel biasa. Dalam konteks Jalamandala, ia adalah:

- lapisan konten publik event
- sumber halaman legal
- pengelola landing page event
- penghubung antara event identity, media library, dan renderer frontend

Kalau modul ini dibangun hanya sebagai CRUD rich text admin, frontend nanti akan cepat mentok. Karena itu desain yang benar adalah:

- event-centric
- media-aware
- route-aware
- frontend-first

---

## 17. Status Implementasi (Changelog)

Sampai saat ini, implementasi telah menyelesaikan dua fase awal dari arsitektur:

### Tahap 1: Database & Admin Dasar (Selesai)
1. **Schema & Database**: 
   - Pembuatan tabel `public.event_pages` via Drizzle (di `packages/db/src/schema/public/pages.ts`).
   - Eksekusi DDL constraint dan relasi ke `expo_events` dan `media_assets` dilakukan menggunakan `provision-public.ts` untuk stabilitas ekosistem Drizzle.
2. **Server Actions (Admin)**: 
   - Membuat `apps/web/actions/pages.ts` (`listEventPages`, `getEventPageDetail`, `upsertEventPage`, `deleteEventPage`).
   - Menerapkan pengecekan Singleton rule (`landing`, `legal_tnc`, `legal_privacy` maksimal 1 per event).
   - Menyertakan validasi auto-sync ke `media_usages` untuk `featured_image`.
3. **UI Admin**:
   - Menambahkan navigasi `Laman Event` di `AdminShell`.
   - Membuat halaman arsip `/admin/laman` dengan summary cards.
   - Membuat halaman form `/admin/laman/tambah` dan `/admin/laman/[id]`.
   - Mengimplementasikan `PageEditor` dasar (dengan fallback UI untuk rich text sebelum Tiptap diaktifkan).

### Tahap 2: Block Editor & Frontend Publik (Selesai)
1. **Admin Block Editor**:
   - Mengimplementasikan `BlockEditor.tsx` khusus untuk `pageType === 'landing'`.
   - Memiliki form management (tambah, reorder, sembunyikan/hapus blok).
   - Validasi `payload` sebagai array of blocks (`page_blocks` format).
2. **Server Actions Publik**:
   - Membuat `public-pages.ts` yang hanya mem-fetch laman dengan `status = 'published'` dan `deleted_at IS NULL`.
3. **Frontend Publik Layout**:
   - Menetapkan route publik utama di `app/[eventSlug]/`.
   - Membuat `layout.tsx` khusus event publik yang menampilkan Navbar (nama logo & link menu) serta Footer dinamis yang memunculkan tautan `Syarat & Ketentuan` atau `Kebijakan Privasi` bila halaman tersebut diterbitkan.
4. **Renderer Publik**:
   - Implementasi `LandingRenderer` yang fail-safe (mengabaikan blok tak dikenal, fallback aman saat payload salah).
   - Komponen Block v1: `HeroBlock`, `ProblemStatementBlock`, `HighlightCardsBlock`, `AgendaPreviewBlock`, `CtaBannerBlock`, `TenantCtaBlock`, `FaqBlock`, `FooterInfoBlock`.
   - Implementasi halaman statis: `syarat-ketentuan`, `kebijakan-privasi`, dan halaman default.

### Tahap 3: Tiptap Editor & Agenda Integrasi (Selesai)
1. **Instalasi & Editor**:
   - Menambahkan dependensi `@tiptap/react`, `@tiptap/pm`, dan `@tiptap/starter-kit`.
   - Membuat komponen `RichTextEditor.tsx` untuk menangani *rich text* pada halaman tipe `default` dan `legal`.
   - Mengganti *textarea* biasa di `PageEditor.tsx` dengan Tiptap editor untuk kenyamanan penyuntingan konten.
2. **Integrasi Data Agenda**:
   - Menambahkan server action `getPublishedEventAgendas` pada `actions/public-pages.ts`.
   - Menghubungkan data `eventAgendas` aktual ke dalam komponen `AgendaPreviewBlock` (jika `mode === 'linked_agenda'`), sehingga daftar agenda secara otomatis mengambil data nyata dari basis data.

### Tahap 4: Finalisasi Styling & Ekstensi Tiptap (Selesai)
1. **Ekstensi Gambar (Image)**:
   - Menambahkan ekstensi `@tiptap/extension-image` agar gambar bisa dimasukkan ke dalam tulisan Tiptap.
   - Mengintegrasikan UI `MediaPicker` ke dalam *toolbar* editor Tiptap via *Dialog/Modal*.
   - Gambar dari `MediaPicker` kini tersimpan pada *path* `public/events/[eventSlug]/pages/content` yang lebih terorganisir, lalu disisipkan ke dalam *content JSON* Tiptap.
2. **Render JSON Tiptap to HTML**:
   - Menambahkan modul `@tiptap/html` untuk merender struktur JSON Tiptap menjadi HTML valid secara *server-side* (SSR-friendly).
   - Menambahkan `generateHTML` dengan ekstensi lengkap (`StarterKit` dan `Image`) di route halaman publik (`syarat-ketentuan`, `kebijakan-privasi`, dan `halaman/[slug]`).
3. **Styling Typography Publik**:
   - Menggunakan *plugin* `tailwindcss/typography` (kelas `prose`, `prose-slate`, `prose-img:rounded-2xl`, dll.) untuk merapikan desain HTML hasil render Tiptap.
4. **Bug Fixing & Type Safety**:
   - Memperbaiki `hydration mismatch` dengan mengatur `immediatelyRender: false` pada `useEditor` Tiptap untuk mendukung pola App Router.
   - Menyelesaikan *type checks error* pada integrasi UI `Button` dan relasi database `eventPages`.
