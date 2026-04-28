"use client";

import * as React from "react";
import { FileText, Grid3X3, HardDrive, Image, LayoutList, Loader2, Lock, Search, Trash2 } from "lucide-react";
import { listMediaAssets, deleteOrphanAssetsAction, applyBucketPolicyAction, type MediaAssetRow, type StorageStats } from "@/actions/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaDetailPanel } from "./MediaDetailPanel";
import { MediaUploadZone } from "./MediaUploadZone";

type View = "grid" | "list";

function formatDate(d: Date | null | undefined) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
}

function AssetIcon({ assetType, publicUrl, assetId, altText, originalName }: {
  assetType: string;
  publicUrl: string | null;
  assetId: string;
  altText: string | null;
  originalName: string;
}) {
  const src = publicUrl ?? `/api/media/${assetId}`;
  if (assetType === "image") {
    return (
      <img
        src={src}
        alt={altText ?? originalName}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      {assetType === "image" ? (
        <Image className="size-8 text-muted-foreground/40" />
      ) : (
        <FileText className="size-8 text-muted-foreground/40" />
      )}
    </div>
  );
}

function VisibilityBadge({ v }: { v: string }) {
  if (v === "public") return <Badge className="bg-green-50 text-green-700 border-none text-[10px]">public</Badge>;
  if (v === "event_admin") return <Badge className="bg-amber-50 text-amber-700 border-none text-[10px]">admin</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 border-none text-[10px]">private</Badge>;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StorageDashboard({ stats, onCleanup }: { stats: StorageStats; onCleanup: () => void }) {
  const [cleaning, setCleaning] = React.useState(false);
  const [cleanResult, setCleanResult] = React.useState<string | null>(null);
  const [applyingPolicy, setApplyingPolicy] = React.useState(false);
  const [policyResult, setPolicyResult] = React.useState<string | null>(null);

  async function handleCleanup() {
    setCleaning(true);
    setCleanResult(null);
    const result = await deleteOrphanAssetsAction();
    setCleaning(false);
    if (result.success) {
      setCleanResult(`${result.deleted} file orphan dihapus.`);
      onCleanup();
    } else {
      setCleanResult(result.error ?? "Gagal cleanup.");
    }
  }

  async function handleApplyPolicy() {
    setApplyingPolicy(true);
    setPolicyResult(null);
    const result = await applyBucketPolicyAction();
    setApplyingPolicy(false);
    setPolicyResult(result.success ? "Bucket policy berhasil diperbarui." : (result.error ?? "Gagal apply policy."));
  }

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <HardDrive className="size-4 text-primary" />
        Storage Usage
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-muted/30 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total File</p>
          <p className="text-lg font-bold">{stats.totalFiles.toLocaleString("id-ID")}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total Ukuran</p>
          <p className="text-lg font-bold">{formatBytes(stats.totalBytes)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 space-y-0.5">
          <p className="text-xs text-amber-700">Orphan (tidak dipakai)</p>
          <p className="text-lg font-bold text-amber-700">{stats.orphanCount}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Per Tipe</p>
          <div className="flex flex-wrap gap-1">
            {stats.byType.map((t) => (
              <span key={t.assetType} className="text-[11px] text-muted-foreground">
                {t.assetType}: {t.fileCount}
              </span>
            ))}
          </div>
        </div>
      </div>

      {stats.orphanCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex-1 text-sm text-amber-800">
            {stats.orphanCount} file tidak dipakai di manapun dan bisa dihapus untuk menghemat storage.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
            disabled={cleaning}
            onClick={handleCleanup}
            type="button"
          >
            {cleaning ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Hapus Orphan
          </Button>
        </div>
      )}

      {cleanResult && (
        <p className="text-sm text-muted-foreground">{cleanResult}</p>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="flex-1 text-sm text-slate-700">
          Apply bucket policy MinIO — wajib dijalankan setelah perubahan konfigurasi storage.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={applyingPolicy}
          onClick={handleApplyPolicy}
          type="button"
        >
          {applyingPolicy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Apply Policy
        </Button>
      </div>

      {policyResult && (
        <p className="text-sm text-muted-foreground">{policyResult}</p>
      )}
    </div>
  );
}

type Props = {
  initialAssets: MediaAssetRow[];
  initialStats: StorageStats;
};

export function MediaLibraryClient({ initialAssets, initialStats }: Props) {
  const [assets, setAssets] = React.useState<MediaAssetRow[]>(initialAssets);
  const [stats, setStats] = React.useState<StorageStats>(initialStats);
  const [view, setView] = React.useState<View>("grid");
  const [selected, setSelected] = React.useState<MediaAssetRow | null>(null);
  const [q, setQ] = React.useState("");
  const [filterType, setFilterType] = React.useState("all");
  const [loading, setLoading] = React.useState(false);
  const [showUpload, setShowUpload] = React.useState(false);

  const searchTimeout = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  async function fetchAssets(params: { q?: string; assetType?: string }) {
    setLoading(true);
    const rows = await listMediaAssets({ q: params.q, assetType: params.assetType });
    setAssets(rows);
    setLoading(false);
  }

  function handleSearch(value: string) {
    setQ(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchAssets({ q: value, assetType: filterType }), 350);
  }

  function handleFilterType(value: string) {
    setFilterType(value);
    fetchAssets({ q, assetType: value });
  }

  function handleDeleted() {
    setSelected(null);
    fetchAssets({ q, assetType: filterType });
  }

  function handleUploaded() {
    setShowUpload(false);
    fetchAssets({ q, assetType: filterType });
  }

  function handleCleanup() {
    fetchAssets({ q, assetType: filterType });
    // refresh stats optimistically: set orphanCount to 0
    setStats((prev) => ({ ...prev, orphanCount: 0 }));
  }

  return (
    <div className="space-y-4">
      <StorageDashboard stats={stats} onCleanup={handleCleanup} />

      <div className="flex gap-0 relative">
      {/* Main area */}
      <div className={`flex-1 min-w-0 space-y-4 transition-all ${selected ? "mr-80" : ""}`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder="Cari nama file..."
              value={q}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <select
            className="h-10 rounded-xl border border-input bg-white px-3 text-sm outline-none focus:border-primary"
            value={filterType}
            onChange={(e) => handleFilterType(e.target.value)}
          >
            <option value="all">Semua tipe</option>
            <option value="image">Gambar</option>
            <option value="pdf">PDF</option>
            <option value="document">Dokumen</option>
            <option value="other">Lainnya</option>
          </select>

          <div className="flex rounded-xl border border-input overflow-hidden">
            <button
              className={`flex h-10 w-10 items-center justify-center text-sm transition ${view === "grid" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted/50"}`}
              onClick={() => setView("grid")}
              type="button"
            >
              <Grid3X3 className="size-4" />
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center text-sm transition border-l border-input ${view === "list" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-muted/50"}`}
              onClick={() => setView("list")}
              type="button"
            >
              <LayoutList className="size-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10"
            onClick={() => setShowUpload((v) => !v)}
            type="button"
          >
            Upload File
          </Button>

          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Upload zone */}
        {showUpload && (
          <MediaUploadZone onUploaded={handleUploaded} />
        )}

        {/* Content */}
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <Image className="size-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada file. Klik Upload File untuk mulai.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelected(asset)}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition hover:border-primary/60 hover:shadow-md ${selected?.id === asset.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              >
                <div className="aspect-square bg-muted/30">
                  <AssetIcon
                    assetType={asset.assetType}
                    publicUrl={asset.publicUrl}
                    assetId={asset.id}
                    altText={asset.altText}
                    originalName={asset.originalName}
                  />
                </div>
                <div className="px-2 py-2 space-y-1">
                  <p className="truncate text-[11px] font-medium text-foreground leading-tight">{asset.originalName}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <VisibilityBadge v={asset.visibility} />
                    {asset.isLocked && <Lock className="size-3 text-amber-500" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ukuran</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visibilitas</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dipakai</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, i) => (
                  <tr
                    key={asset.id}
                    className={`cursor-pointer transition hover:bg-muted/20 ${selected?.id === asset.id ? "bg-primary/5" : i % 2 === 0 ? "bg-white" : "bg-muted/10"}`}
                    onClick={() => setSelected(asset)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border bg-muted/30">
                          <AssetIcon
                            assetType={asset.assetType}
                            publicUrl={asset.publicUrl}
                            assetId={asset.id}
                            altText={asset.altText}
                            originalName={asset.originalName}
                          />
                        </div>
                        <div>
                          <p className="truncate max-w-[220px] font-medium text-foreground">{asset.originalName}</p>
                          {asset.title && <p className="text-xs text-muted-foreground truncate max-w-[220px]">{asset.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{asset.assetType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(asset.sizeBytes)}</td>
                    <td className="px-4 py-3"><VisibilityBadge v={asset.visibility} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{asset.usageCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(asset.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{assets.length} file ditampilkan</p>
      </div>

      {/* Detail panel (fixed slideout) */}
      <MediaDetailPanel
        asset={selected}
        onClose={() => setSelected(null)}
        onDeleted={handleDeleted}
      />

      {/* Overlay when panel open on mobile */}
      {selected && (
        <div
          className="fixed inset-0 z-40 bg-foreground/10 lg:hidden"
          onClick={() => setSelected(null)}
        />
      )}
    </div>
    </div>
  );
}
