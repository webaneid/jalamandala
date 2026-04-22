# Arsitektur Workflow Database
> Dokumen operasional singkat untuk agent atau developer yang perlu mengubah database Jalamandala. Tujuan dokumen ini adalah menghindari kebingungan soal command DB, schema public vs tenant, dan kapan memakai provision script atau Drizzle push.

---

## 1. Tujuan

Project ini **tidak** memakai satu jalur migrasi database yang sangat bersih dan tunggal.

Karena itu, saat ingin mengubah database, jangan langsung menebak dengan:

- `bun run db:push --force`
- `pnpm db:push`
- command root lain yang belum tentu relevan

Yang benar adalah:

1. pahami perubahan masuk ke schema mana
2. jalankan command dari package yang benar
3. prioritaskan provision script yang sudah disiapkan

---

## 2. Dua Dunia Schema

Di Jalamandala sekarang ada dua domain schema:

### A. Public Schema

Dipakai untuk data global / event-level / shared:

- `expo_events`
- `payment_channels`
- `qris_configs`
- `whatsapp_configs`
- `message_templates`
- `event_pages`
- `event_agendas`
- `media_assets`
- `media_usages`
- `forbis_members`
- `participants`
- `participant_businesses`

### B. Tenant Schema

Dipakai untuk data operasional per event tenant:

- booths
- zones
- zone_price_rules
- booth_bookings
- invoices
- invoice_items
- invoice_payments
- orders
- cashflow
- addons

Jadi sebelum menjalankan command apa pun, jawab dulu:

- ini perubahan `public schema`?
- atau `tenant schema`?

---

## 3. Prinsip Utama

Prinsip yang harus dipakai agent:

1. **jangan default ke `db:push --force`**
2. **lebih aman pakai provision script**
3. command DB dijalankan dari `packages/db`
4. environment harus di-load dulu
5. kalau DB lokal tidak aktif, command pasti gagal meskipun script benar

---

## 4. Lokasi Script

Script database utama berada di:

- `/Users/webane/sites/jalamandala/packages/db/package.json`

Jangan berasumsi script tersedia di root project.

---

## 5. Command yang Benar

### 5.1 Untuk Perubahan Public Schema

Gunakan:

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:provision:public
```

Ini command default untuk perubahan seperti:

- menambah kolom di `expo_events`
- menambah tabel `event_pages`
- menambah tabel `event_agendas`
- menambah field baru di `qris_configs`
- update media library public tables

### 5.2 Untuk Perubahan Tenant Schema

Gunakan:

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:provision:tenant
```

Ini command default untuk perubahan seperti:

- tabel booth
- booking
- invoice
- cashflow
- addons
- relasi tenant-specific lain

---

## 6. Kapan Pakai `db:generate` dan `db:push`

Workflow Drizzle formal tetap ada, tetapi **bukan jalur default** untuk project ini.

Command-nya:

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:generate
bun run db:push
```

Pakai jalur ini hanya jika:

- memang sedang mengubah definisi schema Drizzle
- tahu persis dampak perubahan ke database
- tidak cukup hanya dengan provision script

---

## 7. Kenapa `db:push --force` Bukan Default

`db:push --force` tidak boleh dijadikan kebiasaan karena:

1. database project ini sudah mengalami banyak evolusi manual
2. banyak tabel dijaga oleh `ALTER TABLE IF NOT EXISTS`
3. provision script lebih toleran terhadap kondisi DB nyata
4. `--force` lebih berisiko terhadap data existing

Jadi:

- **boleh dipakai hanya jika benar-benar paham**
- **tidak boleh jadi instruksi default untuk agent**

Kalau ada agent yang langsung mengusulkan:

```bash
bun run db:push --force
```

maka asumsi awalnya adalah **itu terlalu agresif**.

---

## 8. Urutan Kerja yang Disarankan

Kalau agent mengubah database, urutannya harus begini:

1. tentukan schema: `public` atau `tenant`
2. update file schema di `packages/db/src/schema/...`
3. update provision script yang relevan
4. jalankan provision yang relevan
5. cek hasil di aplikasi
6. baru kalau perlu, jalankan `db:generate` / `db:push`

Jangan dibalik.

---

## 9. Checklist Sebelum Menjalankan Command DB

Sebelum eksekusi:

- apakah command dijalankan dari `packages/db`?
- apakah `.env` sudah di-load?
- apakah perubahan masuk public atau tenant?
- apakah Postgres lokal aktif?
- apakah ini cukup dengan provision script?

Kalau salah satu belum jelas, jangan langsung push schema.

---

## 10. Failure Mode yang Paling Sering

Agent lain biasanya gagal karena salah satu dari ini:

### A. Menjalankan command dari root project

Gejala:

- script tidak ditemukan
- command salah package

### B. Lupa source `.env`

Gejala:

- `DATABASE_URL` tidak terbaca
- schema tenant salah

### C. Salah memilih public vs tenant

Gejala:

- tabel tidak ketemu
- perubahan masuk schema yang salah

### D. Postgres lokal tidak aktif atau sandbox memblokir koneksi

Gejala:

- `ECONNREFUSED`
- `Operation not permitted`

### E. Langsung pakai `db:push --force`

Gejala:

- perubahan terlalu agresif
- hasil tidak sesuai kondisi database nyata

---

## 11. Command Ringkas yang Harus Diingat Agent

### Public schema

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:provision:public
```

### Tenant schema

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:provision:tenant
```

### Drizzle generate/push bila benar-benar diperlukan

```bash
cd /Users/webane/sites/jalamandala/packages/db
set -a; source ../../.env; set +a
bun run db:generate
bun run db:push
```

### Yang tidak boleh dijadikan default

```bash
bun run db:push --force
```

---

## 12. Keputusan Final

Aturan operasional yang harus dianggap standar:

1. perubahan DB default lewat provision script
2. public schema pakai `db:provision:public`
3. tenant schema pakai `db:provision:tenant`
4. `db:push` hanya dipakai bila memang dibutuhkan
5. `db:push --force` bukan command default

---

## 13. Ringkasan Singkat

Kalau agent bingung, pakai aturan ini:

- ubah tabel event / media / qris / page / agenda -> `db:provision:public`
- ubah booth / invoice / booking / cashflow / addon -> `db:provision:tenant`
- jangan langsung `db:push --force`

Itu rule of thumb yang paling aman untuk codebase ini saat ini.
