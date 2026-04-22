# Arsitektur Agenda
> Dokumen konteks aktif untuk modul agenda FORBIS Expo. Fokusnya adalah struktur data, alur admin, dan batas implementasi awal yang sekarang dipakai.

## 1. Tujuan

Modul `Agenda` dipakai untuk mengelola daftar kegiatan dalam event expo, misalnya:

- seremoni pembukaan
- talkshow
- workshop
- business matching
- hiburan
- sesi umum lain

Target utamanya:

- admin punya daftar kegiatan event yang rapi
- setiap agenda terikat ke event aktif
- jadwal agenda bisa diurutkan berdasarkan waktu
- data agenda siap dipakai ulang nanti untuk halaman publik, landing event, dan operasional lapangan

Agenda bukan bagian dari tenant schema. Agenda menempel ke event di schema `public`, karena satu agenda adalah properti event, bukan properti booth, peserta, atau invoice.

## 2. Letak Domain

Relasi domain yang dipakai:

- `organization -> expo_event -> event_agendas`

Artinya:

- satu organisasi bisa punya banyak event
- satu event bisa punya banyak agenda
- satu agenda hanya milik satu event

## 3. Model Data

Tabel utama:

- `public.event_agendas`

Kolom inti yang dibutuhkan:

- `id`
- `event_id`
- `title`
- `slug`
- `description`
- `agenda_type`
- `start_at`
- `end_at`
- `venue_name`
- `stage_name`
- `speaker_names`
- `is_public`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

## 4. Makna Kolom

### 4.1 Identitas

- `title`: nama agenda yang dilihat admin dan publik
- `slug`: identifier stabil per event, dipakai untuk URL atau referensi sistem nanti
- `description`: penjelasan singkat kegiatan

### 4.2 Klasifikasi

- `agenda_type`: jenis kegiatan
- `status`: status editorial dan operasional agenda
- `is_public`: apakah agenda layak tampil ke publik

Nilai awal `agenda_type` yang disiapkan:

- `ceremony`
- `talkshow`
- `workshop`
- `business_matching`
- `entertainment`
- `session`

Nilai awal `status`:

- `draft`
- `published`
- `cancelled`

Catatan:

- `agenda_type` dan `status` saat ini masih disimpan sebagai `text`, bukan enum database
- keputusan ini sengaja supaya iterasi awal lebih fleksibel

### 4.3 Waktu dan Lokasi

- `start_at`: waktu mulai agenda
- `end_at`: waktu selesai agenda
- `venue_name`: nama area besar, misalnya gedung atau hall
- `stage_name`: titik atau panggung spesifik, misalnya panggung utama atau ruang workshop

### 4.4 Narasumber

- `speaker_names`: daftar nama pembicara, moderator, atau pengisi acara

Disimpan sebagai `text[]` karena:

- satu agenda bisa punya lebih dari satu nama
- kebutuhan awal hanya daftar nama, belum perlu tabel relasi orang/pembicara tersendiri

## 5. Aturan Data

Aturan dasar implementasi awal:

- satu `slug` harus unik dalam satu event
- agenda diurutkan dengan `start_at`, lalu `sort_order`, lalu `title`
- agenda boleh belum `published`
- agenda `cancelled` tetap disimpan, tidak dihapus otomatis
- `end_at` boleh kosong untuk agenda yang belum final durasinya

## 6. UI Admin

Halaman admin:

- `/admin/agenda`

Fungsi implementasi awal:

- membaca event aktif berdasarkan `TENANT_SCHEMA` atau fallback ke event aktif
- menampilkan ringkasan total agenda
- menampilkan daftar agenda secara hirarkis
- grouping utama per `hari / tanggal`
- urutan item di dalam hari berdasarkan `jam mulai`
- filter berdasarkan `hari`
- filter berdasarkan `tipe agenda`
- tambah agenda via modal
- edit agenda via modal
- menampilkan status, jenis agenda, waktu, lokasi, dan narasumber

Fase awal ini belum mencakup:

- drag and drop run-down
- publikasi ke frontend publik
- manajemen pembicara terpisah
- sinkronisasi dengan tiket atau registrasi sesi

### 6.1 Bentuk Hierarki UI

Struktur tampilan admin yang aktif sekarang:

1. card per hari
2. di dalam card hari: daftar agenda terurut per jam
3. tiap agenda menampilkan:
   - jam
   - judul
   - deskripsi
   - tipe
   - status
   - lokasi
   - narasumber
   - tombol edit

Jadi bentuk baca yang dipakai admin sekarang adalah:

- `hari -> jam -> agenda`

Ini dipilih karena lebih mudah dipakai untuk rundown operasional dibanding daftar flat.

## 7. Kenapa Masuk Schema Public

Agenda sengaja tidak dimasukkan ke tenant schema karena:

- agenda adalah identitas event
- satu event bisa ditampilkan lintas konteks admin dan publik
- agenda tidak bergantung pada booth booking atau invoice
- modul ini lebih dekat ke `event setting` daripada ke `booth`

Dengan begitu, agenda bisa dipakai nanti untuk:

- landing event publik
- halaman rundown
- panel admin operasional
- integrasi notifikasi atau reminder sesi

## 8. Tahap Implementasi Sekarang

Tahap yang sedang dibangun sekarang:

1. dokumentasi arsitektur
2. tabel `public.event_agendas`
3. relation ke `expo_events`
4. halaman admin `/admin/agenda`
5. menu admin menuju modul agenda
6. filter hari dan tipe agenda
7. modal tambah agenda
8. modal edit agenda

Tahap berikutnya yang logis:

1. public renderer untuk rundown event
2. speaker directory jika kebutuhan narasumber makin kompleks
3. drag and drop untuk penyusunan ulang rundown
4. kemungkinan agenda multi-track yang lebih kompleks bila dibutuhkan

## 9. Prinsip Operasional

Prinsip yang dipakai untuk modul ini:

- struktur data harus cukup kuat untuk event nyata
- UI admin tahap awal harus langsung bisa dipakai membaca data real
- jangan menambah kompleksitas speaker, ticketing, atau session booking sebelum daftar agenda inti stabil
