import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MarginRow = {
  id: string;
  name: string;
  unitName: string | null;
  price: number;
  vendorPrice: number;
  margin: number;
  totalQty: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
};

function fmt(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function fmtUnit(name: string | null) {
  if (!name) return "";
  return name.trim().toLowerCase() === "m2" ? "M²" : name;
}

export function AddonMarginReport({ rows }: { rows: MarginRow[] }) {
  const grandProfit = rows.reduce((s, r) => s + r.totalProfit, 0);
  const grandRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
  const grandCost = rows.reduce((s, r) => s + r.totalCost, 0);

  return (
    <Card className="border-white/80 bg-white/90">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <CardTitle>Laporan Bagi Hasil</CardTitle>
            <CardDescription>
              Margin keuntungan FORBIS per add-on berdasarkan pesanan masuk.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Total Pendapatan" value={fmt(grandRevenue)} color="blue" />
          <SummaryCard label="Total Biaya Vendor" value={fmt(grandCost)} color="neutral" />
          <SummaryCard label="Keuntungan FORBIS" value={fmt(grandProfit)} color="emerald" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Add-on</TableHead>
              <TableHead className="text-right">Harga Vendor</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Margin / Unit</TableHead>
              <TableHead className="text-right">Qty Terjual</TableHead>
              <TableHead className="text-right">Keuntungan FORBIS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const marginPct = row.vendorPrice > 0
                ? Math.round((row.margin / row.vendorPrice) * 100)
                : 0;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.name}
                    {row.unitName && (
                      <span className="ml-1.5 text-xs text-muted-foreground">/{fmtUnit(row.unitName)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmt(row.vendorPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(row.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums font-medium text-emerald-700">{fmt(row.margin)}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">({marginPct}%)</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.totalQty > 0 ? row.totalQty : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-emerald-700">
                    {row.totalQty > 0 ? fmt(row.totalProfit) : <span className="font-normal text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          {grandProfit > 0 && (
            <tfoot>
              <tr className="border-t border-border/60 bg-neutral-50">
                <td colSpan={5} className="px-4 py-3 text-sm font-semibold">Total Keuntungan FORBIS</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                  {fmt(grandProfit)}
                </td>
              </tr>
            </tfoot>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "blue" | "neutral" | "emerald";
}) {
  const cls = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    neutral: "bg-neutral-50 border-neutral-200 text-neutral-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  }[color];

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
