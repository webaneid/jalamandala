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
- `expo.*` → rewrites to `/expo` (public event pages)
- `api.*` → rewrites to `/api`

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
DATABASE_URL          # postgresql://jalamandala:secret@localhost:6432/jalamandala
TENANT_SCHEMA         # e.g. expo_forbis2026
MINIO_ENDPOINT        # localhost (internal, untuk upload server-side)
MINIO_PORT            # 9000
MINIO_ACCESS_KEY      # admin
MINIO_SECRET_KEY      # password123
MINIO_BUCKET          # participant-assets
MINIO_PUBLIC_URL      # https://storage.forbis.id (WAJIB di production, untuk presigned URL ke client)
REDIS_URL             # redis://localhost:6379
GOTENBERG_URL         # http://localhost:3001
```

## Deployment (Production)

Server berjalan di `/var/www/jalamandala`, dikelola dengan PM2.

```bash
cd /var/www/jalamandala && git pull && bun install && bun run build && pm2 reload jalamandala
```

- Gunakan `pm2 reload` (bukan `restart`) untuk zero-downtime.
- `bun install` wajib dijalankan setelah pull jika ada perubahan `bun.lock`.

## Invoice & Payment Flow

Status invoice: `waiting_for_payment` → `waiting_confirmation` (user submit bukti) → `paid` (admin verifikasi) / `expired` / `cancelled`

Status payment: `pending_verification` → `paid` (verified) / `rejected`

Aturan penting:
- Satu invoice hanya boleh punya **satu** `pending_verification` payment sekaligus — blokir submit baru jika sudah ada.
- Saat user submit bukti transfer, status invoice otomatis berubah ke `waiting_confirmation`.
- Admin verifikasi melalui `verifyPaymentConfirmation()` di `actions/finance.ts`.
- `getInvoiceByToken` di `actions/finance.ts` adalah fungsi utama untuk halaman invoice publik — returns invoice, participant, business, items (enriched), payments (dengan `proofAssetId`), event, paymentChannels, qrisConfig.

## Dashboard Participant

Dashboard berada di `apps/web/app/[eventSlug]/dashboard/` dengan layout `fixed inset-0 z-30` (full-screen overlay di atas public layout). Bottom navigation 4 tab: Beranda, Usaha, Invoice, Profil.

Alur post-payment: Konfirmasi Pembayaran → Lengkapi Data Usaha (`/usaha/[businessId]/lengkapi`) → E-Pass Booth (`/usaha/[businessId]/epass`) → Dashboard.

## Conventions

- **TypeScript strict mode** throughout. `strictNullChecks: true` in web app.
- **Zod** for all form and API input validation. Schemas live in `apps/web/lib/validations/`.
- **Tailwind v4** — uses `@import "tailwindcss"` (not a config file). Design tokens are CSS variables in `globals.css`. Primary: `#134397`, Secondary: `#00adee`.
- **shadcn/ui** components go in `packages/ui/src/`. Local app-specific components go in `apps/web/components/`.
- Path alias `@/*` maps to `apps/web/*`.
- Prefer server actions over API routes for mutations.
- The `antigravity.md` file at the root is the project's architectural decision record — consult it before making structural changes.
