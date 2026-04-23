import Link from "next/link"
import {
  ArrowRight,
  ChartColumnIncreasing,
  ClipboardCheck,
  LayoutGrid,
  ReceiptText,
  Users,
} from "lucide-react"

import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

const funnelData = [
  { label: "Draft formulir", value: 34, tone: "bg-slate-100 text-slate-700" },
  { label: "Invoice terbit", value: 48, tone: "bg-amber-50 text-amber-700" },
  { label: "Sudah bayar", value: 31, tone: "bg-emerald-50 text-emerald-700" },
  { label: "E-pass terbit", value: 26, tone: "bg-primary-50 text-primary-700" },
]

const recentActivity = [
  {
    title: "Invoice INV-FORBIS-0048 dibuka",
    detail: "PT Maju Bersama memilih skema pembayaran penuh untuk booth B-12.",
    time: "8 menit lalu",
  },
  {
    title: "Peserta baru masuk dari formulir publik",
    detail: "Nabila Rahmah mengirim pendaftaran kategori food & beverage.",
    time: "21 menit lalu",
  },
  {
    title: "Verifikasi pembayaran berhasil",
    detail: "Tim finance menandai invoice INV-FORBIS-0041 sebagai lunas.",
    time: "43 menit lalu",
  },
]

const quickActions = [
  {
    title: "Tambah Peserta Manual",
    description: "Input cepat untuk peserta yang mendaftar lewat panitia.",
    href: "/admin/peserta/tambah",
  },
  {
    title: "Atur Ketersediaan Booth",
    description: "Blok area penuh dan sesuaikan harga tiap zona.",
    href: "/admin/booth",
  },
  {
    title: "Kelola Invoice",
    description: "Pantau invoice aktif, jatuh tempo, dan tindak lanjut admin.",
    href: "/admin/keuangan",
  },
]


export const metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        badge="Superadmin"
        title="Dashboard kontrol FORBIS Expo"
        description="Pantau pendaftar, invoice, booth, dan progres operasional event dalam satu dashboard."
        actions={
          <>
            <Link
              href="/admin/peserta/tambah"
              className={buttonVariants({ className: "rounded-2xl px-4" })}
            >
              Tambah Peserta
            </Link>
            <Link
              href="/admin/keuangan"
              className={buttonVariants({
                variant: "outline",
                className: "rounded-2xl bg-white/90 px-4",
              })}
            >
              Lihat Invoice
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Total Pendaftar"
          value="152"
          detail="Gabungan pendaftar publik dan input manual panitia untuk event aktif."
          icon={Users}
          trend="up"
          trendLabel="+18 minggu ini"
        />
        <AdminMetricCard
          label="Invoice Aktif"
          value="48"
          detail="Invoice yang telah diterbitkan dan masih menunggu pembayaran."
          icon={ReceiptText}
          trend="down"
          trendLabel="9 melewati jatuh tempo"
        />
        <AdminMetricCard
          label="Booth Terjual"
          value="72 / 100"
          detail="Posisi okupansi seluruh zona pameran hingga hari ini."
          icon={LayoutGrid}
          trend="up"
          trendLabel="72% terisi"
        />
        <AdminMetricCard
          label="Potensi Pendapatan"
          value="Rp184,5 jt"
          detail="Nilai total invoice terbit dari booth, add-on, dan penyesuaian biaya."
          icon={ChartColumnIncreasing}
          trend="up"
          trendLabel="+Rp32 jt pekan ini"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Funnel Registrasi Tenant</CardTitle>
            <CardDescription>
              Struktur ini disiapkan untuk mengikuti alur sederhana: daftar,
              invoice, bayar, e-pass.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {funnelData.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/60 bg-muted/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <Badge className={cn("ring-1 ring-inset", item.tone)}>
                      {item.value}
                    </Badge>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-50">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(item.value, 12)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 via-white to-accent-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary-600">
                    Operasional Event
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-primary-900">
                    Kontrol utama FORBIS Expo
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Gunakan area ini untuk memantau progres registrasi, pembayaran,
                    dan penerbitan e-pass.
                  </p>
                </div>
                <Link
                  href="/admin/peserta"
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-2xl bg-white/90 px-4",
                  })}
                >
                  Lanjut ke data peserta
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>
                Timeline operasional yang akan jadi pusat monitoring panitia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {recentActivity.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 flex size-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                      <ClipboardCheck className="size-4" />
                    </div>
                    {index < recentActivity.length - 1 ? (
                      <div className="mt-2 h-full w-px bg-border" />
                    ) : null}
                  </div>
                  <div className="space-y-1 pb-4">
                    <p className="font-medium text-primary-900">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.detail}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Shortcut kerja harian untuk panitia inti.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {quickActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 transition-colors hover:border-primary-100 hover:bg-primary-50/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-primary-900">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary-700" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
