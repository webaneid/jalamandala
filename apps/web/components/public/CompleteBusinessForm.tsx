"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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

export function CompleteBusinessForm({ boothCategories, businessId, defaultValues, eventSlug }: Props) {
  const router = useRouter()
  const [error, setError] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

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
  const [tagInput, setTagInput] = React.useState("")

  const [partnershipConcepts, setPartnershipConcepts] = React.useState<string[]>(defaultValues.partnershipConcepts)

  const wordCount = description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const val = tagInput.trim()
      if (val && !productTags.includes(val)) {
        setProductTags([...productTags, val])
      }
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setProductTags(productTags.filter((t) => t !== tag))
  }

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
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Identitas Usaha */}
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Identitas Usaha
        </p>
        <div className="space-y-4">
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
            <select
              className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm disabled:opacity-50"
              disabled={isSubmitting}
              id="legalEntity"
              onChange={(e) => setLegalEntity(e.target.value)}
              value={legalEntity}
            >
              <option value="">Pilih badan hukum</option>
              {defaultLegalEntityOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </FieldShell>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldShell id="businessCategory" label="Kategori Usaha" required>
              <select
                className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm disabled:opacity-50"
                disabled={isSubmitting}
                id="businessCategory"
                onChange={(e) => setBusinessCategory(e.target.value)}
                value={businessCategory}
              >
                <option value="">Pilih kategori</option>
                {defaultBusinessCategoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </FieldShell>

            <FieldShell id="businessSector" label="Bidang Usaha" required>
              <select
                className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm disabled:opacity-50"
                disabled={isSubmitting}
                id="businessSector"
                onChange={(e) => setBusinessSector(e.target.value)}
                value={businessSector}
              >
                <option value="">Pilih bidang</option>
                {defaultBusinessSectorOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </FieldShell>
          </div>
        </div>
      </div>

      {/* Deskripsi */}
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Tentang Perusahaan
        </p>
        <FieldShell
          id="description"
          label="Deskripsi Singkat"
          required
          hint={`${wordCount}/150 kata`}
        >
          <textarea
            className="w-full rounded-2xl border border-border bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 min-h-[120px]"
            disabled={isSubmitting}
            id="description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ceritakan singkat tentang perusahaan Anda, produk/layanan utama, dan keunggulan yang membedakan..."
            value={description}
          />
        </FieldShell>
      </div>

      {/* Kontak & Alamat */}
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Kontak & Alamat Perusahaan
        </p>
        <div className="space-y-4">
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
        </div>
      </div>

      {/* Produk & Kemitraan */}
      <div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-primary-600">
          Produk & Kemitraan
        </p>
        <div className="space-y-4">
          <FieldShell
            id="productTags"
            label="Produk / Layanan"
            required
            hint="Ketik lalu tekan Enter atau koma untuk menambah."
          >
            <div className="rounded-2xl border border-border bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {productTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-primary-50 border border-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
                  >
                    {tag}
                    <button
                      className="text-primary-400 hover:text-primary-700"
                      disabled={isSubmitting}
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                className="w-full text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
                disabled={isSubmitting}
                id="productTags"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Contoh: Madu, Herbal, Makanan Organik..."
                value={tagInput}
              />
            </div>
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
        </div>
      </div>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <PublicButton disabled={isSubmitting} fullWidth type="submit">
        {isSubmitting ? "Menyimpan..." : "Simpan Data Usaha"}
      </PublicButton>
    </form>
  )
}
