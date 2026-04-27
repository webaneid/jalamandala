"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteInvoiceCompletely } from "@/actions/finance";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  participantName: string;
};

export function DeleteInvoiceButton({ invoiceId, invoiceNumber, participantName }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");

  const CONFIRM_WORD = "HAPUS";
  const canDelete = confirm.trim().toUpperCase() === CONFIRM_WORD;

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const res = await deleteInvoiceCompletely(invoiceId);
      if (!res.success) {
        setError(res.error ?? "Gagal menghapus.");
        return;
      }
      router.push("/admin/keuangan");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setConfirm(""); setError(""); }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 hover:border-red-300"
      >
        <Trash2 className="size-4" />
        Hapus Invoice
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.25)]">
            {/* Header */}
            <div className="border-b border-border/60 bg-red-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-100">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700">Hapus Invoice Permanen</p>
                  <p className="text-xs text-red-500">{invoiceNumber}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-slate-700">
                Tindakan ini akan menghapus <strong>secara permanen</strong>:
              </p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {[
                  "Invoice, item invoice & bukti pembayaran",
                  "Order & item order",
                  "Semua booth booking (status booth kembali Open)",
                  `Akun peserta: ${participantName}`,
                  "Semua usaha & persetujuan S&K peserta",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-400" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Data yang dihapus <strong>tidak bisa dipulihkan</strong>.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Ketik <strong className="text-slate-900">HAPUS</strong> untuk konfirmasi
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="HAPUS"
                  className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  autoFocus
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-border/60 px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="flex-1 rounded-xl border border-border/80 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
