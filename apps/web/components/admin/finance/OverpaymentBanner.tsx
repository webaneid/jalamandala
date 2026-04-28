"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { createOverpaymentDisbursement } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function OverpaymentBanner({
  invoiceId,
  invoiceNumber,
  overpaymentAmount,
  participantName,
}: {
  invoiceId: string;
  invoiceNumber: string;
  overpaymentAmount: number;
  participantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, start] = React.useTransition();
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  const [destBankName, setDestBankName] = React.useState("");
  const [destAccountNumber, setDestAccountNumber] = React.useState("");
  const [destAccountName, setDestAccountName] = React.useState(participantName);
  const [notes, setNotes] = React.useState("");

  function handleSubmit() {
    if (!destBankName.trim() || !destAccountNumber.trim() || !destAccountName.trim()) {
      setError("Nama bank, nomor rekening, dan atas nama wajib diisi.");
      return;
    }
    setError("");
    start(async () => {
      const result = await createOverpaymentDisbursement({
        invoiceId,
        destBankName,
        destAccountNumber,
        destAccountName,
        notes,
      });
      if (!result.success) {
        setError(result.error ?? "Gagal membuat permohonan.");
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        Permohonan pengembalian <strong>{formatCurrency(overpaymentAmount)}</strong> sudah dibuat dan dikirim ke halaman Pencairan Dana untuk diproses.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">
                Kelebihan Bayar: {formatCurrency(overpaymentAmount)}
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                Invoice {invoiceNumber} menerima pembayaran melebihi total tagihan. Buat permohonan pengembalian ke halaman Pencairan Dana.
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 gap-2 bg-amber-600 text-white hover:bg-amber-700"
            onClick={() => setOpen(true)}
            size="sm"
            type="button"
          >
            Kembalikan Kelebihan
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Kelebihan Bayar</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">
                  Kembalikan {formatCurrency(overpaymentAmount)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Isi data rekening tujuan. Permohonan akan masuk ke halaman Pencairan Dana untuk disetujui dan ditransfer.
                </p>
              </div>
              <button
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nama Bank *</label>
                <Input
                  onChange={(e) => setDestBankName(e.target.value)}
                  placeholder="contoh: BCA, BRI, Mandiri"
                  value={destBankName}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nomor Rekening *</label>
                <Input
                  onChange={(e) => setDestAccountNumber(e.target.value)}
                  placeholder="Nomor rekening tujuan"
                  value={destAccountNumber}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Atas Nama *</label>
                <Input
                  onChange={(e) => setDestAccountName(e.target.value)}
                  placeholder="Nama pemilik rekening"
                  value={destAccountName}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Catatan (opsional)</label>
                <textarea
                  className="min-h-16 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary-600"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk bendahara"
                  value={notes}
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex gap-3 border-t border-border/70 pt-4">
                <Button
                  className="flex-1 gap-2"
                  disabled={isPending}
                  onClick={handleSubmit}
                  type="button"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Buat Permohonan
                </Button>
                <Button
                  className="flex-1"
                  disabled={isPending}
                  onClick={() => setOpen(false)}
                  type="button"
                  variant="outline"
                >
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
