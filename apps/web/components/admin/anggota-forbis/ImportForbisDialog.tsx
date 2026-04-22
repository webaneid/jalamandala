"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ImportForbisDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
  }

  function handleClose() {
    if (isPending) return;
    if (result) router.refresh();
    reset();
    setOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError("");
  }

  function handleImport() {
    if (!file) return;
    setError("");
    setResult(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/anggota-forbis/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error ?? "Import gagal.");
        return;
      }

      setResult({ imported: json.imported, skipped: json.skipped ?? 0 });
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-10 rounded-2xl gap-2"
        onClick={() => { reset(); setOpen(true); }}
        type="button"
      >
        <Upload className="size-4" />
        Import Excel
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogHeader>
          <div>
            <DialogTitle>Import Anggota FORBIS</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload file Excel sesuai template
            </p>
          </div>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!result ? (
            <>
              <div
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-6 py-8 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition"
                onClick={() => inputRef.current?.click()}
              >
                <FileSpreadsheet className="size-8 text-muted-foreground opacity-60" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Klik untuk pilih file .xlsx</p>
                    <p className="text-xs text-muted-foreground opacity-70 mt-0.5">
                      Gunakan template resmi dengan header yang sesuai
                    </p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" />
              <div>
                <p className="font-semibold">Import berhasil!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {result.imported} baris berhasil diproses.
                  {result.skipped > 0 && (
                    <span className="ml-1 text-amber-600">{result.skipped} baris dilewati.</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-2xl"
            disabled={isPending}
            onClick={handleClose}
            type="button"
          >
            {result ? "Tutup" : "Batal"}
          </Button>
          {!result && (
            <Button
              className="rounded-2xl gap-2"
              disabled={isPending || !file}
              onClick={handleImport}
              type="button"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </>
  );
}
