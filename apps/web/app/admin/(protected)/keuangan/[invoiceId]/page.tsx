import { and, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createTenantDb, db } from "@repo/db";
import {
  boothBookings,
  eventAddons,
  invoiceItems,
  invoicePayments,
  invoices,
} from "@repo/db/schema/tenant";
import {
  participantBusinesses,
  participants,
  paymentChannels,
  qrisConfigs,
} from "@repo/db/schema/public";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DeleteInvoiceButton } from "@/components/admin/finance/DeleteInvoiceButton";
import { DpProgressBanner } from "@/components/admin/finance/DpProgressBanner";
import { InvoiceDetailActions } from "@/components/admin/finance/InvoiceDetailActions";
import { OverpaymentBanner } from "@/components/admin/finance/OverpaymentBanner";
import { PaymentProofPreviewButton } from "@/components/admin/finance/PaymentProofPreviewButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

export const dynamic = "force-dynamic";

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function dedupeTextValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
}

function formatBoothFacilityLabel(name: string | null | undefined, value: string | null | undefined) {
  const normalizedName = normalizeText(name);
  const normalizedValue = normalizeText(value);

  if (!normalizedName) return normalizedValue;
  if (!normalizedValue) return normalizedName;

  const compactName = normalizedName.replace(/\s+/g, "").toLowerCase();
  const compactValue = normalizedValue.replace(/\s+/g, "").toLowerCase();

  if (compactName.includes(compactValue)) {
    return normalizedName;
  }

  return `${normalizedName}: ${normalizedValue}`;
}

async function getInvoiceDetail(invoiceId: string) {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const invoice = await tenantDb.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: { items: true, payments: { orderBy: (t, { desc }) => [desc(t.paidAt)] } },
  });

  if (!invoice) return null;

  const proofAssetRows = await tenantDb.execute<{
    id: string;
    proof_asset_id: string | null;
  }>(sql`
    select id, proof_asset_id
    from invoice_payments
    where invoice_id = ${invoice.id}
  `);
  const proofAssetMap = new Map(
    proofAssetRows.map((row) => [row.id, row.proof_asset_id])
  );

  const [participant, business] = await Promise.all([
    invoice.participantId
      ? db.query.participants.findFirst({ where: eq(participants.id, invoice.participantId) })
      : null,
    invoice.businessId
      ? db.query.participantBusinesses.findFirst({ where: eq(participantBusinesses.id, invoice.businessId) })
      : null,
  ]);

  // Enrich items
  const boothBookingIds = invoice.items
    .filter((i) => i.itemType === "booth_booking" && i.referenceId)
    .map((i) => i.referenceId as string);
  const addonIds = invoice.items
    .filter((i) => i.itemType === "addon" && i.referenceId)
    .map((i) => i.referenceId as string);

  const [boothBookingRows, addonRows] = await Promise.all([
    boothBookingIds.length > 0
      ? tenantDb.query.boothBookings.findMany({
          where: inArray(boothBookings.id, boothBookingIds),
          with: {
            booth: {
              with: {
                facilities: {
                  orderBy: (table, { asc }) => [asc(table.createdAt)],
                  with: {
                    facility: true,
                  },
                },
                zone: true,
              },
            },
          },
        })
      : [],
    addonIds.length > 0
      ? tenantDb.query.eventAddons.findMany({
          where: inArray(eventAddons.id, addonIds),
          with: { addonUnit: true },
        })
      : [],
  ]);

  const boothBookingMap = new Map(boothBookingRows.map((b) => [b.id, b]));
  const addonMap = new Map(addonRows.map((a) => [a.id, a]));

  const enrichedItems = invoice.items.map((item) => {
    let addonDescription: string | null = null;
    let addonUnitName: string | null = null;
    let boothCode: string | null = null;
    let boothFacilities: string[] = [];
    let boothZoneName: string | null = null;

    if (item.itemType === "booth_booking" && item.referenceId) {
      const booking = boothBookingMap.get(item.referenceId);
      if (booking) {
        boothCode = booking.booth.code;
        boothZoneName = booking.booth.zone?.name ?? null;
        boothFacilities = dedupeTextValues(
          booking.booth.facilities.map((entry) =>
            formatBoothFacilityLabel(entry.facility?.name, entry.value)
          )
        );
      }
    } else if (item.itemType === "addon" && item.referenceId) {
      const addon = addonMap.get(item.referenceId);
      addonDescription = addon?.description ?? null;
      addonUnitName = addon?.addonUnit?.name ?? null;
    }

    return {
      ...item,
      addonDescription,
      addonUnitName,
      boothCode,
      boothFacilities,
      boothZoneName,
    };
  });

  // Payment methods for mark-paid form
  const activeEvent = await db.query.expoEvents?.findFirst?.() ?? null;
  const [activeChannels, qrisConfig] = activeEvent
    ? await Promise.all([
        db.query.paymentChannels.findMany({
          where: and(
            eq(paymentChannels.eventId, activeEvent.id),
            eq(paymentChannels.isActive, true),
            eq(paymentChannels.type, "bank_account")
          ),
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
        }),
        db.query.qrisConfigs.findFirst({ where: eq(qrisConfigs.eventId, activeEvent.id) }),
      ])
    : [[], null];

  const paymentMethods = [
    ...activeChannels.map((ch) => ({
      key: `bank:${ch.id}`,
      label: [ch.bankName, ch.accountName].filter(Boolean).join(" · ") || ch.label,
      type: "bank_account",
    })),
    ...(qrisConfig?.isEnabled
      ? [{ key: "qris:default", label: qrisConfig.merchantName ? `QRIS · ${qrisConfig.merchantName}` : "QRIS", type: "qris" }]
      : []),
  ];

  return {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      status: invoice.status,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      grandTotal: invoice.grandTotal,
      paidAt: invoice.paidAt,
      overpaymentAmount: invoice.overpaymentAmount ?? 0,
      dpAmount: invoice.dpAmount ?? 0,
      dpPaidAt: invoice.dpPaidAt ?? null,
      balanceDueDate: invoice.balanceDueDate?.toISOString() ?? null,
      paymentChannelLabel: invoice.paymentChannelLabel,
      paymentChannelKey: invoice.paymentChannelType === "bank_account" && invoice.paymentChannelId
        ? `bank:${invoice.paymentChannelId}`
        : invoice.paymentChannelType === "qris" ? "qris:default" : null,
      notes: invoice.notes,
      publicToken: invoice.publicToken,
    },
    participant: participant ? {
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      whatsapp: participant.whatsapp,
    } : null,
    business: business ? {
      companyName: business.companyName,
      brandName: business.brandName,
      companyPhone: business.companyPhone,
      companyWhatsapp: business.companyWhatsapp,
      companyAddress: business.companyAddress,
    } : null,
    items: enrichedItems,
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paidAt.toISOString(),
      status: p.status,
      method: p.method,
      paymentChannelLabel: p.paymentChannelLabel,
      referenceNumber: p.referenceNumber,
      senderName: p.senderName,
      proofAssetId: p.proofAssetId ?? proofAssetMap.get(p.id) ?? null,
    })),
    paymentMethods,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-700 border-none">Lunas</Badge>;
  if (status === "dp_paid") return <Badge className="bg-sky-100 text-sky-700 border-none">DP Diterima</Badge>;
  if (status === "balance_overdue") return <Badge className="bg-red-100 text-red-700 border-none">Melewati Deadline Pelunasan</Badge>;
  if (status === "waiting_confirmation") return <Badge className="bg-blue-100 text-blue-700 border-none">Menunggu Konfirmasi</Badge>;
  if (status === "dp_waiting_confirmation") return <Badge className="bg-blue-100 text-blue-700 border-none">DP — Menunggu Konfirmasi</Badge>;
  if (status === "balance_waiting_confirmation") return <Badge className="bg-blue-100 text-blue-700 border-none">Pelunasan — Menunggu Konfirmasi</Badge>;
  if (status === "expired") return <Badge className="bg-neutral-100 text-neutral-500 border-none">Kadaluarsa</Badge>;
  if (status === "cancelled") return <Badge className="bg-neutral-100 text-neutral-500 border-none">Dibatalkan</Badge>;
  if (status === "refunding") return <Badge className="bg-purple-100 text-purple-700 border-none">Sedang Direfund</Badge>;
  if (status === "refunded") return <Badge className="bg-purple-100 text-purple-600 border-none">Refund Selesai</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-none">Menunggu Pembayaran</Badge>;
}

type AdminInvoiceItem = NonNullable<Awaited<ReturnType<typeof getInvoiceDetail>>>["items"][number];

type DisplayInvoiceItem = {
  boothCodes?: string[];
  boothFacilities?: string[];
  description: string | null;
  id: string;
  itemType: string;
  quantity: number;
  quantityLabel: string;
  subtotal: number;
  title: string;
  unitPrice: number;
};

function buildDisplayInvoiceItems(items: AdminInvoiceItem[]): DisplayInvoiceItem[] {
  const displayItems: DisplayInvoiceItem[] = [];
  const boothGroupIndex = new Map<string, number>();

  for (const item of items) {
    if (item.itemType === "booth_booking") {
      const title = item.boothZoneName ? `Zona ${item.boothZoneName}` : item.title;
      const key = `${title}:${item.unitPrice}`;
      const existingIndex = boothGroupIndex.get(key);
      const boothCodes = item.boothCode ? [item.boothCode] : [];
      const boothFacilities = item.boothFacilities ?? [];

      if (existingIndex !== undefined) {
        const existing = displayItems[existingIndex];

        if (!existing) {
          continue;
        }

        const nextBoothCodes = dedupeDisplayValues([...(existing.boothCodes ?? []), ...boothCodes]);
        const nextFacilities = dedupeDisplayValues([
          ...(existing.boothFacilities ?? []),
          ...boothFacilities,
        ]);

        existing.boothCodes = nextBoothCodes;
        existing.boothFacilities = nextFacilities;
        existing.description = buildBoothDescription(nextBoothCodes, nextFacilities);
        existing.quantity += item.quantity;
        existing.quantityLabel = String(existing.quantity);
        existing.subtotal += item.subtotal;
        continue;
      }

      boothGroupIndex.set(key, displayItems.length);
      displayItems.push({
        boothCodes,
        boothFacilities,
        description: buildBoothDescription(boothCodes, boothFacilities),
        id: item.id,
        itemType: item.itemType,
        quantity: item.quantity,
        quantityLabel: String(item.quantity),
        subtotal: item.subtotal,
        title,
        unitPrice: item.unitPrice,
      });
      continue;
    }

    if (item.itemType === "addon") {
      const unitName = item.addonUnitName?.trim();

      displayItems.push({
        description: item.addonDescription ?? item.description,
        id: item.id,
        itemType: item.itemType,
        quantity: item.quantity,
        quantityLabel: unitName ? `${item.quantity} ${unitName}` : String(item.quantity),
        subtotal: item.subtotal,
        title: item.title,
        unitPrice: item.unitPrice,
      });
      continue;
    }

    displayItems.push({
      description: item.description,
      id: item.id,
      itemType: item.itemType,
      quantity: item.quantity,
      quantityLabel: String(item.quantity),
      subtotal: item.subtotal,
      title: item.title,
      unitPrice: item.unitPrice,
    });
  }

  return displayItems;
}

function buildBoothDescription(boothCodes: string[], facilities: string[]) {
  const parts: string[] = [];

  if (boothCodes.length > 0) {
    parts.push(`Booth: ${boothCodes.join(", ")}`);
  }

  if (facilities.length > 0) {
    parts.push(`Fasilitas: ${facilities.join(", ")}`);
  }

  return parts.length > 0 ? parts.join(". ") : null;
}

function dedupeDisplayValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
}


export const metadata = {
  title: "Detail Invoice",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const data = await getInvoiceDetail(invoiceId);
  if (!data) notFound();

  const { invoice, participant, business, items, payments, paymentMethods } = data;

  const totalVerified = payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amount, 0);
  const balanceDue = invoice.grandTotal - totalVerified;
  const pendingPayments = payments.filter((p) => p.status === "pending_verification");
  const verifiedPayments = payments.filter((p) => p.status === "verified");
  const displayItems = buildDisplayInvoiceItems(items);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/keuangan"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Keuangan
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          eyebrow="Finance & Transactions"
          title={invoice.invoiceNumber}
          description={business?.companyName ?? participant?.name ?? "Invoice"}
        />
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <StatusBadge status={invoice.status} />
          <DeleteInvoiceButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            participantName={participant?.name ?? "Peserta"}
          />
        </div>
      </div>

      {invoice.overpaymentAmount > 0 && (
        <OverpaymentBanner
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          overpaymentAmount={invoice.overpaymentAmount}
          participantName={participant?.name ?? ""}
        />
      )}

      {(invoice.status === "dp_paid" || invoice.status === "balance_overdue") && (
        <DpProgressBanner
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          grandTotal={invoice.grandTotal}
          dpAmount={invoice.dpAmount}
          balanceDueDate={invoice.balanceDueDate ? new Date(invoice.balanceDueDate) : null}
          status={invoice.status}
          participantName={participant?.name ?? ""}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom kiri: detail + items + histori */}
        <div className="space-y-6 lg:col-span-2">
          {/* Info invoice + pembeli */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Informasi Invoice</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Terbit</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                  <p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lunas Pada</p>
                  <p className="font-medium">{invoice.paidAt ? formatDate(invoice.paidAt) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Metode Bayar</p>
                  <p className="font-medium">{invoice.paymentChannelLabel ?? "-"}</p>
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Peserta</p>
                  <p className="font-semibold">{participant?.name ?? "-"}</p>
                  {participant?.email && <p className="text-muted-foreground">{participant.email}</p>}
                  {participant?.phone && <p className="text-muted-foreground">{participant.phone}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan</p>
                  <p className="font-semibold">{business?.companyName ?? "-"}</p>
                  {business?.brandName && business.brandName !== business.companyName && (
                    <p className="text-muted-foreground">{business.brandName}</p>
                  )}
                  {business?.companyAddress && <p className="text-muted-foreground">{business.companyAddress}</p>}
                  {(business?.companyPhone ?? business?.companyWhatsapp) && (
                    <p className="text-muted-foreground">{business.companyPhone ?? business.companyWhatsapp}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rincian tagihan */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Rincian Tagihan</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-neutral-50">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Item</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground w-16">Qty</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground w-32">Harga</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground w-32">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{item.quantityLabel}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-neutral-50/50">
                  {invoice.taxAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-sm text-muted-foreground">Pajak</td>
                      <td className="px-5 py-2 text-right text-sm">{formatCurrency(invoice.taxAmount)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold">Total Tagihan</td>
                    <td className="px-5 py-3 text-right font-bold text-lg">{formatCurrency(invoice.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Konfirmasi pending */}
          {pendingPayments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="border-b border-blue-200 pb-4">
                <CardTitle className="text-base text-blue-900">
                  Konfirmasi Pembayaran Menunggu Verifikasi ({pendingPayments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {pendingPayments.map((p) => (
                  <InvoiceDetailActions
                    key={p.id}
                    mode="verify"
                    payment={p}
                    invoiceId={invoice.id}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Histori pembayaran */}
          {verifiedPayments.length > 0 && (
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base">Histori Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-neutral-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Atas Nama</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Channel</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bukti</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Jumlah</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {verifiedPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(p.paidAt)}</td>
                        <td className="px-5 py-3">{p.senderName ?? "-"}</td>
                        <td className="px-5 py-3 text-muted-foreground">{p.paymentChannelLabel ?? p.method ?? "-"}</td>
                        <td className="px-5 py-3">
                          <PaymentProofPreviewButton assetId={p.proofAssetId} />
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3">
                          <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs">
                            Terverifikasi
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-neutral-50/50">
                    <tr>
                      <td colSpan={4} className="px-5 py-3 text-right font-semibold">Total Terbayar</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(totalVerified)}</td>
                      <td />
                    </tr>
                    {balanceDue > 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-2 text-right text-sm text-muted-foreground">Sisa Tagihan</td>
                        <td className="px-5 py-2 text-right font-semibold text-amber-700">{formatCurrency(balanceDue)}</td>
                        <td />
                      </tr>
                    )}
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom kanan: aksi admin */}
        <div className="space-y-4">
          <InvoiceDetailActions
            mode="admin-actions"
            invoice={invoice}
            paymentMethods={paymentMethods}
          />
        </div>
      </div>
    </div>
  );
}
