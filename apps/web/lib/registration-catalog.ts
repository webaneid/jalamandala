export const defaultLegalEntityOptions = [
  "CV",
  "PT",
  "PT Perseorangan",
  "Belum Berbadan Hukum",
] as const

export const defaultBusinessCategoryOptions = [
  "Jasa",
  "Produsen",
  "Distributor",
  "Trader",
  "Profesional",
] as const

export const defaultBusinessSectorOptions = [
  "Agribisnis",
  "Industri Kreatif",
  "Industri Manufaktur",
  "Industri Pendidikan & Pelatihan",
  "Industri Pengobatan & Kesehatan",
  "Keuangan & Perbankan",
  "Kontruksi & Property",
  "Konveksi & Fashion",
  "Kuliner & Resto",
  "Peternakan, Pangan & Kehutanan",
  "Perdagangan Jasa & Umum",
  "Profesi Konsultan Publik",
  "Tour & Travel",
  "Industri Digital",
  "Pengembangan Aplikasi & Game",
  "Profesional",
  "Percetakan dan Penerbitan",
] as const

export const defaultPartnershipOptions = [
  "Kerjasama Usaha",
  "Pembukaan cabang",
  "Kerjasama distribusi",
  "Kerjasama Reseller",
] as const

export function normalizeCatalogValue(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function dedupeCatalogValues(values: readonly string[]) {
  const seen = new Set<string>()
  const next: string[] = []

  for (const value of values) {
    const normalized = normalizeCatalogValue(value)

    if (!normalized) {
      continue
    }

    const key = normalized.toLocaleLowerCase("id-ID")

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    next.push(normalized)
  }

  return next
}
