"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  totalAll: number;
  totalSearch: number;
  searchQuery: string;
}

export function ExportForbisDialog({ totalAll, totalSearch, searchQuery }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"all" | "search" | null>(null);

  async function handleExport(scope: "all" | "search") {
    setLoading(scope);
    try {
      const params = new URLSearchParams({ scope });
      if (scope === "search" && searchQuery) params.set("q", searchQuery);

      const res = await fetch(`/api/anggota-forbis/export?${params}`);
      if (!res.ok) throw new Error("Gagal mengexport data.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anggota-forbis-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      alert("Gagal mengexport data. Coba lagi.");
    } finally {
      setLoading(null);
    }
  }

  const hasSearch = !!searchQuery;

  return (
    <>
      <Button
        variant="outline"
        className="h-10 rounded-2xl bg-white/80 gap-2"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Download className="size-4" />
        Export Excel
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle>Export Anggota FORBIS</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Format .xlsx, siap diimport ulang</p>
            </div>
          </div>
          <DialogClose onClose={() => !loading && setOpen(false)} />
        </DialogHeader>

        <DialogBody className="space-y-3">
          {/* Export semua */}
          <button
            className="w-full rounded-2xl border border-border/80 bg-white/60 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
            disabled={!!loading}
            onClick={() => handleExport("all")}
            type="button"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Export semua anggota aktif</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalAll.toLocaleString("id-ID")} anggota
                </p>
              </div>
              {loading === "all"
                ? <Loader2 className="size-4 animate-spin text-primary" />
                : <Download className="size-4 text-muted-foreground" />
              }
            </div>
          </button>

          {/* Export hasil pencarian */}
          {hasSearch && (
            <button
              className="w-full rounded-2xl border border-border/80 bg-white/60 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:opacity-50"
              disabled={!!loading}
              onClick={() => handleExport("search")}
              type="button"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Export hasil pencarian</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalSearch.toLocaleString("id-ID")} anggota &mdash; filter: &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
                {loading === "search"
                  ? <Loader2 className="size-4 animate-spin text-primary" />
                  : <Download className="size-4 text-muted-foreground" />
                }
              </div>
            </button>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-2xl"
            disabled={!!loading}
            onClick={() => setOpen(false)}
            type="button"
          >
            Batal
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
