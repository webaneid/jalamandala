# Arsitektur Laman Peserta (`/{eventSlug}/tenant`)

## Ringkasan

Halaman direktori publik semua peserta dan sponsor expo. Dapat diakses dari:
- Klik logo mana saja di `LogoSliderBlock` (setiap logo jadi link)
- Tombol kecil "Semua Tenant" di kanan bawah frame `LogoSliderBlock`

Tidak memerlukan login. Menggunakan layout `[eventSlug]/layout.tsx` yang sudah ada.

---

## 1. Route & Layout

```
/{eventSlug}/tenant   →   apps/web/app/[eventSlug]/tenant/page.tsx
```

Layout otomatis dari `[eventSlug]/layout.tsx`:
- Background gradient gelap + ambient glow
- `PublicEventHeader` (sticky, countdown, avatar login)
- `PublicBottomNav` (bottom pill nav)
- Footer copyright + S&K / Privasi
- Max-width `max-w-[720px]` via `PublicContainer`

---

## 2. Struktur Halaman

```
/{eventSlug}/tenant
│
├── Header: "Direktori Tenant" (eyebrow chip + judul)
│
├── Section A — "Didukung Oleh"         (conditional: tampil hanya jika ada custom logos)
│   └── Grid logo sponsor/partner
│       - Logo saja, tidak ada popup
│       - Klik logo buka URL eksternal jika ada, atau no-op
│
└── Section B — "Peserta Tenant"
    └── Grid kartu peserta (4 col desktop / 3 col mobile)
        - Tiap card: logo + nama brand
        - Klik card → popup detail bisnis (client component)
```

---

## 3. Grid Layout

| Breakpoint | Kolom | Catatan |
|---|---|---|
| Mobile (default) | 3 kolom | `grid-cols-3` |
| Desktop (`sm:`) | 4 kolom | `sm:grid-cols-4` |

Card: kotak kecil, logo centered, nama brand di bawah (text-xs, truncate). Tidak perlu info lengkap di card — semua detail di popup.

---

## 4. Popup Detail Bisnis

Client component `TenantDirectoryClient.tsx` — mengelola state `selectedBusiness`.

Trigger: klik card peserta → set `selectedBusiness` → render overlay popup.
Tutup: klik backdrop atau tombol X.

**Layout popup:**
```
┌─────────────────────────────┐
│  [Logo]  Nama Perusahaan    │  ← header popup
│          Brand (jika beda)  │
├─────────────────────────────│
│  Deskripsi perusahaan...    │
│                             │
│  📍 Alamat lengkap          │
│                             │
│  [tag produk] [tag produk]  │  ← productTags sebagai chip
│                             │
│  [WA ikon] 08xx-xxx         │  ← link wa.me
│  [Tel ikon] 08xx-xxx        │  ← link tel:
└─────────────────────────────┘
```

Field yang ditampilkan di popup:

| Field | Sumber DB | Kondisi tampil |
|---|---|---|
| Logo | `mediaAssets.publicUrl` | Selalu (placeholder jika null) |
| Nama perusahaan | `companyName` | Selalu |
| Brand | `brandName` | Hanya jika berbeda dari `companyName` |
| Deskripsi | `companyDescription` | Jika tidak null/kosong |
| Alamat | `companyAddress` + kota + provinsi | Jika tidak null/kosong |
| Produk | `productTags[]` sebagai chip | Jika array tidak kosong |
| WhatsApp | `companyWhatsapp` | Jika tidak null |
| Telepon | `companyPhone` | Jika tidak null, dan beda dari WA |

**Format kontak:**
- WA: strip semua non-digit, replace leading `0` dengan `62` → `https://wa.me/62xxx`
- Tel: `tel:{companyPhone}`

---

## 5. Data Fetching

### `getCustomLogosFromBlock(eventSlug: string)`
Lokasi: `apps/web/actions/public-pages.ts`

```
1. Query expoEvents WHERE slug = eventSlug → dapat event.id
2. Query eventPages WHERE eventId AND pageType IN ('landing','homepage') AND status='published'
   WITH content (JSONB)
3. Parse content.blocks → cari block dengan type = 'logo_slider'
4. Return payload.customLogos[] atau [] jika tidak ada
```

Return type:
```ts
Array<{ id: string; url: string; label: string }>
```

`url` sudah full MinIO URL (disimpan saat upload via MediaPicker `visibility="public"`). Gunakan langsung sebagai `src`.

---

### `getPaidTenantDirectory()`
Lokasi: `apps/web/actions/public-pages.ts`

```
1. Query invoices (tenant schema) WHERE status = 'paid' AND businessId IS NOT NULL
   → selectDistinct businessId
2. Query participantBusinesses (public schema)
   WHERE id IN (businessIds)
   LEFT JOIN mediaAssets ON mediaAssets.id = participantBusinesses.logoAssetId
3. Return array bisnis dengan field lengkap
```

Return type per item:
```ts
{
  id: string
  companyName: string
  brandName: string
  companyDescription: string | null
  companyAddress: string | null
  companyRegencyName: string | null
  companyProvinceName: string | null
  companyPhone: string | null
  companyWhatsapp: string | null
  productTags: string[] | null
  logoUrl: string | null       // asset.publicUrl ?? null
  logoAssetId: string | null   // fallback untuk /api/media/{id}
}
```

**Logo URL resolution:**
```ts
logoUrl = asset?.publicUrl ?? null
// Di komponen: src = logoUrl ?? `/api/media/${logoAssetId}` ?? placeholder
```

Tidak pakai `/api/media/{id}` secara default untuk halaman publik karena butuh auth. Logo peserta di-upload dengan `visibility="public"` sehingga `publicUrl` selalu ada.

---

## 6. Perubahan `LogoSliderBlock`

File: `apps/web/components/public/blocks/blocks.tsx`

**Sebelum:** `LogoSliderBlock({ payload })` — tidak menerima `event`
**Sesudah:** `LogoSliderBlock({ payload, event })` — butuh `eventSlug` untuk generate URL

Perubahan:
1. Tambah prop `event` ke signature fungsi
2. Setiap logo di `LogoMarquee` dibungkus link ke `/{eventSlug}/tenant`
3. Tambah tombol "Semua Tenant" di kanan bawah frame (text-xs, outlined pill)

`LogoMarquee` saat ini render `<img>` biasa. Perlu dievaluasi: apakah wrap di Link atau ganti `LogoMarquee` jadi terima prop `href`. Pilihan paling bersih: tambah prop `linkHref` ke `LogoMarquee` sehingga tiap logo jadi anchor.

---

## 7. File yang Dibuat / Diubah

| File | Status | Keterangan |
|---|---|---|
| `apps/web/app/[eventSlug]/tenant/page.tsx` | **BARU** | Server component, fetch + render |
| `apps/web/components/public/TenantDirectoryClient.tsx` | **BARU** | Client component: grid + popup state |
| `apps/web/actions/public-pages.ts` | **UBAH** | Tambah 2 fungsi data fetching |
| `apps/web/components/public/blocks/blocks.tsx` | **UBAH** | LogoSliderBlock: prop event + link + tombol |
| `apps/web/components/public/LogoMarquee.tsx` | **UBAH** | Tambah prop `linkHref` opsional |

---

## 8. Edge Cases & Aturan

| Kasus | Penanganan |
|---|---|
| Peserta paid tidak punya logo | Tampilkan placeholder (kotak abu dengan initial huruf pertama `brandName`) |
| `productTags` null atau `[]` | Tidak render section produk di popup |
| `companyPhone` sama dengan `companyWhatsapp` | Tampilkan hanya WA, tidak duplikat |
| Tidak ada peserta paid | Section B tetap ada dengan pesan "Belum ada peserta terdaftar" |
| Tidak ada custom logos | Section A tidak dirender sama sekali |
| Popup di mobile | Full-screen overlay `fixed inset-0`, scroll jika konten panjang |

---

## 9. Design Tokens (Konsisten dengan Landing Page)

Mengikuti design system public frontend yang sudah ada di `[eventSlug]/layout.tsx`:

```
Background     : linear-gradient(135deg, #050e1f ... #040c1a)
Max-width      : max-w-[720px] via PublicContainer
Cards          : bg-white/5 border-white/8 rounded-2xl
Popup bg       : bg-[#0a1530] border border-white/10 rounded-2xl
Chip/eyebrow   : bg-[#00adee]/15 text-[#00adee] text-[11px] uppercase tracking-[0.18em]
Icon accent    : text-[#00adee]
Link accent    : text-[#00adee] hover:underline
Text muted     : text-white/50
Tag/chip produk: bg-white/8 text-white/70 text-xs rounded-full px-2.5 py-1
```
