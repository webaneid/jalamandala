# Arsitektur Brand UI

Dokumen ini mendefinisikan fondasi visual dan utilitas UI Jalamandala agar implementasi front-end publik, admin, dan komponen lintas modul tetap konsisten.

Dokumen ini bukan sekadar daftar warna. Ia menjadi rujukan untuk:

- brand color palette
- semantic color tokens
- shape system
- form primitives
- button system
- select / autocomplete direction
- card, border, dan surface style
- aset dan utilitas dasar yang harus dipakai ulang

Dokumen ini dibuat **sebelum** eksekusi front-end publik agar desain tidak liar, tidak berubah-ubah per halaman, dan tidak tergantung preferensi implementor.

---

## 1. Tujuan

Jalamandala butuh satu sumber kebenaran visual agar:

- halaman publik event konsisten
- admin dashboard tetap satu keluarga visual
- komponen dasar bisa dipakai ulang
- implementasi page builder, landing page, form pendaftaran, booth booking, invoice, dan dashboard peserta tidak saling bertabrakan

Dokumen ini juga menjadi jembatan antara:

- token CSS / Tailwind yang sudah ada
- komponen dasar di `apps/web/components/ui`
- kebutuhan desain front-end publik yang akan dibangun berikutnya

---

## 2. Sumber Kebenaran Saat Ini

Sumber visual yang sudah aktif di codebase saat ini:

- [apps/web/app/globals.css](/Users/webane/sites/jalamandala/apps/web/app/globals.css)
- [apps/web/components/ui/button.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/button.tsx)
- [apps/web/components/ui/input.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/input.tsx)
- [apps/web/components/ui/select.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/select.tsx)

Dokumen ini merapikan keputusan yang sudah tersirat di file-file tersebut agar bisa dipakai sebagai arsitektur desain, bukan sekadar implementasi tersebar.

---

## 3. Prinsip Visual

Prinsip visual Jalamandala yang direkomendasikan:

1. light-first, bukan dark-first
2. bersih, terang, modern, dan profesional
3. identitas utama memakai biru tua + cyan terang
4. permukaan putih dengan nuansa slate lembut
5. radius modern, tetapi tidak terlalu bulat
6. border halus dan tipis sebagai pemisah utama
7. form dan CTA harus terlihat tegas, tidak abu-abu lemah

Secara rasa, brand ini harus terasa:

- formal tetapi tidak kaku
- event-driven tetapi tetap korporat
- modern tetapi tidak startup generik

---

## 4. Brand Palette

### 4.1 Brand Colors Utama

Palette utama yang sudah tercermin di token saat ini:

- `Brand Navy` = `#134397`
- `Brand Cyan` = `#00adee`
- `Foreground Ink` = `#0f172a`
- `Background Mist` = `#f8fafc`
- `Border Soft` = `#e2e8f0`

### 4.2 Makna Tiap Warna

- `Brand Navy`
  - warna identitas utama
  - dipakai untuk primary action, heading penting, state fokus, link utama
- `Brand Cyan`
  - warna aksen hidup
  - dipakai untuk secondary CTA, highlight, accent graphic, selection color
- `Foreground Ink`
  - warna teks utama
- `Background Mist`
  - warna latar global
- `Border Soft`
  - warna border dan divider

### 4.3 Skala Warna Saat Ini

Berdasarkan token yang sudah aktif:

#### Primary Scale

- `primary-50` = `#e8edf6`
- `primary-100` = `#c6d4e9`
- `primary-500` = `#336bca`
- `primary-600` = `#134397`
- `primary-800` = `#0d2e68`
- `primary-900` = `#081d41`

#### Accent Scale

- `accent-50` = `#e5f7fd`
- `accent-100` = `#b3e7fa`
- `accent-500` = `#00adee`
- `accent-600` = `#008bbe`
- `accent-900` = `#003b52`

---

## 5. Semantic Color Tokens

Token semantik yang harus jadi acuan desain:

### 5.1 Surface

- `background` = `#f8fafc`
- `card` = `#ffffff`
- `popover` = `#ffffff`
- `muted` = `#f1f5f9`

### 5.2 Text

- `foreground` = `#0f172a`
- `muted-foreground` = `#64748b`
- `card-foreground` = `#0f172a`

### 5.3 Action

- `primary` = `#134397`
- `primary-foreground` = `#ffffff`
- `secondary` = `#00adee`
- `secondary-foreground` = `#ffffff`

### 5.4 Support

- `destructive` = `#ef4444`
- `destructive-foreground` = `#f8fafc`
- `border` = `#e2e8f0`
- `input` = `#e2e8f0`
- `ring` = `rgba(19, 67, 151, 0.28)`

### 5.5 Status Guidance

Untuk implementasi baru, semantic status yang disarankan:

- `success`
  - gunakan hijau slate-soft, jangan neon
- `warning`
  - gunakan amber hangat
- `danger`
  - gunakan token `destructive`
- `info`
  - gunakan turunan `accent` atau `primary-100`

Catatan:

- status colors boleh ditambahkan sebagai token baru nanti
- tetapi jangan mencampur warna status operasional dengan warna brand utama

---

## 6. Typography Direction

Typography saat ini sudah mengarah ke:

- `Plus Jakarta Sans`
- fallback `Avenir Next`, `ui-sans-serif`, `system-ui`

Arahan tipografi:

- heading: tegas, rapat, memakai `foreground`
- body text: netral, ringan, tidak terlalu tipis
- label form: jelas dan pendek
- metadata: gunakan `muted-foreground`

Jangan:

- pakai font dekoratif acak
- mencampur banyak family
- memakai weight terlalu tipis untuk body

---

## 7. Shape System

### 7.1 Radius

Token radius aktif sekarang:

- `--radius = 0.5rem`

Turunannya:

- `radius-sm`
- `radius-md`
- `radius-lg`

### 7.2 Arah Radius

Untuk front-end publik, radius yang direkomendasikan:

- input / select / small button: `rounded-lg`
- card sekunder: `rounded-2xl`
- hero card / modal utama: `rounded-3xl`

Prinsip:

- radius kecil untuk elemen utilitarian
- radius besar untuk surface besar atau hero

Jangan:

- campur terlalu banyak radius acak
- gunakan radius ekstrem tanpa alasan

---

## 8. Border & Surface System

### 8.1 Border

Border utama:

- warna: `border`
- tipis dan halus
- dipakai untuk form field, card ringan, divider, state outline

### 8.2 Surface Hierarchy

Hierarchy surface yang disarankan:

1. `background`
2. `card`
3. `muted`
4. `accent-50` atau `primary-50` untuk highlight section

### 8.3 Background Direction

Global background saat ini sudah memakai:

- radial glow halus navy
- radial glow halus cyan
- gradient putih ke slate muda

Ini bisa dipertahankan sebagai bahasa visual utama, terutama untuk:

- halaman publik
- auth pages
- onboarding
- invoice publik

Namun:

- jangan semua section diberi glow
- glow hanya sebagai atmosfer global, bukan dekorasi di tiap card

---

## 9. Button System

Rujukan utama:

- [apps/web/components/ui/button.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/button.tsx)

### 9.1 Variant yang Aktif

Saat ini variant aktif:

- `default`
- `outline`
- `secondary`
- `ghost`
- `destructive`
- `link`

### 9.2 Penggunaan yang Disarankan

- `default`
  - CTA utama
  - submit
  - action penting
- `secondary`
  - CTA sekunder yang tetap menonjol
- `outline`
  - action pendamping
  - filter
  - open modal
- `ghost`
  - action baris / tool action
- `link`
  - teks navigasi

### 9.3 Ukuran yang Disarankan

Ukuran aktif:

- `xs`
- `sm`
- `default`
- `lg`
- `icon`

Untuk front-end publik:

- CTA primer desktop: `lg`
- CTA tabel / inline: `sm`
- CTA hero atau landing penting: boleh `lg` dengan padding tambahan

### 9.4 Arah Visual Button

Button publik sebaiknya:

- tegas
- bersih
- kontras cukup
- tidak terlalu tipis

Jangan:

- gunakan outline pucat untuk CTA utama
- gunakan secondary cyan untuk semua tombol

---

## 10. Form System

Form adalah area paling penting untuk pendaftaran publik.

### 10.1 Input

Rujukan:

- [apps/web/components/ui/input.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/input.tsx)

Karakter input saat ini:

- tinggi dasar `h-8`
- border halus
- rounded `lg`
- focus ring biru

Arahan untuk front-end publik:

- form onboarding boleh memakai tinggi sedikit lebih besar: `h-10` atau `h-11`
- placeholder harus `muted-foreground`
- label harus selalu ada, jangan placeholder-only

### 10.2 Select

Rujukan:

- [apps/web/components/ui/select.tsx](/Users/webane/sites/jalamandala/apps/web/components/ui/select.tsx)

Arah penggunaan:

- select standar untuk pilihan pendek
- untuk dataset panjang, **autocomplete / command select** harus jadi komponen resmi

### 10.3 Autocomplete / Searchable Select

Komponen ini sangat penting untuk:

- organisasi
- anggota FORBIS
- provinsi / kabupaten / kecamatan / desa
- business catalog
- target menu front-end

Arahan arsitektural:

- jangan membuat autocomplete ad-hoc berbeda-beda
- harus ada satu pola utilitas resmi:
  - input trigger
  - popover / command list
  - result state
  - empty state
  - keyboard navigation

Komponen yang dibutuhkan nanti:

- `AutocompleteSelect`
- `RegionAutocompleteSelect`
- `AsyncAutocompleteSelect`

### 10.4 Form Border & Group

Untuk front-end publik, section form yang baik:

- card putih
- `rounded-2xl` atau `rounded-3xl`
- border tipis
- padding lapang
- gap vertikal stabil

Jangan:

- nested border bertumpuk tanpa fungsi
- dua border yang saling menimpa
- section terlalu mepet konten

---

## 11. Card System

Card adalah container utama untuk:

- informasi event
- ringkasan invoice
- section onboarding
- daftar usaha
- booth card
- panel dashboard

### 11.1 Jenis Card yang Direkomendasikan

- `Base Card`
  - putih
  - border halus
  - radius besar
- `Info Card`
  - putih atau muted
  - teks metadata
- `Highlight Card`
  - latar `primary-50` atau `accent-50`
  - untuk hero / CTA / highlight

### 11.2 Hierarki Card

Prinsip:

- satu halaman jangan memakai 5 gaya card acak
- card besar gunakan shadow lembut atau border, bukan keduanya berlebihan

---

## 12. Public Component Utilities yang Wajib Ada

Sebelum front-end publik besar dikerjakan, sebaiknya ada katalog komponen/utilitas dasar berikut:

### 12.1 Action Components

- `PublicButton`
- `SectionAction`
- `IconButton`

### 12.2 Form Components

- `FieldShell`
- `FormSectionCard`
- `AutocompleteSelect`
- `AsyncAutocompleteSelect`
- `PhoneInput`
- `OtpInput`
- `UploadField`

### 12.3 Content Components

- `SectionHeader`
- `EmptyState`
- `StatusBadge`
- `InfoPair`
- `SummaryCard`

### 12.4 Booth & Commerce Components

- `BoothCard`
- `BoothStatusBadge`
- `PriceLine`
- `InvoiceSummaryCard`
- `PaymentChannelCard`

### 12.5 Layout Utilities

- `PublicContainer`
- `PublicPageHeader`
- `PublicSection`
- `StickyActionBar`

Dokumen ini tidak mengharuskan semua komponen dibuat sekarang, tetapi daftar ini harus jadi acuan saat implementasi agar tidak membuat komponen duplikat dengan nama dan gaya acak.

---

## 13. Asset Direction

### 13.1 Asset yang Dibutuhkan Front-End Publik

Minimal nanti front-end publik akan butuh:

- logo event
- logo organisasi jika relevan
- hero image / hero illustration
- icon set konsisten
- QR image
- e-pass visual template

### 13.2 Aturan Asset

- gunakan media library sebagai source, bukan file hardcoded liar
- asset publik harus `visibility = public`
- asset privat peserta jangan pernah dipakai di public landing

### 13.3 Icon Direction

Icon yang dipakai:

- `lucide-react`

Prinsip:

- satu icon style saja
- hindari campur icon library lain tanpa alasan

---

## 14. Mapping ke Token CSS Saat Ini

Implementasi yang sudah aktif di [apps/web/app/globals.css](/Users/webane/sites/jalamandala/apps/web/app/globals.css) harus tetap menjadi fondasi.

Token kunci yang wajib dipakai:

- `bg-background`
- `text-foreground`
- `bg-card`
- `border-border`
- `text-muted-foreground`
- `bg-primary`
- `text-primary-foreground`
- `bg-secondary`
- `text-secondary-foreground`

Jangan:

- hardcode hex langsung di banyak komponen
- membuat palette paralel tanpa token

Kalau butuh warna baru:

- tambahkan ke token dulu
- baru pakai di komponen

---

## 15. Hubungan dengan Front-End Publik

Dokumen ini wajib dirujuk oleh:

- [docs/arsitektur-front-end-public.md](/Users/webane/sites/jalamandala/docs/arsitektur-front-end-public.md)
- [docs/arsitektur-front-end-menu.md](/Users/webane/sites/jalamandala/docs/arsitektur-front-end-menu.md)
- implementasi page blocks publik
- auth pages publik
- onboarding participant
- dashboard peserta
- booking booth publik

Artinya:

- semua keputusan visual front-end harus merujuk ke dokumen ini lebih dulu
- dokumen lain tidak perlu mendefinisikan palette dan komponen dasar dari nol

---

## 15A. Prioritas Implementasi Komponen Publik

Sebelum halaman publik besar dibangun, komponen dasar sebaiknya dibuat bertahap berdasarkan prioritas. Tujuannya agar:

- pondasi layout stabil dulu
- form dan CTA cepat konsisten
- komponen kompleks tidak dibangun di atas primitive yang belum matang

### 15A.1 Batch 1 — Foundation Wajib

Komponen yang harus dibuat paling dulu:

1. `PublicContainer`
2. `SectionHeader`
3. `PublicButton`
4. `FieldShell`
5. `FormSectionCard`
6. `StatusBadge`
7. `AutocompleteSelect`

Kenapa batch ini paling dulu:

- cukup untuk mulai membangun login WA
- cukup untuk mulai membangun OTP
- cukup untuk approval terms
- cukup untuk onboarding peserta
- cukup untuk tambah usaha

### 15A.2 Batch 2 — Form Experience

Setelah foundation siap, lanjut:

8. `AsyncAutocompleteSelect`
9. `PhoneInput`
10. `OtpInput`
11. `UploadField`

Kenapa batch ini berikutnya:

- ini menyempurnakan alur auth dan onboarding
- masih dekat ke domain form publik
- nilainya langsung terasa di flow pendaftaran

### 15A.3 Batch 3 — Commerce & Dashboard

Lalu lanjut:

12. `SummaryCard`
13. `InfoPair`
14. `EmptyState`
15. `StickyActionBar`

Kenapa batch ini belakangan:

- lebih relevan setelah dashboard, invoice, dan checkout mulai dibangun
- bergantung pada struktur data yang sudah lebih jelas

### 15A.4 Urutan Kerja yang Direkomendasikan

Urutan implementasi final yang disarankan:

1. `PublicContainer`
2. `SectionHeader`
3. `PublicButton`
4. `FieldShell`
5. `FormSectionCard`
6. `StatusBadge`
7. `AutocompleteSelect`
8. `AsyncAutocompleteSelect`
9. `PhoneInput`
10. `OtpInput`
11. `UploadField`
12. `SummaryCard`
13. `InfoPair`
14. `EmptyState`
15. `StickyActionBar`

### 15A.5 Mapping ke Fitur Publik

Komponen batch 1 akan langsung dipakai untuk:

- login WhatsApp
- input OTP
- halaman persetujuan syarat
- onboarding peserta
- tambah usaha

Komponen batch 2 akan dipakai untuk:

- pengalaman input form yang lebih matang
- upload publik
- autocomplete dataset besar

Komponen batch 3 akan dipakai untuk:

- dashboard peserta
- booking booth
- checkout
- invoice
- E-Pass

---

## 16. Keputusan Arsitektural yang Direkomendasikan

Keputusan yang direkomendasikan:

1. brand utama memakai `Brand Navy` + `Brand Cyan`
2. aplikasi bersifat light-first
3. token CSS di `globals.css` menjadi sumber kebenaran warna
4. button, input, dan select dasar yang sudah ada menjadi fondasi shared primitives
5. autocomplete select harus menjadi utilitas resmi, bukan implementasi ad-hoc
6. form section memakai card putih ber-border halus dengan radius besar
7. komponen publik baru harus dibangun di atas utility dan primitive yang konsisten

---

## 17. Ringkasan

Brand UI Jalamandala harus dipahami sebagai sistem, bukan kumpulan style acak.

Fondasi yang harus dijaga:

- biru tua + cyan sebagai identitas
- putih + slate muda sebagai ruang
- border halus
- radius modern
- typography bersih
- form tegas dan jelas
- utility component yang bisa dipakai ulang

Kalau ini dijaga sejak awal, front-end publik tidak akan terasa seperti kumpulan halaman lepas, tetapi benar-benar satu produk yang utuh.
