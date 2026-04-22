# Arsitektur Fase Harga Booth

> Dokumen ini menjelaskan sistem penjadwalan fase harga booth (early bird, pre-sale, regular) beserta implementasinya.

## 1. Konsep

Harga booth memiliki 3 fase:

| Fase | Kode | Deskripsi |
|---|---|---|
| Early Bird | `early_bird` | Harga terendah, berlaku di awal pembukaan |
| Pre-Sale | `pre_sale` | Harga menengah |
| Regular | `regular` | Harga penuh, fallback jika tidak ada fase aktif |

Setiap fase memiliki rentang tanggal aktif (`startsAt` → `endsAt`). Sistem membaca waktu sekarang (UTC) dan mencocokkannya dengan rentang tersebut.

## 2. Penyimpanan Data

Jadwal fase disimpan di kolom `starts_at` dan `ends_at` pada tabel `zone_price_rules` (tenant schema).

```sql
-- Tabel: zone_price_rules (tenant schema)
-- Setiap baris = zona × price_group × price_phase
-- starts_at / ends_at menentukan kapan fase ini berlaku
```

Semua zona berbagi jadwal yang sama — saat admin menyimpan jadwal fase, sistem melakukan `UPDATE` bulk ke semua baris `zone_price_rules` dengan `price_phase = :phase`.

## 3. Timezone: WIB (UTC+7)

- **Penyimpanan di DB**: UTC (PostgreSQL `timestamp with time zone`)
- **Input admin**: WIB (datetime-local input ditafsirkan sebagai `+07:00`)
- **Display di UI**: Nilai dikonversi UTC → WIB sebelum ditampilkan

Fungsi utilitas (`apps/web/lib/price-phase.ts`):
- `wibInputToDate(value)` — parse datetime-local sebagai WIB, kembalikan `Date` UTC
- `utcToWibInput(iso)` — konversi UTC ISO string ke format datetime-local dalam WIB

## 4. Resolusi Fase Aktif

### Client-side (ManualInvoiceBuilder)

Fase aktif (`currentPricePhase`) sudah diresolved di server saat page load dan dikirim ke komponen:

```ts
// apps/web/lib/price-phase.ts
export function resolveCurrentPricePhase(rules: PricePhaseRule[]): PricePhase {
  const now = new Date(); // UTC
  for (const phase of ["early_bird", "pre_sale", "regular"]) {
    const rule = rules.find(r => r.pricePhase === phase);
    if (!rule || (!rule.startsAt && !rule.endsAt)) continue;
    const afterStart = !rule.startsAt || now >= new Date(rule.startsAt);
    const beforeEnd  = !rule.endsAt  || now < new Date(rule.endsAt);
    if (afterStart && beforeEnd) return phase;
  }
  return "regular"; // fallback
}
```

### Server-side (createManualInvoice)

`resolvePriceFromRules` di `finance.ts` juga melakukan resolusi berbasis tanggal menggunakan `startsAt/endsAt` dari DB saat invoice dibuat — memastikan harga yang dikunci di invoice adalah harga fase yang benar-benar aktif saat transaksi terjadi.

## 5. Admin UI

Halaman `/admin/setting` → tab **Fase Harga**:
- 3 form inline: Early Bird, Pre-Sale, Regular
- Masing-masing punya 2 input: Mulai Berlaku (WIB) dan Berakhir (WIB)
- Tombol "Simpan" per fase — meng-update semua `zone_price_rules` untuk fase tersebut

## 6. Server Actions

| Action | File | Keterangan |
|---|---|---|
| `updatePricePhaseSchedule` | `actions/price-phases.ts` | Bulk update `startsAt/endsAt` untuk satu fase |

## 7. Fallback Logic

Jika tidak ada fase yang tanggalnya cocok dengan waktu sekarang:
- Sistem otomatis pakai harga **regular**
- Ini berlaku baik di ManualInvoiceBuilder (display) maupun `createManualInvoice` (locking harga)

## 8. Status Implementasi (April 2026)

- ✅ Kolom `starts_at/ends_at` sudah ada di `zone_price_rules` (sebelumnya tidak terpakai)
- ✅ Resolusi berbasis tanggal diimplementasi di `lib/price-phase.ts`
- ✅ Admin UI di `/admin/setting` → tab Fase Harga
- ✅ `createManualInvoice` menggunakan resolusi berbasis tanggal
- ✅ ManualInvoiceBuilder menampilkan harga sesuai fase aktif saat ini
- ✅ Semua input/display dalam WIB (UTC+7)
