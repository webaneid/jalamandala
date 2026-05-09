"use client";

import * as React from "react";
import { AlertTriangle, Clock, Loader2, RotateCcw, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { cancelInvoiceWithRefund, extendReservation } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function fmt(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

type RefundBannerProps = {
  invoiceId: string;
  invoiceNumber: string;
  grandTotal: number;
  totalPaid: number;
  participantName: string;
} & (
  | { mode: "dp"; dpAmount: number; balanceDueDate: Date | null; status: "dp_paid" | "balance_overdue" }
  | { mode: "paid" }
);

export function DpProgressBanner(props: RefundBannerProps) {
  const router = useRouter();
  const [isPending, start] = React.useTransition();
  const [extendError, setExtendError] = React.useState("");
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [refundType, setRefundType] = React.useState<"full" | "half">("full");

  // Refund form state
  const [destBankName, setDestBankName] = React.useState("");
  const [destAccountNumber, setDestAccountNumber] = React.useState("");
  const [destAccountName, setDestAccountName] = React.useState(props.participantName);
  const [notes, setNotes] = React.useState("");
  const [refundError, setRefundError] = React.useState("");
  const [refundDone, setRefundDone] = React.useState(false);

  const isOverdue = props.mode === "dp" && props.status === "balance_overdue";
  const dpAmount = props.mode === "dp" ? props.dpAmount : 0;
  const remainingBalance = props.mode === "dp" ? Math.max(0, props.grandTotal - dpAmount) : 0;
  const progressPct = props.grandTotal > 0 ? Math.min(100, Math.round((props.totalPaid / props.grandTotal) * 100)) : 0;
  const refundAmount = refundType === "full" ? props.totalPaid : Math.floor(props.totalPaid / 2);

  function handleExtend() {
    setExtendError("");
    start(async () => {
      const result = await extendReservation(props.invoiceId);
      if (!result.success) { setExtendError(result.error ?? "Gagal memperpanjang."); return; }
      router.refresh();
    });
  }

  function handleRefundSubmit() {
    if (!destBankName.trim() || !destAccountNumber.trim() || !destAccountName.trim()) {
      setRefundError("Nama bank, nomor rekening, dan atas nama wajib diisi.");
      return;
    }
    setRefundError("");
    start(async () => {
      const result = await cancelInvoiceWithRefund({
        invoiceId: props.invoiceId,
        refundType,
        destBankName,
        destAccountNumber,
        destAccountName,
        notes,
      });
      if (!result.success) { setRefundError(result.error ?? "Gagal membatalkan invoice."); return; }
      setRefundDone(true);
      setRefundOpen(false);
      router.refresh();
    });
  }

  if (refundDone) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        Invoice <strong>{props.invoiceNumber}</strong> telah dibatalkan. Permohonan refund ({fmt(refundAmount)}) sudah masuk ke halaman Pencairan Dana.
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-2xl border px-5 py-4 ${
        props.mode === "paid" ? "border-violet-200 bg-violet-50"
        : isOverdue ? "border-red-300 bg-red-50"
        : "border-sky-200 bg-sky-50"
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {props.mode === "paid"
              ? <XCircle className="mt-0.5 size-5 shrink-0 text-violet-600" />
              : isOverdue
                ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
                : <Clock className="mt-0.5 size-5 shrink-0 text-sky-600" />
            }
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className={`font-semibold ${props.mode === "paid" ? "text-violet-900" : isOverdue ? "text-red-900" : "text-sky-900"}`}>
                  {props.mode === "paid" ? "Invoice Lunas — Opsi Pembatalan & Refund"
                    : isOverdue ? "Deadline Pelunasan Terlewat"
                    : "DP Diterima — Menunggu Pelunasan"}
                </p>
                <p className={`mt-0.5 text-sm ${props.mode === "paid" ? "text-violet-700" : isOverdue ? "text-red-700" : "text-sky-700"}`}>
                  {props.mode === "paid"
                    ? `Total terbayar: ${fmt(props.totalPaid)}. Batalkan invoice dan proses pengembalian dana ke peserta.`
                    : isOverdue
                      ? `Peserta melewati deadline pelunasan${props.mode === "dp" && props.balanceDueDate ? ` ${fmtDate(props.balanceDueDate)}` : ""}. Perpanjang reservasi atau batalkan & refund DP.`
                      : `DP sudah diterima. Peserta perlu melunasi sisa ${fmt(remainingBalance)} sebelum ${props.mode === "dp" && props.balanceDueDate ? fmtDate(props.balanceDueDate) : "-"}.`
                  }
                </p>
              </div>

              {/* Progress bar — hanya untuk DP */}
              {props.mode === "dp" && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>DP Terbayar: <span className="font-semibold text-slate-700">{fmt(dpAmount)}</span></span>
                    <span>Sisa: <span className="font-semibold text-slate-700">{fmt(remainingBalance)}</span></span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/80">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500">{progressPct}% dari total {fmt(props.grandTotal)} terbayar</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-col gap-2">
            {isOverdue && (
              <Button className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap" disabled={isPending} onClick={handleExtend} size="sm" type="button">
                {isPending ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
                Perpanjang +7 Hari
              </Button>
            )}
            <Button className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 whitespace-nowrap" disabled={isPending} onClick={() => setRefundOpen(true)} size="sm" type="button" variant="outline">
              <XCircle className="size-3" />
              Batalkan & Refund
            </Button>
          </div>
        </div>

        {extendError && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{extendError}</p>
        )}
      </div>

      {/* Refund dialog */}
      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-md flex-col max-h-[90vh] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">Batalkan & Refund</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">Invoice {props.invoiceNumber}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Booth akan dilepas kembali ke status tersedia. Permohonan refund masuk ke Pencairan Dana.
                </p>
              </div>
              <button className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-white text-muted-foreground hover:bg-muted" onClick={() => setRefundOpen(false)} type="button">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-6">
              {/* Pilihan refund */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Jumlah Refund</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundType("full")}
                    className={`rounded-xl border p-3 text-left transition ${refundType === "full" ? "border-primary-400 bg-primary-50 ring-2 ring-primary-200" : "border-border hover:bg-muted/50"}`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground">Refund Penuh</p>
                    <p className="mt-0.5 font-bold text-primary-900">{fmt(props.totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">100% dari yang dibayar</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundType("half")}
                    className={`rounded-xl border p-3 text-left transition ${refundType === "half" ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-border hover:bg-muted/50"}`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground">Refund 50%</p>
                    <p className="mt-0.5 font-bold text-amber-800">{fmt(Math.floor(props.totalPaid / 2))}</p>
                    <p className="text-xs text-muted-foreground">Potongan 50% administrasi</p>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Bank *</label>
                <Input onChange={(e) => setDestBankName(e.target.value)} placeholder="contoh: BCA, BRI, Mandiri" value={destBankName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nomor Rekening *</label>
                <Input onChange={(e) => setDestAccountNumber(e.target.value)} placeholder="Nomor rekening tujuan" value={destAccountNumber} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Atas Nama *</label>
                <Input onChange={(e) => setDestAccountName(e.target.value)} placeholder="Nama pemilik rekening" value={destAccountName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Alasan / Catatan (opsional)</label>
                <textarea
                  className="min-h-16 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary-600"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alasan pembatalan untuk bendahara"
                  value={notes}
                />
              </div>

              {refundError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{refundError}</p>
              )}

              <div className="flex gap-3 border-t border-border/70 pt-4">
                <Button className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white" disabled={isPending} onClick={handleRefundSubmit} type="button">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Batalkan & Refund {fmt(refundAmount)}
                </Button>
                <Button className="flex-1" disabled={isPending} onClick={() => setRefundOpen(false)} type="button" variant="outline">
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
