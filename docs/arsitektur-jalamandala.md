# Arsitektur Jalamandala
> Platform Registrasi Tenant Booth Expo — Dokumen Arsitektur v0.1

---

## Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Tech Stack](#tech-stack)
3. [Struktur Monorepo](#struktur-monorepo)
4. [Alur Aplikasi](#alur-aplikasi)
5. [Database Schema](#database-schema)
6. [Autentikasi & Otorisasi](#autentikasi--otorisasi)
7. [Storage (MinIO)](#storage-minio)
8. [PDF Generation (Playwright)](#pdf-generation-playwright)
9. [Pembayaran & Cicilan](#pembayaran--cicilan)
10. [Infrastruktur & Deployment](#infrastruktur--deployment)
11. [Konvensi & Keputusan Desain](#konvensi--keputusan-desain)

---

## Gambaran Umum

Jalamandala adalah platform multi-tenant untuk registrasi tenant booth expo. Setiap penyelenggara event dapat membuat event expo, mengonfigurasi zona dan booth, dan membuka pendaftaran bagi tenant. Tenant mendaftar, memilih booth, melakukan kustomisasi, membayar (lunas atau cicilan), dan menerima e-pass digital.

**Prinsip utama:**
- Satu instalasi, banyak event expo (multi-tenant via schema isolation)
- Full-stack TypeScript dengan Next.js App Router (Server Components + Server Actions)
- Self-hosted, tidak bergantung layanan cloud eksternal

---

## Tech Stack

| Kategori | Teknologi | Keterangan |
|---|---|---|
| Runtime | **Bun** | Package manager + runtime, pengganti Node.js/npm |
| Monorepo | **Turborepo** | Orchestration build pipeline, caching, dependency graph |
| Framework | **Next.js 15** App Router | Server Components, Server Actions, API Routes |
| Language | **TypeScript** (strict) | Seluruh codebase, strict mode aktif |
| Database | **PostgreSQL + PgBouncer** | Schema-per-tenant isolation dengan Connection Pooling |
| ORM | **Drizzle ORM** | Type-safe query builder, custom multi-schema migration |
| Auth | **Better Auth** | Session-based auth, Drizzle adapter |
| Storage | **MinIO** | Self-hosted object storage, satu bucket per event |
| Cache/Queue | **Redis + BullMQ** | Task scheduling (lock booth, timeout pembayaran) |
| UI Framework | **React 19** | via Next.js |
| Styling | **Tailwind CSS v4** | Utility-first CSS |
| Komponen | **shadcn/ui** | Button, Dialog, Command, Popover, dll |
| Editor | **Tiptap v3** | Block editor untuk konten booth dan kontrak |
| Icons | **lucide-react** | Icon set |
| PDF | **Gotenberg / Microservice** | Render HTML ke PDF terpisah agar Next.js tidak berat |
| Infra | **Docker + Nginx** | Deployment di VPS |

---

## Struktur Monorepo

```
jalamandala/
├── apps/
│   └── web/                          # Next.js 15 App Router
│       ├── app/
│       │   ├── (public)/             # Landing page, info event
│       │   │   └── [slug]/           # Halaman publik per event
│       │   ├── (auth)/               # Login, register, verifikasi email
│       │   │   ├── login/
│       │   │   ├── register/
│       │   │   └── verify/
│       │   ├── (tenant)/             # Dashboard tenant (protected)
│       │   │   ├── dashboard/
│       │   │   ├── registrasi/
│       │   │   │   ├── [eventSlug]/
│       │   │   │   │   ├── pilih-booth/
│       │   │   │   │   ├── kustomisasi/
│       │   │   │   │   ├── pembayaran/
│       │   │   │   │   └── epass/
│       │   │   ├── profil/
│       │   │   └── dokumen/
│       │   ├── (admin)/              # Panel admin event (protected)
│       │   │   ├── dashboard/
│       │   │   ├── booth/
│       │   │   ├── tenant/
│       │   │   ├── pembayaran/
│       │   │   └── laporan/
│       │   ├── (superadmin)/         # Panel superadmin (protected)
│       │   │   ├── events/
│       │   │   ├── organisasi/
│       │   │   └── provisioning/
│       │   ├── api/
│       │   │   ├── auth/[...all]/    # Better Auth handler
│       │   │   ├── webhook/          # Payment gateway webhook
│       │   │   └── storage/         # Presigned URL endpoint
│       │   ├── print/                # Halaman khusus untuk PDF (no layout)
│       │   │   ├── epass/[regId]/
│       │   │   ├── invoice/[paymentId]/
│       │   │   └── kontrak/[regId]/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/               # Komponen lokal (konsumsi dari packages/ui)
│       ├── lib/
│       │   ├── actions/              # Server Actions per domain
│       │   │   ├── booth.ts
│       │   │   ├── registration.ts
│       │   │   ├── payment.ts
│       │   │   └── epass.ts
│       │   ├── queries/              # Server-side data fetching functions
│       │   ├── utils.ts
│       │   └── constants.ts
│       ├── middleware.ts             # Route protection + tenant context
│       └── next.config.ts
│
├── packages/
│   ├── db/                          # Database layer
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── public/          # Schema shared (users, orgs, events)
│   │   │   │   └── tenant/          # Schema per-tenant (booths, registrations, dll)
│   │   │   ├── client.ts            # Drizzle client factory (support dynamic schema)
│   │   │   ├── migrate.ts           # Migration utilities
│   │   │   └── seed.ts
│   │   └── drizzle.config.ts
│   │
│   ├── auth/                        # Better Auth configuration
│   │   └── src/
│   │       ├── index.ts             # Auth instance + Drizzle adapter
│   │       ├── middleware.ts        # Auth middleware helper
│   │       └── types.ts             # Extended session types
│   │
│   ├── storage/                     # MinIO client wrapper
│   │   └── src/
│   │       ├── client.ts            # MinIO client singleton
│   │       ├── upload.ts            # Upload helpers
│   │       ├── presigned.ts         # Presigned URL generator
│   │       └── types.ts
│   │
│   ├── pdf/                         # PDF generator client (Gotenberg API Wrapper)
│   │   └── src/
│   │       ├── client.ts            # Gotenberg API client
│   │       ├── epass.ts             # Generate e-pass HTML -> PDF
│   │       ├── invoice.ts           # Generate invoice HTML -> PDF
│   │       └── kontrak.ts           # Generate kontrak HTML -> PDF
│   │
│   ├── ui/                          # Shared UI components (shadcn + custom)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── booth-map/       # Komponen peta booth interaktif
│   │       │   ├── epass-card/      # Tampilan e-pass
│   │       │   └── payment-form/    # Form pembayaran
│   │       └── index.ts
│   │
│   └── config/                      # Shared config
│       ├── tailwind.config.ts
│       ├── tsconfig.base.json
│       └── eslint.config.js
│
├── turbo.json
├── package.json                     # Bun workspaces
└── .env.example
```

### Turborepo Pipeline (`turbo.json`)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

---

## Alur Aplikasi

### Alur Registrasi Tenant (Happy Path)

```
[Tenant]
   │
   ▼
1. REGISTRASI AKUN & ISI FORMULIR (PROGRESIF 1:N)
   - Input Identitas Pribadi: Email, No. WhatsApp, dll.
   - Verifikasi status Anggota FORBIS (Jika ya: Auto-populate form).
   - Simpan Profil Utama (Tabel `participants`).
   - Input Profil Usaha: Mengisi data usaha (Bisa lebih dari 1 usaha untuk 1 peserta).
   - Status akun langsung aktif (tanpa verifikasi dokumen/admin).
   │
   ▼
2. PILIH AREA & BOOTH
   - Buka halaman denah expo
   - Peta booth interaktif per zona (Food / Tech / General / dll)
   - Status booth: available (hijau), occupied (abu), premium (bintang)
   - Memilih nomor booth → booth di-lock sementara (15 menit)
   │
   ▼
3. KUSTOMISASI BOOTH
   - Isi Fascia Board (nama yang tertera di papan booth)
   - Pilih Add-ons (Dinamis):
     [Daftar add-on beserta harga di-load dinamis dari database/pengaturan event]
   - Deskripsi Produk/Bisnis (Tiptap block editor)
   │
   ▼
4. REVIEW & PEMBAYARAN
   - Summary: harga booth + total harga add-ons + PPN 11% (Jika diaktifkan)
   - Pilih metode: Virtual Account / Transfer Bank / Kartu Kredit
   - Pilih skema (Dinamis):
     [Skema pembayaran penuh atau cicilan diatur dari database]
   - Konfirmasi → Payment gateway / instruksi transfer
   │
   ▼
5. E-PASS TERBIT
   - Setelah pembayaran dikonfirmasi (Lunas/Termin 1)
   - Generate QR code unik (token terenkripsi)
   - Generate PDF e-pass via Gotenberg → upload ke MinIO
   - Unduh e-pass & handbook teknis
```

### State Machine Registrasi

```
registered_form → booth_selected → customized → payment_pending →
  payment_partial (cicilan) → payment_complete → epass_issued
         │
         └── payment_overdue (jatuh tempo terlewat)
```

---

## Database Schema

### Strategi: Schema-per-Tenant

Setiap event expo mendapatkan PostgreSQL schema tersendiri (bukan row-level `tenant_id`).
Keuntungan: query bersih tanpa filter global, migrasi per-event independen, isolasi data lebih kuat.

```
PostgreSQL instance
├── Schema: public          ← shared: users, orgs, events
├── Schema: expo_gontor100  ← tenant: booths, registrations, payments
├── Schema: expo_forbis2025 ← tenant: booths, registrations, payments
└── Schema: expo_xyz        ← dst.
```

### Public Schema

```sql
-- Pengguna platform
users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  name        text NOT NULL,
  role        text NOT NULL DEFAULT 'tenant', -- 'tenant' | 'expo_admin' | 'superadmin'
  status      text NOT NULL DEFAULT 'pending_verification',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)

-- Organisasi penyelenggara event
organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  logo_url    text,
  settings    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
)

-- Event expo yang dibuat oleh organisasi
expo_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  schema_name  text UNIQUE NOT NULL, -- e.g. 'expo_gontor100'
  start_date   date,
  end_date     date,
  location     text,
  status       text DEFAULT 'draft', -- 'draft' | 'open' | 'closed' | 'archived'
  settings     jsonb DEFAULT '{}',   -- konfigurasi PPN, add-ons, dll
  created_at   timestamptz DEFAULT now()
)

-- Relasi user ↔ event (untuk role expo_admin)
event_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id  uuid NOT NULL REFERENCES expo_events(id),
  user_id   uuid NOT NULL REFERENCES users(id),
  role      text NOT NULL DEFAULT 'admin',
  UNIQUE(event_id, user_id)
)

-- Better Auth sessions (dikelola otomatis oleh Better Auth)
sessions (
  id         text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id),
  token      text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
)
```

### Tenant Schema (per event expo)

```sql
-- Zona area dalam floor plan expo
zones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,        -- 'Zone Food', 'Zone Tech', 'General'
  color        text,                 -- warna pada peta, hex code
  layout_json  jsonb,                -- posisi dan grid zone di floor plan
  sort_order   integer DEFAULT 0
)

-- Booth / stand expo
booths (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id      uuid NOT NULL REFERENCES zones(id),
  number       text NOT NULL,        -- 'A1', 'B12', dst.
  size         text DEFAULT 'standard', -- 'standard' | 'medium' | 'large'
  is_premium   boolean DEFAULT false,
  position_x   integer,              -- koordinat pada floor plan (grid)
  position_y   integer,
  base_price   integer NOT NULL,     -- dalam Rupiah
  status       text DEFAULT 'available', -- 'available' | 'locked' | 'occupied'
  locked_until timestamptz,          -- TTL 15 menit saat dipilih tenant
  UNIQUE(zone_id, number)
)

-- Pendaftaran tenant untuk 1 booth
registrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,         -- referensi ke public.users
  booth_id    uuid NOT NULL REFERENCES booths(id),
  status      text DEFAULT 'draft',
  -- draft → booth_selected → customized → payment_pending →
  -- payment_partial → payment_complete → epass_issued → cancelled
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(booth_id) -- satu booth hanya bisa dimiliki satu registrasi aktif
)

-- Detail kustomisasi booth
customizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id),
  fascia_text     text NOT NULL,         -- nama yang tertera di papan fascia
  addons          jsonb DEFAULT '[]',    -- array add-on yang dipilih beserta harga
  description     jsonb,                -- Tiptap JSON content
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- Header pembayaran
payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id),
  scheme          text NOT NULL,    -- 'full' | 'installment_2' | 'installment_3'
  method          text NOT NULL,    -- 'virtual_account' | 'transfer' | 'credit_card'
  subtotal        integer NOT NULL, -- harga booth + add-ons
  ppn_amount      integer NOT NULL, -- 11% dari subtotal
  total           integer NOT NULL, -- subtotal + ppn
  status          text DEFAULT 'pending',
  -- 'pending' | 'partial' | 'complete' | 'overdue' | 'refunded'
  created_at      timestamptz DEFAULT now()
)

-- Detail per termin pembayaran (cicilan)
payment_terms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES payments(id),
  term_number   integer NOT NULL,  -- 1, 2, 3
  amount        integer NOT NULL,  -- nominal yang harus dibayar pada termin ini
  due_date      date NOT NULL,
  paid_at       timestamptz,
  paid_amount   integer,
  proof_url     text,              -- bukti transfer (MinIO presigned path)
  status        text DEFAULT 'pending' -- 'pending' | 'paid' | 'overdue'
)

-- E-pass digital
epass (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id),
  qr_token        text UNIQUE NOT NULL, -- JWT/signed token untuk verifikasi QR
  pdf_path        text,                 -- path di MinIO bucket
  issued_at       timestamptz DEFAULT now(),
  is_active       boolean DEFAULT true
)

-- (Tabel Upload Dokumen NIB/NPWP dihapus karena formulir langsung disetujui)
```

### Drizzle Client dengan Dynamic Schema

```typescript
// packages/db/src/client.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as tenantSchema from './schema/tenant'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export function createTenantDb(schemaName: string) {
  return drizzle(pool, {
    schema: tenantSchema,
    // Set search_path agar semua query otomatis ke schema yang tepat
    logger: process.env.NODE_ENV === 'development',
  })
}

// Digunakan di Server Action / Server Component
export async function withTenantSchema<T>(
  schemaName: string,
  fn: (db: ReturnType<typeof createTenantDb>) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query(`SET search_path TO ${schemaName}, public`)
    const db = drizzle(client, { schema: tenantSchema })
    return await fn(db)
  } finally {
    client.release()
  }
}
```

### Strategi Migrasi Multi-Schema

Karena Drizzle ORM secara default belum memiliki native support untuk migrasi lintas schema dinamis secara serentak, kita menggunakan custom script `migrate.ts`:

1. Skrip akan membaca folder `public` untuk migrasi schema publik.
2. Skrip akan query ke `public.expo_events` untuk mendapatkan daftar semua schema aktif (`expo_*`).
3. Skrip melakukan *looping* ke setiap schema aktif, melakukan `SET search_path TO expo_slug, public`, dan menjalankan file migrasi tenant.

---

## Autentikasi & Otorisasi

### Better Auth Setup

```typescript
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@jalamandala/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: { enabled: true },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
  },
})

export type Session = typeof auth.$Infer.Session
```

### Role & Permission

| Role | Akses |
|---|---|
| `tenant` | Registrasi booth, lihat & unduh e-pass milik sendiri, lihat status pembayaran |
| `expo_admin` | Kelola booth & zona, verifikasi dokumen tenant, konfirmasi pembayaran, export laporan |
| `superadmin` | Buat event baru, provisioning schema DB, kelola organisasi, semua akses admin |

### Middleware Route Protection

```typescript
// apps/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@jalamandala/auth/middleware'

export async function middleware(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })

  const isProtectedTenant = req.nextUrl.pathname.startsWith('/dashboard') ||
                             req.nextUrl.pathname.startsWith('/registrasi')
  const isProtectedAdmin   = req.nextUrl.pathname.startsWith('/admin')
  const isProtectedSuper   = req.nextUrl.pathname.startsWith('/superadmin')

  if (!session && (isProtectedTenant || isProtectedAdmin || isProtectedSuper)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isProtectedAdmin && session?.user.role === 'tenant') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isProtectedSuper && session?.user.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/registrasi/:path*', '/admin/:path*', '/superadmin/:path*'],
}
```

---

## Storage (MinIO)

### Konvensi Bucket & Path

Satu bucket per event expo. Nama bucket mengikuti `schema_name` dari event.

```
bucket: expo-gontor100
├── public_uploads/        # Gambar produk, logo tenant
│   └── {userId}/
├── epass/
│   └── {registrationId}/
│       └── epass.pdf
├── invoices/
│   └── {paymentTermId}/
│       └── invoice.pdf
├── contracts/
│   └── {registrationId}/
│       └── kontrak.pdf
└── static/
    ├── handbook-teknis.pdf
    └── floor-plan.jpg
```

### Akses File

File sensitif (dokumen legalitas, e-pass) **tidak boleh diakses langsung** via URL publik.
Gunakan presigned URL dengan TTL 15 menit, di-generate melalui Server Action.

```typescript
// packages/storage/src/presigned.ts
import { storageClient } from './client'

export async function getPresignedUrl(
  bucket: string,
  objectPath: string,
  expirySeconds = 900 // 15 menit
): Promise<string> {
  return await storageClient.presignedGetObject(bucket, objectPath, expirySeconds)
}
```

---

## PDF Generation (Microservice / Gotenberg)

### Strategi

Karena menjalankan Playwright (Chromium) di dalam Next.js Docker Container memakan terlalu banyak RAM dan berisiko *crash*, kita menggunakan **Gotenberg** (Docker-based stateless API for PDF generation) atau microservice terpisah.
Next.js akan merender HTML dari template khusus, lalu mengirim HTML tersebut ke endpoint Gotenberg API untuk dikonversi menjadi PDF.

### Flow Generate E-Pass

```
Server Action (epass.ts)
  │
  ├─ 1. Ambil data registrasi dari DB
  ├─ 2. Generate QR token (JWT signed)
  ├─ 3. Simpan token ke tabel epass
  ├─ 4. Render React Component e-pass menjadi string HTML (via renderToStaticMarkup)
  ├─ 5. Panggil client packages/pdf
  │       └─ Kirim POST request ke http://gotenberg:3000/forms/chromium/convert/html
  ├─ 6. Gotenberg merespons dengan buffer PDF
  ├─ 7. Upload buffer PDF ke MinIO (bucket event, path epass/{regId}/epass.pdf)
  ├─ 8. Update tabel epass dengan pdf_path
  └─ 9. Return presigned URL untuk download
```

---

## Pembayaran & Cicilan

### Model Data

```
Payment (header)
  ├── scheme: 'full' | 'installment_2' | 'installment_3'
  ├── method: 'virtual_account' | 'transfer' | 'credit_card'
  └── payment_terms[] (detail per termin)
        ├── term 1: 100%       due_date: hari ini         (full)
        ├── term 1: 50%        due_date: hari ini         (cicilan 2x)
        │   term 2: 50%        due_date: hari ini + 30 hari
        ├── term 1: 40%        due_date: hari ini         (cicilan 3x)
        │   term 2: 30%        due_date: hari ini + 30 hari
        └── term 3: 30%        due_date: hari ini + 60 hari
```

### Kalkulasi Harga

```typescript
function calculatePayment(boothBasePrice: number, addons: Addon[]) {
  const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0)
  const subtotal    = boothBasePrice + addonsTotal
  const ppn         = Math.round(subtotal * 0.11)
  const total       = subtotal + ppn
  return { subtotal, ppn, total }
}

function generatePaymentTerms(total: number, scheme: PaymentScheme, startDate: Date) {
  if (scheme === 'full') {
    return [{ term: 1, amount: total, dueDate: startDate }]
  }
  if (scheme === 'installment_2') {
    return [
      { term: 1, amount: Math.ceil(total * 0.5),  dueDate: startDate },
      { term: 2, amount: Math.floor(total * 0.5), dueDate: addDays(startDate, 30) },
    ]
  }
  if (scheme === 'installment_3') {
    return [
      { term: 1, amount: Math.ceil(total * 0.4),  dueDate: startDate },
      { term: 2, amount: Math.round(total * 0.3), dueDate: addDays(startDate, 30) },
      { term: 3, amount: Math.floor(total * 0.3), dueDate: addDays(startDate, 60) },
    ]
  }
}
```

### Status Transisi Payment

```
pending → partial (termin 1 dibayar, cicilan masih ada)
        → complete (semua termin lunas)
        → overdue (ada termin yang melewati due_date)
        → refunded
```

E-pass diterbitkan setelah **termin pertama** dikonfirmasi (bukan harus lunas penuh).

---

## Infrastruktur & Deployment

### Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://jalamandala:secret@pgbouncer:6432/jalamandala
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
      - REDIS_URL=redis://redis:6379
      - GOTENBERG_URL=http://gotenberg:3000
    depends_on: [pgbouncer, minio, redis, gotenberg]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: jalamandala
      POSTGRES_USER: jalamandala
      POSTGRES_PASSWORD: secret

  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASE_URL: postgres://jalamandala:secret@postgres:5432/jalamandala
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
    depends_on: [postgres]

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  gotenberg:
    image: gotenberg/gotenberg:8
    command:
      - "gotenberg"
      - "--chromium-disable-javascript=true"
      - "--chromium-allow-insecure-localhost=true"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on: [app]

volumes:
  postgres_data:
  minio_data:
  redis_data:
```

### Nginx Config (ringkas)

```nginx
server {
  listen 443 ssl;
  server_name jalamandala.id;

  location / {
    proxy_pass         http://app:3000;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
  }

  # Rate limit untuk upload dokumen
  location /api/storage/upload {
    limit_req zone=upload burst=5;
    proxy_pass http://app:3000;
  }
}
```

### Variabel Environment

```bash
# apps/web/.env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/jalamandala"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="https://jalamandala.id"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"

# PDF generation (internal)
PRINT_SECRET_TOKEN="your-print-secret"
APP_BASE_URL="http://app:3000"  # internal Docker network URL

# Email (opsional, untuk notifikasi)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
```

---

## Konvensi & Keputusan Desain

### Server Actions sebagai Primary Mutation Layer

Semua mutasi data (create, update, delete) menggunakan Next.js Server Actions, bukan API routes.
API routes hanya digunakan untuk: webhook payment gateway, endpoint presigned URL, dan Better Auth handler.

```typescript
// Pola Server Action
'use server'
import { auth } from '@jalamandala/auth'
import { withTenantSchema } from '@jalamandala/db'
import { headers } from 'next/headers'

export async function selectBooth(boothId: string, eventSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Unauthorized')

  const event = await getEventBySlug(eventSlug)
  return withTenantSchema(event.schemaName, async (db) => {
    // ... logic pilih booth
  })
}
```

### Booth Locking (Optimistic Concurrency)

Saat tenant memilih booth, booth di-lock selama 15 menit (`locked_until`).
Jika dalam 15 menit tidak ada pembayaran dimulai, booth otomatis kembali available via cron job atau check pada query berikutnya.

```sql
-- Booth dianggap available jika:
-- status = 'available' ATAU locked_until sudah lewat
WHERE status = 'available'
   OR (status = 'locked' AND locked_until < NOW())
```

### Task Scheduling (Queue System)

Kita menggunakan **BullMQ + Redis** untuk menjalankan *background jobs* yang andal, dibandingkan menggunakan *cron job* konvensional.
- **Unlock Booth:** Ketika booth dipilih, kita masukkan *delayed job* 15 menit ke BullMQ. Jika dalam 15 menit pembayaran belum dimulai (belum `payment_pending`), job tereksekusi dan mengubah status booth kembali ke `available`.
- **Payment Timeout:** Menangani pembatalan pembayaran jika Virtual Account kedaluwarsa.

### Tiptap Content Storage

Konten editor (deskripsi produk, kontrak) disimpan sebagai Tiptap JSON di kolom `jsonb` PostgreSQL.
Saat generate PDF, konten di-render ulang menggunakan Tiptap SSR atau dikonversi ke HTML.

### Provisioning Tenant Schema

Saat superadmin membuat event baru, sistem otomatis:
1. Insert row ke `public.expo_events`
2. Jalankan `CREATE SCHEMA expo_{slug}`
3. Jalankan Drizzle migration untuk schema baru
4. Buat MinIO bucket `expo-{slug}`

```typescript
// apps/web/lib/actions/provisioning.ts
export async function createExpoEvent(data: CreateEventInput) {
  // 1. Insert event
  const event = await publicDb.insert(expoEvents).values({
    ...data,
    schemaName: `expo_${data.slug}`,
  }).returning()

  // 2. Create schema + run migrations
  await publicDb.execute(sql`CREATE SCHEMA IF NOT EXISTS expo_${sql.raw(data.slug)}`)
  await runTenantMigrations(`expo_${data.slug}`)

  // 3. Create MinIO bucket
  await storageClient.makeBucket(`expo-${data.slug}`, 'ap-southeast-1')

  return event
}
```

---

*Dokumen ini adalah living document. Update seiring perkembangan implementasi.*

*Jalamandala — v0.1 — dibuat dengan [Claude](https://claude.ai)*