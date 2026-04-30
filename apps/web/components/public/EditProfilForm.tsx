"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { updatePublicParticipantProfile } from "@/actions/participants"
import { FieldShell } from "@/components/public/ui/FieldShell"
import { Input } from "@/components/ui/input"

type Props = {
  defaultValues: {
    name: string
    email?: string | null
    phone?: string | null
    whatsapp?: string | null
  }
  eventSlug: string
}

export function EditProfilForm({ defaultValues, eventSlug }: Props) {
  const router = useRouter()
  const [name, setName] = React.useState(defaultValues.name)
  const [email, setEmail] = React.useState(defaultValues.email ?? "")
  const [phone, setPhone] = React.useState(defaultValues.phone ?? "")
  const [error, setError] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!name.trim()) { setError("Nama lengkap wajib diisi."); return }
    setIsSubmitting(true)
    try {
      const res = await updatePublicParticipantProfile({ name, email, phone })
      if (!res.success) { setError(res.error ?? "Gagal menyimpan."); return }
      router.push(`/${eventSlug}/dashboard/profil`)
      router.refresh()
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FieldShell id="name" label="Nama Lengkap" required>
        <Input
          className="h-11 rounded-2xl"
          disabled={isSubmitting}
          id="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap Anda"
          value={name}
        />
      </FieldShell>

      <FieldShell id="email" label="Email" required>
        <Input
          className="h-11 rounded-2xl"
          disabled={isSubmitting}
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@contoh.com"
          type="email"
          value={email}
        />
      </FieldShell>

      <FieldShell id="phone" label="Nomor Telepon">
        <Input
          className="h-11 rounded-2xl"
          disabled={isSubmitting}
          id="phone"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="021xxxxxxx"
          value={phone}
        />
      </FieldShell>

      {/* WhatsApp read-only notice — nomor sudah terverifikasi, tidak bisa diubah mandiri */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <span className="mt-0.5 shrink-0 text-blue-500">
          <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-semibold text-blue-700">WhatsApp: {defaultValues.whatsapp ?? "—"}</p>
          <p className="text-xs text-blue-600 mt-0.5">Nomor WhatsApp tidak dapat diubah sendiri. Hubungi panitia jika perlu perubahan.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 hover:bg-primary/90"
        disabled={isSubmitting || !name.trim()}
        type="submit"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
      </button>
    </form>
  )
}
