# Arsitektur Booth
> Dokumen konteks aktif sistem booth FORBIS Expo. Fokus dokumen ini adalah keadaan sistem yang sekarang berjalan, bukan sejarah refactor lama.

## 1. Tujuan

Sistem booth dibuat untuk mendukung alur berikut:

- admin mengelola zona dan booth
- admin melihat denah booth per zona
- admin mengatur group, category, dan status booth
- admin memilih perusahaan peserta saat booth dibooking
- sistem membuat relasi booking antara booth dan usaha
- harga dasar booth diambil dari aturan harga zona

Dokumen ini menjadi sumber konteks untuk:

- schema database tenant
- relasi ke data peserta/usaha
- aturan harga
- renderer denah admin
- seed booth aktif
- gap yang belum dikerjakan

## 2. Bahasa Domain

Istilah yang dipakai:

- `zone`: area besar seperti `VVIP`, `VIP`, `Premium`, `Festival West`, `Festival North`
- `booth`: unit fisik yang bisa dibooking
- `booth booking`: relasi okupansi booth oleh usaha tertentu
- `participant`: orang pendaftar
- `business`: usaha/perusahaan milik participant

Relasi utamanya:

- satu `participant` bisa punya banyak `business`
- satu `business` bisa booking lebih dari satu `booth`
- satu `booth` hanya boleh punya satu booking aktif

Jadi alur domain yang dipakai sekarang adalah:

- `participant -> business -> booth_booking -> booth -> zone`

## 3. Sumber Kebenaran Saat Ini

Sistem aktif sekarang memakai schema tenant yang sudah direfactor. Sumber kebenaran utamanya:

- master zona di `zones`
- master booth di `booths`
- master group booth di `booth_groups`
- master category booth di `booth_categories`
- matrix harga zona di `zone_price_rules`
- master fasilitas di `booth_facility_catalog`
- relasi fasilitas booth di `booth_facilities`
- okupansi booth di `booth_bookings`
- master satuan add-on di `addon_units`
- master katalog add-on di `event_addons`
- relasi add-on terpilih di `registration_addons`

Data perusahaan peserta diambil dari schema public:

- `participant_businesses`

Halaman admin yang memakai sistem ini:

- `/admin/booth`
- `/admin/addon`

## 4. Model Data Aktif

### 4.1 `zones`

Master area booth.

Kolom penting:

- `id`
- `name`
- `slug`
- `description`
- `location`
- `colorCode`
- `sortOrder`
- `isActive`

Zona aktif saat ini:

- `vvip`
- `vip`
- `premium`
- `festival-west`
- `festival-north`

Catatan:

- `Festival South` tidak dipakai
- booth selalu menempel tepat ke satu zona

### 4.2 `booth_groups`

Master dinamis untuk peruntukan booth.

Makna:

- group menjawab pertanyaan: booth ini diperuntukkan untuk siapa

Seed aktif saat ini:

- `general` -> Umum
- `forbis`
- `fpag`
- `formaqin`
- `sponsor`
- `gontor`

Kolom penting:

- `slug`
- `name`
- `description`
- `defaultPriceGroup`
- `sortOrder`
- `isActive`

Catatan:

- `boothGroup` berbeda dari `priceGroup`
- `boothGroup` dipakai untuk hak/peruntukan booth
- `defaultPriceGroup` dipakai sebagai petunjuk kalkulasi harga saat booking

### 4.3 `booth_categories`

Master dinamis untuk kategori penggunaan booth.

Makna:

- category menjawab pertanyaan: jenis aktivitas atau produk apa yang boleh masuk ke booth ini

Seed aktif saat ini:

- `free` -> bebas untuk apa pun
- `non_fnb` -> selain makanan dan minuman
- `fnb_dry_food`
- `fnb_kitchen`

Kolom penting:

- `slug`
- `name`
- `description`
- `sortOrder`
- `isActive`

### 4.4 `booths`

Master unit fisik booth.

Kolom penting:

- `zoneId`
- `boothGroupId`
- `boothCategoryId`
- `code`
- `name`
- `description`
- `status`
- `sortOrder`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `shape`
- `notes`
- `isActive`

Status aktif saat ini:

- `open`
- `booked`

Catatan:

- `status` dipakai untuk UI dan penyimpanan state booth
- metadata visual koordinat masih tetap disimpan meskipun beberapa zona sekarang dirender dengan layout UI khusus

### 4.5 `zone_price_rules`

Matrix harga per zona.

Satu row mewakili kombinasi:

- `zoneId`
- `priceGroup`
- `pricePhase`

Kolom penting:

- `priceGroup`
- `pricePhase`
- `price`
- `currency`
- `startsAt`
- `endsAt`
- `isActive`

Fase harga aktif:

- `early_bird`
- `pre_sale`
- `regular`

Group harga aktif:

- `forbis`
- `public`
- `sponsor`

Distribusi group harga:

- `VVIP`: `sponsor`, `forbis`, `public`
- zona lain: `forbis`, `public`

### 4.6 `booth_facility_catalog`

Master fasilitas dinamis.

Fasilitas default yang diseed saat ini:

- `Listrik`
- `Tenda 2 muka`
- `Meja 1, kursi 1`
- `Ukuran 2x2M`

### 4.7 `booth_facilities`

Pivot fasilitas per booth.

Model ini dipakai supaya fasilitas tidak hardcoded jadi kolom tetap.

Contoh:

- `Ukuran 2x2M` bisa punya `value`
- fasilitas lain bisa hanya berupa nama

### 4.8 `booth_bookings`

Relasi booking aktif antara usaha dan booth.

Kolom penting:

- `boothId`
- `participantId`
- `businessId`
- `bookingStatus`
- `priceCategory`
- `basePrice`
- `finalPrice`
- `invoiceId`
- `notes`
- `bookedAt`

Catatan:

- booking dibuat saat admin mengubah booth menjadi `booked`
- booking dihapus saat booth dikembalikan ke `open`

### 4.9 `addon_units`

Master dinamis untuk satuan add-on.

Tujuan:

- agar add-on tidak hardcoded ke satuan tertentu
- admin bisa menambah satuan baru sesuai kebutuhan event

Kolom penting:

- `slug`
- `name`
- `description`
- `sortOrder`
- `isActive`

Seed aktif saat ini:

- `KWH`
- `M2`
- `Item`
- `100x100cm`

Catatan:

- tampilan admin merender `M2` sebagai `M²`
- penyimpanan DB tetap memakai nilai plain text

### 4.10 `event_addons`

Master katalog add-on tenant.

Kolom penting:

- `name`
- `description`
- `addonUnitId`
- `price`
- `sortOrder`
- `isActive`

Contoh aktif saat ini:

- `Penambahan Daya Listrik`
  - satuan: `KWH`
  - harga: `Rp 100.000`

Makna:

- add-on adalah item tambahan di luar harga booth dasar
- add-on nanti bisa dipilih saat registrasi atau checkout tenant

### 4.11 `registration_addons`

Pivot add-on yang dipilih di level registrasi.

Kolom penting:

- `registrationId`
- `addonId`
- `quantity`
- `priceSnapshot`

Catatan:

- tabel ini sudah ada
- UI registrasi pemilihan add-on belum disambungkan pada tahap sekarang
- `priceSnapshot` dipakai supaya histori harga aman saat katalog add-on berubah

## 5. Logika Bisnis Aktif

### 5.1 Booth Group vs Price Group

Keduanya mirip, tetapi tidak sama.

`boothGroup`:

- menjelaskan hak/peruntukan booth
- dipakai untuk komunikasi kerja sama dan pembatasan pengambilan booth

Contoh:

- booth group `fpag` berarti booth itu khusus jatah FPAG
- booth group `gontor` berarti booth itu khusus Gontor

`priceGroup`:

- menjelaskan kelompok harga yang dipakai saat booking

Contoh:

- peserta umum memakai harga `public`
- anggota FORBIS memakai harga `forbis`
- booth sponsor bisa memakai harga `sponsor`

Hubungan keduanya saat ini:

- jika `boothGroup = general`, harga diturunkan dari status keanggotaan participant
- jika `boothGroup` punya `defaultPriceGroup`, harga memakai default itu

### 5.2 Booth Category

`boothCategory` dipakai untuk klasifikasi operasional booth:

- `free`
- `non_fnb`
- `fnb_dry_food`
- `fnb_kitchen`

Saat ini category sudah tersimpan di DB dan bisa diedit dari popup admin, tetapi validasi penuh kategori terhadap produk peserta belum dikunci di server.

### 5.3 Booking Booth

Saat admin klik booth:

1. popup booth terbuka
2. admin memilih `boothGroup`
3. admin memilih `boothCategory`
4. admin memilih `status`
5. jika status `booked`, admin wajib memilih perusahaan dari data peserta
6. ketika perusahaan dipilih, popup menampilkan ringkasan data booking dari schema public
7. sistem membuat atau mengganti row di `booth_bookings`

Informasi ringkasan booking di popup `booked`:

- nama yang booking: `participants.name`
- nama perusahaan: `participant_businesses.companyName`
- kategori produk: `participant_businesses.requestedBoothCategoryName`
- produk yang dibawa: `participant_businesses.productTags`

Catatan:

- ringkasan ini hanya untuk membantu admin memastikan booth diassign ke usaha yang benar
- data ringkasan tidak disalin ke `booth_bookings`; sumber kebenaran tetap relasi `businessId` ke `participant_businesses`
- jika `productTags` kosong atau tidak berbentuk array, UI menampilkan `-`

Jika status dikembalikan ke `open`:

- booking booth itu dihapus

### 5.4 Penentuan Harga Saat Booking

Server action saat ini mengambil harga sebagai berikut:

1. ambil `boothGroup`
2. ambil data `business` dan `participant`
3. tentukan `priceGroup`
4. cari harga di `zone_price_rules`
5. saat ini fase yang dipakai default ke `early_bird`
6. simpan `basePrice` dan `finalPrice` ke `booth_bookings`

Catatan:

- logic tanggal untuk memilih `early_bird / pre_sale / regular` belum final
- saat ini masih baseline agar alur booking berjalan dulu

## 6. Nominal Harga Aktif

Harga seed aktif saat ini:

`forbis`

- early bird: `Rp 7.500.000`
- pre sale: `Rp 9.000.000`
- regular: `Rp 10.000.000`

`public`

- early bird: `Rp 9.000.000`
- pre sale: `Rp 11.000.000`
- regular: `Rp 12.500.000`

`sponsor`

- early bird: `Rp 30.000.000`
- pre sale: `Rp 30.000.000`
- regular: `Rp 30.000.000`

Format penyimpanan:

- integer rupiah
- contoh `7500000`

## 7. Add-on Aktif

Bagian ini khusus untuk katalog add-on event.

### 7.1 Data yang disimpan

Setiap add-on sekarang menyimpan:

- `title` atau nama add-on
- `description`
- `price`
- `unit`
- `status aktif/nonaktif`

Contoh:

- `Penambahan Daya Listrik`
- deskripsi: tambahan daya listrik untuk kebutuhan tenant dan display khusus
- harga: `Rp 100.000`
- satuan: `KWH`

### 7.2 Satuan dinamis

Satuan add-on dibuat dinamis supaya admin bisa menambah kebutuhan baru seperti:

- `KWH`
- `M²`
- `Item`
- `100x100cm`

Alasan:

- ada add-on yang berbasis listrik
- ada add-on yang berbasis luas
- ada add-on yang berbasis jumlah item
- ada add-on yang berbasis ukuran area tertentu

### 7.3 Admin UI Add-on

Halaman admin add-on sekarang memakai pola utilitarian:

- tabel daftar add-on
- tabel daftar satuan
- tombol `Tambah Add-on`
- tombol `Tambah Satuan`
- edit lewat popup
- hapus langsung dari tabel

Fokus UI:

- cepat dibaca
- cocok untuk backoffice
- tidak memakai card dekoratif per item

### 7.4 Server action add-on

Server action yang aktif:

- `upsertAddonUnit`
- `deleteAddonUnit`
- `upsertEventAddon`
- `deleteEventAddon`

Aturan penting:

- satuan tidak boleh dihapus jika masih dipakai add-on
- add-on tidak boleh dihapus jika sudah dipakai di `registration_addons`
- dalam kasus add-on sudah dipakai, admin harus menonaktifkan, bukan menghapus

## 8. Seed Aktif Saat Ini

Seed booth aktif berasal dari `packages/db/src/seed-booths.ts`.

Jumlah booth aktif per zona:

- `VVIP = 8`
- `VIP = 16`
- `Premium = 36`
- `Festival West = 30`
- `Festival North = 30`

Total:

- `120 booth`

Kondisi seed booth saat ini:

- semua booth default `open`
- semua booth default `boothGroup = general`
- semua booth default `boothCategory = free`
- semua booking dibersihkan saat reseed

Seed add-on aktif saat ini juga menyiapkan:

- satuan default `KWH`, `M2`, `Item`, `100x100cm`
- add-on contoh `Penambahan Daya Listrik`

## 9. Layout Zona Aktif

Bagian ini penting karena renderer admin sekarang tidak lagi seragam untuk semua zona. Beberapa zona memakai renderer khusus agar bentuk denah lebih rapi dan mendekati sketsa lapangan.

### 9.1 VVIP

Karakter:

- layout khusus
- dua blok horizontal
- kiri 4 booth
- kanan 4 booth
- ada gangway di tengah

Renderer:

- kartu light horizontal
- tidak memakai koordinat absolut untuk tampilan akhir

### 9.2 VIP

Karakter:

- dua baris
- tiap baris terdiri dari blok kiri 4 booth dan kanan 4 booth
- ada gangway di tengah tiap baris

Renderer:

- kartu square
- gaya visual selaras dengan VVIP

### 9.3 Premium

Karakter:

- dua blok besar
- tiap blok berisi dua kolom booth vertikal
- ada gangway vertikal di tengah blok
- ada area `stage` atau akses panggung di bawah

Renderer:

- kartu square
- viewport vertikal dengan scroll bila tinggi melewati area tampilan
- radius kolom mengikuti orientasi vertikal, bukan kiri-kanan

### 9.4 Festival West

Karakter:

- 30 booth
- disusun per blok vertikal
- masing-masing blok berisi 5 booth
- antar blok ada gap

Renderer:

- kartu square
- viewport tetap
- scroll vertikal

### 9.5 Festival North

Karakter:

- 30 booth
- disusun per blok horizontal
- masing-masing blok berisi 5 booth
- antar blok ada gap

Renderer:

- kartu square
- viewport tetap
- scroll horizontal

Catatan:

- `Festival North` adalah zona memanjang
- tidak ada `Festival South`

## 10. Admin UI Aktif

Halaman admin booth sekarang punya kemampuan berikut:

- membaca semua zona dari tenant schema
- membaca booth lengkap beserta group, category, booking, fasilitas, dan harga zona
- membaca daftar perusahaan dari `participant_businesses` beserta peserta, kategori produk, dan produk yang dibawa
- menampilkan ringkasan open vs booked
- membuka popup saat booth diklik
- edit `boothGroup`
- edit `boothCategory`
- edit `status`
- pilih perusahaan saat `booked`
- menampilkan ringkasan booking di popup saat status `booked`
- edit fasilitas per zona
- edit harga per zona

Halaman admin add-on sekarang punya kemampuan berikut:

- membaca katalog add-on dari tenant schema
- membaca master satuan dari tenant schema
- menampilkan daftar add-on dalam tabel
- menampilkan daftar satuan dalam tabel
- tambah/edit add-on lewat popup
- tambah/edit satuan lewat popup
- hapus add-on dan satuan dengan validasi server

Komponen inti:

- [apps/web/app/admin/booth/page.tsx](/Users/webane/sites/jalamandala/apps/web/app/admin/booth/page.tsx:1)
- [apps/web/components/admin/booth/ClickableBoothMap.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/booth/ClickableBoothMap.tsx:1)
- [apps/web/app/admin/addon/page.tsx](/Users/webane/sites/jalamandala/apps/web/app/admin/addon/page.tsx:1)
- [apps/web/components/admin/addon/AddonConfiguration.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/addon/AddonConfiguration.tsx:1)

Server actions:

- [apps/web/actions/booths.ts](/Users/webane/sites/jalamandala/apps/web/actions/booths.ts:1)
- [apps/web/actions/addons.ts](/Users/webane/sites/jalamandala/apps/web/actions/addons.ts:1)

## 11. Server Action Aktif

### 10.1 `updateZoneFacilities`

Fungsi:

- menerima daftar fasilitas dari editor zona
- mem-parsing format `Nama: nilai`
- menghapus fasilitas lama untuk semua booth di zona tersebut
- mengisi ulang fasilitas booth berdasarkan input terbaru

Implikasi:

- editor fasilitas bersifat replace-all per zona

### 10.2 `updateZonePrices`

Fungsi:

- meng-upsert `zone_price_rules`
- menjaga satu kombinasi `zone + priceGroup + pricePhase` hanya punya satu row aktif

### 10.3 `updateBoothConfiguration`

Fungsi:

- validasi booth, group, dan category
- validasi status hanya `open` atau `booked`
- jika `booked`, validasi perusahaan wajib dipilih
- ambil data business dari schema public
- tentukan `priceGroup`
- ambil harga dari `zone_price_rules`
- update booth
- hapus booking lama untuk booth itu
- buat booking baru jika status `booked`

### 11.4 `upsertAddonUnit`

Fungsi:

- tambah atau edit master satuan add-on
- membuat slug otomatis dari nama
- mencegah duplikasi slug

### 11.5 `deleteAddonUnit`

Fungsi:

- hapus satuan add-on

Proteksi:

- ditolak jika satuan masih dipakai di `event_addons`

### 11.6 `upsertEventAddon`

Fungsi:

- tambah atau edit katalog add-on
- validasi satuan wajib dipilih
- simpan harga integer ke DB

### 11.7 `deleteEventAddon`

Fungsi:

- hapus katalog add-on

Proteksi:

- ditolak jika add-on sudah dipakai di `registration_addons`

## 12. File Implementasi Penting

Schema dan seed:

- [packages/db/src/schema/tenant/booths.ts](/Users/webane/sites/jalamandala/packages/db/src/schema/tenant/booths.ts:1)
- [packages/db/src/schema/tenant/registrations.ts](/Users/webane/sites/jalamandala/packages/db/src/schema/tenant/registrations.ts:1)
- [packages/db/src/provision-tenant.ts](/Users/webane/sites/jalamandala/packages/db/src/provision-tenant.ts:1)
- [packages/db/src/seed-booths.ts](/Users/webane/sites/jalamandala/packages/db/src/seed-booths.ts:1)
- [packages/db/src/client.ts](/Users/webane/sites/jalamandala/packages/db/src/client.ts:1)

UI dan action:

- [apps/web/actions/booths.ts](/Users/webane/sites/jalamandala/apps/web/actions/booths.ts:1)
- [apps/web/actions/addons.ts](/Users/webane/sites/jalamandala/apps/web/actions/addons.ts:1)
- [apps/web/app/admin/booth/page.tsx](/Users/webane/sites/jalamandala/apps/web/app/admin/booth/page.tsx:1)
- [apps/web/components/admin/booth/ClickableBoothMap.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/booth/ClickableBoothMap.tsx:1)
- [apps/web/app/admin/addon/page.tsx](/Users/webane/sites/jalamandala/apps/web/app/admin/addon/page.tsx:1)
- [apps/web/components/admin/addon/AddonConfiguration.tsx](/Users/webane/sites/jalamandala/apps/web/components/admin/addon/AddonConfiguration.tsx:1)

## 13. Keputusan Teknis Penting

- booth dimodelkan sebagai entitas fisik terpisah
- booking dimodelkan sebagai entitas transaksi terpisah
- group booth dibuat dinamis, bukan enum statis yang keras
- category booth dibuat dinamis, bukan enum statis yang keras
- satuan add-on dibuat dinamis, bukan enum statis yang keras
- harga utama diletakkan di level zona, bukan harga flat per booth
- add-on ditempatkan sebagai katalog event terpisah, bukan field tambahan di booth
- denah admin saat ini memakai layout UI data-driven, bukan JPG statis
- beberapa zona memakai renderer khusus, bukan satu renderer absolut untuk semua

## 14. Gap yang Masih Terbuka

Bagian ini penting supaya nanti kita tidak lupa mana yang sudah final dan mana yang belum.

Yang sudah jalan:

- schema inti booth
- booking booth dari popup admin
- zone price rules
- fasilitas dinamis
- renderer khusus per zona utama
- katalog add-on dinamis
- master satuan add-on dinamis
- konfigurasi admin add-on berbasis tabel dan popup

Yang belum final:

- validasi eligibility peserta terhadap `boothGroup`
- validasi produk usaha terhadap `boothCategory`
- pemilihan fase harga berdasarkan tanggal booking yang nyata
- integrasi pemilihan add-on di flow registrasi tenant
- perhitungan invoice final yang menjumlahkan booth + add-on + pajak
- quantity add-on di UI registrasi
- integrasi invoice nyata dari `booth_bookings`
- penyimpanan histori perubahan booth
- editor visual drag-drop untuk layout booth
- elemen non-booth seperti `stage`, `gangway`, dan anotasi denah sebagai entitas data terpisah
- sinkronisasi penuh warna booth berdasarkan rule operasional final

## 15. Kesimpulan

Arsitektur booth yang aktif sekarang sudah cukup kuat untuk dipakai sebagai fondasi operasional:

- booth terhubung rapi ke zona
- booth punya group dan category yang dinamis
- booking menempel ke usaha, bukan langsung ke orang
- harga diputuskan dari matrix harga zona
- add-on diputuskan dari katalog event yang punya satuan dinamis
- admin sudah bisa mengubah booth langsung dari denah

Dokumen ini harus dianggap sebagai baseline aktif. Jika nanti ada revisi sketsa, aturan organisasi, atau logika harga, yang diubah pertama adalah dokumen ini lalu implementasinya mengikuti.
