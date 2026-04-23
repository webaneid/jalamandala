"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { submitPublicPaymentConfirmation } from "@/actions/finance";

type PaymentOption = {
  key: string;
  label: string;
};

type Props = {
  businessId: string | null;
  eventSlug: string;
  grandTotal: number;
  invoiceNumber: string;
  paymentOptions: PaymentOption[];
  publicToken: string;
  onClose: () => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function toWibDateTimeLocal(date: Date) {
  // offset UTC+7
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = wib.getUTCFullYear();
  const mo = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  const h = String(wib.getUTCHours()).padStart(2, "0");
  const mi = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PaymentConfirmationDialog({
  businessId,
  eventSlug,
  grandTotal,
  invoiceNumber,
  paymentOptions,
  publicToken,
  onClose,
}: Props) {
  const [paidAt, setPaidAt] = React.useState(() => toWibDateTimeLocal(new Date()));
  const [paymentMethodKey, setPaymentMethodKey] = React.useState(paymentOptions[0]?.key ?? "");
  const [amount, setAmount] = React.useState(String(grandTotal));
  const [senderName, setSenderName] = React.useState("");
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  async function handleProofChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setProofFile(null);
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
      setProofPreviewUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran bukti transfer maksimal 5MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setProofFile(file);

    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setProofPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!senderName.trim()) {
      setError("Nama pengirim wajib diisi.");
      return;
    }

    if (!proofFile) {
      setError("Bukti transfer wajib diunggah.");
      return;
    }

    startTransition(async () => {
      const proofDataUrl = await readFileAsDataUrl(proofFile);
      const result = await submitPublicPaymentConfirmation({
        amount: Number(amount) || grandTotal,
        publicToken,
        paidAt,
        paymentMethodKey: paymentMethodKey || undefined,
        proofData: {
          contentType: proofFile.type,
          dataUrl: proofDataUrl,
          fileName: proofFile.name,
        },
        senderName,
      });

      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan konfirmasi.");
        return;
      }

      setSuccess(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">
              Konfirmasi Pembayaran
            </p>
            <h3 className="mt-1 text-xl font-semibold text-neutral-900">{invoiceNumber}</h3>
            <p className="mt-0.5 text-sm text-neutral-500">
              Nominal: <span className="font-semibold text-neutral-900">{formatCurrency(grandTotal)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:bg-neutral-50"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100">
                <svg className="size-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-green-800">Terimakasih telah melakukan konfirmasi pembayaran</p>
                <p className="text-sm text-green-700">
                  Kami akan segera memberitahu Anda setelah team finance kami memverifikasi pembayaran.
                </p>
              </div>
              <a
                href={businessId ? `/${eventSlug}/usaha/${businessId}/lengkapi` : `/${eventSlug}/dashboard`}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Lanjutkan
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Jumlah */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-800">
                  Jumlah yang ditransfer{" "}
                  <span className="text-neutral-400 font-normal">
                    (tagihan: {formatCurrency(grandTotal)})
                  </span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  min={1}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  type="number"
                  value={amount}
                />
              </div>

              {/* Tanggal & jam */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-800">
                  Kapan transfer? <span className="text-neutral-400 font-normal">(jam WIB, format 24 jam)</span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setPaidAt(e.target.value)}
                  required
                  type="datetime-local"
                  value={paidAt}
                />
              </div>

              {/* Metode pembayaran */}
              {paymentOptions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-800">
                    Transfer ke mana / pakai apa?
                  </label>
                  <select
                    className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setPaymentMethodKey(e.target.value)}
                    value={paymentMethodKey}
                  >
                    <option value="">Pilih metode pembayaran</option>
                    {paymentOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bukti transfer */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-800">
                  Bukti transfer <span className="text-neutral-400 font-normal">(foto/screenshot, maks 5MB)</span>
                </label>
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <input
                    accept="image/*"
                    className="block w-full text-sm text-neutral-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                    onChange={handleProofChange}
                    type="file"
                  />
                  {proofPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Preview bukti transfer"
                      className="max-h-64 rounded-xl border border-neutral-200 object-contain"
                      src={proofPreviewUrl}
                    />
                  ) : (
                    <p className="text-xs text-neutral-500">
                      File akan disimpan privat dan dihubungkan otomatis ke participant dari invoice ini.
                    </p>
                  )}
                </div>
              </div>

              {/* Nama pengirim */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-800">
                  Rekening pengirim atas nama <span className="text-red-500">*</span>
                </label>
                <input
                  className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nama pemilik rekening / akun yang digunakan transfer"
                  required
                  type="text"
                  value={senderName}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  disabled={isPending}
                  onClick={onClose}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Kirim Konfirmasi
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
