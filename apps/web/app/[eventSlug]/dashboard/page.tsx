import Link from "next/link"
import { eq } from "drizzle-orm"
import { db, createTenantDb } from "@repo/db"
import { participants, participantBusinesses } from "@repo/db/schema/public"
import { boothBookings, invoices } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, session!.participantId),
    columns: { name: true, organizationGroupName: true, organizationGroupSlug: true },
    with: { businesses: { columns: { id: true, companyName: true, boothName: true, logoAssetId: true } } },
  })

  const businesses = participant?.businesses ?? []
  const tenantDb = await createTenantDb(TENANT_SCHEMA)

  // Get latest booking + invoice for this participant
  const [latestBooking, latestInvoice] = await Promise.all([
    businesses.length > 0
      ? tenantDb.query.boothBookings.findFirst({
          where: eq(boothBookings.participantId, session!.participantId),
          columns: { bookingStatus: true, businessId: true },
          with: { booth: { columns: { code: true }, with: { zone: { columns: { name: true, colorCode: true } } } } },
        })
      : Promise.resolve(null),
    tenantDb.query.invoices.findFirst({
      where: eq(invoices.participantId, session!.participantId),
      columns: { status: true, grandTotal: true, publicToken: true, invoiceNumber: true },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
  ])

  const hasBooking = !!latestBooking
  const isPaid = latestInvoice?.status === "paid"
  const isActive = hasBooking && isPaid && latestBooking?.bookingStatus === "booked"

  // Determine progress step
  const step = !businesses.length ? 0 : !hasBooking ? 1 : !latestInvoice ? 2 : !isPaid ? 2 : 3

  const steps = [
    { label: "Daftar", done: true },
    { label: "Booking Booth", done: hasBooking },
    { label: "Pembayaran", done: isPaid },
    { label: "Aktif", done: isActive },
  ]

  // CTA contextual
  let cta: { href: string; label: string; color: string } | null = null
  if (!businesses.length) {
    cta = { href: `/${eventSlug}/usaha/baru`, label: "Daftar Usaha Sekarang →", color: "bg-primary" }
  } else if (!hasBooking) {
    cta = { href: `/${eventSlug}/booking`, label: "Booking Booth →", color: "bg-primary" }
  } else if (latestInvoice && !isPaid) {
    cta = {
      href: `/invoice/${latestInvoice.publicToken}`,
      label: `Bayar Invoice ${latestInvoice.invoiceNumber} · ${fmt(latestInvoice.grandTotal)}`,
      color: "bg-amber-500",
    }
  } else if (isPaid && !isActive) {
    cta = { href: `/${eventSlug}/dashboard`, label: "Menunggu Verifikasi Panitia…", color: "bg-slate-400" }
  } else if (isActive && latestBooking?.businessId) {
    cta = {
      href: `/${eventSlug}/usaha/${latestBooking.businessId}/epass`,
      label: "🎫 Lihat E-Pass Booth →",
      color: "bg-secondary",
    }
  }

  const initials = (participant?.name ?? "?")
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

  const firstName = (participant?.name ?? "").split(" ")[0] ?? "Peserta"

  return (
    <div className="min-h-full">
      {/* Top greeting bar */}
      <div className="bg-[#134397] px-5 pt-12 pb-10 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 size-40 rounded-full bg-white/5" />
        <div className="absolute top-6 -left-10 size-28 rounded-full bg-white/5" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-blue-200">Selamat datang,</p>
            <h1 className="mt-0.5 text-2xl font-bold text-white">{firstName} 👋</h1>
            <p className="mt-0.5 text-xs text-blue-300">{participant?.organizationGroupName ?? ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${eventSlug}#tenant`}
              className="flex size-9 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 transition hover:bg-white/20"
              aria-label="Lihat Tenant"
            >
              <svg className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 5.5 3h13L21 9.5M3 9.5h18M3 9.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5M9 21V12h6v9" />
              </svg>
            </Link>
            <div className="size-11 rounded-full bg-[#00adee] flex items-center justify-center shadow-lg border-2 border-white/30">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 -mt-6 space-y-4">
        {/* Progress stepper card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Progress Pendaftaran</p>
          <div className="flex items-center">
            {steps.map((s, i) => (
              <div key={s.label} className="flex-1 flex flex-col items-center relative">
                {/* Connector line */}
                {i > 0 && (
                  <div className={[
                    "absolute top-3 right-1/2 h-0.5 w-full -translate-y-1/2",
                    steps[i]?.done ? "bg-primary" : "bg-slate-200",
                  ].join(" ")} />
                )}
                <div className={[
                  "relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold",
                  s.done ? "bg-primary text-white" : "bg-slate-100 text-slate-400 border-2 border-slate-200",
                ].join(" ")}>
                  {s.done ? (
                    <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span className={[
                  "mt-1.5 text-center text-[10px] font-medium leading-tight",
                  s.done ? "text-primary" : "text-slate-400",
                ].join(" ")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        {cta && (
          <Link
            href={cta.href}
            className={[
              "flex w-full items-center justify-center rounded-2xl py-4 text-sm font-semibold text-white shadow-md transition active:scale-[.98]",
              cta.color,
            ].join(" ")}
          >
            {cta.label}
          </Link>
        )}

        {/* Active booth info */}
        {latestBooking?.booth && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100">
              <svg className="size-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1z" strokeLinecap="round" />
                <path d="M9 22V12h6v10" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Booth Terdaftar</p>
              <p className="font-bold text-slate-900">
                {latestBooking.booth.zone?.name && (
                  <span
                    className="mr-1.5 inline-block size-2 rounded-full"
                    style={{ backgroundColor: latestBooking.booth.zone.colorCode ?? "#94a3b8" }}
                  />
                )}
                {latestBooking.booth.zone?.name ?? ""} · Booth {latestBooking.booth.code}
              </p>
            </div>
          </div>
        )}

        {/* Quick access grid */}
        <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Akses Cepat</p>
        <div className="grid grid-cols-2 gap-3 pb-4">
          <QuickCard
            href={`/${eventSlug}/booking`}
            icon="🏪"
            label="Booking Booth"
            sub="Pesan booth baru"
            color="bg-primary/5 border-primary/20"
          />
          {latestBooking?.businessId ? (
            <QuickCard
              href={`/${eventSlug}/usaha/${latestBooking.businessId}/epass`}
              icon="🎫"
              label="E-Pass Booth"
              sub="Kartu peserta digital"
              color="bg-blue-50 border-blue-100"
            />
          ) : (
            <QuickCard
              href={`/${eventSlug}/dashboard/usaha`}
              icon="🏢"
              label="Usaha Saya"
              sub="Kelola data usaha"
              color="bg-blue-50 border-blue-100"
            />
          )}
          <QuickCard
            href={`/${eventSlug}/dashboard/invoice`}
            icon="🧾"
            label="Invoice"
            sub="Tagihan & pembayaran"
            color="bg-amber-50 border-amber-100"
          />
          <QuickCard
            href={`/${eventSlug}/agenda`}
            icon="📅"
            label="Agenda"
            sub="Jadwal acara"
            color="bg-violet-50 border-violet-100"
          />
        </div>
      </div>
    </div>
  )
}

function QuickCard({
  href, icon, label, sub, color,
}: {
  href: string; icon: string; label: string; sub: string; color: string
}) {
  return (
    <Link
      href={href}
      className={[
        "flex flex-col gap-2 rounded-2xl border p-4 transition active:scale-[.98]",
        color,
      ].join(" ")}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
      </div>
    </Link>
  )
}
