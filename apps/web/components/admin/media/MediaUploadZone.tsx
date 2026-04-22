"use client";

import * as React from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadMediaAssetAction } from "@/actions/media";

type Props = {
  onUploaded: () => void;
};

export function MediaUploadZone({ onUploaded }: Props) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function processFiles(files: FileList) {
    setError("");
    setUploading(true);
    const results = await Promise.allSettled(
      Array.from(files).map(async (file) => {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: maks 5MB`);
        const dataUrl = await readFileAsDataUrl(file);
        const isPublic = file.type.startsWith("image/") && /^(event|qris|channel)/.test(file.name);
        const folder = file.type.startsWith("image/") ? "private/participant-logos" : "private/documents";
        const result = await uploadMediaAssetAction({
          dataUrl,
          contentType: file.type,
          fileName: file.name,
          folder,
          visibility: "private",
        });
        if (!result.success) throw new Error(result.error);
      })
    );
    setUploading(false);
    const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (failures.length > 0) {
      setError(failures.map((f) => (f.reason as Error).message).join("; "));
    } else {
      onUploaded();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-primary/3"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        className="sr-only"
        onChange={handleChange}
      />
      {uploading ? (
        <Loader2 className="size-8 animate-spin text-primary" />
      ) : (
        <Upload className="size-8 text-muted-foreground" />
      )}
      <p className="mt-3 text-sm font-medium text-foreground">
        {uploading ? "Mengunggah..." : "Drag & drop file di sini, atau klik untuk pilih"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Gambar, PDF, dokumen — maks 5MB per file</p>
      {error && (
        <p className="mt-2 max-w-xs rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
