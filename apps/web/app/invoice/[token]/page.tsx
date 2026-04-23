import { notFound } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  History,
  MessageCircle,
  User,
  XCircle,
} from "lucide-react";

import { getInvoiceByToken } from "@/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/invoice/CopyButton";
import { PaymentConfirmationTrigger } from "@/components/invoice/PaymentConfirmationTrigger";
import { PrintButton } from "@/components/invoice/PrintButton";

type PublicInvoiceItem = NonNullable<Awaited<ReturnType<typeof getInvoiceByToken>>>["items"][number];

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

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getInvoiceByToken(token);

  if (!data) notFound();

  const { invoice, participant, business, businessId, items, payments, event, paymentChannels, qrisConfig, qrisDynamic, whatsappSenderId } = data;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const isOverdue =
    invoice.dueDate
      ? new Date() > invoice.dueDate && invoice.status !== "paid" && invoice.status !== "cancelled"
      : false;
  const isPaid = invoice.status === "paid";
  const isWaitingConfirmation = invoice.status === "waiting_confirmation";
  const isClosedStatus = isPaid || invoice.status === "expired" || invoice.status === "cancelled";
  const showPaymentSection = !isClosedStatus;
  const hasPendingPayment = payments.some((p) => p.status === "pending_verification");
  const pendingPayments = payments.filter((p) => p.status === "pending_verification");
  const paidPayments = payments.filter((p) => p.status === "paid");

  function StatusBadge() {
    if (isPaid) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          Lunas
        </Badge>
      );
    }
    if (isWaitingConfirmation) {
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none gap-1.5">
          <Clock className="w-4 h-4" />
          Menunggu Konfirmasi Panitia
        </Badge>
      );
    }
    if (invoice.status === "expired" || invoice.status === "cancelled") {
      return (
        <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-none gap-1.5">
          <XCircle className="w-4 h-4" />
          {invoice.status === "expired" ? "Kadaluarsa" : "Dibatalkan"}
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none gap-1.5">
          <Clock className="w-4 h-4" />
          Jatuh Tempo Terlampaui
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none gap-1.5">
        <Clock className="w-4 h-4" />
        Menunggu Pembayaran
      </Badge>
    );
  }

  const waMessage = business
    ? `Halo, saya sudah transfer untuk invoice ${invoice.invoiceNumber} atas nama ${business.companyName} sebesar ${formatCurrency(invoice.grandTotal)}. Mohon konfirmasi. Terima kasih.`
    : `Halo, saya sudah transfer untuk invoice ${invoice.invoiceNumber} sebesar ${formatCurrency(invoice.grandTotal)}. Mohon konfirmasi. Terima kasih.`;

  const paymentOptions = [
    ...paymentChannels.map((ch) => ({
      key: `bank:${ch.id}`,
      label: [ch.bankName, ch.accountName].filter(Boolean).join(" · ") || ch.label,
    })),
    ...(qrisConfig?.isEnabled
      ? [{ key: "qris:default", label: qrisConfig.merchantName ? `QRIS · ${qrisConfig.merchantName}` : "QRIS" }]
      : []),
  ];

  const waLink = whatsappSenderId
    ? `https://wa.me/${whatsappSenderId.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`
    : null;
  const displayItems = buildDisplayInvoiceItems(items);

  return (
    <div className="min-h-screen bg-neutral-50/50 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Action bar */}
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>

        <Card className="shadow-lg border-neutral-200 overflow-hidden print:shadow-none print:border-none">
          <div className={`h-2 w-full ${isPaid ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-blue-600"}`} />

          {/* Header */}
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-4">
              <div>
                {event.logoAssetId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${event.logoAssetId}`} alt={event.name} className="h-10 mb-2 object-contain" />
                )}
                <p className="text-xs text-neutral-500">{event.name}</p>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">INVOICE</h1>
                <p className="text-sm text-neutral-500">{invoice.invoiceNumber}</p>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <StatusBadge />
                {invoice.dueDate && (
                  <p className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-neutral-500"}`}>
                    Jatuh tempo: {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Diterbitkan Oleh
                </p>
                <p className="font-semibold text-neutral-900">{event.name}</p>
                <p className="text-sm text-neutral-500">Panitia Penyelenggara</p>
                {event.venue && <p className="text-sm text-neutral-500">{event.venue}</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Ditagihkan Kepada
                </p>
                {business ? (
                  <>
                    <p className="font-semibold text-neutral-900">{business.companyName}</p>
                    {business.brandName && business.brandName !== business.companyName && (
                      <p className="text-sm text-neutral-600">{business.brandName}</p>
                    )}
                    {participant && (
                      <p className="text-sm text-neutral-500">{participant.name}</p>
                    )}
                    {business.companyAddress && (
                      <p className="text-sm text-neutral-500">{business.companyAddress}</p>
                    )}
                    {(business.companyPhone || business.companyWhatsapp) && (
                      <p className="text-sm text-neutral-500">
                        {business.companyPhone || business.companyWhatsapp}
                      </p>
                    )}
                  </>
                ) : participant ? (
                  <>
                    <p className="font-semibold text-neutral-900">{participant.name}</p>
                    <p className="text-sm text-neutral-500">{participant.phone}</p>
                  </>
                ) : (
                  <p className="text-sm text-neutral-500 italic">Peserta Terdaftar</p>
                )}
              </div>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 rounded-lg">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Tanggal Terbit</p>
                <p className="text-sm font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Jatuh Tempo</p>
                <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
                </p>
              </div>
              <div className="col-span-2 md:text-right">
                <p className="text-xs text-neutral-500 mb-1">Total Tagihan</p>
                <p className="text-lg font-bold text-neutral-900">{formatCurrency(invoice.grandTotal)}</p>
              </div>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-400" />
                Rincian Tagihan
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-neutral-500">Deskripsi</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-500 w-16">Qty</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-500 w-32">Harga Satuan</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-500 w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayItems.length > 0 ? (
                      displayItems.map((item) => (
                        <tr key={item.id} className="bg-white">
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-900">{item.title}</p>
                            {item.description && (
                              <p className="text-neutral-500 text-xs mt-0.5">{item.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-neutral-600">{item.quantityLabel}</td>
                          <td className="px-4 py-3 text-right text-neutral-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                          Tidak ada rincian item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-neutral-50/50 border-t">
                    {invoice.taxAmount > 0 && (
                      <>
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-sm text-neutral-500">Subtotal</td>
                          <td className="px-4 py-2 text-right text-sm text-neutral-600">{formatCurrency(invoice.subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-sm text-neutral-500">Pajak</td>
                          <td className="px-4 py-2 text-right text-sm text-neutral-600">{formatCurrency(invoice.taxAmount)}</td>
                        </tr>
                      </>
                    )}
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-medium text-neutral-700">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900 text-base">
                        {formatCurrency(invoice.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment instructions */}
            {showPaymentSection && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 print:hidden">
                <h3 className="text-base font-semibold text-blue-900 mb-4">Instruksi Pembayaran</h3>

                {paymentChannels.length === 0 && !qrisConfig?.isEnabled ? (
                  <p className="text-sm text-blue-800 italic">
                    Hubungi admin untuk instruksi pembayaran.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Bank channels */}
                    {paymentChannels.map((ch) => (
                      <div key={ch.id} className="bg-white border border-blue-200 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                          Transfer Bank · {ch.bankName ?? ch.label}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Atas nama: <span className="font-medium text-neutral-900">{ch.accountName}</span>
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-neutral-900 text-lg tracking-wider">
                            {ch.accountNumber}
                          </p>
                          {ch.accountNumber && <CopyButton text={ch.accountNumber} />}
                        </div>
                        <p className="text-sm text-neutral-600">
                          Transfer sejumlah:{" "}
                          <span className="font-bold text-neutral-900">{formatCurrency(invoice.grandTotal)}</span>
                        </p>
                        {ch.instruction && (
                          <p className="text-xs text-neutral-500 border-t pt-2">{ch.instruction}</p>
                        )}
                      </div>
                    ))}

                    {/* QRIS */}
                    {qrisConfig?.isEnabled && (qrisDynamic?.qrDataUrl || qrisConfig.imageAssetId) && (
                      <div className="bg-white border border-blue-200 rounded-lg p-4 flex flex-col items-center gap-3">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider self-start">
                          QRIS
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrisDynamic?.qrDataUrl ?? `/api/media/${qrisConfig.imageAssetId}`}
                          alt="QRIS"
                          className="w-48 h-48 object-contain"
                        />
                        {(qrisDynamic?.merchantName || qrisConfig.merchantName) && (
                          <p className="text-sm font-medium text-neutral-900">
                            {qrisDynamic?.merchantName ?? qrisConfig.merchantName}
                          </p>
                        )}
                        {qrisDynamic ? (
                          <p className="text-xs text-blue-700 font-medium">
                            Scan QRIS di bawah • Nominal sudah terkunci
                          </p>
                        ) : null}
                        <p className="text-sm text-neutral-600">
                          Nominal: <span className="font-bold">{formatCurrency(invoice.grandTotal)}</span>
                        </p>
                      </div>
                    )}

                    {/* Pending confirmation notice */}
                    {hasPendingPayment ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Konfirmasi pembayaran sedang diverifikasi</p>
                            <p className="text-xs text-blue-700 mt-0.5">
                              Panitia sedang memverifikasi bukti transfer Anda. Mohon tunggu notifikasi.
                            </p>
                          </div>
                        </div>
                        {pendingPayments.map((p) => (
                          <div key={p.id} className="rounded-lg bg-white border border-blue-100 p-3 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Nominal</span>
                              <span className="font-semibold text-neutral-900">{formatCurrency(p.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Atas nama</span>
                              <span className="font-medium text-neutral-800">{p.senderName ?? "—"}</span>
                            </div>
                            {p.paymentChannelLabel && (
                              <div className="flex justify-between">
                                <span className="text-neutral-500">Via</span>
                                <span className="font-medium text-neutral-800">{p.paymentChannelLabel}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-neutral-500">Waktu transfer</span>
                              <span className="font-medium text-neutral-800">{formatDate(p.paidAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <PaymentConfirmationTrigger
                        businessId={businessId}
                        eventSlug={event.slug}
                        grandTotal={invoice.grandTotal}
                        invoiceNumber={invoice.invoiceNumber}
                        paymentOptions={paymentOptions}
                        publicToken={invoice.publicToken}
                      />
                    )}

                    {/* WA confirmation */}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Konfirmasi via WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment history — all payments */}
            {payments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-400" />
                  Histori Pembayaran
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">Tanggal</th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">Channel / Pengirim</th>
                        <th className="px-4 py-3 text-right font-medium text-neutral-500">Nominal</th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p) => (
                        <tr key={p.id} className="bg-white">
                          <td className="px-4 py-3 text-neutral-700">{formatDate(p.paidAt)}</td>
                          <td className="px-4 py-3 text-neutral-700">
                            <p>{p.paymentChannelLabel ?? p.method ?? "-"}</p>
                            {p.senderName && <p className="text-xs text-neutral-400">a/n {p.senderName}</p>}
                            {p.referenceNumber && <p className="text-xs text-neutral-400">{p.referenceNumber}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-900">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {p.status === "paid" ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-xs">
                                Terverifikasi
                              </Badge>
                            ) : p.status === "pending_verification" ? (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-xs">
                                Menunggu Verifikasi
                              </Badge>
                            ) : p.status === "rejected" ? (
                              <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none text-xs">
                                Ditolak
                              </Badge>
                            ) : (
                              <Badge className="bg-neutral-100 text-neutral-500 border-none text-xs">
                                {p.status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {totalPaid > 0 && (
                      <tfoot className="bg-neutral-50/50 border-t">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-right text-sm text-neutral-500">
                            Total Terverifikasi
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-green-700">
                            {formatCurrency(totalPaid)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </CardContent>

          <hr className="border-border" />

          <CardFooter className="py-6 bg-neutral-50/30 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-neutral-500">
              Pertanyaan mengenai tagihan ini? Hubungi panitia {event.name}.
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Dihasilkan secara otomatis oleh sistem Jalamandala.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function buildDisplayInvoiceItems(items: PublicInvoiceItem[]): DisplayInvoiceItem[] {
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
