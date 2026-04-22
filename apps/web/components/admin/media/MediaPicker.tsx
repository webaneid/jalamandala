"use client";

import * as React from "react";
import { FileText, Image, Loader2, Search, X } from "lucide-react";
import { listMediaAssets, uploadMediaAssetAction, type MediaAssetRow } from "@/actions/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MediaPickerValue = {
  id: string;
  url: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
} | null;

type Props = {
  value: MediaPickerValue;
  onChange: (asset: MediaPickerValue) => void;
  accept?: "image" | "any";
  folder?: string;
  visibility?: "public" | "private" | "event_admin";
  placeholder?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMediaPreviewUrl(asset: Pick<MediaAssetRow, "id" | "publicUrl">) {
  return asset.publicUrl ?? `/api/media/${asset.id}`;
}

function AssetThumb({ row }: { row: MediaAssetRow }) {
  if (row.assetType === "image") {
    return (
      <img
        src={getMediaPreviewUrl(row)}
        alt={row.altText ?? row.originalName}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      {row.assetType === "image" ? (
        <Image className="size-5 text-muted-foreground/40" />
      ) : (
        <FileText className="size-5 text-muted-foreground/40" />
      )}
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────
function PickerDialog({
  accept,
  folder,
  visibility,
  onPick,
  onClose,
}: {
  accept: "image" | "any";
  folder: string;
  visibility: "public" | "private" | "event_admin";
  onPick: (asset: MediaPickerValue) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<"library" | "upload">("library");
  const [assets, setAssets] = React.useState<MediaAssetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");
  const [highlighted, setHighlighted] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(() => {
    load("");
  }, []);

  async function load(query: string) {
    setLoading(true);
    const rows = await listMediaAssets({
      q: query || undefined,
      assetType: accept === "image" ? "image" : undefined,
      limit: 100,
    });
    setAssets(rows);
    setLoading(false);
  }

  function handleSearch(value: string) {
    setQ(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(value), 350);
  }

  async function handleUpload(files: FileList) {
    const file = files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError("Maks 5MB."); return; }
    setUploading(true);
    setUploadError("");
    const dataUrl = await readFileAsDataUrl(file);
    const result = await uploadMediaAssetAction({
      dataUrl,
      contentType: file.type,
      fileName: file.name,
      folder,
      visibility,
    });
    setUploading(false);
    if (!result.success) { setUploadError(result.error); return; }
    const asset = result.asset;
    onPick({
      id: asset.id,
      url: asset.publicUrl ?? `/api/media/${asset.id}`,
      objectKey: asset.objectKey,
      fileName: asset.originalName,
      mimeType: asset.mimeType,
    });
  }

  function handleConfirm() {
    const row = assets.find((a) => a.id === highlighted);
    if (!row) return;
    pickAsset(row);
  }

  function pickAsset(row: MediaAssetRow) {
    onPick({
      id: row.id,
      url: getMediaPreviewUrl(row),
      objectKey: row.objectKey,
      fileName: row.originalName,
      mimeType: row.mimeType,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 flex flex-col w-full max-w-3xl max-h-[80vh] rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
          <p className="text-base font-semibold text-foreground">Pilih File</p>
          <button onClick={onClose} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted" type="button">
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0">
          <button
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${tab === "library" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("library")}
            type="button"
          >
            Dari Library
          </button>
          <button
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${tab === "upload" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("upload")}
            type="button"
          >
            Upload Baru
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "library" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input className="pl-9" placeholder="Cari nama file..." value={q} onChange={(e) => handleSearch(e.target.value)} />
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-sm text-muted-foreground">
                  <Image className="size-8 mb-2 text-muted-foreground/30" />
                  Belum ada file. Coba tab Upload Baru.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {assets.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setHighlighted(row.id === highlighted ? null : row.id)}
                      onDoubleClick={() => {
                        setHighlighted(row.id);
                        pickAsset(row);
                      }}
                      className={`group flex flex-col overflow-hidden rounded-xl border bg-white transition ${highlighted === row.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/60"}`}
                    >
                      <div className="aspect-square bg-muted/30">
                        <AssetThumb row={row} />
                      </div>
                      <p className="truncate px-1.5 py-1.5 text-[10px] text-muted-foreground text-left">{row.originalName}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept={accept === "image" ? "image/*" : "image/*,application/pdf,.doc,.docx"}
                className="sr-only"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <div
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-14 cursor-pointer hover:border-primary/60 hover:bg-primary/3 transition"
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-8 animate-spin text-primary" />
                ) : (
                  <Image className="size-8 text-muted-foreground/40" />
                )}
                <p className="mt-3 text-sm font-medium text-foreground">
                  {uploading ? "Mengunggah..." : "Klik untuk pilih file"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Maks 5MB</p>
              </div>
              {uploadError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === "library" && (
          <div className="flex items-center justify-between border-t px-5 py-3 shrink-0">
            <p className="text-xs text-muted-foreground">
              {highlighted ? "1 dipilih" : `${assets.length} file`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} type="button">Batal</Button>
              <Button size="sm" disabled={!highlighted} onClick={handleConfirm} type="button">Pilih</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────
export function MediaPicker({
  value,
  onChange,
  accept = "any",
  folder = "private/documents",
  visibility = "private",
  placeholder = "Pilih file dari library...",
}: Props) {
  const [open, setOpen] = React.useState(false);

  function handlePick(asset: MediaPickerValue) {
    onChange(asset);
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center gap-3 rounded-xl border border-input bg-white px-3 py-2.5 text-sm text-left transition hover:border-primary/60 hover:bg-primary/3"
        >
          {value ? (
            <>
              {value.mimeType.startsWith("image/") ? (
                <img src={value.url} alt={value.fileName} className="h-8 w-8 rounded-lg object-cover border shrink-0" />
              ) : (
                <FileText className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate font-medium text-foreground">{value.fileName}</span>
            </>
          ) : (
            <>
              <Image className="size-5 shrink-0 text-muted-foreground/50" />
              <span className="text-muted-foreground">{placeholder}</span>
            </>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted/60 hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <PickerDialog
          accept={accept}
          folder={folder}
          visibility={visibility}
          onPick={handlePick}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
