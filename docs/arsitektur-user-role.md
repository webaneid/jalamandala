# Arsitektur User Role — Jalamandala

## Prinsip Utama

- Satu user (tabel `user`) dapat memiliki **banyak role** (tabel `user_roles`).
- Role bisa bersifat **platform-wide** (`event_id = NULL`) atau **scoped ke event tertentu** (`event_id` diisi).
- Setiap subdomain menampilkan halaman login **tersendiri**. User yang valid di satu subdomain belum tentu punya akses di subdomain lain.
- **Register diri sendiri tidak tersedia** di subdomain admin. User harus ditambahkan oleh Super Admin.
- Subdomain `expo.*` (public) boleh registrasi mandiri — menghasilkan role `participant`.

---

## Daftar Role

| Role | Slug | Scope | Keterangan |
|---|---|---|---|
| Super Admin | `super_admin` | Platform-wide | Akses penuh. Bisa tambah/hapus user & assign role. |
| Admin | `admin` | Per-event | Kelola pendaftaran, peserta, booth. |
| Finance | `finance` | Per-event | Akses modul keuangan, pembayaran, invoice. |
| Seksi Acara | `event_crew` | Per-event | Akses jadwal, rundown, check-in. |
| Vendor | `vendor` | Per-event | Akses terbatas untuk tenant/vendor booth. |
| Participant | `participant` | Per-event | Peserta yang mendaftar via portal publik `expo.*`. |

---

## Skema Database

```sql
-- Enum tipe role
CREATE TYPE public.user_role AS ENUM (
  'super_admin', 'admin', 'finance', 'event_crew', 'vendor', 'participant'
);

-- Tabel relasi user ↔ role
CREATE TABLE public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL,
  event_id    uuid,                          -- NULL = platform-wide
  created_at  timestamp NOT NULL DEFAULT now()
);
```

Satu user bisa punya multiple row di `user_roles`. Contoh: seseorang bisa jadi `admin` di event A dan `finance` di event B secara bersamaan.

---

## Subdomain & Halaman Login

| Subdomain | Rute Internal | Halaman Login | Siapa yang boleh masuk |
|---|---|---|---|
| `app.jalamandala.id` | `/admin` | `/admin/login` | super_admin, admin, finance, event_crew |
| `expo.jalamandala.id` | `/expo` | `/expo/login` | vendor, participant (+ registrasi mandiri) |

Middleware membaca subdomain dan memeriksa session. Jika user tidak punya role yang sesuai untuk subdomain tersebut, diarahkan ke halaman login subdomain bersangkutan (bukan 403).

---

## Alur Penambahan User

```
Super Admin
  └─> Buka /admin/users/tambah
  └─> Isi: Nama, Email, Password sementara
  └─> Pilih Role + Event (jika applicable)
  └─> Sistem membuat row di tabel `user` (via Better Auth)
         + row di tabel `user_roles`
  └─> User login pertama kali dengan password sementara
         (opsional: paksa ganti password saat login pertama)
```

---

## Catatan Implementasi

- **Auth library:** Better Auth (email + password provider).
- `forbis_members` adalah **tabel referensi saja** — tidak punya akun login. Digunakan untuk auto-populate form pendaftaran peserta.
- Cek role di server action / middleware dilakukan dengan query ke `user_roles` berdasarkan `userId` dari session Better Auth.
- Role `super_admin` selalu `event_id = NULL`.
- Untuk route protection middleware, urutan pengecekan:
  1. Ada session? → jika tidak, redirect ke halaman login subdomain.
  2. User punya role yang sesuai dengan subdomain? → jika tidak, redirect ke login.
