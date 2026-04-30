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
          className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
          disabled={isSubmitting}
          id="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap Anda"
          value={name}
        />
      </FieldShell>

      <FieldShell id="email" label="Email" required>
        <Input
          className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
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
          className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
          disabled={isSubmitting}
          id="phone"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="021xxxxxxx"
          value={phone}
        />
      </FieldShell>

      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-200">
        Nomor WhatsApp tidak bisa diubah sendiri — hubungi panitia jika diperlukan perubahan.
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
