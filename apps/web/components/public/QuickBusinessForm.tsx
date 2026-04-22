"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { createQuickBusiness } from "@/actions/public-businesses"
import { FieldShell } from "@/components/public/ui/FieldShell"
import { PublicButton } from "@/components/public/ui/PublicButton"
import { Input } from "@/components/ui/input"

const MAX_LOGO_BYTES = 5 * 1024 * 1024

export type BoothCategoryOption = {
  id: string
  name: string
  slug: string
}

type Props = {
  boothCategories: BoothCategoryOption[]
  eventSlug: string
  nextUrl?: string
  participantId: string
}

type LogoState = {
  contentType: string
  dataUrl: string
  fileName: string
  previewUrl: string
}

export function QuickBusinessForm({ boothCategories, eventSlug, nextUrl, participantId }: Props) {
  const router = useRouter()
  const [error, setError] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [logo, setLogo] = React.useState<LogoState | null>(null)
  const [companyName, setCompanyName] = React.useState("")
  const [sameBoothName, setSameBoothName] = React.useState(true)
  const [boothName, setBoothName] = React.useState("")
  const [categorySlug, setCategorySlug] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      setError("Ukuran logo maksimal 5 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogo({
        contentType: file.type,
        dataUrl: reader.result as string,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
      })
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!companyName.trim()) { setError("Nama perusahaan wajib diisi."); return }
    if (!categorySlug) { setError("Jenis produk untuk expo wajib dipilih."); return }

    setIsSubmitting(true)
    try {
      const result = await createQuickBusiness(participantId, eventSlug, {
        companyName,
        boothName: sameBoothName ? companyName : boothName,
        requestedBoothCategorySlug: categorySlug,
        logoUpload: logo
          ? { dataUrl: logo.dataUrl, contentType: logo.contentType, fileName: logo.fileName }
          : null,
      })

      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan.")
        return
      }

      const dest = nextUrl
        ? `${nextUrl}&businessId=${result.businessId}`
        : `/${eventSlug}/usaha`
      router.push(dest)
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Logo */}
      <div className="flex items-center gap-5">
        <button
          className="relative size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-primary focus:outline-none"
          disabled={isSubmitting}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          {logo ? (
            <Image alt="logo preview" className="object-cover" fill sizes="80px" src={logo.previewUrl} />
          ) : (
            <span className="flex flex-col items-center justify-center gap-1 text-slate-400">
              <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M12 3.75v8.25M8.25 8.25L12 4.5l3.75 3.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xs">Logo</span>
            </span>
          )}
        </button>
        <div className="text-sm text-slate-500">
          <p className="font-medium text-slate-700">Logo Perusahaan</p>
          <p>Opsional · Maks 5 MB (JPG/PNG)</p>
          {logo && (
            <button
              className="mt-1 text-xs text-destructive hover:underline"
              onClick={() => { setLogo(null); if (fileRef.current) fileRef.current.value = "" }}
              type="button"
            >
              Hapus logo
            </button>
          )}
        </div>
        <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} ref={fileRef} type="file" />
      </div>

      {/* Nama Perusahaan */}
      <FieldShell id="companyName" label="Nama Perusahaan" required>
        <Input
          className="h-11 rounded-2xl"
          disabled={isSubmitting}
          id="companyName"
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="PT / CV / UD / Nama Usaha"
          value={companyName}
        />
      </FieldShell>

      {/* Nama di Booth */}
      <FieldShell hint="Nama yang tampil di papan booth saat pameran." id="boothName" label="Nama di Booth" required>
        <Input
          className="h-11 rounded-2xl"
          disabled={isSubmitting || sameBoothName}
          id="boothName"
          onChange={(e) => setBoothName(e.target.value)}
          placeholder="Nama yang tampil di booth"
          value={sameBoothName ? companyName : boothName}
        />
      </FieldShell>
      <label className="-mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input
          checked={sameBoothName}
          disabled={isSubmitting}
          onChange={(e) => setSameBoothName(e.target.checked)}
          type="checkbox"
        />
        Sama dengan nama perusahaan
      </label>

      {/* Jenis Produk untuk Expo */}
      <FieldShell id="categorySlug" label="Jenis Produk untuk Expo" required>
        <select
          className="h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm disabled:opacity-50"
          disabled={isSubmitting}
          id="categorySlug"
          onChange={(e) => setCategorySlug(e.target.value)}
          value={categorySlug}
        >
          <option value="">Pilih jenis produk</option>
          {boothCategories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </FieldShell>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <PublicButton disabled={isSubmitting || !companyName.trim() || !categorySlug} fullWidth type="submit">
        {isSubmitting ? "Menyimpan..." : "Simpan & Lanjut"}
      </PublicButton>
    </form>
  )
}
