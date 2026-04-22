"use client";

import * as React from "react";
import { FileText, Image, Loader2, Lock, Trash2, X } from "lucide-react";
import { deleteMediaAssetAction, updateMediaAssetMetadataAction, type MediaAssetRow } from "@/actions/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  asset: MediaAssetRow | null;
  onClose: () => void;
  onDeleted: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export function MediaDetailPanel({ asset, onClose, onDeleted }: Props) {
  const [title, setTitle] = React.useState(asset?.title ?? "");
  const [altText, setAltText] = React.useState(asset?.altText ?? "");
  const [description, setDescription] = React.useState(asset?.description ?? "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => {
    setTitle(asset?.title ?? "");
    setAltText(asset?.altText ?? "");
    setDescription(asset?.description ?? "");
    setSaveError("");
  }, [asset?.id]);

  async function handleSave() {
    if (!asset) return;
    setSaving(true);
    setSaveError("");
    const result = await updateMediaAssetMetadataAction(asset.id, { title, altText, description });
    setSaving(false);
    if (!result.success) setSaveError(result.error ?? "Gagal.");
  }

  async function handleDelete() {
    if (!asset) return;
    if (!confirm(`Hapus file "${asset.originalName}"?`)) return;
    setDeleting(true);
    const result = await deleteMediaAssetAction(asset.id);
    setDeleting(false);
    if (!result.success) {
      setSaveError(result.error ?? "Gagal hapus.");
    } else {
      onDeleted();
    }
  }

  const previewUrl = asset ? (asset.publicUrl ?? `/api/media/${asset.id}`) : null;
  const isImage = asset?.assetType === "image";

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-[0_0_60px_rgba(15,23,42,0.18)] transition-transform duration-200 w-full max-w-sm ${
        asset ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {asset ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <p className="truncate text-sm font-semibold text-foreground max-w-[220px]">{asset.originalName}</p>
            <button onClick={onClose} className="ml-2 shrink-0 rounded-xl p-1.5 text-muted-foreground hover:bg-muted" type="button">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Preview */}
            <div className="flex items-center justify-center rounded-xl border bg-muted/30 p-4 h-44">
              {isImage && previewUrl ? (
                <img src={previewUrl} alt={asset.altText ?? asset.originalName} className="max-h-full max-w-full rounded object-contain" />
              ) : (
                <FileText className="size-12 text-muted-foreground/50" />
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-xs">
              <div>
                <p className="text-muted-foreground">Tipe</p>
                <p className="font-medium">{asset.mimeType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ukuran</p>
                <p className="font-medium">{formatBytes(asset.sizeBytes)}</p>
              </div>
              {asset.width && (
                <div>
                  <p className="text-muted-foreground">Dimensi</p>
                  <p className="font-medium">{asset.width} × {asset.height}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Visibilitas</p>
                <p className="font-medium capitalize">{asset.visibility}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Diupload</p>
                <p className="font-medium">{formatDate(asset.createdAt)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Pemakaian</p>
                <p className="font-medium">{asset.usageCount} modul</p>
              </div>
            </div>

            {/* Editable metadata */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Judul</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opsional" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Alt Text</label>
                <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Untuk aksesibilitas" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Deskripsi</label>
                <textarea
                  className="min-h-16 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
            </div>

            {saveError && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{saveError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-4 flex gap-2">
            <Button className="flex-1" disabled={saving} onClick={handleSave} size="sm" type="button">
              {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Simpan
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={deleting || asset.isLocked || asset.usageCount > 0}
              onClick={handleDelete}
              type="button"
              className="gap-1.5 text-destructive hover:bg-destructive/5 hover:border-destructive/40"
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
