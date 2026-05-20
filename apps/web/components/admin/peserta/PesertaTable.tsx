"use client";

import * as React from "react";
import { Eye, Pencil, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteParticipant } from "@/actions/participants";
import { useRouter } from "next/navigation";

type BookingStatus = "paid" | "dp_paid" | "waiting" | "none";

interface Participant {
  id: string;
  name: string;
  whatsapp: string;
  isKmiAlumni: boolean | null;
  kmiYear: string | null;
  organizationGroupName: string | null;
  bookingStatus: BookingStatus;
  businesses: Array<{
    id: string;
    companyName: string;
    logoAssetId: string | null;
    invoice: { status: string; invoiceNumber: string; grandTotal: number } | null;
    booths: string[];
  }>;
}

const TABS: { key: BookingStatus | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "paid", label: "Lunas" },
  { key: "dp_paid", label: "DP Terbayar" },
  { key: "waiting", label: "Menunggu Bayar" },
  { key: "none", label: "Belum Booking" },
];

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { label: string; className: string }> = {
    paid:    { label: "Lunas",           className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    dp_paid: { label: "DP Terbayar",     className: "border-blue-200 bg-blue-50 text-blue-700" },
    waiting: { label: "Menunggu Bayar",  className: "border-amber-200 bg-amber-50 text-amber-700" },
    none:    { label: "Belum Booking",   className: "border-slate-200 bg-slate-50 text-slate-500" },
  };
  const s = map[status];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export function PesertaTable({ initialData }: { initialData: Participant[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<BookingStatus | "all">("all");

  const filtered = React.useMemo(() => {
    return initialData.filter((p) => {
      const matchesTab = activeTab === "all" || p.bookingStatus === activeTab;
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.businesses.some((b) => b.companyName.toLowerCase().includes(q)) ||
        p.businesses.some((b) => b.booths.some((booth) => booth.toLowerCase().includes(q)));
      return matchesTab && matchesSearch;
    });
  }, [initialData, activeTab, searchTerm]);

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: initialData.length };
    for (const p of initialData) counts[p.bookingStatus] = (counts[p.bookingStatus] ?? 0) + 1;
    return counts;
  }, [initialData]);

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus peserta ini?")) {
      const res = await deleteParticipant(id);
      if (res.success) router.refresh();
      else alert("Gagal menghapus peserta.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search + tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama, perusahaan, booth..."
            className="h-10 rounded-2xl border-white/70 bg-white pl-8 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-primary-700 text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab.key ? "bg-white/20" : "bg-muted-foreground/10"}`}>
                {tabCounts[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-border/70 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="font-semibold">Nama Peserta</TableHead>
              <TableHead className="font-semibold">Perusahaan</TableHead>
              <TableHead className="font-semibold">Booth</TableHead>
              <TableHead className="font-semibold">WA</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold px-6">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data peserta ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((peserta) => {
                const allBooths = peserta.businesses.flatMap((b) => b.booths);
                const companies = peserta.businesses.map((b) => b.companyName);

                return (
                  <TableRow key={peserta.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      <div>{peserta.name}</div>
                      {peserta.organizationGroupName && (
                        <div className="text-xs text-muted-foreground">{peserta.organizationGroupName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{companies[0] ?? "-"}</div>
                      {companies.length > 1 && (
                        <Badge variant="outline" className="mt-1 text-[10px]">+{companies.length - 1} usaha</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {allBooths.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {allBooths.map((booth) => (
                            <Badge key={booth} className="bg-primary-50 text-primary-700 border-none text-[11px] font-semibold">
                              {booth}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{peserta.whatsapp}</TableCell>
                    <TableCell>
                      <BookingStatusBadge status={peserta.bookingStatus} />
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/peserta/${peserta.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-primary-600 hover:bg-primary-50">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/peserta/${peserta.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-amber-600 hover:bg-amber-50">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(peserta.id)}
                          className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
