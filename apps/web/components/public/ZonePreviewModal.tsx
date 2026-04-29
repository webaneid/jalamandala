"use client";

import * as React from "react";
import { X, Map } from "lucide-react";
import { PublicBoothMap } from "@/components/public/PublicBoothMap";
import type { PublicZoneData } from "@/lib/public-booth-data";

function useZonePreview(slug: string | null) {
  const [data, setData] = React.useState<PublicZoneData | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/zones/${slug}/preview`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [slug]);

  return { data, loading };
}

export function ZonePreviewButton({
  zoneSlug,
  zoneName,
}: {
  zoneSlug: string;
  zoneName: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/14 hover:text-white shrink-0"
        aria-label={`Lihat layout ${zoneName}`}
      >
        <Map className="size-3.5" />
        <span>Layout</span>
      </button>

      {open && (
        <ZonePreviewModalSheet
          zoneSlug={zoneSlug}
          zoneName={zoneName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ZonePreviewModalSheet({
  zoneSlug,
  zoneName,
  onClose,
}: {
  zoneSlug: string;
  zoneName: string;
  onClose: () => void;
}) {
  const { data, loading } = useZonePreview(zoneSlug);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-[#050e1f] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#050e1f] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Preview Layout</p>
            <p className="mt-0.5 font-semibold text-white">Zona {zoneName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-white/12 bg-white/6 text-white/50 hover:bg-white/12 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex h-40 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
            </div>
          )}

          {!loading && data && (
            <>
              <div className="mb-3 flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-emerald-400" /> Open
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-slate-400" /> Terisi
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/5 p-3">
                <PublicBoothMap
                  zone={data}
                  onConfirm={() => {}}
                  readOnly
                />
              </div>
              <p className="mt-3 text-center text-xs text-white/30">
                Ini adalah tampilan preview. Login untuk mulai booking booth.
              </p>
            </>
          )}

          {!loading && !data && (
            <p className="py-8 text-center text-sm text-white/40">Gagal memuat layout zona.</p>
          )}
        </div>
      </div>
    </div>
  );
}
