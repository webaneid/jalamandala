"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Upload } from "lucide-react";

import {
  approveDisbursement,
  rejectDisbursement,
  submitDisbursement,
  cancelDisbursement,
  confirmTransfer,
} from "@/actions/disbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { PaymentProofPreviewButton } from "@/components/admin/finance/PaymentProofPreviewButton";

type Request = {
  id: string;
  requestedBy: string;
  requestedByName: string;
  purposeType: string;
  purposeDescription: string;
  vendorId: string | null;
  vendorAddonRef: string | null;
  requestedAmount: number;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  status: string;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: Date | null;
  vendorName: string | null;
  transfer: {
    id: string;
    transferredAt: Date;
    sourceChannelLabel: string | null;
    destBankName: string;
    destAccountNumber: string;
    destAccountName: string;
    grossAmount: number;
    transferFee: number;
    netAmount: number;
    proofAssetUrl: string | null;
    transferredByName: string;
  } | null;
};

type PaymentChannel = {
  id: string;
  label: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  submitted: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  transferred: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Approval",
  approved: "Disetujui — Siap Transfer",
  rejected: "Ditolak",
  transferred: "Sudah Ditransfer",
  cancelled: "Dibatalkan",
};

const PURPOSE_LABELS: Record<string, string> = {
  vendor: "Vendor", operational: "Operasional", refund: "Refund", other: "Lainnya",
};

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function fmtDt(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(d));
}

export function DisbursementDetail({
  request,
  paymentChannels,
  currentUserId,
  currentUserName,
}: {
  request: Request;
  paymentChannels: PaymentChannel[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const [showReject, setShowReject] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  // Transfer form state
  const [transfer, setTransfer] = React.useState({
    transferredAt: new Date().toISOString().slice(0, 16),
    sourceChannelId: "",
    grossAmount: String(request.requestedAmount),
    transferFee: "0",
    destBankName: request.destBankName,
    destAccountNumber: request.destAccountNumber,
    destAccountName: request.destAccountName,
  });
  const [proofAsset, setProofAsset] = React.useState<MediaPickerValue>(null);

  const netAmount = Number(transfer.grossAmount) - Number(transfer.transferFee);
  const selectedChannel = paymentChannels.find((c) => c.id === transfer.sourceChannelId);

  function action(fn: () => Promise<void>) {
    setError("");
    startTransition(fn);
  }

  function handleApprove() {
    action(async () => {
      const res = await approveDisbursement(request.id, currentUserId, currentUserName);
      if (!res.success) setError(res.error ?? "Gagal.");
      else router.refresh();
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) { setError("Alasan wajib diisi."); return; }
    action(async () => {
      const res = await rejectDisbursement(request.id, currentUserId, currentUserName, rejectReason);
      if (!res.success) setError(res.error ?? "Gagal.");
      else router.refresh();
    });
  }

  function handleSubmit() {
    action(async () => {
      const res = await submitDisbursement(request.id);
      if (!res.success) setError(res.error ?? "Gagal.");
      else router.refresh();
    });
  }

  function handleCancel() {
    action(async () => {
      const res = await cancelDisbursement(request.id);
      if (!res.success) setError(res.error ?? "Gagal.");
      else router.refresh();
    });
  }

  function handleConfirmTransfer() {
    action(async () => {
      const res = await confirmTransfer(request.id, {
        transferredBy: currentUserId,
        transferredByName: currentUserName,
        transferredAt: new Date(transfer.transferredAt),
        sourceChannelId: transfer.sourceChannelId || undefined,
        sourceChannelLabel: selectedChannel?.label,
        destBankName: transfer.destBankName,
        destAccountNumber: transfer.destAccountNumber,
        destAccountName: transfer.destAccountName,
        grossAmount: Number(transfer.grossAmount),
        transferFee: Number(transfer.transferFee),
        proofAssetUrl: proofAsset?.id || undefined,
      });
      if (!res.success) setError(res.error ?? "Gagal konfirmasi transfer.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Status banner */}
      <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status Permohonan</p>
          <div className="mt-1.5">
            <Badge className={`text-sm ${STATUS_COLORS[request.status] ?? ""}`}>
              {STATUS_LABELS[request.status] ?? request.status}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{fmtDt(request.createdAt)}</p>
      </div>

      {/* Info permohonan */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60"><CardTitle>Detail Permohonan</CardTitle></CardHeader>
        <CardContent className="pt-5 space-y-3">
          <Row label="Pemohon" value={request.requestedByName} />
          <Row label="Jenis" value={PURPOSE_LABELS[request.purposeType] ?? request.purposeType} />
          {request.vendorName && <Row label="Vendor" value={request.vendorName} />}
          {request.vendorAddonRef && <Row label="Referensi" value={request.vendorAddonRef} />}
          <Row label="Keterangan" value={request.purposeDescription} />
          <Row label="Jumlah Diminta" value={fmt(request.requestedAmount)} bold />
          <hr className="border-border/40" />
          <Row label="Bank Tujuan" value={request.destBankName} />
          <Row label="No. Rekening" value={request.destAccountNumber} mono />
          <Row label="Nama Pemilik" value={request.destAccountName} />
          {request.notes && <Row label="Catatan" value={request.notes} />}
        </CardContent>
      </Card>

      {/* Approval info */}
      {request.status === "approved" && request.approvedByName && (
        <InfoBanner color="blue" title="Disetujui oleh">
          {request.approvedByName} · {fmtDt(request.approvedAt)}
        </InfoBanner>
      )}
      {request.status === "rejected" && (
        <InfoBanner color="red" title="Ditolak oleh">
          {request.rejectedByName} · {fmtDt(request.rejectedAt)}
          {request.rejectionReason && <p className="mt-1 font-normal opacity-80">Alasan: {request.rejectionReason}</p>}
        </InfoBanner>
      )}

      {/* Transfer detail (jika sudah transferred) */}
      {request.transfer && (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader className="border-b border-emerald-200/60">
            <CardTitle className="text-emerald-800">Konfirmasi Transfer</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <Row label="Ditransfer pada" value={fmtDt(request.transfer.transferredAt)} />
            {request.transfer.sourceChannelLabel && <Row label="Rekening Asal" value={request.transfer.sourceChannelLabel} />}
            <Row label="Bank Tujuan" value={request.transfer.destBankName} />
            <Row label="No. Rekening" value={request.transfer.destAccountNumber} mono />
            <Row label="Nama Pemilik" value={request.transfer.destAccountName} />
            <hr className="border-emerald-200/60" />
            <Row label="Jumlah Transfer" value={fmt(request.transfer.grossAmount)} />
            <Row label="Biaya Transfer" value={fmt(request.transfer.transferFee)} />
            <Row label="Diterima Penerima" value={fmt(request.transfer.netAmount)} bold />
            <Row label="Dikonfirmasi oleh" value={request.transfer.transferredByName} />
            {request.transfer.proofAssetUrl && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Bukti Transfer</p>
                <PaymentProofPreviewButton assetId={request.transfer.proofAssetUrl} label="Bukti Transfer" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Actions: draft */}
      {request.status === "draft" && (
        <div className="flex gap-3">
          <Button disabled={pending} onClick={handleSubmit}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Submit ke Finance
          </Button>
          <Button disabled={pending} onClick={handleCancel} variant="outline">
            Batalkan
          </Button>
        </div>
      )}

      {/* Actions: submitted */}
      {request.status === "submitted" && (
        <Card className="border-white/80 bg-white/90">
          <CardHeader className="border-b border-border/60"><CardTitle>Approval Finance</CardTitle></CardHeader>
          <CardContent className="pt-5 space-y-4">
            {!showReject ? (
              <div className="flex gap-3">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={pending} onClick={handleApprove}>
                  {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle className="mr-2 size-4" />}
                  Setujui
                </Button>
                <Button
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  disabled={pending}
                  onClick={() => setShowReject(true)}
                  variant="outline"
                >
                  <XCircle className="mr-2 size-4" />
                  Tolak
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  autoFocus
                  className="min-h-[80px] w-full rounded-2xl border border-red-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Alasan penolakan..."
                  value={rejectReason}
                />
                <div className="flex gap-3">
                  <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={pending} onClick={handleReject}>
                    {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Konfirmasi Tolak
                  </Button>
                  <Button onClick={() => setShowReject(false)} variant="outline">Batal</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions: approved — form konfirmasi transfer */}
      {request.status === "approved" && !request.transfer && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="border-b border-blue-200/60">
            <CardTitle className="text-blue-900">Konfirmasi Transfer</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Waktu Transfer</label>
                <Input
                  type="datetime-local"
                  value={transfer.transferredAt}
                  onChange={(e) => setTransfer((p) => ({ ...p, transferredAt: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Rekening Asal</label>
                <select
                  className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                  value={transfer.sourceChannelId}
                  onChange={(e) => setTransfer((p) => ({ ...p, sourceChannelId: e.target.value }))}
                >
                  <option value="">-- Pilih rekening (opsional) --</option>
                  {paymentChannels.map((ch) => (
                    <option key={ch.id} value={ch.id}>{ch.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Bank Tujuan</label>
                <Input
                  value={transfer.destBankName}
                  onChange={(e) => setTransfer((p) => ({ ...p, destBankName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">No. Rekening</label>
                <Input
                  value={transfer.destAccountNumber}
                  onChange={(e) => setTransfer((p) => ({ ...p, destAccountNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Nama Pemilik</label>
                <Input
                  value={transfer.destAccountName}
                  onChange={(e) => setTransfer((p) => ({ ...p, destAccountName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Jumlah Transfer (Rp)</label>
                <Input
                  min={0}
                  type="number"
                  value={transfer.grossAmount}
                  onChange={(e) => setTransfer((p) => ({ ...p, grossAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Biaya Transfer (Rp)</label>
                <Input
                  min={0}
                  type="number"
                  value={transfer.transferFee}
                  onChange={(e) => setTransfer((p) => ({ ...p, transferFee: e.target.value }))}
                />
              </div>
            </div>

            {netAmount >= 0 && (
              <div className="rounded-xl bg-white border border-blue-200 px-4 py-3 text-sm">
                Diterima penerima: <span className="font-bold text-blue-800">{fmt(netAmount)}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Bukti Transfer (opsional)</label>
              <MediaPicker
                value={proofAsset}
                onChange={setProofAsset}
                accept="any"
                folder="finance/transfer-proof"
                visibility="event_admin"
                placeholder="Pilih atau upload bukti transfer..."
              />
            </div>

            <Button className="w-full" disabled={pending} onClick={handleConfirmTransfer}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Konfirmasi Transfer & Catat ke Buku Kas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0 w-36">{label}</span>
      <span className={`text-right ${bold ? "font-semibold" : ""} ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function InfoBanner({ color, title, children }: { color: "blue" | "red"; title: string; children: React.ReactNode }) {
  const cls = color === "blue"
    ? "border-blue-200 bg-blue-50 text-blue-800"
    : "border-red-200 bg-red-50 text-red-800";
  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">{title}</p>
      <div className="font-semibold">{children}</div>
    </div>
  );
}
