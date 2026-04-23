"use client";

import * as React from "react";
import { Eye, Loader2, Pencil, Plus, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createInvoiceFromBookedBooths,
  markInvoiceAsPaid,
  updateInvoicePaymentMethod,
} from "@/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FinanceDashboardData = {
  invoices: Array<{
    companyName: string;
    dueDate: string | null;
    grandTotal: number;
    id: string;
    publicToken: string;
    invoiceNumber: string;
    issueDate: string;
    items: Array<{
      id: string;
      quantity: number;
      subtotal: number;
      title: string;
    }>;
    paidAt: string | null;
    participantName: string;
    paymentChannelKey: string | null;
    paymentChannelLabel: string | null;
    paymentChannelType: string | null;
    payments: Array<{
      amount: number;
      id: string;
      method: string | null;
      paidAt: string;
      paymentChannelLabel: string | null;
      proofAssetId: string | null;
      referenceNumber: string | null;
      senderName: string | null;
      status: string;
    }>;
    status: string;
  }>;
  paymentMethods: Array<{
    key: string;
    label: string;
    type: string;
  }>;
  pendingInvoiceGroups: Array<{
    boothCount: number;
    businessId: string;
    companyName: string;
    items: Array<{
      boothCode: string;
      bookingId: string;
      price: number;
      zoneName: string;
    }>;
    participantName: string;
    total: number;
  }>;
  summary: {
    paidCount: number;
    paidValue: number;
    waitingInvoiceCount: number;
    waitingPaymentCount: number;
    waitingPaymentValue: number;
  };
};

type FinanceTab = "bookings" | "invoices";

type PaymentMethodEditorState = {
  invoiceId: string;
  invoiceNumber: string;
  paymentMethodKey: string;
} | null;

type MarkPaidEditorState = {
  amount: string;
  grandTotal: number;
  invoiceId: string;
  invoiceNumber: string;
  notes: string;
  paidAt: string;
  paymentMethodKey: string;
  proofContentType: string;
  proofDataUrl: string;
  proofFileName: string;
  referenceNumber: string;
  senderName: string;
} | null;

export function FinanceDashboard({ data }: { data: FinanceDashboardData }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<FinanceTab>("bookings");
  const [isSaving, startSaving] = React.useTransition();
  const [bookingError, setBookingError] = React.useState("");
  const [invoiceError, setInvoiceError] = React.useState("");
  const [paymentMethodEditor, setPaymentMethodEditor] =
    React.useState<PaymentMethodEditorState>(null);
  const [markPaidEditor, setMarkPaidEditor] = React.useState<MarkPaidEditorState>(null);

  function createInvoice(businessId: string) {
    setBookingError("");
    startSaving(async () => {
      const result = await createInvoiceFromBookedBooths(businessId);

      if (!result.success) {
        setBookingError(result.error ?? "Gagal membuat invoice.");
        return;
      }

      router.refresh();
    });
  }

  function savePaymentMethod() {
    if (!paymentMethodEditor) {
      return;
    }

    setInvoiceError("");
    startSaving(async () => {
      const result = await updateInvoicePaymentMethod(
        paymentMethodEditor.invoiceId,
        paymentMethodEditor.paymentMethodKey
      );

      if (!result.success) {
        setInvoiceError(result.error ?? "Gagal menyimpan metode pembayaran.");
        return;
      }

      setPaymentMethodEditor(null);
      router.refresh();
    });
  }

  function saveMarkPaid() {
    if (!markPaidEditor) {
      return;
    }

    setInvoiceError("");
    startSaving(async () => {
      const result = await markInvoiceAsPaid({
        amount: Number(markPaidEditor.amount) || markPaidEditor.grandTotal,
        invoiceId: markPaidEditor.invoiceId,
        notes: markPaidEditor.notes,
        paidAt: markPaidEditor.paidAt,
        paymentMethodKey: markPaidEditor.paymentMethodKey,
        proofData: markPaidEditor.proofDataUrl
          ? {
              contentType: markPaidEditor.proofContentType,
              dataUrl: markPaidEditor.proofDataUrl,
              fileName: markPaidEditor.proofFileName,
            }
          : undefined,
        referenceNumber: markPaidEditor.referenceNumber,
        senderName: markPaidEditor.senderName,
      });

      if (!result.success) {
        setInvoiceError(result.error ?? "Gagal menandai invoice sebagai paid.");
        return;
      }

      setMarkPaidEditor(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-[28px] border border-white/80 bg-white/90 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="grid gap-2 md:grid-cols-2">
          <TabButton
            active={activeTab === "bookings"}
            description="Booth booking yang siap diterbitkan menjadi invoice"
            label="Booking -> Invoice"
            onClick={() => setActiveTab("bookings")}
          />
          <TabButton
            active={activeTab === "invoices"}
            description="Invoice waiting for payment, metode bayar, dan paid"
            label="Invoice & Payment"
            onClick={() => setActiveTab("invoices")}
          />
        </div>
      </div>

      {activeTab === "bookings" ? (
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Booking yang Menunggu Invoice</CardTitle>
            <CardDescription>
              Semua booking booth yang belum punya invoice akan muncul di sini. Satu perusahaan
              akan digabung jadi satu invoice draft operasional.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Peserta</TableHead>
                  <TableHead>Booth</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pendingInvoiceGroups.map((group) => (
                  <TableRow key={group.businessId}>
                    <TableCell className="font-medium text-primary-950">
                      <div>{group.companyName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {group.boothCount} booth
                      </div>
                    </TableCell>
                    <TableCell>{group.participantName}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-normal text-muted-foreground">
                      {group.items
                        .map((item) => `${item.boothCode} (${item.zoneName})`)
                        .join(", ")}
                    </TableCell>
                    <TableCell className="font-medium">{formatRupiah(group.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={isSaving}
                        onClick={() => createInvoice(group.businessId)}
                        type="button"
                      >
                        {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                        Buat Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {data.pendingInvoiceGroups.length === 0 ? (
                  <EmptyRow colSpan={5} label="Belum ada booking yang menunggu invoice." />
                ) : null}
              </TableBody>
            </Table>

            {bookingError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {bookingError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "invoices" ? (
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Invoice & Payment</CardTitle>
              <CardDescription className="mt-1.5">
                Pilih metode bayar untuk invoice waiting for payment, lalu tandai invoice paid saat
                pembayaran sudah masuk.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Metode Bayar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[220px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium text-primary-950">
                      <div>{invoice.invoiceNumber}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Terbit {formatDate(invoice.issueDate)}
                        {invoice.dueDate ? ` • Jatuh tempo ${formatDate(invoice.dueDate)}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{invoice.companyName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {invoice.participantName}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[340px] whitespace-normal text-muted-foreground">
                      {invoice.items.map((item) => item.title).join(", ")}
                    </TableCell>
                    <TableCell>
                      {invoice.paymentChannelLabel ? (
                        <div className="text-sm text-foreground">{invoice.paymentChannelLabel}</div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Belum dipilih</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <InvoiceStatusBadge status={invoice.status} />
                        {invoice.payments.some((p) => p.status === "pending_verification") && (
                          <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200 text-xs w-fit">
                            Konfirmasi Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatRupiah(invoice.grandTotal)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/keuangan/${invoice.id}`}>
                          <IconButton
                            icon={<Eye className="size-4" />}
                            label="Lihat detail invoice"
                            onClick={() => {}}
                          />
                        </Link>
                        <IconButton
                          icon={<Wallet className="size-4" />}
                          label="Buka Invoice Publik"
                          onClick={() => window.open(`/invoice/${invoice.publicToken || invoice.id}`, '_blank')}
                        />
                        <IconButton
                          icon={<Pencil className="size-4" />}
                          label="Pilih metode bayar"
                          onClick={() =>
                            setPaymentMethodEditor({
                              invoiceId: invoice.id,
                              invoiceNumber: invoice.invoiceNumber,
                              paymentMethodKey: invoice.paymentChannelKey ?? "",
                            })
                          }
                        />
                        {invoice.status !== "paid" ? (
                          <IconButton
                            icon={<Wallet className="size-4" />}
                            label="Tandai paid"
                            onClick={() =>
                              setMarkPaidEditor({
                                amount: String(invoice.grandTotal),
                                grandTotal: invoice.grandTotal,
                                invoiceId: invoice.id,
                                invoiceNumber: invoice.invoiceNumber,
                                notes: "",
                                paidAt: toDateTimeLocal(new Date().toISOString()),
                                paymentMethodKey: invoice.paymentChannelKey ?? "",
                                proofContentType: "",
                                proofDataUrl: "",
                                proofFileName: "",
                                referenceNumber: "",
                                senderName: "",
                              })
                            }
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.invoices.length === 0 ? (
                  <EmptyRow colSpan={7} label="Belum ada invoice." />
                ) : null}
              </TableBody>
            </Table>

            {invoiceError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {invoiceError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {paymentMethodEditor ? (
        <ModalFrame
          title={`Metode Bayar ${paymentMethodEditor.invoiceNumber}`}
          description="Pilih rekening atau QRIS yang akan dipakai untuk invoice ini."
          onClose={() => setPaymentMethodEditor(null)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Metode Pembayaran</label>
              <select
                className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setPaymentMethodEditor((current) =>
                    current ? { ...current, paymentMethodKey: event.target.value } : current
                  )
                }
                value={paymentMethodEditor.paymentMethodKey}
              >
                <option value="">Pilih metode bayar</option>
                {data.paymentMethods.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {invoiceError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {invoiceError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setPaymentMethodEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={savePaymentMethod} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan Metode
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {markPaidEditor ? (
        <ModalFrame
          title={`Tandai Paid ${markPaidEditor.invoiceNumber}`}
          description="Simpan metode bayar, tanggal bayar, dan referensi pembayaran lalu ubah invoice menjadi paid."
          onClose={() => setMarkPaidEditor(null)}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Metode Pembayaran</label>
              <select
                className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setMarkPaidEditor((current) =>
                    current ? { ...current, paymentMethodKey: event.target.value } : current
                  )
                }
                value={markPaidEditor.paymentMethodKey}
              >
                <option value="">Pilih metode bayar</option>
                {data.paymentMethods.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Jumlah Transfer{" "}
                <span className="text-neutral-400 font-normal">
                  (tagihan: {formatRupiah(markPaidEditor.grandTotal)})
                </span>
              </label>
              <Input
                min={1}
                onChange={(event) =>
                  setMarkPaidEditor((current) =>
                    current ? { ...current, amount: event.target.value } : current
                  )
                }
                type="number"
                value={markPaidEditor.amount}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Tanggal & Jam Transfer <span className="text-neutral-400 font-normal">(WIB)</span>
                </label>
                <Input
                  onChange={(event) =>
                    setMarkPaidEditor((current) =>
                      current ? { ...current, paidAt: event.target.value } : current
                    )
                  }
                  type="datetime-local"
                  value={markPaidEditor.paidAt}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nomor Referensi / Kode Unik</label>
                <Input
                  onChange={(event) =>
                    setMarkPaidEditor((current) =>
                      current ? { ...current, referenceNumber: event.target.value } : current
                    )
                  }
                  placeholder="Opsional"
                  value={markPaidEditor.referenceNumber}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Atas Nama Rekening Pengirim</label>
              <Input
                onChange={(event) =>
                  setMarkPaidEditor((current) =>
                    current ? { ...current, senderName: event.target.value } : current
                  )
                }
                placeholder="Nama pemilik rekening yang transfer"
                value={markPaidEditor.senderName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Bukti Transfer <span className="text-neutral-400 font-normal">(foto/screenshot, maks 5MB)</span>
              </label>
              <input
                accept="image/*,application/pdf"
                className="w-full rounded-2xl border border-input bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setMarkPaidEditor((current) =>
                      current
                        ? {
                            ...current,
                            proofContentType: file.type,
                            proofDataUrl: reader.result as string,
                            proofFileName: file.name,
                          }
                        : current
                    );
                  };
                  reader.readAsDataURL(file);
                }}
                type="file"
              />
              {markPaidEditor.proofDataUrl && markPaidEditor.proofContentType.startsWith("image/") && (
                <img
                  alt="Preview bukti transfer"
                  className="mt-2 h-32 w-auto rounded-xl border object-contain"
                  src={markPaidEditor.proofDataUrl}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Catatan Admin</label>
              <textarea
                className="min-h-20 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setMarkPaidEditor((current) =>
                    current ? { ...current, notes: event.target.value } : current
                  )
                }
                placeholder="Opsional"
                value={markPaidEditor.notes}
              />
            </div>

            {invoiceError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {invoiceError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setMarkPaidEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={saveMarkPaid} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan Jadi Paid
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </>
  );
}

function TabButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[22px] border px-4 py-3 text-left transition",
        active
          ? "border-primary/20 bg-primary/10 shadow-[0_10px_24px_rgba(29,78,216,0.10)]"
          : "border-transparent bg-white/70 hover:border-border/80 hover:bg-white"
      )}
      onClick={onClick}
      type="button"
    >
      <p className={cn("text-sm font-semibold", active ? "text-primary-800" : "text-foreground")}>
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  );
}

function ModalFrame({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
              Transaksi
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-primary-950">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        Lunas
      </Badge>
    );
  }
  if (status === "waiting_confirmation") {
    return (
      <Badge className="bg-blue-50 text-blue-700 ring-1 ring-blue-200">
        Menunggu Konfirmasi
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge className="bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200">
        Kedaluwarsa
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge className="bg-red-50 text-red-600 ring-1 ring-red-200">
        Dibatalkan
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
      Menunggu Pembayaran
    </Badge>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell className="py-8 text-center text-muted-foreground" colSpan={colSpan}>
        {label}
      </TableCell>
    </TableRow>
  );
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
