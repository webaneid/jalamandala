# Arsitektur Front-End Menu & Static Homepage

Dokumen ini merevisi arsitektur menu front-end agar selaras dengan arah aplikasi yang **frontend-first**, event-centric, dan terhubung langsung dengan modul `Pages`.

Fokus dokumen ini ada dua:

1. pengaturan menu navigasi publik yang dinamis, rapi, dan bisa drag-and-drop
2. pengaturan halaman utama event seperti konsep **Static Front Page** di WordPress

---

## 1. Tujuan

Modul ini dibutuhkan karena front-end publik tidak boleh bergantung pada menu hardcoded. Admin harus bisa:

- melihat daftar semua URL front-end yang valid
- memilih URL mana yang mau dimasukkan ke menu
- memberi label menu sendiri
- mengurutkan menu dengan drag-and-drop
- mengatur halaman mana yang menjadi **homepage utama event**

Jadi modul ini bukan sekadar "menu list", tetapi **navigation configuration layer** untuk situs publik event.

---

## 2. Prinsip Desain

Prinsip yang dipakai:

1. sumber kebenaran route publik harus jelas
2. menu tidak boleh berisi URL liar yang tidak dikenali sistem, kecuali memang dipilih sebagai external link
3. homepage utama event harus dipilih dari modul `Pages`, bukan diketik manual
4. `landing` bukan satu-satunya homepage; `default page` tertentu juga boleh dijadikan homepage jika dibutuhkan
5. menu builder dan homepage setting sebaiknya berada di **satu layar konfigurasi**, karena keduanya sama-sama mengatur identitas navigasi publik

---

## 3. Hubungan dengan Modul Lain

Modul ini bergantung pada:

- `expo_events`
- `event_pages`
- route publik event

Hubungan logisnya:

- `expo_events` menyimpan event aktif dan `eventSlug`
- `event_pages` menyimpan seluruh laman publik milik event
- modul menu membaca semua target front-end yang valid dari gabungan:
  - halaman `Pages`
  - route sistem publik
  - URL eksternal opsional

---

## 4. Bahasa Domain

Istilah yang dipakai:

- `frontend route`: URL publik yang valid untuk event
- `menu item`: satu item navigasi publik
- `menu source`: asal target menu, misalnya page, system route, atau external URL
- `homepage target`: halaman yang dipilih sebagai root `/{eventSlug}`
- `static homepage`: halaman yang dipilih manual oleh admin untuk menjadi homepage event

---

## 5. Kebutuhan Produk

Admin membutuhkan pengalaman berikut:

### 5.1 Pengaturan Homepage

Admin membuka halaman pengaturan tampilan, lalu:

- melihat pilihan homepage saat ini
- memilih salah satu laman dari `Pages`
- menyimpan sebagai halaman utama event

Contoh:

- root `/{eventSlug}` diarahkan ke `Landing Page`
- atau root `/{eventSlug}` diarahkan ke page biasa seperti `Tentang Expo`

### 5.2 Pengaturan Menu

Admin membuka builder menu, lalu:

- melihat daftar item menu saat ini
- menambah item baru dari target front-end yang sudah dikenal sistem
- memberi label tampilan sendiri
- menyalakan / mematikan item
- drag-and-drop untuk mengatur urutan

### 5.3 Jenis Target Menu yang Harus Didukung

Menu sebaiknya mendukung tiga sumber target:

1. `page`
   - target berasal dari `event_pages`
2. `system`
   - target berasal dari route publik sistem yang diketahui aplikasi
   - misalnya `homepage`, `agenda`, `booth`, `invoice lookup`, `kontak`, atau route publik resmi lain
3. `external`
   - target URL manual di luar event site

Jadi menu tidak boleh hanya mendukung `page` dan `url`, karena nanti route front-end resmi akan banyak dan tidak semuanya berasal dari `event_pages`.

---

## 6. Sumber Kebenaran URL Front-End

Ini bagian yang paling penting.

Karena user meminta "kita butuh semua URL front-end agar tinggal cari URL front-end-nya lalu tambahkan di menu", maka sistem harus punya **route registry**.

### 6.1 Kenapa Route Registry Dibutuhkan

Kalau admin harus mengetik URL sendiri:

- rawan typo
- rawan route yang tidak valid
- sulit sinkron dengan perubahan arsitektur front-end
- sulit dipakai untuk autocomplete / search

Karena itu, menu builder harus membaca target dari registry yang konsisten.

### 6.2 Konsep `frontend route registry`

Secara arsitektur, aplikasi perlu menyediakan daftar target seperti:

```ts
type FrontendRouteTarget =
  | {
      key: "homepage"
      sourceType: "system"
      label: "Beranda"
      pathPattern: "/{eventSlug}"
      pageType: null
      pageId: null
      isSelectableAsMenu: true
      isSelectableAsHomepage: false
    }
  | {
      key: "agenda"
      sourceType: "system"
      label: "Agenda"
      pathPattern: "/{eventSlug}/agenda"
      pageType: null
      pageId: null
      isSelectableAsMenu: true
      isSelectableAsHomepage: false
    }
  | {
      key: "page:{id}"
      sourceType: "page"
      label: "Tentang Expo"
      pathPattern: "/{eventSlug}/halaman/tentang-expo"
      pageType: "default"
      pageId: "uuid"
      isSelectableAsMenu: true
      isSelectableAsHomepage: true
    }
```

Route registry ini tidak harus disimpan sebagai tabel terpisah dulu. Untuk fase awal, registry bisa dibentuk secara dinamis dari:

- route sistem yang hardcoded di server
- daftar `event_pages` yang aktif

### 6.3 Target yang Harus Muncul di Registry

Minimal untuk fase awal:

- `Homepage`
- `Agenda`
- `Booking Booth`
- `Daftar Peserta / Registrasi`
- `Syarat & Ketentuan`
- `Kebijakan Privasi`
- semua `event_pages` yang `status = published`

Catatan:

- `legal_tnc` dan `legal_privacy` boleh muncul juga sebagai system route agar URL-nya stabil
- `landing` page tidak perlu muncul sebagai URL `/halaman/...`, karena ia punya arti khusus
- `default` pages masuk sebagai target menu normal

---

## 7. Struktur Database

### 7.1 Modifikasi `expo_events`

Tambahkan kolom:

- `homepage_page_id uuid null`

Relasi:

- FK ke `public.event_pages.id`

Makna:

- menyimpan page mana yang menjadi homepage event

Kenapa disimpan di `expo_events`:

- karena homepage adalah properti event, bukan properti page
- menjamin hanya ada satu homepage aktif per event
- lebih mudah dibaca oleh public renderer

### 7.2 Tabel Baru `event_nav_menus`

Tabel ini menyimpan item menu untuk satu event.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary key |
| `event_id` | `uuid` | FK ke `expo_events.id` |
| `label` | `text` | Label yang ditampilkan |
| `source_type` | `text` | `page` \| `system` \| `external` |
| `page_id` | `uuid null` | FK ke `event_pages.id` jika `source_type = page` |
| `system_key` | `text null` | Misalnya `homepage`, `agenda`, `booth`, `legal_tnc` |
| `external_url` | `text null` | URL manual jika `source_type = external` |
| `open_in_new_tab` | `boolean` | Relevan terutama untuk external URL |
| `sort_order` | `integer` | Urutan tampil |
| `is_active` | `boolean` | Tampil / tidak |
| `created_at` | `timestamp` | - |
| `updated_at` | `timestamp` | - |

### 7.3 Kenapa `system_key` Dibutuhkan

Karena tidak semua target menu berasal dari page database.

Contoh:

- `Agenda`
- `Booking Booth`
- `Homepage`

Kalau hanya pakai `page_id`, modul menu akan cepat mentok begitu front-end punya route publik operasional lain.

### 7.4 Aturan Validasi Data

Aturan yang harus dijaga:

- jika `source_type = page`, maka `page_id` wajib terisi
- jika `source_type = system`, maka `system_key` wajib terisi
- jika `source_type = external`, maka `external_url` wajib terisi
- satu row hanya boleh punya satu target aktif

---

## 8. Aturan Homepage

### 8.1 Static Homepage

Root `/{eventSlug}` harus membaca:

- `expo_events.homepage_page_id`

Jika terisi:

- ambil page tersebut
- pastikan page milik event yang sama
- pastikan `status = published`
- render sesuai `page_type`

### 8.2 Page Type yang Boleh Menjadi Homepage

Yang boleh dipilih sebagai homepage:

- `landing`
- `default`

Yang tidak boleh:

- `legal_tnc`
- `legal_privacy`

Alasannya:

- legal pages bukan homepage
- URL legal harus stabil dan tidak mengambil alih root event

### 8.3 Fallback jika Homepage Kosong

Urutan fallback yang disarankan:

1. kalau ada `landing` page `published`, pakai itu
2. kalau tidak ada, cari `default` page bertanda utama jika nanti ada mekanisme khusus
3. kalau tetap tidak ada, tampilkan fallback event placeholder yang aman

Jadi situs publik tidak langsung rusak hanya karena homepage belum dikonfigurasi.

---

## 9. Aturan URL untuk Menu

### 9.1 Resolve URL `page`

Jika `source_type = page`:

- `landing` tidak dipakai sebagai menu target biasa
- `default` page menjadi:
  - `/{eventSlug}/halaman/{slug}`
- `legal_tnc` menjadi:
  - `/{eventSlug}/syarat-ketentuan`
- `legal_privacy` menjadi:
  - `/{eventSlug}/kebijakan-privasi`

### 9.2 Resolve URL `system`

Contoh:

- `homepage` -> `/{eventSlug}`
- `agenda` -> `/{eventSlug}/agenda`
- `booth` -> `/{eventSlug}/booth`
- `register` -> `/{eventSlug}/daftar`

Mapping ini harus dipusatkan di satu helper server/client bersama, supaya admin preview, public layout, dan validator memakai logika yang sama.

### 9.3 Resolve URL `external`

Jika external:

- pakai mentah `external_url`
- wajib divalidasi `http://` atau `https://`

---

## 10. UI Admin

### 10.1 Lokasi Menu di Admin

Modul ini harus berada di:

- `/admin/setting`

dan **wajib punya tab sendiri** bernama:

- `Front-End`

Jadi struktur tab di `admin/setting` ke depan minimal menjadi:

- `Profile Event`
- `Pembayaran`
- `WhatsApp`
- `Front-End`

Isi tab `Front-End`:

- pengaturan homepage
- menu builder
- pengaturan navigasi publik lain yang nanti masih relevan

Kenapa harus tab sendiri:

- konfigurasi front-end akan terus bertambah, tidak berhenti di menu
- homepage dan menu adalah domain yang sama: presentasi publik event
- lebih mudah dikembangkan nanti untuk navbar, footer links, CTA global, dan route publik lain
- lebih jelas bagi admin operasional daripada disembunyikan sebagai section kecil

### 10.2 Isi Tab `Front-End`: Homepage Setting

UI yang disarankan:

- card atau panel khusus
- label jelas: `Halaman Utama Website`
- select autocomplete yang membaca `event_pages`
- hanya menampilkan page yang boleh dijadikan homepage
- preview URL hasil:
  - `/{eventSlug}`

Field:

- `Homepage Source`
  - opsi:
    - `Landing Page`
    - daftar `Default Page` yang published

Catatan:

- jika ada `landing` page published, tampilkan sebagai kandidat paling atas
- legal pages tidak muncul

### 10.3 Isi Tab `Front-End`: Menu Builder

Komponen yang dibutuhkan:

- search target front-end
- form tambah item menu
- daftar menu sortable

#### A. Form Tambah Item

Field:

- `Label Menu`
- `Target`
  - autocomplete dari route registry
- `Buka di tab baru`
  - terutama untuk external link
- tombol `Tambah ke Menu`

Perilaku:

- saat target dipilih, label boleh auto-filled dari nama target
- admin tetap boleh mengganti label manual

#### B. List Builder

Tiap row menampilkan:

- drag handle
- label
- badge source type: `Page`, `System`, `External`
- preview path/url
- toggle active
- tombol edit
- tombol hapus

Drag-and-drop:

- pakai `dnd-kit`
- simpan urutan ke `sort_order`

### 10.4 Kenapa Search Target Lebih Penting daripada Dropdown Biasa

Karena jumlah page dan route nanti akan bertambah.

Kalau hanya dropdown biasa:

- sulit discan
- sulit cari cepat
- kurang enak untuk admin operasional

Autocomplete dengan grouping lebih tepat:

- `System Routes`
- `Pages`
- `External URL`

---

## 11. Arsitektur Front-End Publik

### 11.1 Public Layout

`app/[eventSlug]/layout.tsx` harus memuat:

- event identity
- nav menus aktif

Renderer navbar membaca:

- `event_nav_menus`
- urut berdasarkan `sort_order asc`
- hanya `is_active = true`

### 11.2 Root Homepage

`app/[eventSlug]/page.tsx` harus:

1. baca `expo_events.homepage_page_id`
2. jika ada, render page itu
3. jika tidak ada, jalankan fallback homepage logic

Renderer homepage:

- jika page type `landing` -> `LandingRenderer`
- jika page type `default` -> renderer Tiptap/HTML

### 11.3 Konsistensi URL

Helper resolve URL harus dipakai oleh:

- admin menu builder
- public navbar
- preview URL homepage
- validasi save menu

Jangan sampai ada 3 tempat berbeda yang membangun URL sendiri-sendiri.

---

## 12. Server Actions yang Dibutuhkan

File yang paling tepat:

- `apps/web/actions/front-end-menu.ts`
- atau bisa digabung ke `event-settings.ts` kalau ingin tetap satu domain setting

Action minimum:

- `getFrontendRouteTargets(eventId)`
- `getEventNavigationConfig(eventId)`
- `saveEventHomepageSetting(eventId, homepagePageId | null)`
- `createEventNavMenu(payload)`
- `updateEventNavMenu(id, payload)`
- `deleteEventNavMenu(id)`
- `reorderEventNavMenus(items)`

Untuk publik:

- `getPublishedEventMenus(eventSlug)`
- `getPublishedEventHomepage(eventSlug)`

---

## 13. Strategi Implementasi

Urutan implementasi yang paling aman:

1. tambah `homepage_page_id` ke `expo_events`
2. buat tabel `event_nav_menus`
3. buat helper `getFrontendRouteTargets(eventId)`
4. bangun UI admin `Navigasi & Homepage`
5. pasang drag-and-drop menu builder
6. pasang homepage resolver di route publik root
7. pasang navbar publik dinamis

Kenapa urutannya begitu:

- homepage dan menu sama-sama bergantung pada route target
- route registry harus jadi fondasi dulu
- public renderer baru aman setelah data navigasinya solid

---

## 14. Keputusan Implementasi yang Disarankan

Keputusan yang direkomendasikan:

1. homepage disimpan di `expo_events.homepage_page_id`
2. menu item disimpan di tabel `event_nav_menus`
3. target menu punya 3 source type:
   - `page`
   - `system`
   - `external`
4. daftar URL front-end tidak diketik manual, tetapi dibaca dari route registry
5. pengaturan menu dan homepage diletakkan dalam satu halaman setting
6. helper resolve URL harus tunggal dan dipakai lintas admin + publik

---

## 15. Ringkasan

Arsitektur menu front-end yang benar untuk Jalamandala bukan sekadar tabel link. Yang dibutuhkan adalah:

- **route-aware**
- **page-aware**
- **event-aware**
- **homepage-aware**

Dengan pendekatan ini:

- admin tinggal cari target front-end yang sudah valid
- beri label
- drag-and-drop urutan
- pilih static homepage dari `Pages`

Jadi sistem menjadi lebih dekat ke cara kerja WordPress static homepage, tetapi tetap sesuai arsitektur event-centric Jalamandala.

---

## 16. Catatan Implementasi

### Fase 1 — Database Provisioning ✅

**Perubahan Schema Drizzle:**

- `packages/db/src/schema/public/events.ts`: Ditambahkan kolom `homepagePageId` (`uuid`, nullable) pada tabel `expoEvents`. Ditambahkan relasi `homepage` (one-to-one ke `eventPages`) dan `navMenus` (one-to-many ke `eventNavMenus`).
- `packages/db/src/schema/public/menus.ts` **(BARU)**: Skema tabel `eventNavMenus` sesuai spesifikasi Bagian 7.2. Kolom: `id`, `eventId`, `label`, `sourceType`, `pageId`, `systemKey`, `externalUrl`, `openInNewTab`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`. Relasi ke `expoEvents` dan `eventPages`.
- `packages/db/src/schema/public/index.ts`: Ditambahkan `export * from "./menus"`.

**Provisioning SQL:**

- `packages/db/src/provision-public.ts`: Ditambahkan `ALTER TABLE expo_events ADD COLUMN IF NOT EXISTS homepage_page_id uuid` dan `CREATE TABLE IF NOT EXISTS event_nav_menus (...)`.

### Fase 2 — Admin API & Actions ✅

**File Baru:**

- `apps/web/actions/front-end-menu.ts`: Berisi semua server actions untuk modul menu:
  - `getFrontendRouteTargets(eventId, eventSlug)` — Route registry dinamis; menggabungkan system routes (`homepage`, `agenda`, `booth`) dan `event_pages` yang published.
  - `getEventNavigationConfig(eventId)` — Ambil `homepagePageId` dan daftar menu.
  - `saveEventHomepageSetting(eventId, homepagePageId)`
  - `createEventNavMenu(payload)`, `updateEventNavMenu(id, payload)`, `deleteEventNavMenu(id)`
  - `reorderEventNavMenus(items)` — Batch update `sort_order` dalam transaksi.

**File Dimodifikasi:**

- `apps/web/actions/public-pages.ts`: Ditambahkan:
  - `getPublishedEventMenus(eventSlug)` — Ambil menu aktif urut `sort_order`, include relasi `page`.
  - `getPublishedEventHomepage(eventSlug)` — Ambil homepage berdasarkan `homepage_page_id`, fallback ke landing page published.

### Fase 3 — UI Admin (Menu Builder & Homepage) ✅

**Dependensi Baru:**

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — Library drag-and-drop untuk sortable menu list.

**File Baru:**

- `apps/web/components/admin/setting/FrontendSettings.tsx`: Komponen client-side berisi:
  - **Homepage Setting** — Select dropdown yang menampilkan halaman `landing` dan `default` yang published sebagai kandidat homepage.
  - **Menu Builder** — Form tambah menu dengan autocomplete target (grouped: System Routes, Event Pages, Eksternal). Sortable list dengan `@dnd-kit` untuk drag-and-drop reorder. Setiap row menampilkan drag handle, label, badge source type, toggle aktif/nonaktif, dan tombol hapus.

**File Dimodifikasi:**

- `apps/web/components/admin/setting/EventSettingConfiguration.tsx`:
  - Ditambahkan tipe tab `"frontend"` pada `SettingTab`.
  - Ditambahkan `TabButton` "Front-End" di grid tab.
  - Render `<FrontendSettings>` ketika tab `"frontend"` aktif.
  - Props baru: `frontendConfig`, `frontendTargets`.
- `apps/web/app/admin/(protected)/setting/page.tsx`:
  - Fetch `getEventNavigationConfig` dan `getFrontendRouteTargets` lalu pass sebagai props.

### Fase 4 — Public Layout & Resolver ✅

**File Dimodifikasi:**

- `apps/web/app/[eventSlug]/layout.tsx`:
  - Navbar sekarang membaca menu dari `getPublishedEventMenus(eventSlug)` alih-alih hardcoded dari `event_pages`.
  - Fungsi helper `resolveMenuUrl(menu, eventSlug)` di-resolve berdasarkan `sourceType` (`system`, `page`, `external`) dan `pageType` (`legal_tnc`, `legal_privacy`, `default`).
  - Mendukung `target="_blank"` untuk `openInNewTab`.
- `apps/web/app/[eventSlug]/page.tsx`:
  - Sekarang menggunakan `getPublishedEventHomepage` sebagai sumber data homepage.
  - Dual renderer: jika `pageType === "landing"` → `<LandingRenderer>`, jika `pageType === "default"` → Tiptap `generateHTML` + `prose` renderer.
  - Fallback placeholder jika tidak ada homepage dan tidak ada landing page published.
