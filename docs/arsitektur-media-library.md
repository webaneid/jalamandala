# Arsitektur Media Library
> Revisi v2 — berdasarkan kondisi codebase aktual. Dokumen ini adalah desain sistem; belum ada kode yang boleh dieksekusi sebelum disetujui.

---

## Status MinIO (Confirmed)

MinIO sudah berjalan native via Homebrew dari `/Users/webane/minio-data`.

| Item | Nilai |
|------|-------|
| Endpoint | `localhost:9000` |
| Console | `localhost:9001` |
| Root User | `minioadmin` |
| Root Password | `minioadmin123` |
| `.env` keys | `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` |

Credentials sudah cocok antara `.env` dan proses MinIO yang berjalan.

---

## 1. Tujuan

Media library adalah **infrastruktur penyimpanan file terpusat** untuk semua modul di Jalamandala:

- Logo usaha peserta
- Logo event
- Gambar QRIS
- Bukti pembayaran
- Dokumen pendukung

Target pengalaman:
- Mirip WordPress Media Library — grid thumbnail, list view, detail panel
- File yang pernah diupload bisa dipilih ulang (tidak upload ulang)
- Admin melihat semua file event aktif; peserta hanya miliknya
- Setiap file punya metadata lengkap dan tercatat pemakaiannya

---

## 2. Kondisi Saat Ini (Existing URLs yang Tersebar)

File URL saat ini disimpan langsung di kolom masing-masing tabel tanpa metadata tambahan:

| Tabel | Kolom | Contoh pemakai |
|-------|-------|----------------|
| `participant_businesses` | `logo_url` | Form profil usaha |
| `expo_events` | `logo_url` | Setting event |
| `expo_events` (via qris_configs) | `qris_image_url` | QRIS payment |
| `payment_channels` | `image_url` | Logo bank/channel |
| `invoice_payments` (tenant) | `proof_url` | Bukti transfer |

Masalah pola ini:
- Tidak ada metadata (ukuran, MIME type, siapa yang upload, kapan)
- Tidak tahu apakah file masih dipakai sebelum dihapus
- Tidak bisa dipakai ulang antar modul
- URL mungkin rusak (broken link) tanpa ada audit trail

---

## 3. Strategi Bucket MinIO

Gunakan **satu bucket** (`participant-assets`) dengan prefix path yang membedakan visibilitas. Akses dikontrol oleh policy MinIO + signed URL dari server, bukan bucket terpisah.

```
participant-assets/
├── public/                    # Policy: public-read
│   ├── event-logos/{uuid}.{ext}
│   ├── qris/{uuid}.{ext}
│   └── payment-channels/{uuid}.{ext}
│
└── private/                   # Policy: private (default)
    ├── participant-logos/{uuid}.{ext}
    ├── payment-proofs/{uuid}.{ext}
    └── documents/{uuid}.{ext}
```

**Bucket policy MinIO:**
- Prefix `public/` → policy `s3:GetObject` untuk semua (`*`)
- Prefix `private/` → hanya akses via server dengan signed request

**URL Serving:**
- File `public/` → URL langsung `http://localhost:9000/participant-assets/public/...`
- File `private/` → **Presigned GET URL** yang expire (default: 1 jam), di-generate oleh server action setiap kali halaman dimuat

> **Catatan penting**: Di production nanti, URL MinIO akan diganti dengan domain custom atau proxy Nginx. `publicUrl` di database bisa di-overwrite tanpa mengubah `objectKey`.

---

## 4. Model Data

### 4.1 Penempatan Tabel

Tabel `media_assets` masuk ke **public schema** (bukan tenant schema), karena:
- Asset bisa lintas tenant (logo admin, logo event global)
- Lebih mudah di-query dari admin tanpa JOIN lintas schema
- Tenant context disimpan sebagai kolom (`tenantSchema`, `eventId`)

### 4.2 Tabel `media_assets` (public schema)

```sql
CREATE TABLE media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Konteks kepemilikan
  tenant_schema   TEXT,                          -- NULL = global/admin asset
  event_id        UUID REFERENCES expo_events,
  owner_user_id   UUID REFERENCES "user",        -- admin/user yang upload
  owner_participant_id UUID REFERENCES participants,
  owner_business_id    UUID REFERENCES participant_businesses,

  -- Storage
  bucket          TEXT NOT NULL,                 -- 'participant-assets'
  object_key      TEXT NOT NULL UNIQUE,          -- 'public/event-logos/{uuid}.png'
  public_url      TEXT,                          -- cached URL (bisa null untuk private)

  -- Metadata file
  file_name       TEXT NOT NULL,                 -- nama aman untuk object key
  original_name   TEXT NOT NULL,                 -- nama asli dari user
  mime_type       TEXT NOT NULL,
  extension       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  width           INTEGER,                       -- untuk image
  height          INTEGER,                       -- untuk image
  checksum        TEXT,                          -- MD5/SHA256 untuk dedup opsional

  -- Konten semantik
  title           TEXT,
  alt_text        TEXT,
  description     TEXT,

  -- Klasifikasi
  asset_type      TEXT NOT NULL,                 -- 'image' | 'document' | 'pdf' | 'other'
  visibility      TEXT NOT NULL DEFAULT 'private', -- 'public' | 'private' | 'event_admin'
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'archived' | 'deleted'
  is_locked       BOOLEAN NOT NULL DEFAULT false, -- tidak boleh dihapus jika dipakai

  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMP                       -- soft delete
);
```

### 4.3 Tabel `media_usages` (public schema)

Mencatat di mana sebuah asset dipakai:

```sql
CREATE TABLE media_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES media_assets ON DELETE CASCADE,
  module      TEXT NOT NULL,       -- 'participant' | 'event' | 'finance' | 'qris'
  entity_type TEXT NOT NULL,       -- 'participant_business' | 'expo_event' | 'invoice_payment'
  entity_id   TEXT NOT NULL,       -- UUID dari entity
  field_name  TEXT NOT NULL,       -- 'logo' | 'proof' | 'qris_image'
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Contoh data:
```
module=participant, entity_type=participant_business, entity_id=<businessId>, field_name=logo
module=finance, entity_type=invoice_payment, entity_id=<paymentId>, field_name=proof
module=event, entity_type=expo_event, entity_id=<eventId>, field_name=logo
```

### 4.4 Kolom di Tabel Lain (Relasi ke media_assets)

Tabel-tabel yang sudah punya URL akan ditambahkan kolom `_asset_id`:

| Tabel | Kolom baru | Kolom lama (tetap ada, jadi snapshot) |
|-------|-----------|---------------------------------------|
| `participant_businesses` | `logo_asset_id UUID REFERENCES media_assets` | `logo_url TEXT` |
| `expo_events` | `logo_asset_id UUID REFERENCES media_assets` | `logo_url TEXT` |
| `qris_configs` | `qris_image_asset_id UUID REFERENCES media_assets` | `qris_image_url TEXT` |
| `invoice_payments` | `proof_asset_id UUID REFERENCES media_assets` | `proof_url TEXT` |

Kolom `_url` lama **tidak langsung dihapus**; dipakai sebagai fallback selama migrasi.

---

## 5. Upload Flow

### 5.1 Server-Side Upload (Sekarang — untuk file ≤ 5MB)

```
Client → pilih file → base64 dataUrl
      → Server Action → validasi → upload ke MinIO
      → simpan row media_assets → simpan media_usages
      → return { assetId, url }
```

Ini sudah berjalan di `minio-storage.ts` untuk `participant-logos` dan `payment-proofs`. Akan di-refactor agar semua upload lewat satu helper `createMediaAsset()`.

### 5.2 Presigned PUT Upload (Nanti — untuk file besar)

```
Client → minta presigned URL → Server Action generate presigned PUT URL
      → Client upload langsung ke MinIO (tanpa lewat Next.js)
      → Client konfirmasi ke server → server simpan metadata
```

Fase 1 cukup pakai server-side upload. Presigned PUT diterapkan di fase selanjutnya.

### 5.3 Serving File Private

Private files tidak punya URL publik langsung. Cara akses:

```
Client → request asset → API Route /api/media/[assetId]
       → server verifikasi session/token
       → generate presigned GET URL (expire 1 jam)
       → redirect 302 ke presigned URL
```

Ini berarti URL bukti pembayaran di admin/invoice halaman akan di-resolve via API route, bukan disimpan langsung.

---

## 6. Hak Akses

| Role | Bisa lihat | Bisa upload | Bisa hapus |
|------|-----------|-------------|------------|
| Super Admin | Semua asset | Ya | Jika tidak locked |
| Admin | Asset event aktif | Ya | Jika tidak locked |
| Peserta (login) | Asset miliknya sendiri | Ya (private) | Jika tidak locked |
| Publik (tanpa auth) | Asset `visibility=public` saja | Tidak | Tidak |

Aturan tambahan:
- Jika `is_locked = true` → tidak bisa dihapus oleh siapapun kecuali super admin
- Asset di-lock otomatis ketika ada `media_usages` aktif
- Soft delete dulu (set `deleted_at`, `status='deleted'`), hard delete dari MinIO hanya ketika `media_usages` kosong

---

## 7. UI Admin Media Library

### 7.1 Halaman `/admin/media`

Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Media Library                          [Upload File]     │
│ ─────────────────────────────────────────────────────── │
│ [Search...] [Tipe: Semua ▼] [Owner ▼] [Tanggal ▼] [⊞⊟] │
│ ─────────────────────────────────────────────────────── │
│ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                   │
│ │img│ │img│ │pdf│ │img│ │img│ │img│                   │
│ │   │ │   │ │   │ │   │ │   │ │   │                   │
│ │nam│ │nam│ │nam│ │nam│ │nam│ │nam│                   │
│ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                   │
│                                   [1] [2] [3] ... [next]│
└─────────────────────────────────────────────────────────┘
```

Klik item → **Detail Panel** muncul di kanan (seperti WordPress):
- Preview besar
- Nama file, MIME type, ukuran
- Owner, tanggal upload
- Alt text, deskripsi (editable)
- Daftar `media_usages` (dipakai di mana)
- Copy URL (jika public)
- Tombol Hapus (jika tidak locked)

### 7.2 Komponen Reusable: `MediaPicker`

```tsx
<MediaPicker
  mode="single"              // 'single' | 'multi'
  accept="image"             // 'image' | 'document' | 'any'
  maxSize={5 * 1024 * 1024}  // 5MB
  visibility="private"       // filter yang ditampilkan
  onSelect={(asset) => setLogoAsset(asset)}
/>
```

Implementasi: Dialog yang berisi `MediaGrid` + `UploadDropzone`. Saat file dipilih, callback `onSelect` dipanggil dengan `MediaAsset` object. Komponen ini menggantikan `<input type="file">` di semua form yang butuh upload.

---

## 8. Rencana Implementasi Bertahap

### Fase 1: Fondasi ✅ SELESAI

**File yang dibuat/diubah:**

| File | Keterangan |
|------|-----------|
| `packages/db/src/schema/public/media.ts` | Drizzle schema `mediaAssets` + `mediaUsages` + relations |
| `packages/db/src/schema/public/index.ts` | Export `media.ts` |
| `packages/db/src/schema/public/businesses.ts` | Tambah `logoAssetId uuid` |
| `packages/db/src/schema/public/events.ts` | Tambah `logoAssetId`, `qrisImageAssetId` di paymentChannels, `imageAssetId` di qrisConfigs |
| `packages/db/src/schema/tenant/finance.ts` | Tambah `proofAssetId uuid` di `invoicePayments` |
| `packages/db/src/provision-public.ts` | CREATE TABLE media_assets, media_usages + ALTER TABLE _asset_id columns |
| `packages/db/src/provision-tenant.ts` | ALTER TABLE invoice_payments: sender_name, proof_url, proof_asset_id |
| `apps/web/lib/minio-storage.ts` | Refactor: tambah `createMediaAsset()`, `attachMediaUsage()`, `initMediaBucketPolicy()`. Legacy wrappers `uploadParticipantBusinessLogo` dan `uploadPaymentProof` tetap ada dan kini memanggil `createMediaAsset()` |

**DB yang sudah dijalankan:**
- `bun run db:provision:public` → tabel `media_assets` + `media_usages` + kolom `_asset_id` di public schema
- `bun run db:provision:tenant` → kolom `proof_asset_id`, `sender_name`, `proof_url` di `invoice_payments`
- MinIO bucket policy `public/` prefix → `download` (public-read) via `mc`

**Bucket MinIO setelah Fase 1:**
```
participant-assets/
├── public/          ← policy: public-read (mc anonymous set download)
│   ├── event-logos/
│   ├── qris/
│   └── payment-channels/
└── private/         ← policy: default (akses hanya via signed request)
    ├── participant-logos/
    ├── payment-proofs/
    └── documents/
```

---

### Fase 2: Admin Media Library Page ✅ SELESAI

**File yang dibuat:**

| File | Keterangan |
|------|-----------|
| `apps/web/actions/media.ts` | Server actions: `listMediaAssets`, `uploadMediaAssetAction`, `updateMediaAssetMetadataAction`, `deleteMediaAssetAction` |
| `apps/web/app/admin/(protected)/media/page.tsx` | Server Component — fetch initial assets, render `MediaLibraryClient` |
| `apps/web/components/admin/media/MediaLibraryClient.tsx` | "use client" — grid/list toggle, search, filter tipe, state selected asset |
| `apps/web/components/admin/media/MediaDetailPanel.tsx` | "use client" — slideout panel kanan: preview, metadata editable, delete |
| `apps/web/components/admin/media/MediaUploadZone.tsx` | "use client" — drag-and-drop upload, multi-file, max 5MB |

**Sidebar admin diupdate:**
- `admin-shell.tsx` → tambah nav item "Media Library" (`/admin/media`, icon `Images`) + `resolveSectionTitle` case

**Fitur halaman `/admin/media`:**
- Grid view 6 kolom (thumbnail + nama + badge visibilitas)
- List/table view (preview, nama, tipe, ukuran, visibilitas, pemakaian, tanggal)
- Search real-time debounce 350ms
- Filter tipe: semua / gambar / PDF / dokumen / lainnya
- Upload drag-and-drop multi-file (base64 → server action → MinIO + DB)
- Detail panel slideout kanan: preview, meta (MIME, ukuran, dimensi, tanggal, pemakaian), edit title/alt/deskripsi, soft delete (diblokir jika `is_locked` atau ada `media_usages`)

---

### Fase 3: MediaPicker Component ✅ SELESAI

**File yang dibuat/diubah:**

| File | Keterangan |
|------|-----------|
| `apps/web/components/admin/media/MediaPicker.tsx` | Komponen picker dialog dengan 2 tab: "Dari Library" (grid + search) dan "Upload Baru" (dropzone). Type `MediaPickerValue = { id, url, objectKey, fileName, mimeType } \| null` |
| `apps/web/actions/participants.ts` | `createBusiness` + `updateBusiness` terima `logoAssetId?` + `logoAssetUrl?`; skip upload jika assetId tersedia |
| `apps/web/actions/event-settings.ts` | `updateEventProfile` terima `logoAssetId?`; `upsertQrisConfig` terima `imageAssetId?` |
| `apps/web/actions/finance.ts` | `markInvoiceAsPaid` + `submitPublicPaymentConfirmation` terima `proofAssetId?` + `proofAssetUrl?`; skip upload jika assetId tersedia |
| `apps/web/components/forms/BusinessForm.tsx` | Logo field diganti MediaPicker (`folder: private/participant-logos`) |
| `apps/web/components/admin/setting/EventSettingConfiguration.tsx` | Logo event + QRIS image diganti MediaPicker (`folder: public/event-logos` dan `public/qris`) |
| `apps/web/components/admin/finance/InvoiceDetailActions.tsx` | Proof file input diganti MediaPicker (`folder: private/payment-proofs`) |
| `apps/web/components/invoice/PaymentConfirmationDialog.tsx` | Proof file input diganti MediaPicker |

**Fitur MediaPicker:**
- Tab "Dari Library": grid thumbnail, search real-time, single select, double-click untuk langsung pilih
- Tab "Upload Baru": klik untuk upload, validasi 5MB, upload via `uploadMediaAssetAction` → langsung tersimpan di `media_assets`
- Trigger button: preview thumbnail jika gambar, file icon jika bukan; tombol × untuk clear
- `accept="image"` membatasi grid dan upload ke tipe gambar saja
- `folder` dan `visibility` mengontrol path MinIO dan metadata saat upload baru

### Fase 4: Private File Serving ✅ SELESAI

**File yang dibuat/diubah:**

| File | Keterangan |
|------|-----------|
| `apps/web/lib/minio-storage.ts` | Tambah `generatePresignedGetUrl(objectKey, expiresIn=3600)` — presigned AWS4 GET URL tanpa auth header |
| `apps/web/app/api/media/[assetId]/route.ts` | GET route: cek session better-auth → DB lookup → redirect 302 ke presigned URL (private) atau `publicUrl` (public) |
| `apps/web/components/admin/media/PrivateImage.tsx` | `PrivateImage` — `<img src="/api/media/[assetId]">` dengan loading/error state. `PrivateImageLink` — wrapper dengan link buka full size |
| `apps/web/app/admin/(protected)/keuangan/[invoiceId]/page.tsx` | Tambah `proofAssetId` ke payments data yang dikirim ke `InvoiceDetailActions` |
| `apps/web/components/admin/finance/InvoiceDetailActions.tsx` | `PendingPayment` type tambah `proofAssetId`; `VerifyCard` ganti `<img src={proofUrl}>` dengan `PrivateImageLink` jika `proofAssetId` tersedia |

**Cara kerja presigned GET URL:**
1. Browser request `/api/media/{assetId}` (dengan cookie sesi)
2. Server cek session — jika tidak ada, return 401
3. DB lookup `media_assets` by id
4. Jika `visibility=public` dan `publicUrl` ada → redirect ke `publicUrl`
5. Jika private → `generatePresignedGetUrl(objectKey, 3600)` → redirect 302 ke MinIO URL dengan signature query params
6. Browser follow redirect, fetch file dari MinIO langsung dengan signed URL (expire 1 jam)

### Fase 5: Cleanup dan Audit

1. Hapus kolom `_url` lama setelah semua tabel sudah pakai `_asset_id`
2. Dashboard storage usage di admin
3. Cleanup orphan assets (tidak punya `media_usages`)
4. Implementasi presigned PUT upload untuk file besar

---

## 9. Object Key Convention

```
public/event-logos/{uuid}.{ext}
public/qris/{uuid}.{ext}
public/payment-channels/{uuid}.{ext}

private/participant-logos/{uuid}.{ext}
private/payment-proofs/{uuid}.{ext}
private/documents/{uuid}.{ext}
```

UUID di sini adalah `media_assets.id` — stabil dan tidak bergantung nama file asli.

---

## 10. Keputusan Arsitektur Final

| Keputusan | Pilihan |
|-----------|---------|
| Lokasi tabel | Public schema (bukan tenant) |
| Jumlah bucket | Satu bucket, dua prefix (public/ dan private/) |
| Private file access | Presigned GET URL via `/api/media/[assetId]` |
| Upload method (fase 1-3) | Server-side (lewat server action, base64 dataUrl) |
| Backward compatibility | Kolom `_url` lama tetap ada selama migrasi |
| Soft vs hard delete | Soft delete dulu; hard delete setelah `media_usages` kosong |
| File lock | `is_locked` manual; proteksi hapus otomatis via `usageCount > 0` check |
| Drizzle schema location | `packages/db/src/schema/public/media.ts` |
