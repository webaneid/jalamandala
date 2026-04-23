import Link from "next/link"
import { eq } from "drizzle-orm"
import { db, createTenantDb } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { invoices } from "@repo/db/schema/tenant"
import { getCurrentParticipantSession } from "@/lib/participant-session"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const fmtDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d) : "—"

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  paid: { label: "Lunas", color: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-400" },
  waiting_for_payment: { label: "Menunggu Bayar", color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-400" },
  expired: { label: "Kedaluwarsa", color: "bg-slate-100 border-slate-200 text-slate-500", dot: "bg-slate-400" },
  cancelled: { label: "Dibatalkan", color: "bg-red-50 border-red-200 text-red-600", dot: "bg-red-400" },
}

export default async function DashboardInvoicePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>
}) {
  const { eventSlug } = await params
  const session = await getCurrentParticipantSession()

  const tenantDb = await createTenantDb(TENANT_SCHEMA)
  const myInvoices = await tenantDb.query.invoices.findMany({
    where: eq(invoices.participantId, session!.participantId),
    columns: {
      id: true,
      invoiceNumber: true,
      grandTotal: true,
      status: true,
      issueDate: true,
      dueDate: true,
      publicToken: true,
      businessId: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  // Get business names
  const businessIds = [...new Set(myInvoices.map((i) => i.businessId).filter(Boolean) as string[])]
  const bizMap = new Map<string, string>()
  if (businessIds.length > 0) {
    const bizList = await db.query.participantBusinesses.findMany({
      where: (t, { inArray }) => inArray(t.id, businessIds),
      columns: { id: true, companyName: true },
    })
    bizList.forEach((b) => bizMap.set(b.id, b.companyName))
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-5 pt-14 pb-5 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-900">Invoice</h1>
        <p className="text-sm text-slate-500 mt-0.5">{myInvoices.length} tagihan</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {myInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg className="size-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M9 12h6M9 16h4M5 3h14a1 1 0 011 1v16l-2-1.5L16 20l-2 1.5L12 20l-2 1.5L8 20l-2 1.5V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">Belum ada invoice</p>
            <p className="text-sm text-slate-500 mt-1">Invoice akan muncul setelah Anda booking booth.</p>
          </div>
        ) : (
          myInvoices.map((inv) => {
            const s = STATUS_MAP[inv.status] ?? STATUS_MAP.waiting_for_payment!
            const bizName = inv.businessId ? (bizMap.get(inv.businessId) ?? "—") : "—"
            const isOverdue = inv.dueDate && new Date() > inv.dueDate && inv.status !== "paid" && inv.status !== "cancelled"

            return (
              <Link
                key={inv.id}
                href={`/invoice/${inv.publicToken}`}
                className="block rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden active:scale-[.99] transition"
              >
                {/* Status bar top */}
                <div className={`h-1 w-full ${inv.status === "paid" ? "bg-emerald-400" : isOverdue ? "bg-red-400" : "bg-amber-400"}`} />

                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{bizName}</p>
                      <p className="font-bold text-slate-900 mt-0.5">{inv.invoiceNumber}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.color}`}>
                      <span className={`size-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-400">Diterbitkan: {fmtDate(inv.issueDate)}</p>
                      {inv.dueDate && (
                        <p className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                          Jatuh tempo: {fmtDate(inv.dueDate)}
                          {isOverdue ? " · Terlambat!" : ""}
                        </p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-slate-900">{fmt(inv.grandTotal)}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                    <span>Lihat detail & bayar</span>
                    <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
