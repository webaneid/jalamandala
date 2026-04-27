# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jalamandala is a multi-tenant SaaS platform for registering expo booth tenants, built for the FORBIS National Economic Summit 2026. It is owned by Webane Indonesia.

## Commands

All commands use **Bun** (1.3.11) as the package manager. Run from the repo root unless noted.

```bash
# Development
bun run dev                  # Start all apps (turbo)
bun run build                # Build all packages/apps
bun run lint                 # Lint all packages
bun run check-types          # TypeScript check all packages
bun run format               # Prettier format all files

# Web app (apps/web, port 6250)
cd apps/web && bun run dev
cd apps/web && bun run check-types   # runs next typegen first, then tsc

# Database (packages/db)
cd packages/db
bun run db:generate          # Generate Drizzle migration files
bun run db:migrate           # Run migrations
bun run db:push              # Push schema directly (dev only)
bun run db:provision:public  # Initialize public schema tables
bun run db:provision:tenant  # Initialize tenant schema tables
bun run db:seed:regions      # Seed Indonesia regions
bun run db:seed:booths       # Seed booth categories/groups
bun run db:seed:wa-templates # Seed default WhatsApp message templates (run once per event)
bun run db:studio            # Open Drizzle Studio GUI
```

## Infrastructure

Local services are managed via Docker:

```bash
docker compose up -d         # Start postgres, pgbouncer, redis, gotenberg, minio
```

- **PostgreSQL 16** on port 5432 (direct) / **PgBouncer** on port 6432 (use this for app connections)
- **Redis** on 6379
- **MinIO** object storage on 9000 (S3-compatible), console on 9001
- **Gotenberg** PDF service on 3001

The app connects via `DATABASE_URL` pointing to PgBouncer (port 6432), not Postgres directly.

## Architecture

### Monorepo Structure

```
apps/web/       # Next.js 15 App Router — the main application
apps/docs/      # Documentation site
packages/db/    # Drizzle ORM client + schemas + migrations
packages/ui/    # Shared shadcn/ui-based component library
packages/eslint-config/
packages/typescript-config/
```

### Subdomain Routing

A single Next.js instance serves multiple subdomains via `apps/web/middleware.ts`:

- `app.*` → rewrites to `/admin` (admin dashboard)
- `expo.*` + path `/vendor/...` → rewrites to `/expo/vendor/...` (vendor portal)
- `expo.*` + path lainnya → dilayani langsung oleh Next.js routes (public event pages `[eventSlug]`)
- `api.*` → rewrites to `/api`

**Vendor portal URL**: `expo.forbis.id/vendor/login`, `expo.forbis.id/vendor/dashboard`, dst. Semua internal href di vendor components menggunakan `/vendor/...` (bukan `/expo/vendor/...`) agar tidak ada double redirect.

### Multi-Tenant Database Pattern

The DB uses **schema-per-tenant** isolation in PostgreSQL:

- `public` schema — shared data: users, events, participants, businesses, regions, FORBIS members
- Per-tenant schema (e.g., `expo_forbis2026`) — registrations, booths, payments, finance

The `TENANT_SCHEMA` env var selects the active tenant. The DB package exposes:
- `db` — public schema client (singleton)
- `createTenantDb(schemaName)` — returns a cached tenant DB client

### Data Model Key Points

- **Participant → Businesses**: 1-to-many. A participant (person) can have multiple business profiles.
- **Registrations** live in the tenant schema and link back to participants/businesses in the public schema.
- **Booths**: Categories → Groups → Booths → Bookings (tenant schema)

### Server Actions

Business logic lives in `apps/web/actions/`. These are Next.js server actions (`"use server"`), not API routes. Use them for mutations. API routes (`apps/web/app/api/`) are for read-only data fetching from client components.

### File Storage

MinIO integration is in `apps/web/lib/minio-storage.ts`. Files are uploaded with AWS4 presigned URLs. Path format: `participant-logos/{uuid}.{ext}`. Max 5MB per upload.

**Penting:** Di production MinIO berada di belakang reverse proxy (`storage.forbis.id`). Selalu set `MINIO_PUBLIC_URL=https://storage.forbis.id` di env production. Fungsi `generatePresignedGetUrl` menggunakan `publicBaseUrl` (dari `MINIO_PUBLIC_URL`) — jangan kembalikan ke `baseUrl` (localhost) karena presigned URL akan gagal di sisi client.

**Media API auth bypass:** `/api/media/[assetId]` mendukung query `?publicToken=<invoicePublicToken>` untuk asset private milik participant — dipakai di halaman invoice publik agar gambar bukti transfer bisa ditampilkan tanpa login admin.

### PDF Generation

Gotenberg microservice handles PDF rendering (not Next.js). Point `GOTENBERG_URL` to the running instance.

## Key Environment Variables

```
DATABASE_URL              # postgresql://jalamandala:secret@localhost:6432/jalamandala
TENANT_SCHEMA             # e.g. expo_forbis2026
MINIO_ENDPOINT            # localhost (internal, untuk upload server-side)
MINIO_PORT                # 9000
MINIO_ACCESS_KEY          # admin
MINIO_SECRET_KEY          # password123
MINIO_BUCKET              # participant-assets
MINIO_PUBLIC_URL          # https://storage.forbis.id (WAJIB di production, untuk presigned URL ke client)
REDIS_URL                 # redis://localhost:6379
GOTENBERG_URL             # http://localhost:3001
NEXT_PUBLIC_APP_URL       # https://app.forbis.id (dipakai di WA link admin/pencairan)
NEXT_PUBLIC_EXPO_URL      # https://expo.forbis.id (dipakai di WA link invoice ke peserta)
GOWA_ENABLED              # true/false — set false untuk disable WA di dev/staging
GOWA_URL                  # URL GoWA instance (fallback jika DB config kosong)
GOWA_USERNAME             # GoWA username
GOWA_PASSWORD             # GoWA password
GOWA_DEVICE_ID            # GoWA device ID
```

## Deployment (Production)

Server berjalan di `/var/www/jalamandala`, dikelola dengan PM2.

```bash
cd /var/www/jalamandala && git pull && bun install && bun run build && pm2 reload jalamandala
```

- Gunakan `pm2 reload` (bukan `restart`) untuk zero-downtime.
- `bun install` wajib dijalankan setelah pull jika ada perubahan `bun.lock`.

## SEO & Metadata

Semua halaman menggunakan Next.js `generateMetadata` / `export const metadata`:

- **Root layout** — title template `%s — Jalamandala`, `metadataBase` dari `NEXT_PUBLIC_APP_URL`
- **`[eventSlug]/layout.tsx`** — `generateMetadata` fetch nama event → template `%s — {eventName}`
- **`[eventSlug]/page.tsx`** — dynamic dari DB: `seoTitle`, `seoDescription`, `featuredImageAssetId` (OG image via `/api/media/{id}`)
- **`[eventSlug]/halaman/[slug]/page.tsx`** — same, per-page SEO dari DB
- **Admin layout** — template `%s — Admin Jalamandala`
- **Vendor layout** — template `%s — Vendor Portal`
- Semua halaman lain: hardcoded `export const metadata = { title: '...' }`

## WhatsApp Notification Flow

WA dikirim via GoWA. Config diambil dari DB (`whatsappConfigs` tabel, via `/admin/setting`) dengan fallback env vars `GOWA_*`.

**Template diambil dari DB** (`messageTemplates` tabel). Seed default: `bun run db:seed:wa-templates` (jalankan sekali per event).

| Event | Key | Trigger |
|-------|-----|---------|
| Invoice terbit | `invoice_terbit` | `createManualInvoice()` — baik dari admin maupun peserta booking sendiri |
| Invoice lunas | `invoice_lunas` | `verifyPaymentConfirmation()` — admin verifikasi bayar |
| Vendor akun dibuat | `vendor_akun_dibuat` | Admin buat akun vendor |
| Pencairan disetujui/ditolak/ditransfer | `pencairan_*` | Admin proses pencairan |

**Link invoice di WA** menggunakan `NEXT_PUBLIC_EXPO_URL` env var. Wajib di-set di production agar link tidak pakai fallback.

## Invoice & Payment Flow

Status invoice: `waiting_for_payment` → `waiting_confirmation` (user submit bukti) → `paid` (admin verifikasi) / `expired` / `cancelled`

Status payment: `pending_verification` → `paid` (verified) / `rejected`

Aturan penting:
- Satu invoice hanya boleh punya **satu** `pending_verification` payment sekaligus — blokir submit baru jika sudah ada.
- Saat user submit bukti transfer, status invoice otomatis berubah ke `waiting_confirmation`.
- Admin verifikasi melalui `verifyPaymentConfirmation()` di `actions/finance.ts`.
- `getInvoiceByToken` di `actions/finance.ts` adalah fungsi utama untuk halaman invoice publik — returns invoice, participant, business, items (enriched), payments (dengan `proofAssetId`), event, paymentChannels, qrisConfig.

**Hapus invoice (admin):** `deleteInvoiceCompletely(invoiceId)` di `actions/finance.ts` — hapus invoice + order + booth bookings (reset booths ke `open`) + participant + businesses + terms approvals. Tombol ada di halaman detail invoice (`/admin/keuangan/{id}`), requires konfirmasi ketik "HAPUS".

## Alur Pendaftaran Peserta (End-to-End)

### Ringkasan Alur

```
Login/OTP → Booking Booth (5 step) → Syarat & Ketentuan → Invoice → Bayar → Konfirmasi → E-Pass
```

### 1. Autentikasi Peserta

- Login via WhatsApp OTP di `/{eventSlug}/login`
- Session disimpan di cookie, dikelola oleh `apps/web/lib/participant-session.ts`
- Setelah login, redirect ke `/{eventSlug}/dashboard`

### 2. Booking Booth — 5 Step Flow

Entry point: `/{eventSlug}/booking` (page: `apps/web/app/[eventSlug]/booking/page.tsx`)

State machine berbasis URL params — tidak ada client state, browser back berfungsi alami:

| Step | URL Params | Komponen |
|------|-----------|----------|
| 1 — Pilih Usaha | *(kosong)* | inline di page |
| 2 — Pilih Zona | `?businessId=` | inline di page |
| 3 — Pilih Booth | `?businessId=&zone=` | `PublicBookingClient` + `PublicBoothMap` |
| 4 — Add-on | `?businessId=&zone=&boothIds=` | `PublicAddonStep` |
| 5 — Syarat & Ketentuan | `?businessId=&zone=&boothIds=&termsStep=1` | `PublicTermsStep` |

**Multi-booth**: Step 3 menggunakan multi-select (`Set<string>`). URL param `boothIds` = comma-separated IDs (bukan `boothId` tunggal). Satu invoice mencakup semua booth yang dipilih.

**Zona filtering di Step 2**: Daftar zona (step 2) hanya menampilkan zona yang punya **minimal 1 booth open yang eligible** untuk peserta tersebut. Fungsi: `getEligibleZonesForBooking(participant, business)` di `lib/public-booth-data.ts`. Logika eligibility per booth ada di `lib/booth-eligibility.ts`:
- `BOOTH_GROUP_ACCESS` memetakan `organizationGroupSlug` peserta → `boothGroup.slug` yang boleh dipesan (contoh: `formaqin` → hanya booth group `formaqin`; `forbis` → `general` + `forbis`)
- `isBoothCategoryAllowed` memeriksa kesesuaian kategori produk usaha dengan `boothCategory.slug` booth (contoh: `fnb_kitchen` hanya bisa pesan booth `fnb_kitchen`; `fnb_dry_food` bisa ke `fnb_dry_food` atau `fnb_kitchen`)
- Zona yang tidak punya satu pun booth eligible untuk peserta tersebut **tidak ditampilkan sama sekali** di step 2.

**Add-on param**: `addons=addonId1:qty,addonId2:qty` — di-carry dari step 4 ke step 5 via URL.

**Syarat & Ketentuan wajib per order** — tombol "Lewati Add-on" dan "Tambah Add-on" di `PublicAddonStep` selalu redirect ke step S&K, tidak pernah langsung buat invoice. Pengecekan `hasActiveTermsApproval` sudah dihapus — tidak ada bypass meskipun peserta sudah pernah setuju sebelumnya.

### 3. Pembuatan Invoice

Di `PublicTermsStep` (`apps/web/components/public/PublicTermsStep.tsx`):
1. `createTermsApproval()` → simpan persetujuan S&K ke `participantTermsApprovals` (public schema) dengan HMAC token + QR
2. Tampilkan QR sebentar (~1.2 detik)
3. `createPublicBoothBooking({ boothIds: string[], ... })` → memanggil `createManualInvoice()` di `apps/web/actions/finance.ts`
4. Redirect ke `/invoice/{publicToken}`

`createManualInvoice` (tenant schema):
- Buat `boothBookings` (status `booked`) untuk setiap boothId, update `booths.status = reserved`
- Buat `orders` + `orderItems`
- Buat `invoices` + `invoiceItems` (itemType `booth_booking` dan `addon`)
- Kirim notifikasi WhatsApp ke peserta

### 4. Pembayaran

Halaman invoice: `/invoice/{publicToken}` (`apps/web/app/invoice/[token]/page.tsx`)

- Peserta upload bukti transfer → `submitPaymentProof()` di `actions/finance.ts`
- Status invoice: `waiting_for_payment` → `waiting_confirmation`
- Satu invoice hanya boleh punya **satu** payment `pending_verification` — blokir submit baru jika sudah ada
- Bukti transfer disimpan di MinIO, ditampilkan via `/api/media/{assetId}?publicToken={invoicePublicToken}` (bypass auth)

### 5. Verifikasi Admin & E-Pass

- Admin verifikasi di `/admin/keuangan` → `verifyPaymentConfirmation()` → status `paid`
- Peserta dapat E-Pass di `/{eventSlug}/usaha/{businessId}/epass` (QR code + info booth)
- E-Pass hanya muncul jika `bookingStatus === "booked"`

### Layout Booth (Hardcoded per Zone Slug)

Layout visual booth di admin (`ClickableBoothMap.tsx`) dan frontend (`PublicBoothMap.tsx`) adalah **hardcoded per `zone.slug`** — bukan dinamis dari DB. Data booth (kode, status, harga) dari DB, tapi susunan grid/gangway dikode manual.

| Zone slug | Layout | Konfigurasi saat ini |
|-----------|--------|----------------------|
| `vip` | 2 kolom + gangway tengah, 2 baris | VIP1–VIP12 = **12 booth** (3+3 per baris × 2 baris) |
| `premium` | 4 kolom vertikal + Stage di tengah atas | P1–P32 = **32 booth** — kiri-luar (P25-32) \| kiri-dalam (P1-8) \| [Stage] \| kanan-dalam (P9-16) \| kanan-luar (P17-24). Dalam kolom: nomor besar di atas, kecil di bawah. |
| `festival-west` | Kolom kiri (4 blok: 5+5+6+6) + kolom kanan atas (5) | FW1–FW27 = **27 booth** (FW1-5 kanan atas, FW6-27 kiri turun) |
| `festival-north` | Baris horizontal scrollable, dinamis (blok 5) | FN1–FN27 = **27 booth** — tidak perlu ubah kode saat jumlah berubah |

Total keseluruhan: **98 booth** (12+32+27+27). Seed: `bun run db:seed:booths` di `packages/db`.

**Zona VVIP dihapus.** Tidak ada lagi zona `vvip` di seed, layout, maupun price rules.

Kalau jumlah booth berubah, update `slice()` dan `grid-cols-N` di **dua tempat sekaligus**:
1. `apps/web/components/admin/booth/ClickableBoothMap.tsx`
2. `apps/web/components/public/PublicBoothMap.tsx`

Jangan lupa sesuaikan `min-w-[Npx]` di wrapper jika lebar total grid berubah signifikan.

**Warna booth di admin (`/admin/booth`)** — `resolveBoothFill()` di `ClickableBoothMap.tsx`, berdasarkan kombinasi booth group + booth category + status:

| Kondisi | Warna |
|---------|-------|
| Booked + Gontor | #22c55e (hijau) |
| Booked + FPAG | #fef08a (kuning) |
| Booked + Formaqin | #f97316 (orange) |
| Booked (lainnya) | #9ca3af (abu-abu) |
| Open + fnb_kitchen | #bfdbfe (biru muda) |
| Open + fnb_dry_food | #93c5fd (biru) |
| Open (default) | #ffffff (putih) |

Background layout booth menggunakan gradient `linear-gradient(180deg, #f0fdf4 0%, #eff6ff 35%, #fff7ed 70%, #fefce8 100%)` — hanya di `/admin/booth`, tidak di halaman lain.

**Halaman lain yang tidak perlu diubah saat jumlah booth berubah:**
- `/admin/keuangan/tambah-tagihan` → `ManualInvoiceBuilder` sepenuhnya dinamis dari DB (`booths.findMany`), tidak ada hardcoded layout atau slice.
- `/admin/booth` (booth management) → data dari DB, hanya layout visual yang hardcoded di `ClickableBoothMap`.

Perubahan jumlah booth cukup: (1) update data di DB via admin booth management, (2) update slice/grid di dua file layout di atas.

### Skema Database Terkait

**Public schema** (shared):
- `participants` — data peserta (nama, WA, organisasi)
- `participantBusinesses` — profil usaha (1 peserta → banyak usaha)
- `participantTermsApprovals` — rekaman persetujuan S&K per order (dengan HMAC token, QR payload, IP, user agent)
- `vendors` + `vendorAddonAssignments` — vendor add-on beserta WhatsApp-nya

**Tenant schema** (e.g. `expo_forbis2026`):
- `zones` → `booths` → `boothBookings` — lokasi dan status pemesanan booth
- `boothFacilities` + `boothFacilityCatalog` — fasilitas per booth
- `eventAddons` — daftar add-on yang tersedia
- `orders` → `invoices` → `invoiceItems` — transaksi keuangan
- `invoicePayments` — bukti pembayaran (proofAssetId → MinIO)

**Relasi lintas schema** (tidak ada FK di DB, di-join secara manual di kode):
- `boothBookings.businessId` → `public.participantBusinesses.id`
- `invoiceItems.referenceId` (itemType=addon) → `eventAddons.id`
- `vendorAddonAssignments.eventAddonId` → `eventAddons.id`
- `disbursementRequests.vendorId` → `public.vendors.id`

### Surat Pernyataan (PDF)

Route: `GET /api/surat-pernyataan/{approvalId}` (`apps/web/app/api/surat-pernyataan/[approvalId]/route.ts`)

- Generate HTML → kirim ke Gotenberg → kembalikan PDF inline
- Gunakan `approval.approvedAt` (with timezone, UTC) untuk display waktu, bukan `approvedAtWib` (stored as UTC-shifted, akan double-shift jika diformat dengan timezone)
- QR di PDF berisi `approval.approvalToken` (HMAC string, bukan JSON)

## Vendor Portal

URL: `expo.forbis.id/vendor/...` → middleware rewrite ke `/expo/vendor/...`

- Login: `expo.forbis.id/vendor/login`
- Shell: `VendorShell.tsx` — dark mobile-first UI, bottom pill nav (Dashboard, Data Booth atau Add-on, Pencairan)
- Vendor type `booth`: akses halaman `/vendor/booths` (daftar tenant per zona)
- Vendor type `addon`: akses halaman `/vendor/addons` (daftar pesanan add-on)
- Pencairan: vendor submit request pencairan dana, admin approve di `/admin/keuangan/pencairan`

## Dashboard Participant

Dashboard berada di `apps/web/app/[eventSlug]/dashboard/` dengan layout `fixed inset-0 z-[60]` (full-screen overlay di atas public header yang `z-50`). Bottom navigation 4 tab:

| Tab | Path | Isi |
|-----|------|-----|
| Beranda | `/dashboard` | Ringkasan + quick actions + Booking Booth |
| Booth | `/dashboard/booth` | List semua booth dipesan (per booking, bisa > 1) |
| Invoice | `/dashboard/invoice` | List invoice |
| Profil | `/dashboard/profil` | Info kontak, dokumen S&K, menu "Usaha Saya" |

**Tab Booth** → klik card → detail di `/dashboard/booth/{bookingId}`: zona, fasilitas, rincian add-on + nama & WA vendor.

**"Usaha Saya"** ada di tab Profil (bukan tab terpisah), mengarah ke `/dashboard/usaha` untuk manage profil bisnis.

## Public Frontend Design System

Seluruh public-facing pages (`[eventSlug]/*`, vendor portal) menggunakan dark mobile-first design:

- **Max width**: `max-w-[720px]` — mobile-first, capped di lebar tablet
- **Background**: `linear-gradient(135deg, #050e1f 0%, #0a1f48 30%, #071630 55%, #040c1a 100%)`
- **Brand colors**: Primary `#134397`, Accent `#00adee`
- **Cards**: `bg-white/5 border-white/8 rounded-2xl backdrop-blur-sm`
- **Header**: sticky, transparent → gradient on scroll (`rgba(4,16,31,0.93)` → transparent)
- **Bottom nav**: fixed pill nav `rgba(13,28,60,0.82)` dengan `backdrop-blur(20px)`
- **Dark inputs**: `border-white/12 bg-white/8 text-white placeholder:text-white/30`

Komponen utama di `apps/web/components/public/`:
- `PublicEventHeader` — countdown timer, shop icon, avatar dropdown (login/logout)
- `PublicBottomNav` — 4 tab: logo→home, calendar→agenda, store→tenant, dashboard
- `PublicBoothMap` — zone map dengan `isVertical` flag: vertikal = info di atas + map di bawah, horizontal = image kiri + map kanan

## Conventions

- **TypeScript strict mode** throughout. `strictNullChecks: true` in web app.
- **Zod** for all form and API input validation. Schemas live in `apps/web/lib/validations/`.
- **Tailwind v4** — uses `@import "tailwindcss"` (not a config file). Design tokens are CSS variables in `globals.css`. Primary: `#134397`, Secondary: `#00adee`.
- **shadcn/ui** components go in `packages/ui/src/`. Local app-specific components go in `apps/web/components/`.
- Path alias `@/*` maps to `apps/web/*`.
- Prefer server actions over API routes for mutations.
- The `antigravity.md` file at the root is the project's architectural decision record — consult it before making structural changes.
