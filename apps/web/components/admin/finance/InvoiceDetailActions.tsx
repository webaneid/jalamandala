"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Pencil, Wallet } from "lucide-react";

import {
  markInvoiceAsPaid,
  updateInvoicePaymentMethod,
  verifyPaymentConfirmation,
} from "@/actions/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { PrivateImageLink } from "@/components/admin/media/PrivateImage";

type PendingPayment = {
  id: string;
  amount: number;
  paidAt: string;
  status: string;
  method: string | null;
  paymentChannelLabel: string | null;
  referenceNumber: string | null;
  senderName: string | null;
  proofAssetId: string | null;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  grandTotal: number;
  status: string;
  paymentChannelKey: string | null;
  paymentChannelLabel: string | null;
};

type PaymentMethod = { key: string; label: string; type: string };

type Props =
  | { mode: "verify"; payment: PendingPayment; invoiceId: string }
  | { mode: "admin-actions"; invoice: InvoiceSummary; paymentMethods: PaymentMethod[] };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toWibDateTimeLocal(date: Date) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const mo = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

// ── Verify mode ────────────────────────────────────────────────────────────────
function VerifyCard({ payment, invoiceId }: { payment: PendingPayment; invoiceId: string }) {
  const router = useRouter();
  const [isPending, start] = React.useTransition();
  const [error, setError] = React.useState("");

  function handleVerify() {
    setError("");
    start(async () => {
      const result = await verifyPaymentConfirmation(payment.id);
      if (!result.success) {
        setError(result.error ?? "Gagal memverifikasi.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Jumlah Transfer</p>
          <p className="font-bold text-blue-900 text-base">{formatCurrency(payment.amount)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tanggal & Jam</p>
          <p className="font-medium">{formatDate(payment.paidAt)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Atas Nama</p>
          <p className="font-medium">{payment.senderName ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Channel</p>
          <p className="font-medium">{payment.paymentChannelLabel ?? payment.method ?? "-"}</p>
        </div>
        {payment.referenceNumber && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">No. Referensi</p>
            <p className="font-medium">{payment.referenceNumber}</p>
          </div>
        )}
      </div>

      {payment.proofAssetId && (
        <PrivateImageLink
          assetId={payment.proofAssetId}
          alt="Bukti transfer"
          className="h-48 rounded-lg border hover:opacity-80 transition-opacity"
        />
      )}

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button className="w-full gap-2" disabled={isPending} onClick={handleVerify} type="button">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
        Verifikasi Pembayaran
      </Button>
    </div>
  );
}

// ── Admin actions mode ─────────────────────────────────────────────────────────
function AdminActionsCard({
  invoice,
  paymentMethods,
}: {
  invoice: InvoiceSummary;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const [isPending, start] = React.useTransition();
  const [error, setError] = React.useState("");

  // Pilih metode
  const [editingMethod, setEditingMethod] = React.useState(false);
  const [methodKey, setMethodKey] = React.useState(invoice.paymentChannelKey ?? "");

  // Tandai paid
  const [editingPaid, setEditingPaid] = React.useState(false);
  const [paidAt, setPaidAt] = React.useState(() => toWibDateTimeLocal(new Date()));
  const [amount, setAmount] = React.useState(String(invoice.grandTotal));
  const [senderName, setSenderName] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [paymentMethodKey, setPaymentMethodKey] = React.useState(invoice.paymentChannelKey ?? "");
  const [proofAsset, setProofAsset] = React.useState<MediaPickerValue>(null);
  const [notes, setNotes] = React.useState("");

  function saveMethod() {
    setError("");
    start(async () => {
      const result = await updateInvoicePaymentMethod(invoice.id, methodKey);
      if (!result.success) { setError(result.error ?? "Gagal."); return; }
      setEditingMethod(false);
      router.refresh();
    });
  }

  function saveMarkPaid() {
    setError("");
    start(async () => {
      const result = await markInvoiceAsPaid({
        amount: Number(amount) || invoice.grandTotal,
        invoiceId: invoice.id,
        notes,
        paidAt,
        paymentMethodKey,
        proofAssetId: proofAsset?.id || undefined,
        referenceNumber,
        senderName,
      });
      if (!result.success) { setError(result.error ?? "Gagal."); return; }
      setEditingPaid(false);
      router.refresh();
    });
  }

  if (invoice.status === "paid") {
    return (
      <Card>
        <CardContent className="pt-5">
          <Badge className="bg-green-100 text-green-700 border-none">Invoice Lunas</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">Aksi Admin</CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Pilih metode */}
        {!editingPaid && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Metode Pembayaran</p>
            {editingMethod ? (
              <div className="space-y-2">
                <select
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600"
                  onChange={(e) => setMethodKey(e.target.value)}
                  value={methodKey}
                >
                  <option value="">Pilih metode</option>
                  {paymentMethods.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={isPending} onClick={saveMethod} size="sm" type="button">
                    {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}Simpan
                  </Button>
                  <Button className="flex-1" onClick={() => setEditingMethod(false)} size="sm" type="button" variant="outline">
                    Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">{invoice.paymentChannelLabel ?? "Belum dipilih"}</span>
                <button onClick={() => setEditingMethod(true)} className="text-primary-700 hover:underline text-xs font-medium" type="button">
                  <Pencil className="inline size-3 mr-1" />Ubah
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tandai paid */}
        {!editingMethod && (
          editingPaid ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold border-t pt-3">Input Pembayaran Manual</p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Jumlah Transfer (tagihan: {formatCurrency(invoice.grandTotal)})</label>
                <Input min={1} onChange={(e) => setAmount(e.target.value)} type="number" value={amount} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tanggal & Jam Transfer (WIB)</label>
                <Input onChange={(e) => setPaidAt(e.target.value)} type="datetime-local" value={paidAt} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Metode Pembayaran</label>
                <select
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600"
                  onChange={(e) => setPaymentMethodKey(e.target.value)}
                  value={paymentMethodKey}
                >
                  <option value="">Pilih metode</option>
                  {paymentMethods.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Atas Nama Pengirim</label>
                <Input onChange={(e) => setSenderName(e.target.value)} placeholder="Nama pemilik rekening" value={senderName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">No. Referensi</label>
                <Input onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Opsional" value={referenceNumber} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bukti Transfer</label>
                <MediaPicker
                  value={proofAsset}
                  onChange={setProofAsset}
                  accept="image"
                  folder="private/payment-proofs"
                  visibility="private"
                  placeholder="Pilih atau upload bukti transfer..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Catatan</label>
                <textarea
                  className="min-h-16 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary-600"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opsional"
                  value={notes}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="flex-1 gap-1.5" disabled={isPending} onClick={saveMarkPaid} type="button">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                  Simpan Pembayaran
                </Button>
                <Button className="flex-1" onClick={() => setEditingPaid(false)} type="button" variant="outline">
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full gap-2" onClick={() => setEditingPaid(true)} type="button" variant="outline">
              <Wallet className="size-4" />
              Input Pembayaran Manual
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────────
export function InvoiceDetailActions(props: Props) {
  if (props.mode === "verify") {
    return <VerifyCard payment={props.payment} invoiceId={props.invoiceId} />;
  }
  return <AdminActionsCard invoice={props.invoice} paymentMethods={props.paymentMethods} />;
}
