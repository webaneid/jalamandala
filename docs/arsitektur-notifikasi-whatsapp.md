# Arsitektur Notifikasi WhatsApp

Dokumen ini mencatat rencana notifikasi WhatsApp yang perlu dikirim terkait alur vendor dan keuangan. Belum diimplementasikan — ini catatan desain agar tidak terlewat.

---

## Konteks

Sistem menggunakan nomor WhatsApp yang tersimpan di:
- `public.vendors.whatsapp` — nomor vendor
- `public.participants.whatsapp` — nomor peserta/pembeli
- Finance team: nomor dikonfigurasi manual di env / event setting

Gateway WA belum ditentukan (kandidat: Fonnte, WabotSaaS, WA Business API).

---

## Notifikasi ke Vendor

### 1. Akun Vendor Dibuat
**Trigger:** Admin membuat vendor baru via `/admin/vendor`
**Penerima:** Vendor (nomor dari `vendors.whatsapp`)
**Isi pesan:**
```
Halo [Nama Vendor],

Akun vendor Anda untuk FORBIS National Economic Summit 2026 telah dibuat.

🔗 Login: https://expo.jalamandala.id/vendor/login
📧 Email: [email]
🔑 Password: [password_sementara]

Segera ganti password setelah login pertama.
```
**Catatan:** Password sementara digenerate saat `createVendor`. Harus dikirim sekali saja — tidak bisa diulang karena password di-hash.

---

### 2. Menerima Order Baru dari Peserta
**Trigger:** Peserta checkout dan ada `order_items` dengan `referenceId` yang merupakan add-on milik vendor ini
**Penerima:** Vendor add-on yang bersangkutan
**Isi pesan:**
```
[Nama Vendor], ada pesanan add-on masuk!

📦 Add-on: [nama add-on]
👤 Pemesan: [nama peserta] / [nama perusahaan]
📞 WA: [whatsapp peserta]
🏠 Stand: [kode booth]
🔢 Qty: [jumlah]

Cek detail di portal vendor: https://expo.jalamandala.id/vendor/addons
```
**Catatan:** Perlu mapping `order_items.referenceId` → `event_addons.id` → `vendor_addon_assignments.vendorId`. Satu order bisa trigger beberapa vendor kalau pesan multi add-on.

---

### 3. Pengajuan Pencairan Disetujui
**Trigger:** Finance mengklik Setujui di `/admin/keuangan/pencairan/[id]` → status berubah ke `approved`
**Penerima:** Vendor pemohon
**Isi pesan:**
```
[Nama Vendor], pengajuan pencairan dana Anda telah DISETUJUI ✅

💰 Jumlah: [requestedAmount]
📋 Keterangan: [purposeDescription]

Dana akan segera ditransfer ke rekening Anda:
🏦 [destBankName] - [destAccountNumber]
👤 [destAccountName]

Info lebih lanjut: https://expo.jalamandala.id/vendor/pencairan
```

---

### 4. Pengajuan Pencairan Ditolak
**Trigger:** Finance menolak pengajuan → status berubah ke `rejected`
**Penerima:** Vendor pemohon
**Isi pesan:**
```
[Nama Vendor], pengajuan pencairan dana Anda DITOLAK ❌

💰 Jumlah: [requestedAmount]
📋 Keterangan: [purposeDescription]
❗ Alasan: [rejectionReason]

Silakan ajukan ulang atau hubungi tim FORBIS untuk informasi lebih lanjut.
```

---

### 5. Dana Sudah Ditransfer
**Trigger:** Finance mengkonfirmasi transfer → status berubah ke `transferred`
**Penerima:** Vendor pemohon
**Isi pesan:**
```
[Nama Vendor], dana pencairan telah DITRANSFER 💸

💰 Jumlah diterima: [netAmount] (setelah biaya transfer [transferFee])
🏦 Ke rekening: [destBankName] - [destAccountNumber]
🕐 Waktu transfer: [transferredAt]

Terima kasih telah bermitra di FORBIS 2026!
```
**Catatan:** Jika ada bukti transfer (proofAssetUrl), bisa dilampirkan sebagai link atau gambar WA.

---

## Notifikasi ke Finance (perihal Vendor)

### 6. Pengajuan Pencairan Baru Masuk
**Trigger:** Vendor submit pengajuan → status berubah ke `submitted`
**Penerima:** Tim Finance (nomor dari env/config, bukan dari DB)
**Isi pesan:**
```
⚠️ Ada pengajuan pencairan dana baru!

👤 Vendor: [nama vendor]
💰 Jumlah: [requestedAmount]
📋 Keterangan: [purposeDescription]
🏦 Rekening: [destBankName] - [destAccountNumber] a/n [destAccountName]

Review di: https://app.jalamandala.id/admin/keuangan/pencairan/[id]
```

---

## Notifikasi Tambahan yang Perlu Dipertimbangkan

### Untuk Peserta (bukan vendor)
- Konfirmasi pembayaran berhasil (sudah ada? perlu dicek)
- Reminder invoice belum dibayar (H-3, H-1 jatuh tempo)
- E-pass / QR code booth siap

### Untuk Admin/Finance
- Invoice baru masuk (peserta submit)
- Pembayaran diterima dan diverifikasi
- Reminder pengajuan pencairan yang sudah lama pending (> 3 hari belum di-review)

---

## Catatan Implementasi (nanti)

- **Gateway WA:** Pilih satu provider (Fonnte paling mudah untuk Indonesia, flat rate per pesan)
- **Async:** Pengiriman WA harus async — jangan block server action. Gunakan background job atau `setTimeout` / queue sederhana
- **Template:** Simpan template di event setting agar bisa dikustomisasi per event tanpa deploy ulang
- **Rate limit:** Batasi maksimal X pesan per menit ke satu nomor yang sama
- **Log:** Catat setiap notifikasi yang dikirim (nomor, status delivered/failed, timestamp) agar bisa di-audit
- **Opt-out:** Pertimbangkan mekanisme vendor/peserta bisa minta tidak dikirim notifikasi tertentu

---

## Status

| # | Notifikasi | Status |
|---|-----------|--------|
| 1 | Akun vendor dibuat | Belum |
| 2 | Order add-on masuk | Belum |
| 3 | Pencairan disetujui | Belum |
| 4 | Pencairan ditolak | Belum |
| 5 | Dana ditransfer | Belum |
| 6 | Pengajuan pencairan ke finance | Belum |
