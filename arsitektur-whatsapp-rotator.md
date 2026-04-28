# Arsitektur WhatsApp Rotator

## Konsep

Visitor klik icon WhatsApp di bottom nav halaman publik → sistem pilih agen CS berikutnya (round-robin presisi) → catat klik di DB → redirect ke `wa.me/{nomor}?text={pesan default}`.

**Presisi distribusi:** algoritma pilih agen aktif dengan `total_clicks` terkecil. Jika sama, urut berdasarkan `sort_order`. Ini menjamin distribusi merata meskipun ada agen yang baru ditambahkan di tengah jalan.

---

## Database Schema (Tenant Schema)

### Tabel `wa_rotator_agents`

Daftar agen CS yang menerima giliran.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid PK | |
| `event_id` | uuid NOT NULL | ref ke `expoEvents.id` (no FK) |
| `name` | text NOT NULL | Nama lengkap agen |
| `greeting_name` | text NOT NULL | Nama sapaan di pesan WA, misal "Kak Rina" |
| `wa_number` | text NOT NULL | Format internasional tanpa `+`, misal `6285210001111` |
| `is_active` | boolean DEFAULT true | Nonaktif = skip dari rotasi |
| `sort_order` | integer DEFAULT 0 | Urutan tiebreak saat `total_clicks` sama |
| `total_clicks` | integer DEFAULT 0 | Counter denormalized (sinkron dari `wa_rotator_clicks`) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Tabel `wa_rotator_clicks`

Log setiap klik — untuk audit dan recount jika diperlukan.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid PK | |
| `agent_id` | uuid NOT NULL | FK ke `wa_rotator_agents.id` |
| `event_id` | uuid NOT NULL | |
| `source` | text | `'public_bottom_nav'` (extensible) |
| `clicked_at` | timestamp NOT NULL DEFAULT now() | |

---

## Algoritma Rotasi

```
1. Ambil semua agen aktif (is_active = true), urut: total_clicks ASC, sort_order ASC
2. Pilih agen pertama (total_clicks terkecil)
3. INCREMENT total_clicks agen tersebut (atomic update)
4. INSERT log ke wa_rotator_clicks
5. Return: wa_number + greeting_name
```

Operasi 3 & 4 dalam satu transaksi untuk konsistensi.

---

## API Endpoint

### `GET /api/wa-rotator/redirect`

Dipanggil dari public frontend. Tidak membutuhkan auth.

**Query params:**
- `eventSlug` — slug event aktif

**Flow:**
1. Resolve event dari `eventSlug`
2. Jalankan algoritma rotasi (transaksi DB)
3. Build URL: `https://wa.me/{wa_number}?text={encoded_message}`
4. Return `NextResponse.redirect(url)`

**Pesan default:**
```
Halo {greeting_name}, saya ingin bertanya tentang pendaftaran booth FORBIS National Economic Summit 2026. Boleh dibantu? 🙏
```

Pesan bisa dikonfigurasi dari admin (disimpan di `wa_rotator_agents` per agen, atau satu pesan global di `expoEvents`).

---

## Public UI

Icon WA di `PublicBottomNav` (bottom nav halaman publik). Posisi: tab ke-5 atau menggantikan salah satu tab yang ada — **dikonfirmasi user setelah arsitektur disetujui**.

```tsx
// Klik → navigate ke /api/wa-rotator/redirect?eventSlug=xxx
// Buka di tab baru (_blank) agar user tidak keluar dari halaman
<a href={`/api/wa-rotator/redirect?eventSlug=${eventSlug}`} target="_blank">
  <WhatsAppIcon />
</a>
```

Icon SVG disediakan oleh user.

---

## Admin Dashboard

### Halaman `/admin/whatsapp-rotator`

**Akses:** `finance`, `admin`, `super_admin` — hanya bisa **melihat**.  
**Edit/tambah/hapus:** `super_admin` saja.

**Tampilan:**
- Kartu ringkasan: total klik hari ini, total klik keseluruhan, jumlah agen aktif
- Tabel agen: nama, nomor WA, total klik, % share, status aktif/nonaktif, terakhir diklik
- Grafik distribusi sederhana (progress bar per agen)
- Log klik terbaru (10 terakhir)

**Aksi super_admin:**
- Tambah agen baru
- Edit nama / greeting_name / nomor / sort_order
- Aktifkan / nonaktifkan agen
- Reset counter (dengan konfirmasi)

---

## Struktur File

```
apps/web/
├── app/
│   ├── api/
│   │   └── wa-rotator/
│   │       └── redirect/
│   │           └── route.ts          ← GET handler, rotasi + redirect
│   └── admin/(protected)/
│       └── whatsapp-rotator/
│           └── page.tsx              ← Dashboard admin
├── actions/
│   └── wa-rotator.ts                 ← Server actions (CRUD agen, reset counter)
└── components/
    └── admin/
        └── wa-rotator/
            ├── WaRotatorDashboard.tsx
            └── AgentFormModal.tsx

packages/db/src/
├── schema/tenant/
│   └── wa-rotator.ts                 ← Schema tabel baru
└── provision-tenant.ts               ← ALTER TABLE / CREATE TABLE baru
```

---

## Catatan Implementasi

- `total_clicks` di-increment dengan `UPDATE ... SET total_clicks = total_clicks + 1` (atomic, bukan read-then-write) untuk menghindari race condition jika ada concurrent klik.
- Tidak ada session/cookie tracking — setiap klik dianggap visitor baru. Ini intentional: tujuan rotator adalah distribusi beban CS, bukan unique visitor tracking.
- Jika semua agen nonaktif, redirect ke nomor fallback (bisa nomor panitia umum) atau tampilkan pesan error.
- Nomor WA format `628xxx` (tanpa `+`) karena `wa.me` menerima keduanya tapi konsisten lebih baik.
