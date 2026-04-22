# Arsitektur QRIS Dinamis
> Revisi aktif untuk codebase Jalamandala saat ini. Fokus dokumen ini adalah: pengelolaan QRIS di admin setting, ekstraksi payload dari gambar QR, dan penggunaan QRIS dinamis bernominal di invoice publik.

---

## 1. Tujuan

Modul QRIS dibuat untuk memenuhi dua kebutuhan utama:

1. admin cukup upload atau paste QRIS merchant, lalu sistem otomatis membaca dan mengekstrak data merchant
2. invoice publik menampilkan QRIS yang **sudah terisi nominal tagihan**, sehingga participant tinggal scan dan bayar

Target akhirnya:

- admin tidak perlu mengisi data merchant secara manual
- merchant identity tersimpan rapi di event setting
- participant tidak perlu mengetik nominal sendiri saat scan QRIS
- alur tetap bisa berjalan tanpa payment gateway berbayar

Catatan penting:

- fase ini **bukan auto settlement**
- status pembayaran tetap diverifikasi melalui bukti bayar / approval admin
- QRIS di sini adalah **instrumen pembayaran**, bukan sumber kebenaran status lunas

---

## 2. Posisi di Sistem Saat Ini

QRIS menempel ke event, bukan ke tenant schema.

Sumber data aktif:

- `public.qris_configs`
- `public.media_assets`
- `public.media_usages`
- invoice publik dari tenant schema

Komponen sistem yang terkait:

- halaman admin `/admin/setting`
- halaman invoice publik `/invoice/[token]`
- media library untuk upload gambar QRIS
- finance / invoice untuk instruksi pembayaran

---

## 3. Sumber Kebenaran

Untuk QRIS, sumber kebenaran yang benar adalah:

- `qris_configs.emvPayload`

Bukan:

- gambar QRIS
- merchant name hasil input manual

Maknanya:

- gambar QRIS hanya media bantu
- merchant name dan city adalah hasil parse
- payload EMV adalah data utama yang dipakai untuk generate QR per-invoice

Jadi hierarki kebenarannya:

1. `emvPayload`
2. hasil parse dari payload (`merchantName`, `merchantCity`)
3. gambar QRIS (`imageAssetId`) sebagai preview/fallback visual

---

## 4. Model Data Aktif

Tabel yang dipakai:

### 4.1 `public.qris_configs`

Kolom penting:

- `event_id`
- `is_enabled`
- `emv_payload`
- `merchant_name`
- `merchant_city`
- `image_asset_id`
- `expiry_minutes`

Makna:

- `emv_payload`: payload EMV QRIS statis merchant
- `merchant_name`: hasil parse, readonly dari sisi admin
- `merchant_city`: hasil parse, readonly dari sisi admin
- `image_asset_id`: asset gambar QRIS di media library
- `expiry_minutes`: masa berlaku tampilan QR invoice, lebih ke UX/cosmetic

### 4.2 `public.media_assets`

Dipakai untuk menyimpan gambar QRIS yang diupload admin.

Rekomendasi visibility:

- `public`

Karena gambar QRIS statis bukan data sensitif tingkat private, dan dipakai untuk preview atau fallback di invoice publik.

### 4.3 `public.media_usages`

Saat gambar QRIS dipakai di event setting, wajib tercatat:

- `module = 'qris'`
- `entity_type = 'qris_config'`
- `entity_id = {qrisConfigId}`
- `field_name = 'qris_image'`

---

## 5. Alur Admin Setting

Halaman:

- `/admin/setting`

Lokasi UI:

- tab / section pembayaran
- sub-section QRIS

### 5.1 Input yang didukung

Admin bisa mengisi QRIS dengan dua cara:

1. upload gambar QRIS
2. paste EMV payload manual

Keduanya boleh ada, tetapi sistem tetap menganggap `emvPayload` sebagai data utama.

### 5.2 Alur upload gambar QRIS

Alur yang benar:

1. admin upload gambar QRIS ke media library
2. sistem decode isi QR dari gambar
3. sistem extract string EMV payload
4. sistem parse field merchant
5. UI auto-fill:
   - `emvPayload`
   - `merchantName`
   - `merchantCity`
6. admin simpan konfigurasi QRIS

Kalau decode gagal:

- gambar tetap boleh tersimpan sebagai asset
- tapi QRIS tidak boleh dianggap valid untuk dipakai di invoice sampai payload berhasil terbaca atau diisi manual

### 5.3 Alur paste payload manual

Alur:

1. admin paste payload EMV
2. sistem parse payload
3. UI menampilkan:
   - merchant name
   - merchant city
4. admin simpan

### 5.4 Validasi admin setting

Saat QRIS diaktifkan:

- `emvPayload` wajib ada
- payload harus lolos parse dasar
- merchant name dan city harus bisa diambil atau minimal payload valid

Jika `is_enabled = true` dan payload kosong / invalid:

- konfigurasi tidak boleh disimpan sebagai aktif

---

## 6. Parsing dan Ekstraksi QRIS

### 6.1 Dua lapis parsing

Sistem butuh dua lapis:

1. **decode QR image -> string**
2. **parse EMV string -> struktur TLV**

Jangan dicampur.

### 6.2 Hasil minimum dari parser

Parser perlu mengembalikan minimal:

- `merchantName`
- `merchantCity`
- `rawPayload`
- `isValid`
- `errorMessage`

### 6.3 Fungsi yang dibutuhkan secara arsitektural

Service QRIS minimal harus punya fungsi:

- `decodeQrisImage(file | asset)` -> payload string
- `parseQrisPayload(payload)` -> metadata merchant + tag map
- `generateDynamicQrisPayload(payload, amount)` -> payload final invoice
- `renderQrisImage(payload)` -> data URL / SVG / PNG untuk frontend

---

## 7. QRIS Dinamis untuk Invoice Publik

### 7.1 Prinsip utama

Invoice publik **tidak** menampilkan QRIS statis mentah.

Yang benar:

- invoice membaca `emvPayload` dari `qris_configs`
- sistem membuat QRIS baru per invoice dengan nominal tagihan

Jadi QR yang tampil di participant adalah:

- QRIS merchant yang sama
- tetapi sudah diinjeksi nominal invoice

### 7.2 Sumber nominal

Nominal yang dipakai harus berasal dari invoice.

Prioritas:

1. `balance due` jika nanti partial payment didukung
2. `grandTotal` untuk kondisi saat ini

Jangan ambil nominal dari input frontend.

### 7.3 Hasil yang diharapkan di sisi participant

Saat participant scan:

- merchant sudah benar
- nominal sudah otomatis terisi
- user tinggal klik bayar

Itu berarti invoice publik harus merender:

- QR image hasil generate runtime
- nominal tagihan
- merchant name
- instruksi singkat

### 7.4 Jika QRIS tidak siap

Jika:

- `qris_configs.is_enabled = false`
- payload tidak valid
- invoice sudah `paid`

Maka frontend invoice publik:

- tidak menampilkan QRIS dinamis
- fallback ke metode pembayaran lain

---

## 8. Transformasi Payload QRIS

Konsep transformasi:

1. parse payload QRIS statis
2. ubah mode static menjadi dynamic
3. inject nominal invoice
4. hitung ulang CRC
5. hasilkan payload baru
6. render QR baru untuk invoice

### 8.1 Aturan umum

Payload dinamis invoice:

- tidak disimpan permanen ke database
- digenerate saat runtime

Alasan:

- nominal bergantung invoice
- QR harus selalu sesuai nilai tagihan terbaru
- menghindari penyimpanan snapshot QR yang cepat basi

### 8.2 Output runtime

Service runtime sebaiknya mengembalikan:

- `payload`
- `qrDataUrl` atau `qrSvg`
- `amount`
- `merchantName`
- `merchantCity`
- `expiresAt`

`expiresAt` di fase ini boleh bersifat UX-only, bukan hard security guarantee.

---

## 9. Integrasi ke Invoice Publik

Halaman terkait:

- `/invoice/[token]`

### 9.1 Behaviour invoice publik

Jika invoice:

- belum `paid`
- QRIS aktif
- payload valid

Maka invoice publik menampilkan section:

- judul metode: `QRIS`
- merchant name
- QR dinamis
- nominal tagihan
- catatan bahwa nominal sudah terkunci

### 9.2 Status pembayaran

Setelah participant bayar:

- participant tetap perlu kirim bukti bayar jika sistem belum punya callback otomatis
- admin/verifikator tetap melakukan approval

Jadi alurnya:

`invoice issued -> QRIS dibayar -> bukti bayar masuk -> diverifikasi -> invoice paid`

---

## 10. Integrasi ke Admin Keuangan

Modul yang terkait:

- `/admin/keuangan`
- `/admin/keuangan/[invoiceId]`

Admin keuangan perlu bisa melihat:

- metode bayar QRIS
- nominal invoice
- bukti bayar jika ada
- status verifikasi

QRIS tidak mengubah prinsip finance yang sudah ada:

- invoice tetap sumber kebenaran tagihan
- payment record tetap sumber kebenaran pelunasan

---

## 11. Media Library Contract

Jika admin upload QRIS image:

- asset disimpan di media library
- folder/prefix yang direkomendasikan:
  - `public/qris`
- usage dicatat
- jika gambar diganti:
  - usage lama dibersihkan atau diperbarui
  - usage baru dipasang

QRIS image boleh dipakai sebagai:

- preview di admin setting
- fallback visual di invoice jika generator dinamis gagal

Tetapi fallback ini bukan target utama.

Target utama tetap:

- generate QR dinamis dari payload

---

## 12. Error Handling

Kasus yang harus ditangani:

### 12.1 Saat admin setting

- gambar QR tidak bisa di-decode
- payload hasil decode invalid
- payload manual invalid
- merchant name/city tidak terbaca

Perilaku:

- tampilkan error jelas
- jangan aktifkan QRIS jika payload invalid

### 12.2 Saat invoice publik

- event belum punya QRIS aktif
- invoice sudah paid
- nominal invoice nol / invalid
- generator payload gagal

Perilaku:

- sembunyikan metode QRIS
- tampilkan metode bayar lain
- jangan kirim QR rusak ke participant

---

## 13. Keputusan Arsitektural

Keputusan penting yang harus dipakai agent implementasi:

1. `emvPayload` adalah source of truth
2. QRIS image hanyalah helper visual dan input helper
3. merchant info berasal dari parse payload, bukan input manual bebas
4. QRIS invoice bersifat runtime-generated per invoice
5. nominal QRIS selalu berasal dari invoice, bukan input user
6. status `paid` tidak otomatis hanya karena QR ditampilkan
7. bukti bayar dan approval admin tetap menjadi bagian alur

---

## 14. Urutan Implementasi yang Benar

Urutan yang disarankan:

1. rapikan service parser QRIS
2. tambahkan decode image -> payload di admin setting
3. simpan payload + merchant parse result ke `qris_configs`
4. buat service generator QRIS dinamis per nominal
5. sambungkan ke invoice publik
6. evaluasi UX pembayaran dan bukti bayar

Alasannya:

- admin setting adalah fondasi data
- invoice publik tidak boleh dikerjakan sebelum source of truth QRIS stabil

---

## 15. Ringkasan

Dalam sistem ini, QRIS harus dipahami sebagai:

- konfigurasi pembayaran level event
- berbasis payload EMV sebagai sumber utama
- bisa diinput melalui gambar QR atau payload manual
- dipakai untuk menghasilkan QR dinamis per invoice

Jadi output yang kita incar adalah:

- admin upload QRIS -> sistem langsung mengenali merchant
- participant buka invoice -> scan QR -> nominal sudah otomatis siap dibayar

Tanpa itu, pengalaman QRIS akan terasa setengah jadi.
