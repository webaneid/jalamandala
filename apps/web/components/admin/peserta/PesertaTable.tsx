"use client";

import * as React from "react";
import { Eye, Pencil, Trash2, Search, SlidersHorizontal } from "lucide-react";
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

interface PesertaTableProps {
  initialData: any[];
}

function resolveVerificationStatus(participant: any) {
  if (!participant.businesses || participant.businesses.length === 0) {
    return {
      label: "Butuh Data Usaha",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  const hasLogo = participant.businesses.some((business: any) => !!business.logoAssetId);

  if (!hasLogo) {
    return {
      label: "Perlu Logo",
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "Lengkap",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export function PesertaTable({ initialData }: PesertaTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const filteredData = initialData.filter((p) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.businesses?.[0]?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus peserta ini?")) {
      const res = await deleteParticipant(id);
      if (res.success) {
        router.refresh();
      } else {
        alert("Gagal menghapus peserta.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama atau perusahaan..."
            className="h-11 rounded-2xl border-white/70 bg-white pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full rounded-2xl bg-white px-4 sm:w-auto">
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter & Segmentasi
        </Button>
      </div>

      <div className="rounded-3xl border border-border/70 bg-white overflow-hidden">
        <Table>
          <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="font-semibold">Nama Lengkap</TableHead>
                <TableHead className="font-semibold">Perusahaan Utama</TableHead>
                <TableHead className="font-semibold">Status Alumni</TableHead>
                <TableHead className="font-semibold">Nomor WA</TableHead>
                <TableHead className="font-semibold">Status Verifikasi</TableHead>
                <TableHead className="text-right font-semibold px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Tidak ada data peserta ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((peserta) => (
                <TableRow key={peserta.id} className="hover:bg-muted/30 transition-colors">
                  {(() => {
                    const verificationStatus = resolveVerificationStatus(peserta);

                    return (
                      <>
                  <TableCell className="font-medium">
                    {peserta.name}
                  </TableCell>
                  <TableCell>
                    {peserta.businesses?.[0]?.companyName || "-"}
                    {peserta.businesses?.length > 1 && (
                      <Badge variant="outline" className="ml-2 text-[10px]">+{peserta.businesses.length - 1} lainnya</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {peserta.isKmiAlumni ? (
                      <Badge variant="secondary" className="bg-primary-50 text-primary-700 border-primary-100">
                        KMI {peserta.kmiYear}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Umum</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{peserta.whatsapp}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={verificationStatus.className}
                    >
                      {verificationStatus.label}
                    </Badge>
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
                      </>
                    );
                  })()}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
