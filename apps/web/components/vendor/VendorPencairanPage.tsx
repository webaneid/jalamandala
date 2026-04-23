"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X, Plus, CheckCircle2, Clock, Ban } from "lucide-react";

import { updateVendorBankInfo } from "@/actions/vendors";
import { createVendorDisbursementRequest, cancelVendorDisbursement } from "@/actions/disbursements";

type Disbursement = {
  id: string;
  purposeDescription: string;
  requestedAmount: number;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  status: string;
  notes: string | null;
  createdAt: Date | null;
};

type Props = {
  vendor: {
    id: string;
    name: string;
    bankName: string | null;
    bankAccount: string | null;
    bankAccountName: string | null;
  };
  currentUserId: string;
  currentUserName: string;
  disbursements: Disbursement[];
  claimable: { totalTagihan: number; totalDicairkan: number; claimable: number };
};

type Tab = "ajukan" | "riwayat";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Ditolak",
  transferred: "Dana Ditransfer",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-white/8 text-white/50",
  submitted: "bg-amber-400/15 text-amber-300",
  approved: "bg-[#00adee]/15 text-[#00adee]",
  rejected: "bg-red-400/15 text-red-400",
  transferred: "bg-emerald-400/15 text-emerald-400",
  cancelled: "bg-white/8 text-white/30",
};

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

const inputCls = "h-11 w-full rounded-2xl border border-white/12 bg-white/8 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00adee]/50 focus:ring-1 focus:ring-[#00adee]/30 disabled:opacity-40";
const textareaCls = "w-full rounded-2xl border border-white/12 bg-white/8 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00adee]/50 focus:ring-1 focus:ring-[#00adee]/30 disabled:opacity-40";
const cardCls = "rounded-2xl p-5";
const cardStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" };

export function VendorPencairanPage({ vendor, currentUserId, currentUserName, disbursements, claimable }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("ajukan");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const [editingBank, setEditingBank] = React.useState(!vendor.bankName);
  const [bankName, setBankName] = React.useState(vendor.bankName ?? "");
  const [bankAccount, setBankAccount] = React.useState(vendor.bankAccount ?? "");
  const [bankAccountName, setBankAccountName] = React.useState(vendor.bankAccountName ?? "");

  const [amount, setAmount] = React.useState(String(claimable.claimable));
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const bankComplete = bankName && bankAccount && bankAccountName;

  function handleSaveBank() {
    setError("");
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountName.trim()) {
      setError("Semua field rekening wajib diisi."); return;
    }
    startTransition(async () => {
      const res = await updateVendorBankInfo(vendor.id, { bankName, bankAccount, bankAccountName });
      if (!res.success) { setError(res.error ?? "Gagal menyimpan."); return; }
      setEditingBank(false);
      setSuccess("Rekening berhasil disimpan.");
      setTimeout(() => setSuccess(""), 3000);
      router.refresh();
    });
  }

  function handleSubmitRequest(submit: boolean) {
    setError("");
    if (!bankComplete) { setError("Lengkapi data rekening bank terlebih dahulu."); return; }
    if (!description.trim()) { setError("Deskripsi wajib diisi."); return; }
    if (!amount || Number(amount) <= 0) { setError("Jumlah harus lebih dari 0."); return; }
    if (Number(amount) > claimable.claimable) { setError(`Jumlah melebihi sisa (${fmt(claimable.claimable)}).`); return; }
    startTransition(async () => {
      const res = await createVendorDisbursementRequest({
        vendorId: vendor.id,
        requestedBy: currentUserId,
        requestedByName: currentUserName,
        purposeDescription: description,
        requestedAmount: Number(amount),
        destBankName: bankName,
        destAccountNumber: bankAccount,
        destAccountName: bankAccountName,
        notes: notes || undefined,
        submit,
      });
      if (!res.success) { setError(res.error ?? "Gagal."); return; }
      setAmount(String(claimable.claimable));
      setDescription("");
      setNotes("");
      setSuccess(submit ? "Permohonan berhasil disubmit ke Finance." : "Draft tersimpan.");
      setTimeout(() => setSuccess(""), 4000);
      setTab("riwayat");
      router.refresh();
    });
  }

  function handleCancel(id: string) {
    setError("");
    startTransition(async () => {
      const res = await cancelVendorDisbursement(id, vendor.id);
      if (!res.success) { setError(res.error ?? "Gagal."); return; }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00adee]">Keuangan</p>
        <h1 className="mt-0.5 text-2xl font-bold text-white">Pencairan Dana</h1>
      </div>

      {/* Bank card */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Rekening Bank</p>
          {!editingBank && (
            <button
              type="button"
              onClick={() => setEditingBank(true)}
              className="flex size-7 items-center justify-center rounded-lg border border-white/12 bg-white/8 text-white/50 transition hover:bg-white/15 hover:text-white"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>

        {editingBank ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/50">Nama Bank *</label>
                <input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA, Mandiri, BRI…" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Nomor Rekening *</label>
                <input className={inputCls} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="12345678" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50">Nama Pemilik Rekening *</label>
              <input className={inputCls} value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Nama sesuai buku tabungan" />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveBank}
                disabled={pending}
                className="flex h-10 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #134397, #00adee)" }}
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Simpan
              </button>
              {vendor.bankName && (
                <button
                  type="button"
                  onClick={() => { setEditingBank(false); setBankName(vendor.bankName ?? ""); setBankAccount(vendor.bankAccount ?? ""); setBankAccountName(vendor.bankAccountName ?? ""); }}
                  className="h-10 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm text-white/60 transition hover:bg-white/15"
                >
                  Batal
                </button>
              )}
            </div>
          </div>
        ) : bankComplete ? (
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/15">
              <CheckCircle2 className="size-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{bankAccountName}</p>
              <p className="text-sm text-white/40">{bankName} · {bankAccount}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            Belum ada data rekening. Isi terlebih dahulu sebelum mengajukan pencairan.
          </div>
        )}
      </div>

      {/* Feedback */}
      {success && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400">{success}</div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {([["ajukan", "Ajukan"], ["riwayat", "Riwayat"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setError(""); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium transition"
            style={tab === key
              ? { background: "linear-gradient(135deg, #134397, #00adee)", color: "white" }
              : { color: "rgba(255,255,255,0.4)" }}
          >
            {label}
            {key === "riwayat" && disbursements.length > 0 && (
              <span className="ml-1.5 rounded-full bg-white/15 px-2 py-0.5 text-xs">{disbursements.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Ajukan */}
      {tab === "ajukan" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className={cardCls} style={cardStyle}>
              <p className="text-xs text-white/40">Total Tagihan</p>
              <p className="mt-1 text-base font-bold text-white tabular-nums">{fmt(claimable.totalTagihan)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
              <p className="text-xs text-red-400/70">Dicairkan</p>
              <p className="mt-1 text-base font-bold text-red-400 tabular-nums">{fmt(claimable.totalDicairkan)}</p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={claimable.claimable > 0
                ? { background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.20)" }
                : cardStyle}
            >
              <p className={`text-xs ${claimable.claimable > 0 ? "text-emerald-400/70" : "text-white/40"}`}>Dapat Dicairkan</p>
              <p className={`mt-1 text-base font-bold tabular-nums ${claimable.claimable > 0 ? "text-emerald-400" : "text-white/40"}`}>{fmt(claimable.claimable)}</p>
            </div>
          </div>

          {claimable.claimable <= 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/40">
              Tidak ada sisa tagihan yang bisa dicairkan saat ini.
            </div>
          )}

          <div className={cardCls} style={cardStyle}>
            <p className="mb-4 text-sm font-semibold text-white">Formulir Permohonan</p>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/50">Jumlah (Rp) *</label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(claimable.claimable))}
                    className="text-xs text-[#00adee] hover:underline"
                  >
                    Isi penuh
                  </button>
                </div>
                <input
                  type="number"
                  min={1}
                  max={claimable.claimable}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                  className={inputCls + " text-lg font-semibold"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Keterangan / Tujuan *</label>
                <textarea
                  className={textareaCls}
                  style={{ minHeight: 80 }}
                  placeholder="Contoh: Pembayaran jasa cetak brosur peserta FORBIS 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Catatan Tambahan (opsional)</label>
                <textarea
                  className={textareaCls}
                  style={{ minHeight: 60 }}
                  placeholder="Nomor invoice, keterangan lain"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                />
              </div>

              {bankComplete && (
                <div className="rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm">
                  <p className="mb-1 text-xs text-white/40">Dana dikirim ke:</p>
                  <p className="font-semibold text-white">{bankAccountName}</p>
                  <p className="text-white/40">{bankName} · {bankAccount}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSubmitRequest(false)}
              disabled={pending || !bankComplete || claimable.claimable <= 0}
              className="flex h-11 items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 text-sm font-medium text-white/70 transition hover:bg-white/15 disabled:opacity-40"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Simpan Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmitRequest(true)}
              disabled={pending || !bankComplete || claimable.claimable <= 0 || !Number(amount)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #134397, #00adee)" }}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              <Plus className="size-4" />
              Submit ke Finance
            </button>
          </div>
        </div>
      )}

      {/* Tab: Riwayat */}
      {tab === "riwayat" && (
        <div className="space-y-3">
          {disbursements.length === 0 ? (
            <div className="rounded-3xl py-20 text-center text-sm text-white/30" style={cardStyle}>
              Belum ada riwayat pencairan.
            </div>
          ) : (
            disbursements.map((d) => (
              <div key={d.id} className={cardCls} style={cardStyle}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[d.status] ?? "bg-white/8 text-white/50"}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                      <span className="text-xs text-white/30">{fmtDate(d.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-white">{d.purposeDescription}</p>
                    <p className="mt-1 text-xl font-bold text-white tabular-nums">{fmt(d.requestedAmount)}</p>
                    <p className="mt-1 text-xs text-white/35">
                      {d.destAccountName} · {d.destBankName} {d.destAccountNumber}
                    </p>
                    {d.notes && <p className="mt-1.5 text-xs text-white/30 italic">{d.notes}</p>}
                  </div>
                  {(d.status === "draft" || d.status === "submitted") && (
                    <button
                      type="button"
                      onClick={() => handleCancel(d.id)}
                      disabled={pending}
                      className="flex items-center gap-1 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-400/20 disabled:opacity-50"
                    >
                      <X className="size-3" />
                      Batalkan
                    </button>
                  )}
                </div>
                <StatusTimeline status={d.status} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "submitted", label: "Diajukan" },
    { key: "approved", label: "Disetujui" },
    { key: "transferred", label: "Ditransfer" },
  ];

  if (status === "draft") return null;
  if (status === "cancelled" || status === "rejected") {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
        <Ban className="size-3.5" />
        <span>{status === "cancelled" ? "Dibatalkan" : "Ditolak oleh Finance"}</span>
      </div>
    );
  }

  const activeIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i <= activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={step.key}>
            <div className={`flex items-center gap-1.5 ${done ? "text-[#00adee]" : "text-white/20"}`}>
              {done ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
              <span className={`text-xs font-medium ${active ? "text-[#00adee]" : ""}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < activeIdx ? "bg-[#00adee]/30" : "bg-white/8"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
