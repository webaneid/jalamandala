# Arsitektur Vendor
> Dokumen ini mendefinisikan model data, alur akses, dan implementasi modul vendor Jalamandala.
> Status: **live** (schema + admin UI + portal vendor + sistem bagi hasil + pencairan dana sudah berjalan).
> Terakhir diperbarui: April 2026

---

## 1. Tujuan

Modul vendor dibuat untuk menjawab kebutuhan berikut:

- Vendor booth (backdrop, branding, perlengkapan fisik) perlu tahu siapa tenant di setiap booth.
- Vendor add-on (TV, daya listrik, peralatan tambahan) perlu tahu siapa pemesan, di booth mana, dan berapa quantity-nya — beserta **tagihan HPP (harga vendor)** agar mereka tahu berapa yang harus diinvoicekan ke FORBIS.
- Vendor bisa mengajukan **pencairan dana** langsung dari portal, berdasarkan sisa tagihan yang otomatis dihitung.

---

## 2. Dua Jenis Vendor

### 2.1 Vendor Booth
Ditugaskan ke satu atau lebih `zones`. Data yang bisa diakses:
- Daftar booth `booked` di zona yang ditugaskan
- Per booth: kode booth, zona, nama booth, nama usaha, nama pemesan
- Export CSV

### 2.2 Vendor Add-on
Ditugaskan ke satu atau lebih `event_addons`. Data yang bisa diakses:
- Daftar `order_items` untuk add-on yang ditugaskan (sumber data: `order_items`, bukan `registration_addons`)
- Per item: nama add-on, kode booth, nama usaha, **nama pemesan**, **nomor WA pemesan**, quantity, **harga vendor/unit (HPP)**, **total tagihan ke FORBIS**
- Export CSV dengan kolom vendor price

---

## 3. Model Data (Public Schema)

### 3.1 `vendors`

```sql
CREATE TABLE public.vendors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  event_id            uuid NOT NULL,
  name                text NOT NULL,
  whatsapp            text NOT NULL,
  vendor_type         public.vendor_type NOT NULL,
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  -- Rekening bank untuk pencairan dana
  bank_name           text,
  bank_account        text,
  bank_account_name   text,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
```

Kolom `bank_name`, `bank_account`, `bank_account_name` ditambahkan via `ALTER TABLE` di `provision-public.ts`. Dipakai untuk auto-fill form pencairan dana.

### 3.2 `vendor_booth_assignments`

```sql
CREATE TABLE public.vendor_booth_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  zone_slug   text NOT NULL,
  created_at  timestamp NOT NULL DEFAULT now()
);
```

### 3.3 `vendor_addon_assignments`

```sql
CREATE TABLE public.vendor_addon_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  event_addon_id  uuid NOT NULL,
  created_at      timestamp NOT NULL DEFAULT now()
);
```

`event_addon_id` → `event_addons.id` tenant schema (cross-schema, no DB FK).

### 3.4 Enum `vendor_type`

```sql
CREATE TYPE public.vendor_type AS ENUM ('booth', 'addon');
```

---

## 4. Sistem Bagi Hasil (Harga Vendor / HPP)

Setiap `event_addons` di tenant schema memiliki dua kolom harga:

| Kolom | Keterangan |
|---|---|
| `price` | Harga jual ke peserta (harga FORBIS) |
| `vendor_price` | HPP — harga yang FORBIS bayarkan ke vendor |

Selisih `price - vendor_price` adalah **keuntungan FORBIS per unit per add-on**.

### Laporan Margin (Admin)
Halaman `/admin/addon` menampilkan:
- Kolom: Add-on, Harga Vendor, Harga Jual, Margin/Unit, Margin %, Qty Terjual, Total Keuntungan FORBIS
- Komponen: `AddonMarginReport.tsx`
- Hanya muncul untuk add-on yang memiliki `vendor_price` terisi

### Tampilan di Portal Vendor
Halaman `/expo/vendor/addons` menampilkan **harga vendor (HPP)**, bukan harga jual:
- Kolom Harga/Unit = `vendor_price`
- Kolom Tagihan = `vendor_price × quantity`
- Stat card "Total Tagihan ke FORBIS" di atas tabel

Ini memudahkan vendor mengetahui **berapa yang harus mereka invoicekan ke FORBIS**.

---

## 5. Sistem Pencairan Dana Vendor

### 5.1 Alur

```
Vendor isi rekening bank (portal)
  → Vendor ajukan pencairan (jumlah otomatis = sisa tagihan)
  → Status: submitted
  → Finance review di /admin/keuangan/pencairan
  → Approved → Finance konfirmasi transfer + upload bukti
  → Status: transferred
  → Otomatis catat cash_out di cashflow_ledger
  → Notifikasi WA ke vendor (rencana)
```

### 5.2 Kalkulasi Sisa Tagihan

`getVendorClaimableAmount(vendorId)` mengembalikan:

| Field | Kalkulasi |
|---|---|
| `totalTagihan` | Σ `vendor_price × quantity` dari semua `order_items` add-on milik vendor |
| `totalDicairkan` | Σ `requestedAmount` dari `disbursement_requests` vendor dengan status `transferred` |
| `claimable` | `totalTagihan - totalDicairkan` (min 0) |

### 5.3 Form Pengajuan di Portal Vendor
- Jumlah **pre-filled** dengan nilai `claimable` secara otomatis
- Vendor boleh mengubah jumlah (request parsial)
- Validasi: tidak boleh melebihi `claimable`
- Shortcut "Isi penuh" untuk kembali ke nilai penuh
- Preview "Sisa setelah ini" jika request parsial
- Tombol: **Simpan Draft** atau **Submit ke Finance**

### 5.4 Rekening Bank Vendor
- Vendor isi sendiri di portal (`/expo/vendor/pencairan` → card Rekening Bank)
- Admin bisa isi/edit di `/admin/vendor` → Edit → section "Rekening Bank"
- Auto-fill di form pencairan admin (`/admin/keuangan/pencairan/tambah`) saat vendor dipilih

### 5.5 Tabel DB Pencairan (Tenant Schema)

`disbursement_requests`:
- `id`, `event_id`, `requested_by` (userId), `requested_by_name`
- `purpose_type` (vendor/operational/refund/other), `purpose_description`
- `vendor_id` (nullable, cross-schema ref ke `public.vendors`)
- `requested_amount`, `dest_bank_name`, `dest_account_number`, `dest_account_name`
- `status` (draft → submitted → approved → transferred | rejected | cancelled)
- `approved_by`, `approved_by_name`, `approved_at`
- `rejected_by`, `rejected_by_name`, `rejected_at`, `rejection_reason`
- `notes`, `created_at`, `updated_at`

`disbursement_transfers`:
- `id`, `request_id` (FK ke disbursement_requests)
- `transferred_by`, `transferred_by_name`, `transferred_at`
- `source_channel_label`, `dest_bank_name`, `dest_account_number`, `dest_account_name`
- `gross_amount`, `transfer_fee`, `net_amount`
- `proof_asset_url` (menyimpan **asset ID** dari media library, bukan URL langsung)
- `notes`, `created_at`

`cashflow_ledger` memiliki kolom tambahan `reference_disbursement_id` yang terisi otomatis saat `confirmTransfer()`.

---

## 6. Integrasi User Role

Saat admin membuat vendor baru:
1. Buat `public."user"` via Better Auth credential provider
2. Buat `public.account` dengan password di-hash (scrypt)
3. Buat `public.user_roles` dengan `role = 'vendor'`
4. Buat `public.vendors` dengan profil dan `vendor_type`
5. Buat `vendor_booth_assignments` atau `vendor_addon_assignments` sesuai tipe

Semua dalam satu DB transaction.

---

## 7. Subdomain & Routing

Vendor login via subdomain `expo.*`. Middleware rewrite:

| Path | Keterangan |
|---|---|
| `/expo/vendor/login` | Halaman login vendor |
| `/expo/vendor/dashboard` | Dashboard — ringkasan penugasan + statistik |
| `/expo/vendor/booths` | Tabel booth per zona (vendor booth only) |
| `/expo/vendor/addons` | Tabel order add-on + tagihan HPP (vendor addon only) |
| `/expo/vendor/pencairan` | Rekening bank + form pengajuan + riwayat pencairan |

Protected layout `(protected)/layout.tsx` memeriksa:
1. Session valid
2. User punya role `vendor`
3. Row `vendors` ada dan `is_active = true`

Nav `VendorShell.tsx` menampilkan tab sesuai `vendorType` + tab **Pencairan Dana** (semua vendor).

---

## 8. Admin UI

### `/admin/vendor`
- Daftar semua vendor per event
- **Tambah vendor** — buat akun + role + vendor + penugasan + catatan
- **Edit vendor** — nama, WA, catatan, penugasan zona/add-on, **rekening bank**
- **Reset password** — generate baru, tampil di dialog untuk disalin
- **Aktif/Nonaktif** — toggle tanpa hapus data

### `/admin/keuangan/pencairan`
- Daftar semua permohonan pencairan (semua tipe: vendor, operasional, refund, lainnya)
- Quick approve/reject inline dari tabel
- Summary cards: Menunggu Approval, Siap Ditransfer, Total Sudah Ditransfer

### `/admin/keuangan/pencairan/tambah`
- Form pencairan untuk staff admin (bukan dari vendor)
- Pilih purpose type: Vendor / Operasional / Refund / Lainnya
- Jika Vendor: dropdown vendor + auto-fill rekening dari `vendors.bank_*`

### `/admin/keuangan/pencairan/[id]`
- Detail lengkap permohonan
- Approval / Reject dengan alasan
- Form konfirmasi transfer: waktu, rekening asal (dari payment channels), rekening tujuan, jumlah, biaya transfer, bukti transfer via **MediaPicker** (tersimpan sebagai asset ID ke media library)
- Preview bukti transfer via `PaymentProofPreviewButton`

---

## 9. Source Data Order Add-on

**Penting:** Data order add-on vendor diambil dari `order_items`, **bukan** `registration_addons`.

| Tabel | Keterangan |
|---|---|
| `order_items` | Sumber aktual. `item_type = 'addon'`, `reference_id = event_addons.id` (text) |
| `registration_addons` | Tabel lama, tidak dipakai untuk data vendor |

Mapping: `order_items.reference_id` (text) → `event_addons.id` (uuid, dibandingkan sebagai string)

---

## 10. File Implementasi

| File | Keterangan |
|---|---|
| `packages/db/src/schema/public/vendors.ts` | Schema vendors + assignments + bank fields |
| `packages/db/src/schema/tenant/finance.ts` | Schema disbursement_requests, disbursement_transfers, cashflowLedger |
| `packages/db/src/provision-public.ts` | ALTER TABLE vendors tambah bank fields |
| `packages/db/src/provision-tenant.ts` | CREATE TABLE disbursement tables + ALTER cashflow_ledger |
| `apps/web/actions/vendors.ts` | getVendors, createVendor, updateVendor (+bank fields), toggleVendorActive, resetVendorPassword, getVendorBoothData, getVendorAddonData, getVendorDashboardStats, updateVendorBankInfo, **getVendorClaimableAmount** |
| `apps/web/actions/disbursements.ts` | getDisbursements, getDisbursement, createDisbursement, approveDisbursement, rejectDisbursement, cancelDisbursement, confirmTransfer, getVendorsForDisbursement, getPaymentChannelsForDisbursement, **getVendorDisbursements**, **createVendorDisbursementRequest**, **cancelVendorDisbursement** |
| `apps/web/app/admin/(protected)/vendor/page.tsx` | Admin vendor page |
| `apps/web/app/admin/(protected)/keuangan/pencairan/page.tsx` | Daftar pencairan |
| `apps/web/app/admin/(protected)/keuangan/pencairan/tambah/page.tsx` | Form pencairan admin |
| `apps/web/app/admin/(protected)/keuangan/pencairan/[id]/page.tsx` | Detail + konfirmasi transfer |
| `apps/web/components/admin/vendor/VendorConfiguration.tsx` | Modal tambah/edit/reset + bank fields |
| `apps/web/components/admin/finance/DisbursementList.tsx` | Tabel + quick actions |
| `apps/web/components/admin/finance/DisbursementForm.tsx` | Form pencairan admin + auto-fill rekening |
| `apps/web/components/admin/finance/DisbursementDetail.tsx` | Detail + MediaPicker bukti transfer |
| `apps/web/components/admin/addon/AddonConfiguration.tsx` | Config add-on + kolom vendor price + margin |
| `apps/web/components/admin/addon/AddonMarginReport.tsx` | Laporan margin bagi hasil |
| `apps/web/app/expo/vendor/(protected)/pencairan/page.tsx` | Portal pencairan vendor |
| `apps/web/components/vendor/VendorPencairanPage.tsx` | UI rekening + form ajukan + riwayat |
| `apps/web/components/vendor/VendorShell.tsx` | Nav shell + tab Pencairan Dana |
| `apps/web/app/api/vendor/export/route.ts` | Export CSV (vendor price columns) |

---

## 11. Notifikasi WhatsApp (Rencana)

Lihat `arsitektur-whatsapp.md` untuk detail lengkap. Ringkasan notif vendor:

| Kode | Trigger | Penerima |
|---|---|---|
| V1 | Akun vendor dibuat | Vendor (URL login + kredensial) |
| V2 | Order add-on masuk | Vendor add-on bersangkutan |
| V3 | Pencairan disetujui | Vendor pemohon |
| V4 | Pencairan ditolak | Vendor pemohon |
| V5 | Dana ditransfer | Vendor pemohon |
| F1 | Pengajuan pencairan baru | Finance team |

---

## 12. Batasan & Catatan

- Vendor tidak bisa mengubah data peserta atau booth — portal read-only kecuali rekening bank sendiri dan pengajuan pencairan.
- Vendor hanya melihat data sesuai zona atau add-on yang ditugaskan.
- Satu user hanya boleh menjadi satu vendor per event.
- Vendor nonaktif tidak bisa login.
- Pencairan hanya bisa diajukan jika `claimable > 0` (ada sisa tagihan yang belum dicairkan).
- Bukti transfer disimpan sebagai **asset ID media library** (bukan URL langsung) agar bisa dipreview via `PaymentProofPreviewButton`.
- Cache `globalThis.__jalamandalaTenantDbs` — setiap kali ada kolom baru di tenant schema, dev server harus di-restart agar schema Drizzle yang di-cache ter-refresh.
