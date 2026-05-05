export const dynamic = "force-dynamic";

import { getCashflowLedger } from "@/actions/finance";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CashflowTable } from "@/components/admin/finance/CashflowTable";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}


export const metadata = {
  title: "Cashflow",
};

export default async function CashflowPage() {
  const result = await getCashflowLedger();
  const entries = result.success ? result.data! : [];

  const totalIn = entries.filter(e => e.type === "cash_in").reduce((sum, e) => sum + e.amount, 0);
  const totalOut = entries.filter(e => e.type === "cash_out").reduce((sum, e) => sum + e.amount, 0);
  const balance = totalIn - totalOut;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminPageHeader
          eyebrow="Finance & Transactions"
          title="Buku Kas (Cashflow)"
          description="Laporan transparan seluruh pergerakan uang masuk dan keluar."
        />
        <div className="flex gap-2">
          <Link href="/admin/keuangan/pencairan">
            <Button variant="outline">Pencairan Dana</Button>
          </Link>
          <Link href="/admin/keuangan">
            <Button variant="outline">Kembali ke Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Total Pemasukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-950">{formatRupiah(totalIn)}</div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-800 flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Total Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-950">{formatRupiah(totalOut)}</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Saldo Akhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-950">{formatRupiah(balance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <CashflowTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}
