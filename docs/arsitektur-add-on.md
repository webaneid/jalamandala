# Arsitektur Add-on
> Dokumen konteks aktif sistem add-on FORBIS Expo. Fokus dokumen ini adalah state add-on yang sekarang berjalan di admin dan tenant schema.

## 1. Tujuan

Sistem add-on dibuat untuk menampung kebutuhan tambahan di luar harga booth dasar.

Contoh:

- penambahan daya listrik
- tambahan area atau panel
- kebutuhan item operasional tertentu

Data add-on harus:

- dinamis
- bisa ditambah dan dikurangi dari admin
- punya satuan yang juga dinamis
- siap dipakai nanti di flow registrasi dan invoice

## 2. Bahasa Domain

Istilah yang dipakai:

- `addon_unit`: satuan add-on, misalnya `KWH`, `M²`, `Item`
- `event_addon`: master katalog add-on untuk event aktif
- `registration_addon`: add-on yang dipilih pada level registrasi

Hubungan utamanya:

- satu `event_addon` memakai satu `addon_unit`
- satu `registration` bisa memiliki banyak `registration_addon`
- `registration_addon` menyimpan `priceSnapshot` agar histori harga tetap aman

## 3. Sumber Kebenaran Saat Ini

Sumber kebenaran add-on sekarang ada di tenant schema:

- `addon_units`
- `event_addons`
- `registration_addons`

Admin UI yang aktif:

- `/admin/addon`

Server actions yang aktif:

- `upsertAddonUnit`
- `deleteAddonUnit`
- `upsertEventAddon`
- `deleteEventAddon`

## 4. Model Data Aktif

### 4.1 `addon_units`

Master dinamis untuk satuan add-on.

Kolom penting:

- `id`
- `slug`
- `name`
- `description`
- `sortOrder`
- `isActive`

Fungsi:

- supaya satuan tidak hardcoded
- supaya admin bisa menambah satuan baru sesuai kebutuhan event

Contoh satuan yang sekarang diseed:

- `KWH`
- `M2`
- `Item`
- `100x100cm`

Catatan tampilan:

- di UI, `M2` dirender sebagai `M²`
- di DB, nilainya tetap tersimpan sebagai teks biasa

### 4.2 `event_addons`

Master katalog add-on tenant untuk event aktif.

Kolom penting:

- `id`
- `name`
- `description`
- `addonUnitId`
- `price` — harga jual ke peserta (harga FORBIS)
- `vendorPrice` — HPP / harga vendor (nullable). Biaya yang FORBIS bayarkan ke vendor add-on.
- `sortOrder`
- `isActive`

Makna:

- add-on adalah item tambahan di luar harga booth dasar
- add-on disusun di level event, bukan menempel permanen ke satu booth tertentu
- selisih `price - vendorPrice` adalah keuntungan FORBIS per unit (sistem bagi hasil)

Contoh row aktif saat ini:

- `Penambahan Daya Listrik`
  - satuan: `KWH`
  - harga jual: `Rp 100.000`
  - harga vendor (HPP): dikonfigurasi per event

### 4.3 `registration_addons`

Pivot add-on yang dipilih pada registrasi.

Kolom penting:

- `registrationId`
- `addonId`
- `quantity`
- `priceSnapshot`

Fungsi:

- menyimpan add-on yang dipilih tenant
- menjaga harga historis walaupun katalog berubah di masa depan

Status saat ini:

- tabel sudah ada
- UI pemilihan add-on di registrasi belum disambungkan
- **Catatan penting:** tabel ini kosong dalam praktik — data order add-on aktual tersimpan di `order_items` (tenant schema), bukan di sini

### 4.4 `order_items` (Sumber Kebenaran Aktual Order Add-on)

Meskipun `registration_addons` ada di schema, **sumber kebenaran aktual** untuk add-on yang dipesan peserta adalah `order_items`:

- `item_type = 'addon'`
- `reference_id = event_addons.id` (disimpan sebagai text, bukan FK)
- `quantity`, `subtotal`, `title`

Seluruh fitur vendor add-on, laporan margin, dan kalkulasi pencairan dana menggunakan `order_items`, bukan `registration_addons`.

## 5. Data yang Disimpan di Add-on

Setiap add-on sekarang menyimpan:

- `title` atau nama
- `description`
- `price`
- `unit`
- `status aktif/nonaktif`

Contoh kebutuhan user:

- `Penambahan daya listrik`
- `100 KWH`
- `Rp 100.000`

Di implementasi saat ini:

- angka kuantitas seperti `100` belum dimodelkan sebagai field master terpisah
- yang disimpan adalah harga per satuan add-on
- kuantitas nanti masuk di level `registration_addons.quantity`

Jadi model aktif sekarang lebih aman:

- katalog menyimpan harga per unit
- registrasi menyimpan quantity

## 6. Seed Aktif Saat Ini

Seed default add-on berasal dari `packages/db/src/seed-booths.ts`.

Satuan default:

- `KWH`
- `M2`
- `Item`
- `100x100cm`

Add-on contoh:

- `Penambahan Daya Listrik`
  - harga: `100000`
  - satuan: `KWH`

## 7. Admin UI Aktif

Halaman admin add-on sekarang memakai pola utilitarian:

- tabel daftar add-on
- tabel daftar satuan
- tombol `Tambah Add-on`
- tombol `Tambah Satuan`
- edit lewat popup
- hapus langsung dari tabel

Alasan desain:

- lebih cocok untuk backoffice
- cepat dibaca
- tidak membuang ruang untuk card dekoratif

### 7.1 Tabel Add-on

Kolom yang ditampilkan:

- judul
- deskripsi
- satuan
- **harga vendor (HPP)**
- **harga jual**
- **margin** (Rp + %, ditampilkan dengan warna emerald jika positif)
- status
- aksi

### 7.2 Tabel Satuan

Kolom yang ditampilkan:

- nama
- slug
- deskripsi
- status
- aksi

### 7.3 Popup Form

Popup add-on:

- judul
- deskripsi
- **harga vendor (HPP)** — kolom kiri
- **harga jual** — kolom kanan (2-col grid)
- **preview margin** — live card: margin rupiah + persen, muncul otomatis jika keduanya diisi
- satuan
- status

Popup satuan:

- nama
- deskripsi
- status

## 8. Server Action Aktif

### 8.1 `upsertAddonUnit`

Fungsi:

- tambah atau edit satuan
- membuat slug otomatis dari nama
- mencegah duplikasi slug

### 8.2 `deleteAddonUnit`

Fungsi:

- hapus satuan

Proteksi:

- ditolak jika satuan masih dipakai `event_addons`

### 8.3 `upsertEventAddon`

Fungsi:

- tambah atau edit katalog add-on
- validasi satuan wajib dipilih
- simpan harga integer (`price` dan `vendorPrice`)
- `vendorPrice` nullable — jika tidak diisi, margin tidak dihitung

### 8.4 `deleteEventAddon`

Fungsi:

- hapus katalog add-on

Proteksi:

- ditolak jika add-on sudah dipakai di `registration_addons`
- dalam kasus itu add-on sebaiknya dinonaktifkan, bukan dihapus

## 9. File Implementasi Penting

Schema:

- [packages/db/src/schema/tenant/booths.ts](/Users/webane/sites/jalamandala/packages/db/src/schema/tenant/booths.ts:1) — `event_addons` termasuk `vendorPrice`
- [packages/db/src/schema/tenant/registrations.ts](/Users/webane/sites/jalamandala/packages/db/src/schema/tenant/registrations.ts:1)

Provision dan seed:

- [packages/db/src/provision-tenant.ts](/Users/webane/sites/jalamandala/packages/db/src/provision-tenant.ts:1)
- [packages/db/src/seed-booths.ts](/Users/webane/sites/jalamandala/packages/db/src/seed-booths.ts:1)

UI dan action:

- [apps/web/actions/addons.ts](/Users/webane/sites/jalamandala/apps/web/actions/addons.ts:1) — `upsertEventAddon` menyimpan `vendorPrice`
- [apps/web/app/admin/(protected)/addon/page.tsx](/Users/webane/sites/jalamandala/apps/web/app/admin/(protected)/addon/page.tsx:1) — termasuk `getMarginReport()`
- [apps/web/components/admin/addon/AddonConfiguration.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/addon/AddonConfiguration.tsx:1) — form dengan vendor price + live margin preview
- [apps/web/components/admin/addon/AddonMarginReport.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/addon/AddonMarginReport.tsx:1) — laporan bagi hasil FORBIS

## 10. Keputusan Teknis Penting

- satuan add-on dibuat dinamis, bukan enum statis
- katalog add-on dibuat di level event, bukan hardcoded di UI
- harga add-on disimpan sebagai integer rupiah
- quantity add-on tidak disimpan di master, tetapi di level registrasi
- add-on yang sudah pernah dipakai registrasi tidak boleh dihapus sembarangan

## 11. Gap yang Masih Terbuka

Yang sudah jalan:

- schema satuan add-on dinamis
- schema katalog add-on dinamis
- admin UI tabel + popup
- proteksi hapus dasar
- seed satuan default

Yang belum final:

- pemilihan add-on di flow registrasi tenant
- quantity add-on di UI registrasi
- subtotal invoice yang menjumlahkan booth + add-on
- aturan pajak atau surcharge di atas add-on
- sorting manual add-on dari admin
- pencarian dan filter di halaman add-on

## 12. Kesimpulan

Sistem add-on sekarang sudah siap sebagai fondasi konfigurasi:

- admin bisa mengelola satuan
- admin bisa mengelola katalog add-on
- add-on sudah punya relasi ke registrasi untuk langkah berikutnya

Langkah berikutnya yang paling masuk akal adalah menghubungkan katalog ini ke flow registrasi, lalu menghitung total invoice dari `booth + add-ons + pajak`.
