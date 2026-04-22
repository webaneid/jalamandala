"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BookUser,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Images,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Settings2,
  Sparkles,
  Store,
  UserCog,
  Users,
  Wallet,
  X,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const primaryNavigation = [
  {
    href: "/admin",
    label: "Overview & Analytics",
    description: "Ringkasan funnel registrasi, invoice, dan booth.",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/booth",
    label: "Peta & Booth",
    description: "Editor area, zona, dan ketersediaan booth.",
    icon: Map,
  },
  {
    href: "/admin/peserta",
    label: "Data Pendaftar",
    description: "Verifikasi, pencarian, dan input manual peserta.",
    icon: Users,
  },
  {
    href: "/admin/keuangan",
    label: "Keuangan",
    description: "Invoice, status pembayaran, dan tindak lanjut.",
    icon: Wallet,
  },
  {
    href: "/admin/agenda",
    label: "Agenda Event",
    description: "Run-down kegiatan, sesi, dan panggung event.",
    icon: CalendarDays,
  },
  {
    href: "/admin/setting",
    label: "Setting Event",
    description: "Konfigurasi event, timeline, channel pembayaran, dan pesan.",
    icon: Settings2,
  },
  {
    href: "/admin/laman",
    label: "Laman Event",
    description: "Landing page, S&K, dan informasi publik lainnya.",
    icon: FileText,
  },
  {
    href: "/admin/anggota-forbis",
    label: "Anggota FORBIS",
    description: "Database referensi anggota FORBIS untuk auto-populate form.",
    icon: BookUser,
  },
  {
    href: "/admin/vendor",
    label: "Vendor",
    description: "Kelola akun vendor booth dan add-on beserta penugasan mereka.",
    icon: Store,
  },
  {
    href: "/admin/pengguna",
    label: "Pengguna & Role",
    description: "Kelola akun dan hak akses pengguna sistem.",
    icon: UserCog,
  },
  {
    href: "/admin/media",
    label: "Media Library",
    description: "Kelola semua gambar, dokumen, dan file aset sistem.",
    icon: Images,
  },
]

const secondaryNavigation = [
  {
    href: "/admin/addon",
    label: "Konfigurasi Add-on",
  },
  {
    href: "/admin/peserta/tambah",
    label: "Tambah Peserta",
  },
  {
    href: "/admin/keuangan/pencairan",
    label: "Pencairan Dana",
  },
]

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href)
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  async function handleLogout() {
    await authClient.signOut()
    router.push("/admin/login")
  }

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-[296px] border-r border-border/80 bg-white/68 px-4 py-4 backdrop-blur-xl lg:flex lg:flex-col">
          <SidebarContent pathname={pathname} onLogout={handleLogout} />
        </aside>

        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[292px] border-r border-border/80 bg-white/90 px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-transform duration-200 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-3 flex items-center justify-end">
            <button
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-white/80 text-muted-foreground"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X className="size-4.5" />
            </button>
          </div>
          <SidebarContent pathname={pathname} onLogout={handleLogout} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/80 bg-white/62 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4 px-5 py-4 md:px-8">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-white/80 text-muted-foreground lg:hidden"
                  onClick={() => setMobileOpen(true)}
                  type="button"
                >
                  <Menu className="size-4.5" />
                </button>
                <div>
                  <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                    App Jalamandala
                  </p>
                  <h1 className="m-0 text-lg font-semibold tracking-[-0.03em] text-foreground">
                    {resolveSectionTitle(pathname)}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                {isMounted && session?.user?.name && (
                  <ShellBadge>{session.user.name}</ShellBadge>
                )}
                {isMounted && session?.user?.email && (
                  <ShellBadge>{session.user.email}</ShellBadge>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  type="button"
                >
                  <LogOut className="size-3" />
                  Keluar
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-5 py-6 md:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function SidebarContent({ pathname, onLogout }: { pathname: string; onLogout: () => void }) {
  return (
    <>
      <div className="rounded-[28px] border border-border/80 bg-card p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          Expo Backoffice
        </p>
        <div className="mt-4 flex items-start gap-3">
          <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="m-0 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
              FORBIS Expo
            </p>
            <p className="m-0 mt-1 truncate text-sm text-muted-foreground">
              Registrasi, invoice, pembayaran, e-pass.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ShellBadge>2026</ShellBadge>
              <ShellBadge>100 booth</ShellBadge>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
        <div>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Navigasi Utama
          </p>
          <div className="space-y-1.5">
            {primaryNavigation.map((item) => {
              const active = isActivePath(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-2xl border px-4 text-sm transition",
                    active
                      ? "border-primary/15 bg-primary/10 text-primary"
                      : "border-transparent bg-white/48 text-foreground hover:border-border/90 hover:bg-white/82"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="size-4.5" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {active ? (
                    <ChevronRight className="size-4 text-primary" />
                  ) : null}
                </Link>
              )
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Shortcut
          </p>
          <div className="space-y-1.5">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 items-center justify-between rounded-2xl border border-transparent bg-white/48 px-4 text-sm text-foreground transition hover:border-border/90 hover:bg-white/82"
              >
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="mt-4 grid gap-2">
        <Button variant="outline" className="min-h-12 justify-between rounded-2xl bg-white/80">
          Ganti Event
          <ChevronDown className="size-4" />
        </Button>
        <Button
          variant="outline"
          className="min-h-12 justify-between rounded-2xl bg-white/80 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
          onClick={onLogout}
          type="button"
        >
          Keluar
          <LogOut className="size-4" />
        </Button>
      </div>
    </>
  )
}

function ShellBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-foreground/6 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </span>
  )
}

function resolveSectionTitle(pathname: string) {
  if (pathname.startsWith("/admin/peserta/tambah")) {
    return "Tambah Peserta"
  }

  if (pathname.startsWith("/admin/peserta")) {
    return "Data Pendaftar"
  }

  if (pathname.startsWith("/admin/booth")) {
    return "Peta & Booth"
  }

  if (pathname.startsWith("/admin/addon")) {
    return "Konfigurasi Add-on"
  }

  if (pathname.startsWith("/admin/setting")) {
    return "Kelola Event"
  }

  if (pathname.startsWith("/admin/agenda")) {
    return "Agenda Event"
  }

  if (pathname.startsWith("/admin/keuangan")) {
    return "Keuangan & Transaksi"
  }

  if (pathname.startsWith("/admin/anggota-forbis")) {
    return "Anggota FORBIS"
  }

  if (pathname.startsWith("/admin/vendor")) {
    return "Vendor"
  }

  if (pathname.startsWith("/admin/pengguna")) {
    return "Pengguna & Role"
  }

  if (pathname.startsWith("/admin/media")) {
    return "Media Library"
  }

  if (pathname.startsWith("/admin/laman")) {
    return "Laman Event"
  }

  return "Overview & Analytics"
}
