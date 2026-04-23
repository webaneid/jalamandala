"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Search } from "lucide-react"
import { updatePublicBusiness } from "@/actions/public-businesses"
import { FieldShell } from "@/components/public/ui/FieldShell"
import { PublicButton } from "@/components/public/ui/PublicButton"
import { Input } from "@/components/ui/input"
import { RegionAutocompleteSelect } from "@/components/forms/RegionAutocompleteSelect"
import {
  defaultLegalEntityOptions,
  defaultBusinessCategoryOptions,
  defaultBusinessSectorOptions,
  defaultPartnershipOptions,
  dedupeCatalogValues,
} from "@/lib/registration-catalog"
import type { BoothCategoryFormOption } from "@/lib/booth-form-options"

type Props = {
  boothCategories: BoothCategoryFormOption[]
  businessId: string
  defaultValues: {
    brandName: string
    boothName: string
    companyName: string
    requestedBoothCategorySlug: string
    companyDescription: string
    companyPhone: string
    companyWhatsapp: string
    companyAddress: string
    companyProvinceCode: string
    companyProvinceName: string
    companyRegencyCode: string
    companyRegencyName: string
    companyDistrictCode: string
    companyDistrictName: string
    companyVillageCode: string
    companyVillageName: string
    legalEntity: string
    businessCategory: string
    businessSector: string
    productTags: string[]
    partnershipConcepts: string[]
  }
  eventSlug: string
}

type CatalogData = {
  businessCategories: string[]
  businessSectors: string[]
  legalEntities: string[]
  productTags: string[]
}

// Generic autocomplete for string values (free-form + suggestions)
function StringAutocomplete({
  disabled,
  options,
  placeholder,
  value,
  onChange,
}: {
  disabled?: boolean
  options: string[]
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const filtered = React.useMemo(() => {
    const q = value.trim().toLocaleLowerCase("id-ID")
    const list = q
      ? options.filter((o) => o.toLocaleLowerCase("id-ID").includes(q))
      : options
    return list.slice(0, 10)
  }, [value, options])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        autoComplete="off"
        className="h-11 rounded-2xl pl-9"
        disabled={disabled}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true) }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        value={value}
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.map((opt) => (
              <button
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                  opt === value
                    ? "bg-primary-50 font-medium text-primary-900"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(opt)
                  setIsOpen(false)
                }}
                type="button"
              >
                <span>{opt}</span>
                {opt === value && <Check className="size-4 text-primary-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Tag input with autocomplete suggestions
function TagAutocomplete({
  disabled,
  suggestions,
  tags,
  onAdd,
  onRemove,
}: {
  disabled?: boolean
  suggestions: string[]
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}) {
  const [input, setInput] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    const q = input.trim().toLocaleLowerCase("id-ID")
    return suggestions
      .filter((s) => !tags.includes(s) && (q ? s.toLocaleLowerCase("id-ID").includes(q) : true))
      .slice(0, 8)
  }, [input, suggestions, tags])

  function commitTag(val: string) {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed)
    }
    setInput("")
    setIsOpen(false)
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commitTag(input)
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1]!)
    }
  }

  return (
    <div className="relative">
      <div className="min-h-[2.75rem] w-full rounded-2xl border border-border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-primary-50 border border-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
            >
              {tag}
              <button
                className="text-primary-400 hover:text-primary-700 leading-none"
                disabled={disabled}
                onClick={() => onRemove(tag)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="w-full text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
          disabled={disabled}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
          onChange={(e) => { setInput(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKey}
          placeholder="Ketik lalu tekan Enter atau koma..."
          value={input}
        />
      </div>
      {isOpen && !disabled && filtered.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-48 overflow-y-auto p-1.5">
            {filtered.map((sug) => (
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                key={sug}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commitTag(sug)
                }}
                type="button"
              >
                <span className="size-1.5 rounded-full bg-primary-400 shrink-0" />
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CompleteBusinessForm({ boothCategories, businessId, defaultValues, eventSlug }: Props) {
  const router = useRouter()
  const [error, setError] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [catalog, setCatalog] = React.useState<CatalogData>({
    businessCategories: [],
    businessSectors: [],
    legalEntities: [],
    productTags: [],
  })

  // Fetch catalog on mount
  React.useEffect(() => {
    fetch("/api/business-catalog")
      .then((r) => r.json())
      .then((data) => {
        setCatalog({
          businessCategories: dedupeCatalogValues([
            ...defaultBusinessCategoryOptions,
            ...(data.businessCategories ?? []),
          ]),
          businessSectors: dedupeCatalogValues([
            ...defaultBusinessSectorOptions,
            ...(data.businessSectors ?? []),
          ]),
          legalEntities: dedupeCatalogValues([
            ...defaultLegalEntityOptions,
            ...(data.legalEntities ?? []),
          ]),
          productTags: dedupeCatalogValues(data.productTags ?? []),
        })
      })
      .catch(() => {
        // fallback to defaults
        setCatalog({
          businessCategories: [...defaultBusinessCategoryOptions],
          businessSectors: [...defaultBusinessSectorOptions],
          legalEntities: [...defaultLegalEntityOptions],
          productTags: [],
        })
      })
  }, [])

  const [brandName, setBrandName] = React.useState(defaultValues.brandName)
  const [boothName, setBoothName] = React.useState(defaultValues.boothName)
  const [companyName] = React.useState(defaultValues.companyName)
  const [categorySlug, setCategorySlug] = React.useState(defaultValues.requestedBoothCategorySlug)
  const [description, setDescription] = React.useState(defaultValues.companyDescription)
  const [companyPhone, setCompanyPhone] = React.useState(defaultValues.companyPhone)
  const [companyWhatsapp, setCompanyWhatsapp] = React.useState(defaultValues.companyWhatsapp)
  const [companyAddress, setCompanyAddress] = React.useState(defaultValues.companyAddress)

  const [provinceCode, setProvinceCode] = React.useState(defaultValues.companyProvinceCode)
  const [provinceName, setProvinceName] = React.useState(defaultValues.companyProvinceName)
  const [regencyCode, setRegencyCode] = React.useState(defaultValues.companyRegencyCode)
  const [regencyName, setRegencyName] = React.useState(defaultValues.companyRegencyName)
  const [districtCode, setDistrictCode] = React.useState(defaultValues.companyDistrictCode)
  const [districtName, setDistrictName] = React.useState(defaultValues.companyDistrictName)
  const [villageCode, setVillageCode] = React.useState(defaultValues.companyVillageCode)
  const [villageName, setVillageName] = React.useState(defaultValues.companyVillageName)

  const [legalEntity, setLegalEntity] = React.useState(defaultValues.legalEntity)
  const [businessCategory, setBusinessCategory] = React.useState(defaultValues.businessCategory)
  const [businessSector, setBusinessSector] = React.useState(defaultValues.businessSector)

  const [productTags, setProductTags] = React.useState<string[]>(defaultValues.productTags)
  const [partnershipConcepts, setPartnershipConcepts] = React.useState<string[]>(defaultValues.partnershipConcepts)

  const wordCount = description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0

  function togglePartnership(concept: string) {
    setPartnershipConcepts((prev) =>
      prev.includes(concept) ? prev.filter((c) => c !== concept) : [...prev, concept]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!brandName.trim()) return setError("Nama brand wajib diisi.")
    if (!legalEntity) return setError("Badan hukum wajib dipilih.")
    if (!businessCategory) return setError("Kategori usaha wajib dipilih.")
    if (!businessSector) return setError("Bidang usaha wajib dipilih.")
    if (description.trim().length < 10) return setError("Tentang perusahaan harus diisi minimal 10 karakter.")
    if (wordCount > 150) return setError("Tentang perusahaan maksimal 150 kata.")
    if (!companyAddress.trim()) return setError("Alamat perusahaan wajib diisi.")
    if (!provinceCode) return setError("Provinsi wajib dipilih.")
    if (!regencyCode) return setError("Kabupaten/kota wajib dipilih.")
    if (!districtCode) return setError("Kecamatan wajib dipilih.")
    if (!villageCode) return setError("Desa/kelurahan wajib dipilih.")
    if (productTags.length === 0) return setError("Tambahkan minimal satu produk/layanan.")
    if (partnershipConcepts.length === 0) return setError("Pilih minimal satu konsep kemitraan.")

    setIsSubmitting(true)
    try {
      const result = await updatePublicBusiness(businessId, eventSlug, {
        brandName,
        boothName: boothName || companyName,
        businessCategory,
        businessSector,
        companyName,
        companyAddress,
        companyDescription: description,
        companyDistrictCode: districtCode,
        companyPhone: companyPhone || undefined,
        companyProvinceCode: provinceCode,
        companyRegencyCode: regencyCode,
        companyVillageCode: villageCode,
        companyWhatsapp: companyWhatsapp || undefined,
        requestedBoothCategorySlug: categorySlug,
        legalEntity,
        partnershipConcepts,
        productTags,
      })

      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan.")
        return
      }

      router.push(`/${eventSlug}/usaha`)
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Identitas Usaha */}
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Identitas Usaha
        </p>

        <FieldShell id="brandName" label="Nama Brand / Merek" required>
          <Input
            className="h-11 rounded-2xl"
            disabled={isSubmitting}
            id="brandName"
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Nama brand yang dikenal publik"
            value={brandName}
          />
        </FieldShell>

        <FieldShell id="boothName" label="Nama di Booth" required hint="Nama yang tampil di papan booth saat pameran.">
          <Input
            className="h-11 rounded-2xl"
            disabled={isSubmitting}
            id="boothName"
            onChange={(e) => setBoothName(e.target.value)}
            placeholder={companyName}
            value={boothName}
          />
        </FieldShell>

        <FieldShell id="categorySlug" label="Jenis Produk untuk Expo" required>
          <select
            className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm disabled:opacity-50"
            disabled={isSubmitting}
            id="categorySlug"
            onChange={(e) => setCategorySlug(e.target.value)}
            value={categorySlug}
          >
            <option value="">Pilih jenis produk</option>
            {boothCategories.filter((c) => c.slug !== "free").map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        </FieldShell>

        <FieldShell id="legalEntity" label="Badan Hukum" required>
          <StringAutocomplete
            disabled={isSubmitting}
            options={catalog.legalEntities}
            onChange={setLegalEntity}
            placeholder="Cari atau ketik badan hukum..."
            value={legalEntity}
          />
        </FieldShell>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldShell id="businessCategory" label="Kategori Usaha" required>
            <StringAutocomplete
              disabled={isSubmitting}
              options={catalog.businessCategories}
              onChange={setBusinessCategory}
              placeholder="Cari kategori usaha..."
              value={businessCategory}
            />
          </FieldShell>

          <FieldShell id="businessSector" label="Bidang Usaha" required>
            <StringAutocomplete
              disabled={isSubmitting}
              options={catalog.businessSectors}
              onChange={setBusinessSector}
              placeholder="Cari bidang usaha..."
              value={businessSector}
            />
          </FieldShell>
        </div>
      </section>

      {/* Tentang Perusahaan */}
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Tentang Perusahaan
        </p>

        <FieldShell
          id="description"
          label="Deskripsi Singkat"
          required
          hint={`${wordCount}/150 kata`}
        >
          <textarea
            className="w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 min-h-[120px] resize-none"
            disabled={isSubmitting}
            id="description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ceritakan singkat tentang perusahaan, produk/layanan utama, dan keunggulan yang membedakan..."
            value={description}
          />
        </FieldShell>
      </section>

      {/* Kontak & Alamat */}
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Kontak & Alamat Perusahaan
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldShell id="companyPhone" label="Telepon Perusahaan">
            <Input
              className="h-11 rounded-2xl"
              disabled={isSubmitting}
              id="companyPhone"
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="021xxxxxxx / 08xxxxxxxxxx"
              value={companyPhone}
            />
          </FieldShell>
          <FieldShell id="companyWhatsapp" label="WhatsApp Perusahaan">
            <Input
              className="h-11 rounded-2xl"
              disabled={isSubmitting}
              id="companyWhatsapp"
              onChange={(e) => setCompanyWhatsapp(e.target.value)}
              placeholder="08xxxxxxxxxx"
              value={companyWhatsapp}
            />
          </FieldShell>
        </div>

        <FieldShell id="companyAddress" label="Alamat Lengkap" required>
          <Input
            className="h-11 rounded-2xl"
            disabled={isSubmitting}
            id="companyAddress"
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="Jl. ..."
            value={companyAddress}
          />
        </FieldShell>

        <RegionAutocompleteSelect
          disabled={isSubmitting}
          level="province"
          onSelect={(r) => {
            setProvinceCode(r?.code ?? "")
            setProvinceName(r?.name ?? "")
            setRegencyCode(""); setRegencyName("")
            setDistrictCode(""); setDistrictName("")
            setVillageCode(""); setVillageName("")
          }}
          placeholder="Cari provinsi..."
          valueCode={provinceCode}
          valueName={provinceName}
        />
        <RegionAutocompleteSelect
          disabled={isSubmitting || !provinceCode}
          level="regency"
          onSelect={(r) => {
            setRegencyCode(r?.code ?? "")
            setRegencyName(r?.name ?? "")
            setDistrictCode(""); setDistrictName("")
            setVillageCode(""); setVillageName("")
          }}
          parentCode={provinceCode}
          placeholder="Cari kabupaten/kota..."
          valueCode={regencyCode}
          valueName={regencyName}
        />
        <RegionAutocompleteSelect
          disabled={isSubmitting || !regencyCode}
          level="district"
          onSelect={(r) => {
            setDistrictCode(r?.code ?? "")
            setDistrictName(r?.name ?? "")
            setVillageCode(""); setVillageName("")
          }}
          parentCode={regencyCode}
          placeholder="Cari kecamatan..."
          valueCode={districtCode}
          valueName={districtName}
        />
        <RegionAutocompleteSelect
          disabled={isSubmitting || !districtCode}
          level="village"
          onSelect={(r) => {
            setVillageCode(r?.code ?? "")
            setVillageName(r?.name ?? "")
          }}
          parentCode={districtCode}
          placeholder="Cari desa/kelurahan..."
          valueCode={villageCode}
          valueName={villageName}
        />
      </section>

      {/* Produk & Kemitraan */}
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Produk & Kemitraan
        </p>

        <FieldShell
          id="productTags"
          label="Produk / Layanan"
          required
          hint="Ketik nama produk lalu tekan Enter atau koma untuk menambah."
        >
          <TagAutocomplete
            disabled={isSubmitting}
            onAdd={(tag) => setProductTags((prev) => [...prev, tag])}
            onRemove={(tag) => setProductTags((prev) => prev.filter((t) => t !== tag))}
            suggestions={catalog.productTags}
            tags={productTags}
          />
        </FieldShell>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-800">
            Konsep Kemitraan <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {defaultPartnershipOptions.map((opt) => (
              <label
                key={opt}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                  partnershipConcepts.includes(opt)
                    ? "border-primary bg-primary-50 font-medium text-primary-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-primary-200 hover:bg-primary-50/40",
                ].join(" ")}
              >
                <input
                  checked={partnershipConcepts.includes(opt)}
                  className="accent-primary"
                  disabled={isSubmitting}
                  onChange={() => togglePartnership(opt)}
                  type="checkbox"
                />
                {opt}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <PublicButton disabled={isSubmitting} fullWidth type="submit">
        {isSubmitting ? "Menyimpan..." : "Simpan Data Usaha"}
      </PublicButton>
    </form>
  )
}
