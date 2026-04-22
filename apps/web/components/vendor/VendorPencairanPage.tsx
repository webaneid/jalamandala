"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X, Plus, CheckCircle2, Clock, XCircle, Ban } from "lucide-react";

import { updateVendorBankInfo } from "@/actions/vendors";
import { createVendorDisbursementRequest, cancelVendorDisbursement } from "@/actions/disbursements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  submitted: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  transferred: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-500",
};

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export function VendorPencairanPage({ vendor, currentUserId, currentUserName, disbursements, claimable }: Props) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("ajukan");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  // Bank form state
  const [editingBank, setEditingBank] = React.useState(!vendor.bankName);
  const [bankName, setBankName] = React.useState(vendor.bankName ?? "");
  const [bankAccount, setBankAccount] = React.useState(vendor.bankAccount ?? "");
  const [bankAccountName, setBankAccountName] = React.useState(vendor.bankAccountName ?? "");

  // Disbursement form state — pre-filled with claimable, vendor can edit
  const [amount, setAmount] = React.useState(String(claimable.claimable));
  const [description, setDescription] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const bankComplete = bankName && bankAccount && bankAccountName;

  function handleSaveBank() {
    setError("");
    if (!bankName.trim() || !bankAccount.trim() || !bankAccountName.trim()) {
      setError("Semua field rekening wajib diisi.");
      return;
    }
    startTransition(async () => {
      const res = await updateVendorBankInfo(vendor.id, {
        bankName, bankAccount, bankAccountName,
      });
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
    if (Number(amount) > claimable.claimable) { setError(`Jumlah tidak boleh melebihi sisa tagihan (${fmt(claimable.claimable)}).`); return; }
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
    <div className="space-y-5">
      {/* Bank Account Card */}
      <Card className="border-border/80 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 border-b border-border/60">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rekening Bank</p>
            <CardTitle className="text-base mt-0.5">Info Rekening Anda</CardTitle>
          </div>
          {!editingBank && (
            <button
              type="button"
              onClick={() => setEditingBank(true)}
              className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground hover:bg-neutral-50"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {editingBank ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nama Bank *</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA, Mandiri, BRI, dll" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Nomor Rekening *</label>
                  <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="12345678" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama Pemilik Rekening *</label>
                <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Nama lengkap sesuai buku tabungan" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveBank} disabled={pending} size="sm">
                  {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Simpan Rekening
                </Button>
                {vendor.bankName && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditingBank(false);
                    setBankName(vendor.bankName ?? "");
                    setBankAccount(vendor.bankAccount ?? "");
                    setBankAccountName(vendor.bankAccountName ?? "");
                  }}>
                    Batal
                  </Button>
                )}
              </div>
            </div>
          ) : bankComplete ? (
            <div className="flex items-center gap-4">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{bankAccountName}</p>
                <p className="text-sm text-muted-foreground">{bankName} · {bankAccount}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Belum ada data rekening. Isi terlebih dahulu sebelum mengajukan pencairan.
            </div>
          )}
        </CardContent>
      </Card>

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-border/60 bg-white p-1 shadow-sm">
        {([["ajukan", "Ajukan Pencairan"], ["riwayat", "Riwayat Pencairan"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setError(""); }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${tab === key ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-neutral-50"}`}
          >
            {label}
            {key === "riwayat" && disbursements.length > 0 && (
              <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-white/20" : "bg-neutral-100"}`}>
                {disbursements.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Ajukan */}
      {tab === "ajukan" && (
        <div className="space-y-4">
          {!bankComplete && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Lengkapi data rekening bank di atas sebelum mengajukan pencairan.
            </div>
          )}

          {/* Ringkasan tagihan */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Total Tagihan</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{fmt(claimable.totalTagihan)}</p>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-medium text-red-600/70">Sudah Dicairkan</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-red-700">{fmt(claimable.totalDicairkan)}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${claimable.claimable > 0 ? "border-emerald-200 bg-emerald-50" : "border-border/60 bg-neutral-50"}`}>
              <p className={`text-xs font-medium ${claimable.claimable > 0 ? "text-emerald-700/70" : "text-muted-foreground"}`}>Sisa Dapat Dicairkan</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${claimable.claimable > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>{fmt(claimable.claimable)}</p>
            </div>
          </div>

          {claimable.claimable <= 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-muted-foreground">
              Tidak ada sisa tagihan yang bisa dicairkan saat ini.
            </div>
          )}

          <Card className="border-border/80 bg-white shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base">Permohonan Pencairan</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Dana sebesar <span className="font-semibold text-foreground">{fmt(claimable.claimable)}</span> akan ditransfer ke rekening Anda.
              </p>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Jumlah — pre-filled, tapi bisa diedit */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Jumlah yang Diminta (Rp) *</label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(claimable.claimable))}
                    className="text-xs text-primary hover:underline"
                  >
                    Isi penuh ({fmt(claimable.claimable)})
                  </button>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={claimable.claimable}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                  className="text-lg font-semibold tabular-nums"
                />
                {Number(amount) > 0 && Number(amount) < claimable.claimable && (
                  <p className="text-xs text-muted-foreground">
                    Sisa setelah ini: {fmt(claimable.claimable - Number(amount))}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Keterangan / Tujuan Pencairan *</label>
                <textarea
                  className="min-h-[80px] w-full rounded-2xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Contoh: Pembayaran jasa cetak brosur peserta FORBIS 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Catatan Tambahan (opsional)</label>
                <textarea
                  className="min-h-[60px] w-full rounded-2xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="Nomor invoice, keterangan lainnya"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!bankComplete || claimable.claimable <= 0}
                />
              </div>

              {bankComplete && (
                <div className="rounded-xl border border-border/60 bg-neutral-50 px-4 py-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dana akan dikirim ke:</p>
                  <p className="font-semibold">{bankAccountName}</p>
                  <p className="text-muted-foreground">{bankName} · {bankAccount}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={pending || !bankComplete || claimable.claimable <= 0}
              onClick={() => handleSubmitRequest(false)}
            >
              {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Simpan Draft
            </Button>
            <Button
              disabled={pending || !bankComplete || claimable.claimable <= 0 || !Number(amount)}
              onClick={() => handleSubmitRequest(true)}
            >
              {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              <Plus className="mr-1.5 size-4" />
              Submit ke Finance
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Riwayat */}
      {tab === "riwayat" && (
        <div className="space-y-3">
          {disbursements.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-white py-16 text-center text-sm text-muted-foreground shadow-sm">
              Belum ada riwayat pencairan.
            </div>
          ) : (
            disbursements.map((d) => (
              <Card key={d.id} className="border-border/80 bg-white shadow-sm">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={STATUS_STYLE[d.status] ?? ""}>
                          {STATUS_LABEL[d.status] ?? d.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(d.createdAt)}</span>
                      </div>
                      <p className="mt-2 font-medium text-sm">{d.purposeDescription}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{fmt(d.requestedAmount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.destAccountName} · {d.destBankName} {d.destAccountNumber}
                      </p>
                      {d.notes && (
                        <p className="mt-2 text-xs text-muted-foreground italic">{d.notes}</p>
                      )}
                    </div>
                    {(d.status === "draft" || d.status === "submitted") && (
                      <button
                        type="button"
                        onClick={() => handleCancel(d.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <X className="size-3" />
                        Batalkan
                      </button>
                    )}
                  </div>
                  <StatusTimeline status={d.status} />
                </CardContent>
              </Card>
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
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Ban className="size-3.5 text-red-400" />
        <span>{status === "cancelled" ? "Dibatalkan oleh pemohon" : "Ditolak oleh Finance"}</span>
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
            <div className={`flex items-center gap-1.5 ${done ? "text-primary" : "text-muted-foreground/40"}`}>
              {done ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
              <span className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 ${i < activeIdx ? "bg-primary/30" : "bg-border/60"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
