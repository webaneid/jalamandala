# Arsitektur Dev Server

Dokumen ini mencatat cara menjalankan server development agar tidak membuang konteks saat proyek dikerjakan oleh beberapa agent.

## Status Saat Ini

Untuk `apps/web`, script development memakai Webpack:

```bash
bun run dev
```

Di baliknya:

```bash
next dev --webpack --port 6250
```

Alasannya: pada Next.js 16, default dev server memakai Turbopack. Di proyek ini Turbopack beberapa kali membuat hasil render stale, terutama perubahan class Tailwind/TSX di route publik, sehingga browser masih menampilkan class lama walau source sudah berubah.

## Dampak Ke Produksi

Tidak ada dampak ke produksi.

Script produksi tetap:

```bash
bun run build
bun run start
```

`next build` tetap memakai konfigurasi produksi Next.js. Flag `--webpack` hanya berlaku untuk `next dev`.

## Kapan Boleh Balik Ke Turbopack

Jika HMR sudah stabil atau Next/Turbopack sudah diperbarui, script bisa dikembalikan menjadi:

```json
"dev": "next dev --port 6250"
```

Atau eksplisit Turbopack:

```json
"dev": "next dev --turbo --port 6250"
```

## Aturan Praktis

- Jika DOM masih menampilkan class lama padahal source sudah benar, cek dulu apakah dev server masih Turbopack.
- Jangan langsung kill server berulang kecuali HMR benar-benar stale.
- Untuk pekerjaan UI intensif, Webpack dev lebih stabil walau start awal bisa sedikit lebih lambat.
