import Link from "next/link"
import { count, eq, sql } from "drizzle-orm"
import {
  ArrowRight,
  ChartColumnIncreasing,
  LayoutGrid,
  ReceiptText,
  Users,
} from "lucide-react"

import { db, createTenantDb } from "@repo/db"
import { participants, expoEvents } from "@repo/db/schema/public"
import { invoices, booths } from "@repo/db/schema/tenant"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowRight as ArrowRightIcon } from "lucide-react"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
  }).format(n)

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
}

export default async function AdminDashboardPage() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  const [
    event,
    totalParticipants,
    invoiceCounts,
    boothCounts,
    revenueRow,
    recentInvoices,
  ] = await Promise.all([
    db.query.expoEvents.findFirst({
      where: eq(expoEvents.schemaName, TENANT_SCHEMA),
      columns: { name: true },
    }),
    db.select({ totalParticipants: count() }).from(participants).then((r) => r[0]?.totalParticipants ?? 0),
    tenantDb
      .select({ status: invoices.status, cnt: count() })
      .from(invoices)
      .groupBy(invoices.status),
    tenantDb
      .select({ status: booths.status, cnt: count() })
      .from(booths)
      .groupBy(booths.status),
    tenantDb
      .select({ total: sql<string>`coalesce(sum(grand_total),0)` })
      .from(invoices)
      .where(sql`status != 'cancelled'`),
    tenantDb.query.invoices.findMany({
      columns: { invoiceNumber: true, status: true, grandTotal: true, createdAt: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 5,
    }),
  ])

  const eventName = event?.name ?? "Expo"

  const activeInvoices = invoiceCounts
    .filter((r: { status: string; cnt: number }) => ["waiting_for_payment", "waiting_confirmation"].includes(r.status))
    .reduce((s: number, r: { cnt: number }) => s + Number(r.cnt), 0)
  const paidInvoices = invoiceCounts.find((r: { status: string }) => r.status === "paid")?.cnt ?? 0
  const totalInvoices = invoiceCounts.reduce((s: number, r: { cnt: number }) => s + Number(r.cnt), 0)

  const openBooths = boothCounts.find((r: { status: string }) => r.status === "open")?.cnt ?? 0
  const totalBooths = boothCounts.reduce((s: number, r: { cnt: number }) => s + Number(r.cnt), 0)
  const soldBooths = totalBooths - Number(openBooths)

  const revenue = Number(revenueRow[0]?.total ?? 0)

  const funnelData = [
    { label: "Peserta terdaftar", value: Number(totalParticipants), tone: "bg-slate-100 text-slate-700" },
    { label: "Invoice terbit", value: totalInvoices, tone: "bg-amber-50 text-amber-700" },
    { label: "Sudah bayar", value: Number(paidInvoices), tone: "bg-emerald-50 text-emerald-700" },
    { label: "Booth terisi", value: soldBooths, tone: "bg-primary-50 text-primary-700" },
  ]
  const funnelMax = Math.max(...funnelData.map((d) => d.value), 1)

  const statusLabel: Record<string, string> = {
    waiting_for_payment: "Menunggu bayar",
    waiting_confirmation: "Menunggu konfirmasi",
    paid: "Lunas",
    expired: "Kedaluwarsa",
    cancelled: "Dibatalkan",
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        badge="Superadmin"
        title={`Dashboard kontrol ${eventName}`}
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
          label="Total Peserta"
          value={String(totalParticipants)}
          detail="Total peserta terdaftar di sistem."
          icon={Users}
        />
        <AdminMetricCard
          label="Invoice Aktif"
          value={String(activeInvoices)}
          detail="Invoice menunggu pembayaran atau konfirmasi."
          icon={ReceiptText}
        />
        <AdminMetricCard
          label="Booth Terisi"
          value={`${soldBooths} / ${totalBooths}`}
          detail={`${openBooths} booth masih tersedia.`}
          icon={LayoutGrid}
        />
        <AdminMetricCard
          label="Total Pendapatan"
          value={fmt(revenue)}
          detail="Nilai total invoice aktif dan lunas."
          icon={ChartColumnIncreasing}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Funnel Registrasi Tenant</CardTitle>
            <CardDescription>
              Alur pendaftaran: daftar, invoice, bayar, booth terisi.
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
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${item.tone}`}>
                      {item.value}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-50">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((item.value / funnelMax) * 100)}%` }}
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
                    Kontrol utama {eventName}
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
              <CardTitle>Invoice Terbaru</CardTitle>
              <CardDescription>5 invoice terakhir yang masuk ke sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada invoice.</p>
              ) : (
                recentInvoices.map((inv) => (
                  <Link
                    key={inv.invoiceNumber}
                    href={`/admin/keuangan?q=${inv.invoiceNumber}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 hover:border-primary/30 hover:bg-primary-50/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-primary-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabel[inv.status] ?? inv.status} · {fmt(inv.grandTotal)}
                      </p>
                    </div>
                    <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Shortcut kerja harian untuk panitia inti.</CardDescription>
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
