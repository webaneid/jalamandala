"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";

import {
  approveDisbursement,
  rejectDisbursement,
} from "@/actions/disbursements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  requestedByName: string;
  purposeType: string;
  purposeDescription: string;
  requestedAmount: number;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  status: string;
  createdAt: Date | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Approval",
  approved: "Disetujui",
  rejected: "Ditolak",
  transferred: "Sudah Transfer",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  submitted: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  transferred: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-500",
};

const PURPOSE_LABELS: Record<string, string> = {
  vendor: "Vendor",
  operational: "Operasional",
  refund: "Refund",
  other: "Lainnya",
};

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

export function DisbursementList({
  rows,
  currentUserId,
  currentUserName,
}: {
  rows: Row[];
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [error, setError] = React.useState("");

  const totalSubmitted = rows.filter((r) => r.status === "submitted").length;
  const totalApproved = rows.filter((r) => r.status === "approved").length;
  const totalTransferred = rows.filter((r) => r.status === "transferred").reduce((s, r) => s + r.requestedAmount, 0);

  function handleApprove(id: string) {
    setError("");
    startTransition(async () => {
      const res = await approveDisbursement(id, currentUserId, currentUserName);
      if (!res.success) setError(res.error ?? "Gagal.");
      else router.refresh();
    });
  }

  function handleRejectSubmit(id: string) {
    if (!rejectReason.trim()) { setError("Alasan wajib diisi."); return; }
    setError("");
    startTransition(async () => {
      const res = await rejectDisbursement(id, currentUserId, currentUserName, rejectReason);
      if (!res.success) setError(res.error ?? "Gagal.");
      else { setRejectingId(null); setRejectReason(""); router.refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Menunggu Approval" value={String(totalSubmitted)} color="amber" />
        <SummaryCard label="Siap Ditransfer" value={String(totalApproved)} color="blue" />
        <SummaryCard label="Total Sudah Ditransfer" value={fmt(totalTransferred)} color="emerald" />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Daftar Permohonan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pemohon</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Rekening Tujuan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {fmtDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{row.requestedByName}</TableCell>
                    <TableCell>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {PURPOSE_LABELS[row.purposeType] ?? row.purposeType}
                        </span>
                        <p className="mt-0.5 text-sm">{row.purposeDescription}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{row.destAccountName}</p>
                        <p className="text-muted-foreground">{row.destBankName} · {row.destAccountNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmt(row.requestedAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[row.status] ?? ""}>
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === "submitted" && (
                          <>
                            <button
                              className="inline-flex size-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              disabled={pending}
                              onClick={() => handleApprove(row.id)}
                              title="Setujui"
                            >
                              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                            </button>
                            <button
                              className="inline-flex size-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => { setRejectingId(row.id); setRejectReason(""); setError(""); }}
                              title="Tolak"
                            >
                              <XCircle className="size-3.5" />
                            </button>
                          </>
                        )}
                        <Link href={`/admin/keuangan/pencairan/${row.id}`}>
                          <button
                            className="inline-flex size-8 items-center justify-center rounded-xl border border-border/70 bg-white text-muted-foreground hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                            title="Detail"
                          >
                            <Eye className="size-3.5" />
                          </button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                  {rejectingId === row.id && (
                    <TableRow className="bg-red-50/60">
                      <TableCell colSpan={7} className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <textarea
                            autoFocus
                            className="min-h-[60px] flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Alasan penolakan..."
                            value={rejectReason}
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={pending}
                              onClick={() => handleRejectSubmit(row.id)}
                              size="sm"
                            >
                              {pending ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                              Tolak
                            </Button>
                            <Button
                              onClick={() => setRejectingId(null)}
                              size="sm"
                              variant="outline"
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Belum ada permohonan pencairan dana.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: "amber" | "blue" | "emerald" }) {
  const cls = {
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  }[color];
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
