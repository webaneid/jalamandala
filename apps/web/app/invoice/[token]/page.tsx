import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ImageIcon,
} from "lucide-react";

import { getInvoiceByToken } from "@/actions/finance";
import { getCurrentParticipantSession } from "@/lib/participant-session";
import { CopyButton } from "@/components/invoice/CopyButton";
import { InvoiceBackButton } from "@/components/invoice/InvoiceBackButton";
import { PaymentConfirmationTrigger } from "@/components/invoice/PaymentConfirmationTrigger";
import { PrintButton } from "@/components/invoice/PrintButton";
import { ProofImageLightbox } from "@/components/invoice/ProofImageLightbox";

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
  const [data, session] = await Promise.all([
    getInvoiceByToken(token),
    getCurrentParticipantSession(),
  ]);

  if (!data) notFound();

  const { invoice, participant, business, businessId, items, payments, event, paymentChannels, qrisConfig, qrisDynamic, whatsappSenderId } = data;

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);

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

  const statusConfig = isPaid
    ? { label: "Lunas", color: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50 border border-emerald-200", Icon: CheckCircle2 }
    : isWaitingConfirmation
    ? { label: "Menunggu Konfirmasi", color: "bg-blue-500", text: "text-blue-700 bg-blue-50 border border-blue-200", Icon: Clock }
    : invoice.status === "expired" || invoice.status === "cancelled"
    ? { label: invoice.status === "expired" ? "Kadaluarsa" : "Dibatalkan", color: "bg-slate-400", text: "text-slate-600 bg-slate-100 border border-slate-200", Icon: XCircle }
    : isOverdue
    ? { label: "Jatuh Tempo Terlampaui", color: "bg-red-500", text: "text-red-700 bg-red-50 border border-red-200", Icon: Clock }
    : { label: "Menunggu Pembayaran", color: "bg-amber-400", text: "text-amber-700 bg-amber-50 border border-amber-200", Icon: Clock };

  const fallbackUrl = session
    ? `/${event.slug}/dashboard`
    : `/${event.slug}/login`;

  const waMessage = business
    ? `Halo, saya sudah transfer untuk invoice ${invoice.invoiceNumber} atas nama ${business.companyName} sebesar ${fmt(invoice.grandTotal)}. Mohon konfirmasi. Terima kasih.`
    : `Halo, saya sudah transfer untuk invoice ${invoice.invoiceNumber} sebesar ${fmt(invoice.grandTotal)}. Mohon konfirmasi. Terima kasih.`;

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

  const paymentStatusConfig = {
    paid: { label: "Terverifikasi", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    pending_verification: { label: "Menunggu Verifikasi", cls: "text-blue-700 bg-blue-50 border-blue-200" },
    rejected: { label: "Ditolak", cls: "text-red-700 bg-red-50 border-red-200" },
  } as const;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Top accent bar */}
      <div className={`h-1.5 w-full ${statusConfig.color} print:hidden`} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Nav bar */}
        <div className="flex items-center justify-between print:hidden">
          <InvoiceBackButton fallbackUrl={fallbackUrl} />
          <PrintButton />
        </div>

        {/* ── INVOICE HEADER CARD ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Colored top stripe */}
          <div className={`h-1 w-full ${statusConfig.color}`} />

          <div className="p-5 sm:p-6">
            {/* Logo + Invoice title row */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                {event.logoAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${event.logoAssetId}`}
                    alt={event.name}
                    className="h-9 object-contain mb-2"
                  />
                ) : (
                  <p className="text-sm font-semibold text-primary mb-1">{event.name}</p>
                )}
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">INVOICE</h1>
                <p className="text-xs text-slate-400 mt-0.5">{invoice.invoiceNumber}</p>
              </div>

              {/* Status pill */}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border shrink-0 ${statusConfig.text}`}>
                <statusConfig.Icon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
            </div>

            {/* From / To */}
            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dari</p>
                <p className="font-semibold text-slate-800">{event.name}</p>
                <p className="text-slate-500 text-xs">Panitia Penyelenggara</p>
                {event.venue && <p className="text-slate-400 text-xs">{event.venue}</p>}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kepada</p>
                {business ? (
                  <>
                    <p className="font-semibold text-slate-800">{business.companyName}</p>
                    {business.brandName && business.brandName !== business.companyName && (
                      <p className="text-slate-600 text-xs">{business.brandName}</p>
                    )}
                    {participant && <p className="text-slate-500 text-xs">{participant.name}</p>}
                    {business.companyAddress && <p className="text-slate-400 text-xs">{business.companyAddress}</p>}
                  </>
                ) : participant ? (
                  <>
                    <p className="font-semibold text-slate-800">{participant.name}</p>
                    <p className="text-slate-500 text-xs">{participant.phone}</p>
                  </>
                ) : (
                  <p className="text-slate-400 text-xs italic">Peserta Terdaftar</p>
                )}
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 rounded-xl bg-slate-50 border border-slate-100 divide-x divide-slate-100 text-center">
              <div className="px-3 py-3">
                <p className="text-[10px] text-slate-400 mb-0.5">Terbit</p>
                <p className="text-xs font-semibold text-slate-700">{fmtDate(invoice.issueDate)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] text-slate-400 mb-0.5">Jatuh Tempo</p>
                <p className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                  {invoice.dueDate ? fmtDate(invoice.dueDate) : "—"}
                </p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[10px] text-slate-400 mb-0.5">Total</p>
                <p className="text-xs font-bold text-slate-900">{fmt(invoice.grandTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RINCIAN TAGIHAN ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <p className="text-sm font-bold text-slate-800">Rincian Tagihan</p>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Deskripsi</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 w-14">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 w-28">Harga Satuan</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayItems.length > 0 ? (
                  displayItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-500">{item.quantityLabel}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500">{fmt(item.unitPrice)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{fmt(item.subtotal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-sm">
                      Tidak ada rincian item.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="border-t border-slate-100 bg-slate-50/40">
                {invoice.taxAmount > 0 && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-xs text-slate-400">Subtotal</td>
                      <td className="px-5 py-2 text-right text-sm text-slate-600">{fmt(invoice.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-xs text-slate-400">Pajak</td>
                      <td className="px-5 py-2 text-right text-sm text-slate-600">{fmt(invoice.taxAmount)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right font-semibold text-slate-600">Total</td>
                  <td className="px-5 py-3 text-right font-extrabold text-slate-900 text-base">{fmt(invoice.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-50">
            {displayItems.length > 0 ? (
              displayItems.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm shrink-0">{fmt(item.subtotal)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span>{item.quantityLabel} × {fmt(item.unitPrice)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">Tidak ada rincian item.</p>
            )}
            {/* Mobile total */}
            <div className="px-5 py-4 bg-slate-50/60 flex justify-between items-center">
              {invoice.taxAmount > 0 && (
                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>Subtotal: {fmt(invoice.subtotal)}</div>
                  <div>Pajak: {fmt(invoice.taxAmount)}</div>
                </div>
              )}
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">Total Tagihan</p>
                <p className="text-lg font-extrabold text-slate-900">{fmt(invoice.grandTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── INSTRUKSI PEMBAYARAN ── */}
        {showPaymentSection && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <p className="text-sm font-bold text-slate-800">Cara Pembayaran</p>
            </div>
            <div className="p-5 space-y-4">
              {paymentChannels.length === 0 && !qrisConfig?.isEnabled ? (
                <p className="text-sm text-slate-500 italic">Hubungi admin untuk instruksi pembayaran.</p>
              ) : (
                <>
                  {paymentChannels.map((ch) => (
                    <div key={ch.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Transfer Bank · {ch.bankName ?? ch.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        Atas nama: <span className="font-semibold text-slate-800">{ch.accountName}</span>
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 text-xl tracking-wider">{ch.accountNumber}</p>
                        {ch.accountNumber && <CopyButton text={ch.accountNumber} />}
                      </div>
                      <p className="text-xs text-slate-500">
                        Transfer sejumlah:{" "}
                        <span className="font-bold text-slate-900">{fmt(invoice.grandTotal)}</span>
                      </p>
                      {ch.instruction && (
                        <p className="text-xs text-slate-400 border-t border-slate-200 pt-2">{ch.instruction}</p>
                      )}
                    </div>
                  ))}

                  {qrisConfig?.isEnabled && (qrisDynamic?.qrDataUrl || qrisConfig.imageAssetId) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center gap-3">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest self-start">QRIS</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrisDynamic?.qrDataUrl ?? `/api/media/${qrisConfig.imageAssetId}`}
                        alt="QRIS"
                        className="w-44 h-44 object-contain"
                      />
                      {(qrisDynamic?.merchantName || qrisConfig.merchantName) && (
                        <p className="text-sm font-semibold text-slate-800">
                          {qrisDynamic?.merchantName ?? qrisConfig.merchantName}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Nominal: <span className="font-bold">{fmt(invoice.grandTotal)}</span>
                      </p>
                      {qrisDynamic && (
                        <p className="text-xs text-primary font-medium">Scan QRIS · Nominal sudah terkunci</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Pending confirmation notice OR confirm button */}
              {hasPendingPayment ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Konfirmasi pembayaran sedang diverifikasi</p>
                      <p className="text-xs text-blue-600 mt-0.5">Panitia sedang memverifikasi bukti transfer Anda. Mohon tunggu.</p>
                    </div>
                  </div>
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="rounded-lg bg-white border border-blue-100 p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nominal</span>
                        <span className="font-semibold text-slate-800">{fmt(p.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Atas nama</span>
                        <span className="font-medium text-slate-700">{p.senderName ?? "—"}</span>
                      </div>
                      {p.paymentChannelLabel && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Via</span>
                          <span className="font-medium text-slate-700">{p.paymentChannelLabel}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tanggal transfer</span>
                        <span className="font-medium text-slate-700">{fmtDate(p.paidAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                paymentChannels.length > 0 || qrisConfig?.isEnabled ? (
                  <PaymentConfirmationTrigger
                    businessId={businessId}
                    eventSlug={event.slug}
                    grandTotal={invoice.grandTotal}
                    invoiceNumber={invoice.invoiceNumber}
                    paymentOptions={paymentOptions}
                    publicToken={invoice.publicToken}
                  />
                ) : null
              )}

              {/* WhatsApp */}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Konfirmasi via WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── HISTORI PEMBAYARAN ── */}
        {payments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50">
              <p className="text-sm font-bold text-slate-800">Histori Pembayaran</p>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Channel / Pengirim</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Nominal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-400">Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p) => {
                    const psCfg = paymentStatusConfig[p.status as keyof typeof paymentStatusConfig];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/40 transition">
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{fmtDate(p.paidAt)}</td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <p className="text-xs">{p.paymentChannelLabel ?? p.method ?? "—"}</p>
                          {p.senderName && <p className="text-xs text-slate-400">a/n {p.senderName}</p>}
                          {p.referenceNumber && <p className="text-xs text-slate-400">{p.referenceNumber}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-800 text-xs">{fmt(p.amount)}</td>
                        <td className="px-4 py-3.5">
                          {psCfg ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${psCfg.cls}`}>
                              {psCfg.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{p.status}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {p.proofAssetId ? (
                            <ProofImageLightbox assetId={p.proofAssetId} />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-200 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {totalPaid > 0 && (
                  <tfoot className="border-t border-slate-100 bg-slate-50/40">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-right text-xs font-semibold text-slate-500">
                        Total Terverifikasi
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-sm">
                        {fmt(totalPaid)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-50">
              {payments.map((p) => {
                const psCfg = paymentStatusConfig[p.status as keyof typeof paymentStatusConfig];
                return (
                  <div key={p.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{fmt(p.amount)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDate(p.paidAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.proofAssetId && <ProofImageLightbox assetId={p.proofAssetId} />}
                        {psCfg ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${psCfg.cls}`}>
                            {psCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">{p.status}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      {(p.paymentChannelLabel || p.method) && (
                        <p>Via: <span className="text-slate-700">{p.paymentChannelLabel ?? p.method}</span></p>
                      )}
                      {p.senderName && (
                        <p>Atas nama: <span className="text-slate-700">{p.senderName}</span></p>
                      )}
                      {p.referenceNumber && (
                        <p>Ref: <span className="text-slate-700">{p.referenceNumber}</span></p>
                      )}
                    </div>
                  </div>
                );
              })}
              {totalPaid > 0 && (
                <div className="px-5 py-3 bg-slate-50/60 flex justify-between items-center">
                  <p className="text-xs text-slate-400">Total Terverifikasi</p>
                  <p className="font-extrabold text-emerald-700">{fmt(totalPaid)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400 space-y-0.5">
          <p>Pertanyaan? Hubungi panitia {event.name}.</p>
          <p>Dihasilkan otomatis oleh sistem Jalamandala.</p>
        </div>
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
        if (!existing) continue;
        const nextBoothCodes = dedupeDisplayValues([...(existing.boothCodes ?? []), ...boothCodes]);
        const nextFacilities = dedupeDisplayValues([...(existing.boothFacilities ?? []), ...boothFacilities]);
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
  if (boothCodes.length > 0) parts.push(`Booth: ${boothCodes.join(", ")}`);
  if (facilities.length > 0) parts.push(`Fasilitas: ${facilities.join(", ")}`);
  return parts.length > 0 ? parts.join(". ") : null;
}

function dedupeDisplayValues(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }
  return result;
}
