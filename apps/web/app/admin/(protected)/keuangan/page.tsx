import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import Link from "next/link";
import { Clock3, ReceiptText, Wallet, Waypoints } from "lucide-react";

import { createTenantDb, db } from "@repo/db";
import { expoEvents, participantBusinesses } from "@repo/db/schema/public";
import { boothBookings, invoices } from "@repo/db/schema/tenant";

import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FinanceDashboard } from "@/components/admin/finance/FinanceDashboard";
import { Button } from "@/components/ui/button";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getFinancePageData() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();

  const activeEvent =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({
          where: eq(expoEvents.schemaName, configuredSchemaName),
          with: {
            paymentChannels: {
              orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.label)],
            },
            qrisConfigs: true,
          },
        })
      : null) ??
    (await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
      with: {
        paymentChannels: {
          orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.label)],
        },
        qrisConfigs: true,
      },
    }));

  const pendingBookings = await tenantDb.query.boothBookings.findMany({
    where: and(eq(boothBookings.bookingStatus, "booked"), isNull(boothBookings.invoiceId)),
    with: {
      booth: {
        with: {
          zone: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.bookedAt)],
  });

  const pendingBusinessIds = [...new Set(pendingBookings.map((booking) => booking.businessId))];
  const pendingBusinesses =
    pendingBusinessIds.length > 0
      ? await db.query.participantBusinesses.findMany({
          where: inArray(participantBusinesses.id, pendingBusinessIds),
          with: {
            participant: true,
          },
        })
      : [];

  const pendingBusinessMap = new Map(
    pendingBusinesses.map((business) => [business.id, business] as const)
  );

  const pendingInvoiceGroups = pendingBusinessIds
    .map((businessId) => {
      const business = pendingBusinessMap.get(businessId);

      if (!business) {
        return null;
      }

      const items = pendingBookings
        .filter((booking) => booking.businessId === businessId)
        .map((booking) => ({
          boothCode: booking.booth.code,
          bookingId: booking.id,
          price: booking.finalPrice,
          zoneName: booking.booth.zone?.name ?? "-",
        }));

      return {
        boothCount: items.length,
        businessId,
        companyName: business.companyName,
        participantName: business.participant.name,
        total: items.reduce((sum, item) => sum + item.price, 0),
        items,
      };
    })
    .filter((group): group is NonNullable<typeof group> => !!group)
    .sort((left, right) => left.companyName.localeCompare(right.companyName));

  const invoiceRows = await tenantDb.query.invoices.findMany({
    with: {
      items: true,
      order: true,
      payments: {
        orderBy: (table, { desc }) => [desc(table.paidAt)],
      },
    },
    orderBy: (table, { desc }) => [desc(table.issueDate)],
  });

  const invoiceBusinessIds = [...new Set(invoiceRows.map((invoice) => invoice.order?.businessId || invoice.businessId).filter((id): id is string => !!id))];
  const invoiceBusinesses =
    invoiceBusinessIds.length > 0
      ? await db.query.participantBusinesses.findMany({
          where: inArray(participantBusinesses.id, invoiceBusinessIds),
          with: {
            participant: true,
          },
        })
      : [];
  const invoiceBusinessMap = new Map(
    invoiceBusinesses.map((business) => [business.id, business] as const)
  );

  const invoicesForDashboard = invoiceRows.map((invoice) => {
    const businessId = invoice.order?.businessId || invoice.businessId;
    const business = businessId ? invoiceBusinessMap.get(businessId) : null;

    return {
      companyName: business?.companyName ?? invoice.recipientName ?? "Tanpa Nama",
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      grandTotal: invoice.grandTotal,
      id: invoice.id,
      publicToken: invoice.publicToken,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      items: invoice.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        subtotal: item.subtotal,
        title: item.title,
      })),
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      participantName: business?.participant.name ?? invoice.recipientEmail ?? "-",
      paymentChannelKey: invoice.paymentChannelType === "bank_account"
        ? invoice.paymentChannelId
          ? `bank:${invoice.paymentChannelId}`
          : null
        : invoice.paymentChannelType === "qris"
          ? "qris:default"
          : null,
      paymentChannelLabel: invoice.paymentChannelLabel,
      paymentChannelType: invoice.paymentChannelType,
      payments: invoice.payments.map((payment) => ({
        amount: payment.amount,
        id: payment.id,
        method: payment.method,
        paidAt: payment.paidAt.toISOString(),
        paymentChannelLabel: payment.paymentChannelLabel,
        proofAssetId: payment.proofAssetId ?? null,
        referenceNumber: payment.referenceNumber,
        senderName: payment.senderName ?? null,
        status: payment.status,
      })),
      status: invoice.status,
    };
  });

  const paymentMethods = [
    ...(activeEvent?.paymentChannels
      .filter((channel) => channel.type === "bank_account" && channel.isActive)
      .map((channel) => ({
        key: `bank:${channel.id}`,
        label:
          [channel.bankName, channel.accountName].filter(Boolean).join(" · ") ||
          channel.label ||
          "Rekening",
        type: "bank_account",
      })) ?? []),
    ...(activeEvent?.qrisConfigs[0]?.isEnabled
      ? [
          {
            key: "qris:default",
            label: activeEvent.qrisConfigs[0].merchantName
              ? `QRIS · ${activeEvent.qrisConfigs[0].merchantName}`
              : "QRIS",
            type: "qris",
          },
        ]
      : []),
  ];

  const waitingPaymentInvoices = invoicesForDashboard.filter(
    (invoice) => invoice.status === "waiting_for_payment"
  );
  const paidInvoices = invoicesForDashboard.filter((invoice) => invoice.status === "paid");

  return {
    invoices: invoicesForDashboard,
    paymentMethods,
    pendingInvoiceGroups,
    summary: {
      paidCount: paidInvoices.length,
      paidValue: paidInvoices.reduce((sum, invoice) => sum + invoice.grandTotal, 0),
      waitingInvoiceCount: pendingInvoiceGroups.length,
      waitingPaymentCount: waitingPaymentInvoices.length,
      waitingPaymentValue: waitingPaymentInvoices.reduce(
        (sum, invoice) => sum + invoice.grandTotal,
        0
      ),
    },
  };
}

export default async function KeuanganPage() {
  const data = await getFinancePageData();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <AdminPageHeader
          eyebrow="Finance & Transactions"
          title="Booking, invoice, pembayaran"
          description="Mulai dari booth yang sudah dibooking, terbitkan invoice, pilih metode bayar, lalu tandai invoice paid."
        />
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/admin/keuangan/tambah-tagihan">
            <Button className="gap-2">
              <ReceiptText className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          </Link>
          <Link href="/admin/keuangan/cashflow">
            <Button variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              Lihat Buku Kas
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Menunggu Invoice"
          value={String(data.summary.waitingInvoiceCount)}
          detail="Perusahaan yang sudah booking booth tetapi invoice belum diterbitkan."
          icon={ReceiptText}
          trend="up"
          trendLabel="Dari booking aktif"
        />
        <AdminMetricCard
          label="Waiting for Payment"
          value={String(data.summary.waitingPaymentCount)}
          detail="Invoice yang sudah terbit dan masih menunggu pembayaran."
          icon={Clock3}
          trend="down"
          trendLabel={formatRupiah(data.summary.waitingPaymentValue)}
        />
        <AdminMetricCard
          label="Invoice Paid"
          value={String(data.summary.paidCount)}
          detail="Invoice yang sudah ditandai lunas."
          icon={Wallet}
          trend="up"
          trendLabel={formatRupiah(data.summary.paidValue)}
        />
        <AdminMetricCard
          label="Metode Pembayaran Aktif"
          value={String(data.paymentMethods.length)}
          detail="Rekening dan QRIS yang bisa dipilih saat invoice diterbitkan."
          icon={Waypoints}
          trend="up"
          trendLabel="Dari event setting"
        />
      </div>

      <FinanceDashboard data={data} />
    </div>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
