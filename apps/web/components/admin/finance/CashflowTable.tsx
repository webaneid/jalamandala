"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Entry = {
  id: string
  transactionDate: Date
  type: string
  amount: number
  description: string
  category: string
  referenceInvoiceId: string | null
  referenceDisbursementId: string | null
  participantName: string | null
  businessName: string | null
  boothCodes: string[]
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date))
}

export function CashflowTable({ entries }: { entries: Entry[] }) {
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return entries
    return entries.filter((e) =>
      e.participantName?.toLowerCase().includes(q) ||
      e.businessName?.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.boothCodes.some((c) => c.toLowerCase().includes(q))
    )
  }, [entries, search])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 rounded-xl h-9"
          placeholder="Cari nama peserta, usaha, atau booth…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch("")}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {search && (
        <p className="text-xs text-muted-foreground">
          Menampilkan {filtered.length} dari {entries.length} transaksi
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Tanggal (WIB)</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Uang Masuk</TableHead>
            <TableHead className="text-right">Uang Keluar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                {formatDate(entry.transactionDate)}
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  {entry.referenceInvoiceId ? (
                    <Link
                      href={`/admin/keuangan/${entry.referenceInvoiceId}`}
                      className="font-medium hover:text-primary hover:underline underline-offset-2"
                    >
                      {entry.description}
                    </Link>
                  ) : (
                    <p className="font-medium">{entry.description}</p>
                  )}
                  {(entry.participantName || entry.businessName || entry.boothCodes.length > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        entry.participantName,
                        entry.businessName,
                        entry.boothCodes.length > 0 ? `Booth ${entry.boothCodes.join(", ")}` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {entry.referenceDisbursementId && (
                    <Link
                      href={`/admin/keuangan/pencairan/${entry.referenceDisbursementId}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Lihat Pencairan
                    </Link>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-neutral-50 text-xs">
                  {entry.category}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium text-emerald-600">
                {entry.type === "cash_in" ? formatRupiah(entry.amount) : "-"}
              </TableCell>
              <TableCell className="text-right font-medium text-rose-600">
                {entry.type === "cash_out" ? formatRupiah(entry.amount) : "-"}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                {search ? "Tidak ada transaksi yang cocok." : "Belum ada riwayat transaksi."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
