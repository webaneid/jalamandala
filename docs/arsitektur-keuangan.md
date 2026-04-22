# Arsitektur Keuangan
> Dokumen konteks aktif untuk modul keuangan FORBIS Expo. Dokumen ini sekarang memuat dua hal: arah arsitektur target, dan status implementasi yang sudah benar-benar berjalan di codebase.

## 0. Status Implementasi Aktif

### Yang sudah aktif

**Halaman admin:**
- `/admin/keuangan` — Dashboard keuangan utama dengan ringkasan metrik dan dua tab
- `/admin/keuangan/tambah-tagihan` — Form pembuatan tagihan manual (Universal Invoice Builder)
- `/admin/keuangan/cashflow` — Buku kas: ringkasan saldo + tabel semua transaksi uang masuk/keluar
- `/admin/keuangan/pencairan` — Daftar semua permohonan pencairan dana + quick approve/reject
- `/admin/keuangan/pencairan/tambah` — Form pencairan untuk staff admin (vendor / operasional / refund / lainnya)
- `/admin/keuangan/pencairan/[id]` — Detail permohonan + approval/reject + form konfirmasi transfer

**Alur Booking → Invoice:**
- Invoice dibuat dari `booth_bookings` berstatus `booked` yang belum punya `invoiceId`
- Dikelompokkan per bisnis/perusahaan di tab "Booking → Invoice"
- Server action: `createInvoiceFromBookedBooths(businessId)`

**Universal Invoice Builder (`/admin/keuangan/tambah-tagihan`):**
- Pilih peserta + bisnis (opsional, untuk invoice ke pihak internal)
- Pilih booth dari daftar booth aktif + hitung harga otomatis (berdasarkan price group peserta)
- Pilih add-on dengan kuantitas
- Tambah item manual (judul, deskripsi, qty, harga satuan)
- Minimal satu item wajib ada (booth, addon, atau item manual)
- Server action: `createManualInvoice(payload)`

**Price group logic:**
- Harga booth dihitung berdasarkan `priceGroup` peserta (forbis / public)
- Fase harga diprioritaskan: `early_bird` > `pre_sale` > `regular`
- Resolusi harga dilakukan di server action dan client ManualInvoiceBuilder

**Pembayaran:**
- Pilih metode bayar: rekening bank atau QRIS (dari konfigurasi event setting)
- Tandai invoice `paid` dengan tanggal, nomor referensi, catatan admin
- Saat paid: otomatis buat entri `cash_in` di `cashflow_ledger` dan update order ke `paid`
- Server actions: `updateInvoicePaymentMethod()`, `markInvoiceAsPaid()`

**Invoice publik:**
- Halaman `/invoice/[token]` dapat diakses tanpa login menggunakan `publicToken`
- Tampilkan detail invoice, instruksi pembayaran (jika belum paid), atau konfirmasi lunas
- Mendukung print/cetak (CSS print-optimized)
- Rincian item sudah memakai format operasional yang sama dengan detail invoice admin:
  - item tenant/booth ditampilkan sebagai `Zona {namaZona}`
  - deskripsi tenant berisi nomor booth yang dibooking dan fasilitas booth dari DB
  - item add-on menampilkan deskripsi add-on sebagai subteks
  - satuan add-on ditampilkan di kolom Qty, misal `1 KWH` atau `2 Item`

**Buku Kas:**
- Ringkasan: total pemasukan, total pengeluaran, saldo bersih
- Tabel semua entri `cashflow_ledger` diurut tanggal terbaru
- Cash in otomatis dari `markInvoiceAsPaid()`
- Tombol "Pencairan Dana" di header halaman
- Entri `cash_out` dari konfirmasi transfer menampilkan link "Lihat Pencairan" ke `disbursement_requests`

**Sistem Pencairan Dana:**
- Alur: `draft → submitted → approved → transferred | rejected | cancelled`
- Admin dapat approve/reject inline dari tabel daftar, atau detail per permohonan
- Konfirmasi transfer: isi waktu, rekening sumber (dari payment channels), biaya transfer, upload bukti via MediaPicker
- Bukti transfer tersimpan sebagai **asset ID media library** (bukan URL), dipreview via `PaymentProofPreviewButton`
- Otomatis mencatat `cash_out` di `cashflow_ledger` saat transfer dikonfirmasi
- Vendor dapat mengajukan pencairan mandiri dari portal `/expo/vendor/pencairan`
- `getVendorClaimableAmount()` menghitung sisa tagihan: `totalTagihan - totalDicairkan`

**Tenant schema aktif:**
- `orders`, `order_items`
- `invoices`, `invoice_items`, `invoice_payments`
- `cashflow_ledger` (dengan kolom `reference_disbursement_id` untuk link ke disbursement)
- `disbursement_requests`, `disbursement_transfers`

### Yang belum aktif

- Upload bukti bayar peserta / `payment_confirmation` — kolom `proofOfTransferUrl` di invoice ada tapi belum dipakai
- Pajak / diskon — `taxAmount` selalu 0, tidak ada field diskon
- Pembayaran parsial (`partial_paid`) — status ada di desain tapi tidak diimplementasikan
- Notifikasi WhatsApp / email saat invoice terbit atau lunas
- Payment gateway (Midtrans dll) — belum dikerjakan
- Reminder jatuh tempo otomatis
- Add-on dari pendaftaran peserta belum otomatis masuk invoice (harus input manual)

## 1. Visi Baru: Universal Transaction & Buku Kas (Cashflow)

Berdasarkan evaluasi terbaru, arsitektur keuangan tidak boleh hanya menjadi produk sampingan dari "Booking Booth". Modul keuangan harus dirombak menjadi pusat transaksi universal.

### A. Konsep Universal Transaction (Invoice Komprehensif)
Setiap peserta/perusahaan yang melakukan transaksi akan dibuatkan satu **Invoice**.
Invoice ini berfungsi sebagai keranjang belanja yang mencatat *apa saja* yang mereka beli:
- Pembelian Booth (beserta nomor booth dan harganya).
- Pembelian Add-ons (Meja, Kursi, Daya Listrik, beserta kuantitas dan harga satuan).
- Biaya tambahan lainnya (jika ada).

**Pencatatan Status Pembayaran harus Sangat Detail:**
- Berapa total tagihannya?
- Apakah statusnya sudah dibayar (Paid) atau belum (Unpaid/Partial)?
- Jika sudah dibayar: Dibayar melalui channel apa? (Transfer Bank Mandiri, QRIS, dll).
- Kapan tanggal transfernya?
- Mana file **Bukti Transfernya**?

### B. Konsep Buku Kas (Cashflow Ledger)
Admin wajib memiliki visibilitas penuh terhadap **Uang Masuk** dan **Uang Keluar**.
- **Uang Masuk (Cash In):** Setiap kali sebuah Invoice ditandai sebagai `Paid`, sistem akan mengotomatisasi pencatatan uang masuk ke Buku Kas.
- **Uang Keluar (Cash Out):** Admin dapat mencatat pengeluaran operasional event (misal: bayar vendor tenda, cetak spanduk) lengkap dengan bukti notanya.
- Laporan Cashflow akan merekapitulasi total saldo event secara *real-time*.

---

Modul keuangan harus mendukung alur ini:

- pemesanan booth dan add-on
- pembentukan invoice
- pengiriman instruksi pembayaran
- konfirmasi pembayaran
- pencatatan uang masuk
- pencatatan uang keluar
- pelaporan keuangan event

Tujuan utamanya bukan hanya menagih uang, tetapi menjaga hubungan yang rapi antara:

- siapa yang memesan
- apa yang dipesan
- invoice mana yang diterbitkan
- dibayar ke rekening atau channel mana
- status pembayaran sekarang apa

## 2. Ruang Lingkup

Sesuai kebutuhan saat ini, modul keuangan terdiri dari:

- laporan uang masuk dari pembayaran
- laporan uang keluar
- alur `Pemesanan -> Invoice -> Konfirmasi Pembayaran`
- invoice yang bisa memuat:
  - booth yang dipesan
  - add-on opsional
  - tujuan pembayaran

Selain itu, modul ini terkait langsung dengan konfigurasi event:

- identitas event
- payment channels
- WhatsApp configuration
- message templates

Catatan:

- detail domain event setting dipisah di [arsitektur-event-setting.md](/Users/webane/sites/jalamandala/docs/arsitektur-event-setting.md:1)

## 3. Keputusan Urutan: Event Setting Dulu atau Keuangan Dulu?

Jawaban saya:

- **event setting inti dulu**
- lalu **keuangan**

Bukan event setting penuh yang besar dulu, dan bukan keuangan berdiri sendiri dulu.

Yang benar adalah:

1. bangun **event setting minimum yang dibutuhkan finance**
2. baru bangun **modul keuangan** di atas data setting itu

Alasannya sederhana:

- invoice tidak bisa final tanpa identitas event
- invoice tidak bisa dikirim tanpa tahu channel pembayaran
- konfirmasi pembayaran tidak bisa benar tanpa daftar rekening/QRIS/gateway
- notifikasi WhatsApp tidak bisa rapi tanpa message template dan gateway setting

Jadi dependency-nya memang ke arah ini:

- `Event Setting Inti -> Finance -> Otomasi`

## 4. Dependency ke Event Setting

Sebelum finance dibuat penuh, event setting inti harus sudah tersedia.

Minimum dependency yang dibutuhkan finance:

- profil event untuk identitas invoice
- payment channels untuk tujuan pembayaran
- WhatsApp config untuk pengiriman pesan
- message templates untuk follow-up operasional

Detail domain ini sengaja dipisah ke:

- [arsitektur-event-setting.md](/Users/webane/sites/jalamandala/docs/arsitektur-event-setting.md:1)

## 5. Domain Keuangan

Istilah yang dipakai:

- `order` atau pemesanan: konteks item yang akan ditagihkan
- `invoice`: dokumen tagihan resmi
- `invoice_item`: detail item di dalam invoice
- `payment`: transaksi pembayaran yang masuk
- `payment_confirmation`: bukti/konfirmasi pembayaran
- `payment_channel`: channel tujuan pembayaran
- `cash_in`: uang masuk
- `cash_out`: uang keluar

Hubungan dasarnya:

- satu order bisa menghasilkan satu atau lebih invoice
- satu invoice punya banyak invoice item
- satu invoice bisa punya satu atau lebih payment
- satu payment terkait ke satu payment channel
- cash in dan cash out dipakai untuk laporan keuangan event

## 6. Alur Inti yang Disarankan

### 6.1 Alur Operasional

1. peserta memesan booth
2. peserta menambah add-on opsional
3. sistem membentuk order
4. sistem menerbitkan invoice
5. invoice menampilkan item detail dan channel pembayaran
6. peserta membayar
7. admin atau sistem mengonfirmasi pembayaran
8. status invoice berubah
9. transaksi masuk tercatat di laporan keuangan

### 6.2 Alur Status Sederhana

`draft -> issued -> partially_paid -> paid -> cancelled`

Untuk pembayaran:

`pending -> submitted -> verified -> rejected`

Untuk cash movement:

- `cash_in`
- `cash_out`

## 7. Struktur Invoice yang Dibutuhkan

Invoice nanti harus bisa memuat:

- identitas event
- identitas peserta/perusahaan
- daftar booth yang dipesan
- add-on yang dipilih
- subtotal
- pajak atau biaya tambahan jika nanti dipakai
- total
- tujuan pembayaran
- due date
- status invoice

### 7.1 Item Invoice

Contoh item:

- `Zona VVIP`
- `Zona Premium`
- `Booth VIP 6`
- `Penambahan Daya Listrik`
- `Backdrop Branding`

Jadi invoice jangan disimpan sebagai satu angka total saja.

Yang benar:

- ada header invoice
- ada detail item invoice

Format tampilan detail invoice yang aktif:

- untuk `itemType = booth_booking`, judul tampilan bukan kode booth tunggal, melainkan `Zona {zone.name}`
- deskripsi booth memuat `Booth: {kode booth}` dan `Fasilitas: {daftar fasilitas}`
- jika satu invoice berisi lebih dari satu booth dalam zona/harga yang sama, baris tampilan bisa digabung dan daftar nomor booth ditampilkan di deskripsi
- untuk `itemType = addon`, judul memakai nama add-on
- deskripsi add-on memakai `event_addons.description`
- satuan add-on dari `addon_units.name` tidak menjadi deskripsi, tetapi digabung ke kolom Qty
- contoh Qty add-on: `1 KWH`, `1 Item`, `2 M²`
- format ini dipakai konsisten di halaman invoice publik dan detail invoice admin

## 8. Payment Channel

Karena user sudah jelas ingin beberapa cara pembayaran, payment channel harus dibuat sebagai entitas sendiri.

Jenis channel yang perlu disiapkan:

- `bank_account`
- `qris`
- `payment_gateway`

### 8.1 Bank Account

Field minimal:

- nama bank
- nomor rekening
- nama pemilik rekening
- label internal
- instruksi pembayaran
- status aktif

### 8.2 QRIS

Field minimal:

- label
- gambar QR atau URL asset
- instruksi pembayaran
- status aktif

### 8.3 Payment Gateway

Field minimal:

- provider
- mode `sandbox/live`
- credential reference
- instruksi fallback
- status aktif

Catatan:

- credential sensitif jangan disimpan sembarang di UI biasa
- sebaiknya dipisah ke secret/env atau vault nanti

## 9. Laporan Keuangan

Modul keuangan yang user minta tidak cukup hanya daftar invoice.

Harus ada dua laporan utama:

### 9.1 Laporan Uang Masuk

Sumber:

- pembayaran invoice yang tervalidasi

Field minimal:

- tanggal bayar
- nomor invoice
- nama perusahaan
- nominal
- channel pembayaran
- status verifikasi
- catatan admin

### 9.2 Laporan Uang Keluar

Sumber:

- pengeluaran operasional event

Field minimal:

- tanggal
- kategori pengeluaran
- deskripsi
- nominal
- metode bayar
- bukti pengeluaran
- PIC / pencatat

Catatan:

- uang keluar adalah domain berbeda dari invoice tenant
- jangan dicampur ke tabel payment masuk

## 10. Arsitektur Data

Bagian ini dibagi dua:

- struktur yang sudah aktif
- struktur target lanjutan yang belum dieksekusi

### 10.1 Order dan Invoice

`orders`

- id
- participantId
- businessId
- status
- notes

`order_items`

- id
- orderId
- itemType
- referenceId
- title
- description
- quantity
- unitPrice
- subtotal

`invoices`

- id
- orderId (nullable, untuk invoice manual)
- participantId (opsional)
- businessId (opsional)
- recipientName (untuk entitas luar)
- recipientEmail (untuk entitas luar)
- publicToken (token rahasia untuk akses publik URL)
- invoiceNumber
- issueDate
- dueDate
- subtotal
- taxAmount
- grandTotal
- paymentChannelId
- paymentChannelType
- paymentChannelLabel
- status
- paidAt
- notes

`invoice_items`

- id
- invoiceId
- itemType (custom, booth_booking, addon)
- referenceId
- title
- description
- quantity
- unitPrice
- subtotal

Status implementasi:

- `orders` dan `order_items` sudah aktif di tenant schema
- `invoices` dan `invoice_items` sudah berevolusi menjadi Universal Invoice (dapat dibuat dengan atau tanpa Order)
- `publicToken` sudah diimplementasikan untuk akses halaman public di `/invoice/[token]`

Catatan implementasi sekarang:

- satu invoice bisa dibentuk dari sekumpulan `booth_bookings`, atau diisi secara kustom menggunakan Form Tagihan Manual.
- `paymentChannelId`, `paymentChannelType`, dan `paymentChannelLabel` sudah disimpan langsung di invoice untuk kebutuhan operasional cepat.

### 10.2 Payment dan Konfirmasi

Struktur target semula:

`payments`

- id
- invoiceId
- paymentChannelId
- amount
- paidAt
- status
- method
- referenceNumber
- notes

`payment_confirmations`

- id
- paymentId
- submittedBy
- proofAssetId
- submittedAt
- verifiedAt
- verifiedBy
- status
- notes

Status implementasi sekarang:

- tabel lama `payments` di tenant schema masih ada sebagai legacy fondasi awal
- alur aktif yang sekarang dipakai adalah `invoice_payments`

`invoice_payments`

- id
- invoiceId
- paymentChannelId
- paymentChannelType
- paymentChannelLabel
- amount
- paidAt
- status
- method
- referenceNumber
- notes

Keputusan implementasi:

- untuk fase sekarang, admin menandai invoice langsung menjadi `paid`
- saat itu sistem membuat row `invoice_payments`
- `payment_confirmation` belum dibangun karena upload bukti dan verifikasi berlapis belum masuk fase ini

### 10.3 Cash Ledger

Sistem buku kas kini disatukan menjadi satu tabel universal:

`cashflow_ledger`

- id
- eventId
- type (`cash_in` atau `cash_out`)
- category (`invoice_payment`, `operational`, dll)
- amount
- description
- transactionDate
- referenceInvoiceId (FK ke invoices jika ada)
- referencePaymentId (FK ke invoice_payments jika ada)
- proofAssetId (opsional, bukti transfer/nota)
- createdBy
- createdAt
- updatedAt

Status Implementasi:
- Sudah aktif. Ketika invoice diubah statusnya menjadi `paid`, sebuah entri `cash_in` otomatis dibuat di `cashflow_ledger`.
- Halaman UI Buku Kas sudah tersedia di `/admin/keuangan/cashflow`.

## 11. Kenapa Order Harus Dipisah dari Invoice

Ini penting.

Kalau langsung `booth_booking -> invoice`, nanti cepat mentok saat:

- satu perusahaan booking lebih dari satu booth
- invoice memuat booth + add-on campuran
- invoice perlu diterbitkan ulang
- ada penyesuaian item

Jadi lebih aman:

- `order` sebagai konteks komersial
- `invoice` sebagai dokumen tagihan

Implementasi sekarang mengikuti keputusan ini.

## 12. Message Template Dependency

Finance membutuhkan message template untuk:

- invoice diterbitkan
- pengingat jatuh tempo
- pembayaran diverifikasi

Tetapi domain template sendiri dipisah ke:

- [arsitektur-event-setting.md](/Users/webane/sites/jalamandala/docs/arsitektur-event-setting.md:1)

## 13. Urutan Implementasi yang Disarankan

Urutan paling aman menurut saya:

### Fase 1: Event Setting Inti

- profil event
- payment channels
- whatsapp config
- message templates

### Fase 2: Order dan Invoice

- order
- order items
- invoice
- invoice items

### Fase 3: Pembayaran

- payment
- payment confirmation
- admin verification

### Fase 4: Laporan Keuangan

- cash in report
- cash out report
- summary dashboard

Alasan urutan ini:

- finance tanpa setting akan menggantung
- laporan tanpa invoice juga kosong
- invoice tanpa order akan cepat kusut

Status aktual:

- Fase 1 `Event Setting Inti`: sudah berjalan
- Fase 2 `Order dan Invoice`: sudah berjalan (booth booking + manual invoice)
- Fase 3 `Pembayaran`: sudah berjalan parsial
  - pilih metode bayar
  - tandai paid
  - simpan `invoice_payments`
- Fase 4 `Laporan Keuangan`: **berjalan parsial**
  - Buku Kas (cashflow ledger view) sudah ada di `/admin/keuangan/cashflow`
  - Cash in otomatis saat invoice paid
  - Cash out otomatis dari konfirmasi transfer pencairan dana
  - Form pencairan dana admin (`/admin/keuangan/pencairan`) sudah aktif
  - Portal vendor untuk ajukan pencairan mandiri sudah aktif

## 14. Status Sistem Saat Ini

### 14.1 File Implementasi Aktif

| File | Peran |
|------|-------|
| `apps/web/actions/finance.ts` | Server actions invoice + pembayaran |
| `apps/web/actions/disbursements.ts` | Server actions pencairan dana (CRUD + konfirmasi transfer) |
| `apps/web/app/admin/(protected)/keuangan/page.tsx` | Dashboard utama |
| `apps/web/app/admin/(protected)/keuangan/tambah-tagihan/page.tsx` | Universal Invoice Builder |
| `apps/web/app/admin/(protected)/keuangan/cashflow/page.tsx` | Buku Kas (dengan link ke pencairan) |
| `apps/web/app/admin/(protected)/keuangan/pencairan/page.tsx` | Daftar permohonan pencairan |
| `apps/web/app/admin/(protected)/keuangan/pencairan/tambah/page.tsx` | Form tambah pencairan admin |
| `apps/web/app/admin/(protected)/keuangan/pencairan/[id]/page.tsx` | Detail + konfirmasi transfer |
| `apps/web/components/admin/finance/FinanceDashboard.tsx` | Client component: tab + modal pembayaran |
| `apps/web/components/admin/finance/ManualInvoiceBuilder.tsx` | Client component: form tambah tagihan |
| `apps/web/components/admin/finance/DisbursementList.tsx` | Tabel pencairan + quick approve/reject |
| `apps/web/components/admin/finance/DisbursementForm.tsx` | Form pencairan admin + auto-fill rekening vendor |
| `apps/web/components/admin/finance/DisbursementDetail.tsx` | Detail + MediaPicker bukti transfer |
| `apps/web/app/invoice/[token]/page.tsx` | Halaman invoice publik |
| `packages/db/src/schema/tenant/finance.ts` | Schema DB tenant (termasuk disbursement tables) |
| `packages/db/src/provision-tenant.ts` | Provisioning tabel tenant |

### 14.2 Alur 1: Booking → Invoice → Payment

1. Admin booking booth di modul booth → masuk ke `booth_bookings` (status `booked`, `invoiceId` null)
2. Dashboard keuangan tab "Booking → Invoice" menampilkan kelompok booking per bisnis
3. Admin klik **"Buat Invoice"** → `createInvoiceFromBookedBooths(businessId)`:
   - Buat `orders` + `order_items`
   - Buat `invoices` (status `waiting_for_payment`) + `invoice_items`
   - Set `booth_bookings.invoiceId`
   - Nomor invoice: format `INV-FORBIS-YYYYMMDD-HHMM-XXXX`
   - Due date default: 7 hari setelah tanggal terbit
4. Admin klik ikon pensil → pilih metode bayar → `updateInvoicePaymentMethod()`
5. Admin klik **"Tandai Paid"** → `markInvoiceAsPaid()`:
   - Buat `invoice_payments` (status `verified`)
   - Set invoice `status = paid`, `paidAt`
   - Buat entri `cashflow_ledger` (type=`cash_in`, category=`invoice_payment`)
   - Update `orders.status = paid`

### 14.3 Alur 2: Universal Invoice Builder (`/admin/keuangan/tambah-tagihan`)

Form terdiri dari empat seksi:

1. **Identitas Transaksi**: pilih peserta → pilih bisnis → nama penerima, email, due date (opsional)
2. **Pilih Booth**: checkbox per booth berstatus `open`, harga dihitung otomatis per price group peserta
3. **Pilih Add-on**: checkbox + input kuantitas per addon event yang aktif
4. **Item Manual Opsional**: baris bebas (judul, deskripsi, qty, harga satuan)

Validasi: minimal satu item (booth/addon/item manual) wajib ada.

Submit → `createManualInvoice()`:
- Buat booth bookings + ubah status booth `open` → `booked`
- Buat `orders` (jika ada bisnis), `invoices`, `invoice_items`
- Status invoice langsung `waiting_for_payment`

### 14.4 Alur 3: Invoice Publik

1. Setiap invoice punya `publicToken` (UUID unik)
2. Admin buka ikon Wallet di dashboard → link `/invoice/{publicToken}` → bagikan ke peserta
3. Halaman publik (tanpa login):
   - Belum paid: tampil detail item + instruksi pembayaran (rekening/QRIS)
   - Sudah paid: tampil konfirmasi LUNAS + tanggal bayar
4. Rincian item publik sudah disamakan dengan detail invoice admin:
   - booth ditampilkan sebagai zona + nomor booth + fasilitas
   - add-on menampilkan deskripsi add-on
   - satuan add-on tampil di Qty
5. Mendukung cetak (print-optimized CSS)

### 14.5 Logika Harga Booth

Harga booth dihitung berdasarkan dua dimensi:

1. **Price group** peserta:
   - Slug grup organisasi = `"general"`: cek `isForbisMember` → `"forbis"` atau `"public"`
   - Selain itu: gunakan `defaultPriceGroup` dari booth group

2. **Fase harga** (prioritas tertinggi → terendah): `early_bird` → `pre_sale` → `regular`
   - Ambil rule pertama yang cocok dengan price group + fase
   - Fallback: rule manapun yang cocok price group
   - Default: 0

Resolusi harga dilakukan di server (`createManualInvoice`) dan client (`ManualInvoiceBuilder`) untuk preview.

### 14.6 Gap yang Masih Tersisa

| Gap | Keterangan |
|-----|-----------|
| Upload bukti bayar peserta | Kolom `proofOfTransferUrl` ada di schema, belum dipakai di UI |
| Pajak / diskon | `taxAmount` selalu 0, tidak ada field diskon terstruktur |
| Pembayaran parsial | Status `partially_paid` belum diimplementasikan |
| Notifikasi otomatis | WhatsApp / email saat invoice terbit atau lunas belum ada |
| Payment gateway | Midtrans dll belum dikerjakan |
| Reminder jatuh tempo | Belum dikerjakan |
| Add-on dari registrasi | Add-on peserta belum otomatis masuk ke invoice |
| Pembatalan invoice | Tidak ada flow cancel/revisi invoice |

## 15. Kesimpulan

`event setting` sudah cukup menopang finance dasar. Alur `order → invoice → payment` sudah aktif. Buku kas berjalan penuh: cash in otomatis dari pembayaran invoice, cash out otomatis dari konfirmasi transfer pencairan. Sistem pencairan dana (admin + portal vendor) sudah live dengan alur approval penuh. Yang belum: konfirmasi pembayaran berlapis dari peserta, upload bukti bayar peserta, add-on invoice otomatis, notifikasi WhatsApp, dan payment gateway.

---

## 16. Alur Uang Keluar — Pencairan Dana

> Status: **Live** — schema, server actions, admin UI, dan portal vendor sudah berjalan.

### 16.1 Konsep

Uang keluar tidak boleh dicatat langsung sebagai entri `cashflow_ledger` tanpa jejak persetujuan. Setiap pengeluaran harus melewati dua tahap:

1. **Permohonan Pencairan Dana** — pemohon mengisi form, finance menyetujui atau menolak.
2. **Konfirmasi Transfer** — finance mengisi bukti setelah uang benar-benar dikirim.

Baru setelah konfirmasi transfer selesai, entri `cash_out` otomatis masuk ke `cashflow_ledger`.

Alur ini berlaku untuk semua jenis pengeluaran:
- Pembayaran ke vendor (booth, add-on, logistik)
- Pengeluaran operasional (sewa venue, cetak materi, konsumsi)
- Refund atau pengembalian dana peserta

### 16.2 Status Flow

```
draft → submitted → approved → transferred
                 ↘            ↘
                  rejected     cancelled
```

| Status | Keterangan |
|--------|------------|
| `draft` | Disimpan tapi belum dikirim ke finance |
| `submitted` | Permohonan dikirim, menunggu approval |
| `approved` | Finance menyetujui, menunggu eksekusi transfer |
| `rejected` | Finance menolak, disertai alasan |
| `transferred` | Transfer sudah dilakukan, bukti terupload |
| `cancelled` | Dibatalkan oleh pemohon sebelum approved |

### 16.3 Struktur Data

Dua tabel baru di **tenant schema**:

#### 16.3.1 `disbursement_requests` — Permohonan Pencairan

```sql
CREATE TABLE disbursement_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pemohon
  requested_by        uuid NOT NULL,           -- FK ke public.user.id
  requested_by_name   text NOT NULL,           -- snapshot nama saat submit

  -- Tujuan
  purpose_type        text NOT NULL,           -- 'vendor' | 'operational' | 'refund' | 'other'
  purpose_description text NOT NULL,           -- keterangan bebas
  vendor_id           uuid,                    -- FK ke public.vendors.id jika purpose_type = 'vendor'
  vendor_addon_ref    text,                    -- referensi add-on/zona yang dibayar (opsional)

  -- Jumlah
  requested_amount    integer NOT NULL,        -- jumlah yang diminta (dalam rupiah)

  -- Rekening tujuan
  dest_bank_name      text NOT NULL,
  dest_account_number text NOT NULL,
  dest_account_name   text NOT NULL,

  -- Approval
  status              text NOT NULL DEFAULT 'draft',
  approved_by         uuid,                    -- FK ke public.user.id
  approved_by_name    text,
  approved_at         timestamp,
  rejected_by         uuid,
  rejected_by_name    text,
  rejected_at         timestamp,
  rejection_reason    text,

  -- Meta
  notes               text,
  event_id            uuid NOT NULL,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now()
);
```

#### 16.3.2 `disbursement_transfers` — Konfirmasi Transfer

Diisi oleh finance setelah transfer benar-benar dilakukan. Satu-ke-satu dengan `disbursement_requests` yang sudah `approved`.

```sql
CREATE TABLE disbursement_transfers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid NOT NULL REFERENCES disbursement_requests(id) ON DELETE CASCADE,

  -- Detail transfer aktual
  transferred_at      timestamp NOT NULL,      -- waktu transfer dilakukan
  source_channel_id   uuid,                    -- payment channel yang dipakai (nullable, bisa kas fisik)
  source_channel_label text,                   -- snapshot label channel (BCA, Mandiri, dll)
  dest_bank_name      text NOT NULL,           -- bisa beda dengan request jika dikoreksi
  dest_account_number text NOT NULL,
  dest_account_name   text NOT NULL,
  gross_amount        integer NOT NULL,        -- jumlah sebelum dipotong biaya
  transfer_fee        integer NOT NULL DEFAULT 0,  -- biaya transfer (beda bank, dll)
  net_amount          integer NOT NULL,        -- gross_amount - transfer_fee (yg diterima penerima)

  -- Bukti
  proof_asset_url     text,                    -- URL file bukti transfer (MinIO)

  -- Siapa yang mengeksekusi
  transferred_by      uuid NOT NULL,
  transferred_by_name text NOT NULL,

  created_at          timestamp NOT NULL DEFAULT now()
);
```

#### 16.3.3 Dampak ke `cashflow_ledger`

Saat `disbursement_transfers` berhasil dibuat (transfer dikonfirmasi), sistem otomatis insert ke `cashflow_ledger`:

```
type        = 'cash_out'
category    = purpose_type  (vendor / operational / refund / other)
amount      = gross_amount  (jumlah yang keluar dari kas kita)
description = purpose_description
reference_disbursement_id = disbursement_requests.id
```

Kolom `reference_disbursement_id` perlu ditambahkan ke `cashflow_ledger` (saat ini hanya ada `referenceInvoiceId` dan `referencePaymentId`).

### 16.4 Alur Operasional Detail

#### Tahap 1: Pemohon Mengisi Form

Halaman: `/admin/keuangan/pencairan/tambah`

Form field:
| Field | Keterangan |
|-------|------------|
| Tujuan | Pilih tipe: Vendor / Operasional / Refund / Lainnya |
| Vendor | Dropdown vendor aktif (muncul jika tipe = Vendor) |
| Referensi add-on/zona | Teks bebas — misal "Pembayaran Daya Listrik bulan Mei" |
| Deskripsi | Keterangan lengkap permohonan |
| Jumlah | Nominal dalam rupiah |
| Bank tujuan | Nama bank, nomor rekening, nama pemilik |
| Catatan | Opsional |

Pemohon bisa save sebagai `draft` atau langsung `submitted`.

#### Tahap 2: Finance Approval

Halaman: `/admin/keuangan/pencairan` — daftar semua permohonan dengan filter status.

Aksi yang tersedia per baris:
- **Setujui** → status → `approved`, isi `approved_by`, `approved_at`
- **Tolak** → status → `rejected`, wajib isi alasan penolakan

#### Tahap 3: Konfirmasi Transfer

Muncul setelah status `approved`. Finance mengisi form konfirmasi:

| Field | Keterangan |
|-------|------------|
| Waktu transfer | DateTime picker |
| Rekening sumber | Pilih dari payment channels (atau kas fisik) |
| Rekening tujuan | Pre-fill dari request, bisa dikoreksi |
| Jumlah transfer | Pre-fill dari `requested_amount` |
| Biaya transfer | Input potongan (default 0) — net amount dihitung otomatis |
| Bukti transfer | Upload file (JPG/PNG/PDF) ke MinIO |

Submit → buat `disbursement_transfers` → set `disbursement_requests.status = transferred` → insert `cashflow_ledger` cash_out.

### 16.5 Integrasi dengan Modul Vendor

Ketika `purpose_type = 'vendor'`:
- Dropdown pilih vendor dari `public.vendors` (filter by event)
- Judul otomatis diisi: `Pembayaran ke {vendor.name}`
- Field `vendor_id` tersimpan sehingga bisa di-filter di laporan vendor
- Data rekening vendor di-prefill jika ada (saat ini vendor belum punya field rekening bank — akan ditambahkan ke `public.vendors`)

**Field yang akan ditambahkan ke `public.vendors`:**
```sql
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS bank_account_name text;
```

Admin vendor sudah ada, cukup tambahkan tiga field ini ke form edit vendor.

### 16.6 Tampilan di Buku Kas

Halaman `/admin/keuangan/cashflow` sudah ada. Setelah fitur ini aktif:
- Entri `cash_out` dengan category `vendor` / `operational` / `refund` otomatis muncul
- Kolom baru: "Ref. Pencairan" yang link ke detail `disbursement_requests`
- Filter baru: filter by category

### 16.7 File Implementasi

| File | Keterangan |
|------|------------|
| `packages/db/src/schema/tenant/finance.ts` | Tabel `disbursement_requests` + `disbursement_transfers` |
| `packages/db/src/schema/public/vendors.ts` | Kolom `bank_name`, `bank_account`, `bank_account_name` di tabel vendors |
| `packages/db/src/provision-tenant.ts` | CREATE TABLE disbursement + ALTER cashflow_ledger (reference_disbursement_id) |
| `packages/db/src/provision-public.ts` | ALTER vendors (bank fields) |
| `apps/web/actions/disbursements.ts` | getDisbursements, getDisbursement, createDisbursement, approveDisbursement, rejectDisbursement, cancelDisbursement, confirmTransfer, getVendorsForDisbursement, getPaymentChannelsForDisbursement, getVendorDisbursements, createVendorDisbursementRequest, cancelVendorDisbursement |
| `apps/web/app/admin/(protected)/keuangan/pencairan/page.tsx` | Daftar permohonan + summary cards |
| `apps/web/app/admin/(protected)/keuangan/pencairan/tambah/page.tsx` | Form pencairan admin (semua tipe) |
| `apps/web/app/admin/(protected)/keuangan/pencairan/[id]/page.tsx` | Detail + approval/reject + konfirmasi transfer |
| `apps/web/components/admin/finance/DisbursementList.tsx` | Tabel + quick approve/reject inline |
| `apps/web/components/admin/finance/DisbursementForm.tsx` | Form permohonan + auto-fill rekening vendor |
| `apps/web/components/admin/finance/DisbursementDetail.tsx` | Detail + MediaPicker bukti transfer + PaymentProofPreviewButton |
| `apps/web/app/expo/vendor/(protected)/pencairan/page.tsx` | Halaman pencairan di portal vendor |
| `apps/web/components/vendor/VendorPencairanPage.tsx` | UI rekening bank + form ajukan + riwayat vendor |

### 16.8 Catatan Teknis

- Bukti transfer disimpan sebagai **asset ID media library** (bukan URL langsung), agar bisa dipreview via `PaymentProofPreviewButton` di `/api/media/{id}`.
- `cashflow_ledger.reference_disbursement_id` terisi otomatis saat `confirmTransfer()`.
- `getVendorClaimableAmount()` hanya menghitung disbursement dengan `status = 'transferred'` sebagai "sudah dicairkan" — bukan draft/submitted/approved.
- Satu vendor bisa ajukan lebih dari satu request; saldo terpotong hanya setelah transfer dikonfirmasi.
- Cache `globalThis.__jalamandalaTenantDbs` — jika ada kolom baru di tenant schema, dev server harus di-restart agar `.query.*` API terupdate.
