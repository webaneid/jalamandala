# Arsitektur: Halaman Invoice Publik (`/invoice/[token]`)

> Dokumen ini mendeskripsikan arsitektur halaman invoice publik sesuai struktur Jalamandala saat ini (Next.js 15 App Router, multi-tenant DB).

---

## 1. URL & Routing

```
URL: /invoice/:publicToken
File: apps/web/app/invoice/[token]/page.tsx
```

- `publicToken` = kolom `invoices.public_token` (UUID auto-generate saat invoice dibuat)
- Halaman ini **tidak butuh login** — diakses peserta langsung dari link yang dikirim
- Middleware **tidak merewrite** `/invoice/*` — halaman served langsung
- Di produksi: dapat diakses via subdomain bebas (tidak dikunci ke `app.*` atau `expo.*`)

---

## 2. Sumber Data

Semua data diambil **server-side** di Server Component. Tidak ada client fetch.

```
Tenant DB (expo_forbis2026):
  invoices              → header invoice
  invoice_items         → rincian tagihan
  invoice_payments      → histori pembayaran
  booth_bookings        → enrichment item booth_booking
  booths                → kode, dimensi (width × height), zona
  zones                 → nama zona
  event_addons          → nama, harga add-on
  addon_units           → satuan (KWH, M2, item, dll)

Public DB:
  participants          → nama, email, telepon, whatsapp
  participant_businesses → nama perusahaan, brand, alamat, telepon, whatsapp
  expo_events           → nama event, logo
  payment_channels      → rekening bank (filter isActive + type=bank_account)
  qris_configs          → status QRIS, emvPayload, merchantName, imageUrl
```

---

## 3. Shape Data dari `getInvoiceByToken`

Fungsi ini ada di `apps/web/actions/finance.ts`. Perlu diperbarui agar mengembalikan semua data yang dibutuhkan halaman.

```ts
type InvoicePageData = {
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate: Date;
    dueDate: Date | null;
    status: string;               // waiting_for_payment | paid | expired | cancelled
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    paidAt: Date | null;
    paymentChannelLabel: string | null;
    paymentChannelType: string | null;
    notes: string | null;
    publicToken: string;
  };
  participant: {
    name: string;
    email: string | null;
    phone: string;
    whatsapp: string;
  } | null;
  business: {
    companyName: string;
    brandName: string;
    boothName: string | null;
    companyAddress: string | null;
    companyPhone: string | null;
    companyWhatsapp: string | null;
  } | null;
  items: Array<{
    id: string;
    itemType: string;             // booth_booking | addon | custom
    title: string;
    description: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    // Enrichment booth_booking:
    boothCode: string | null;
    boothZoneName: string | null;
    boothWidth: number | null;    // piksel → tampilkan sebagai meter di UI (lihat catatan)
    boothHeight: number | null;
    // Enrichment addon:
    addonUnitName: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: Date;
    method: string | null;
    referenceNumber: string | null;
    paymentChannelLabel: string | null;
    status: string;
  }>;
  event: {
    name: string;
    logoUrl: string | null;
    venue: string | null;
  };
  paymentChannels: Array<{
    id: string;
    type: string;
    label: string;
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    instruction: string | null;
    isActive: boolean;
  }>;
  qrisConfig: {
    isEnabled: boolean;
    merchantName: string | null;
    imageUrl: string | null;
    emvPayload: string | null;
  } | null;
};
```

---

## 4. Enrichment Item per Tipe

### `booth_booking`
`invoice_items.referenceId` → `booth_bookings.id`
→ join `booths` → ambil `code`, `width`, `height`
→ join `zones` → ambil `name`

**Catatan dimensi booth**: kolom `booths.width` dan `booths.height` adalah nilai piksel dari peta visual (seed: 84×42 piksel untuk booth 2×2m). Tampil di UI sebagai keterangan zona saja, atau ikutkan keterangan fasilitas jika ada. Jangan langsung tampilkan nilai piksel.

### `addon`
`invoice_items.referenceId` → `event_addons.id`
→ join `addon_units` → ambil `name` (KWH, M2, item, dll)

**Format display**: `[Qty] [unit] × Rp [unitPrice]`

### `custom`
Tidak perlu enrichment. Pakai `title`, `description`, `quantity`, `unitPrice` langsung.

---

## 5. Kalkulasi Sisi Server

```ts
const totalPaid  = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0)
const balanceDue = invoice.grandTotal - totalPaid
const isOverdue  = invoice.dueDate
  ? new Date() > invoice.dueDate && invoice.status !== "paid" && invoice.status !== "cancelled"
  : false
const isPaid     = invoice.status === "paid"
```

---

## 6. Layout Halaman

```
┌──────────────────────────────────────────────────────────┐
│  HEADER                                                  │
│  [Logo Event]  Nama Event              [Status Badge]   │
│                Nomor Invoice                             │
│                Jatuh tempo: xx Mei 2026                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────┬───────────────────────────────┐
│  INFO PENJUAL            │  INFO PEMBELI                 │
│  Nama Event              │  Nama Peserta                 │
│  Panitia Penyelenggara   │  Nama Perusahaan / Brand      │
│  [Venue]                 │  Telepon / WhatsApp           │
│                          │  Alamat                       │
└──────────────────────────┴───────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  RINGKASAN  [Tanggal Terbit] [Jatuh Tempo] [Total Tagihan]│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  RINCIAN TAGIHAN                                         │
│                                                          │
│  booth_booking: Booth [code] · Zona [zone] · [Fasilitas] │
│  addon:         [nama] · [qty] [unit] · [harga satuan]   │
│  custom:        [title] · [description] · qty × harga    │
│                                                          │
│  [Subtotal] [Pajak] [Grand Total]                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  INSTRUKSI PEMBAYARAN  (hanya muncul jika belum lunas)  │
│                                                          │
│  Rekening Bank:                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [Bank] · [Nama Rekening]                         │   │
│  │ [Nomor Rekening]                [Salin]          │   │
│  │ Transfer sejumlah: Rp [grandTotal]               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  QRIS (jika qrisConfig.isEnabled):                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ [Gambar QR / imageUrl]                           │   │
│  │ [merchantName]                                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Konfirmasi WhatsApp: tombol WA ke nomor admin           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  HISTORI PEMBAYARAN  (muncul jika ada payments.paid)    │
│  Tabel: Tanggal | Channel | Nominal | Status             │
└──────────────────────────────────────────────────────────┘

[FOOTER] Pertanyaan? Hubungi panitia [nama event].
         Nomor WA: [company_phone dari whatsapp_configs]
```

---

## 7. Status Badge

| `invoice.status` | Teks Badge | Warna |
|---|---|---|
| `waiting_for_payment` + belum overdue | Menunggu Pembayaran | Amber |
| `waiting_for_payment` + overdue | Jatuh Tempo Terlampaui | Merah |
| `paid` | Lunas | Hijau |
| `expired` | Kadaluarsa | Abu |
| `cancelled` | Dibatalkan | Abu |

---

## 8. Kondisi Tampil/Sembunyikan

| Kondisi | Yang berubah |
|---|---|
| `isPaid` | Sembunyikan seksi Instruksi Pembayaran |
| `status === 'expired' \| 'cancelled'` | Sembunyikan seksi Instruksi Pembayaran |
| `isOverdue` | Due Date merah + badge Overdue |
| `paymentChannels.length === 0 && !qrisConfig?.isEnabled` | Tampilkan pesan "Hubungi admin untuk instruksi pembayaran" |
| `qrisConfig?.imageUrl` ada | Tampilkan gambar QRIS statis |
| `payments` ada yang `status = 'paid'` | Tampilkan seksi Histori Pembayaran |
| `business === null` | Tampilkan fallback "Peserta terdaftar" |

---

## 9. Seksi Pembayaran Detail

### Transfer Bank
Untuk setiap `paymentChannels` yang `isActive && type === 'bank_account'`:
```
[Nama Bank]
Atas nama: [accountName]
Nomor Rekening: [accountNumber]  [Salin]
Jumlah Transfer: Rp [grandTotal]
```

### QRIS Statis
Jika `qrisConfig.isEnabled && qrisConfig.imageUrl`:
```
[<img> QR code dari imageUrl]
[merchantName]
Nominal: Rp [grandTotal]
```
> **Catatan**: Fase ini hanya QRIS statis. QRIS dinamis (generate per-invoice) direncanakan di fase otomasi.

### Konfirmasi WhatsApp
Tombol WA dengan pre-filled message:
```
Halo, saya sudah transfer untuk invoice [invoiceNumber]
atas nama [business.companyName] sebesar Rp [grandTotal].
Mohon konfirmasi. Terima kasih.
```
Nomor WA diambil dari `whatsapp_configs.sender_id` atau fallback ke admin kontak event.

---

## 10. File Structure

```
apps/web/app/invoice/
  └── [token]/
        └── page.tsx             ← Server Component (async)

apps/web/actions/finance.ts
  └── getInvoiceByToken(token)   ← Diperbarui: enriched response

apps/web/components/invoice/
  └── InvoiceDocument.tsx        ← Pure display component (no "use client" needed)
  └── PaymentSection.tsx         ← "use client" — untuk salin nomor rekening
  └── QrisDisplay.tsx            ← "use client" opsional — untuk copy QRIS
```

---

## 11. Gap Implementasi (yang perlu dikerjakan)

| # | Gap | Status |
|---|---|---|
| 1 | `getInvoiceByToken` tidak fetch participant/business data | ❌ belum |
| 2 | `invoice_items` tidak di-enrich (booth code/zone, addon unit) | ❌ belum |
| 3 | `paymentChannels` + `qrisConfig` tidak disertakan dalam response | ❌ belum |
| 4 | Halaman pakai `onClick` di Server Component (akan error) | ❌ perlu pindah ke Client Component |
| 5 | `recipientName`/`recipientEmail` sudah dihapus dari invoice form, tapi page masih pakai | ❌ perlu pakai data dari participant/business |
| 6 | Dimensi booth (piksel) perlu mapping ke label fasilitas | ❌ tampil zona + kode saja |
| 7 | Tombol "Salin nomor rekening" butuh client-side | ❌ belum ada |
| 8 | Tidak ada fallback jika invoice tidak ditemukan (404) | ✅ sudah ada `notFound()` |

---

## 12. Yang Tidak Diimplementasi (Out of Scope)

- **QRIS Dinamis per invoice** — generate EMV payload dengan nominal terkunci. Masuk fase otomasi.
- **Upload bukti bayar** — peserta upload screenshot transfer. Masuk fase otomasi.
- **iPaymu / payment gateway** — tidak ada di sistem saat ini.
- **Download PDF** — memakai Gotenberg, masuk fase terpisah.
