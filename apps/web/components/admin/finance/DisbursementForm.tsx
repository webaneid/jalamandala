"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createDisbursement } from "@/actions/disbursements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VendorOption = {
  id: string;
  name: string;
  vendorType: string;
  bankName: string | null;
  bankAccount: string | null;
  bankAccountName: string | null;
};

type FormState = {
  purposeType: "vendor" | "operational" | "refund" | "other";
  vendorId: string;
  vendorAddonRef: string;
  purposeDescription: string;
  requestedAmount: string;
  destBankName: string;
  destAccountNumber: string;
  destAccountName: string;
  notes: string;
};

export function DisbursementForm({
  currentUserId,
  currentUserName,
  vendors,
}: {
  currentUserId: string;
  currentUserName: string;
  vendors: VendorOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState<FormState>({
    purposeType: "vendor",
    vendorId: "",
    vendorAddonRef: "",
    purposeDescription: "",
    requestedAmount: "",
    destBankName: "",
    destAccountNumber: "",
    destAccountName: "",
    notes: "",
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-fill rekening saat vendor dipilih
  React.useEffect(() => {
    if (form.purposeType !== "vendor" || !form.vendorId) return;
    const vendor = vendors.find((v) => v.id === form.vendorId);
    if (!vendor) return;
    setForm((prev) => ({
      ...prev,
      destBankName: vendor.bankName ?? prev.destBankName,
      destAccountNumber: vendor.bankAccount ?? prev.destAccountNumber,
      destAccountName: vendor.bankAccountName ?? prev.destAccountName,
      purposeDescription: prev.purposeDescription || `Pembayaran ke ${vendor.name}`,
    }));
  }, [form.vendorId]);

  function handleSubmit(submit: boolean) {
    setError("");
    startTransition(async () => {
      const res = await createDisbursement({
        requestedBy: currentUserId,
        requestedByName: currentUserName,
        purposeType: form.purposeType,
        purposeDescription: form.purposeDescription,
        vendorId: form.purposeType === "vendor" && form.vendorId ? form.vendorId : null,
        vendorAddonRef: form.vendorAddonRef || undefined,
        requestedAmount: Number(form.requestedAmount),
        destBankName: form.destBankName,
        destAccountNumber: form.destAccountNumber,
        destAccountName: form.destAccountName,
        notes: form.notes || undefined,
        submit,
      });

      if (!res.success) {
        setError(res.error ?? "Gagal menyimpan.");
        return;
      }
      router.push(`/admin/keuangan/pencairan/${res.id}`);
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Tujuan */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Tujuan Pengeluaran</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["vendor", "operational", "refund", "other"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => set("purposeType", type)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  form.purposeType === type
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 bg-white text-muted-foreground hover:border-border"
                }`}
              >
                {{ vendor: "Vendor", operational: "Operasional", refund: "Refund", other: "Lainnya" }[type]}
              </button>
            ))}
          </div>

          {form.purposeType === "vendor" && vendors.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pilih Vendor</label>
              <select
                className="h-11 w-full rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                onChange={(e) => set("vendorId", e.target.value)}
                value={form.vendorId}
              >
                <option value="">-- Pilih vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vendorType === "booth" ? "Booth" : "Add-on"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.purposeType === "vendor" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Referensi Add-on / Zona (opsional)</label>
              <Input
                placeholder="Contoh: Pembayaran Daya Listrik April"
                value={form.vendorAddonRef}
                onChange={(e) => set("vendorAddonRef", e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Deskripsi / Keterangan</label>
            <textarea
              className="min-h-[80px] w-full rounded-2xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              placeholder="Jelaskan kebutuhan pencairan ini..."
              value={form.purposeDescription}
              onChange={(e) => set("purposeDescription", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Jumlah */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Jumlah & Rekening Tujuan</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Jumlah yang Diminta (Rp)</label>
            <Input
              min={0}
              placeholder="0"
              type="number"
              value={form.requestedAmount}
              onChange={(e) => set("requestedAmount", e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nama Bank</label>
              <Input
                placeholder="BCA, Mandiri, dll"
                value={form.destBankName}
                onChange={(e) => set("destBankName", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nomor Rekening</label>
              <Input
                placeholder="12345678"
                value={form.destAccountNumber}
                onChange={(e) => set("destAccountNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nama Pemilik Rekening</label>
              <Input
                placeholder="Nama lengkap"
                value={form.destAccountName}
                onChange={(e) => set("destAccountName", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catatan */}
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Catatan Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <textarea
            className="min-h-[72px] w-full rounded-2xl border border-input bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
            placeholder="Opsional"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3">
        <Button
          disabled={pending}
          onClick={() => handleSubmit(false)}
          variant="outline"
        >
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Simpan Draft
        </Button>
        <Button
          disabled={pending}
          onClick={() => handleSubmit(true)}
        >
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Submit ke Finance
        </Button>
      </div>
    </div>
  );
}
