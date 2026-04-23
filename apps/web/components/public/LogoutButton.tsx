"use client"

import { useRouter } from "next/navigation"

export function LogoutButton({ eventSlug }: { eventSlug: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/public/logout", { method: "POST" })
    router.push(`/${eventSlug}/login`)
  }

  return (
    <button
      className="w-full rounded-2xl border border-red-200 bg-red-50 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-[.98]"
      onClick={handleLogout}
      type="button"
    >
      Keluar dari Akun
    </button>
  )
}
