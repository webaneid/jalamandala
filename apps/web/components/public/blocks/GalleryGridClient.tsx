"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type GalleryImage = { assetId: string; url?: string | null; caption?: string };

export function GalleryGridClient({ images }: { images: GalleryImage[] }) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  function prev() {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }

  function next() {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
    if (e.key === "Escape") setLightboxIndex(null);
  }

  const rows: GalleryImage[][] = [];
  for (let i = 0; i < images.length; i += 3) {
    rows.push(images.slice(i, i + 3));
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-3 gap-3">
            {row.map((img, ci) => {
              const globalIndex = ri * 3 + ci;
              return (
                <button
                  key={img.assetId}
                  type="button"
                  onClick={() => setLightboxIndex(globalIndex)}
                  className="group relative overflow-hidden rounded-xl bg-white/5"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img
                    src={img.url ?? `/api/media/${img.assetId}`}
                    alt={img.caption ?? ""}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-90"
                  />
                  {img.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                      <p className="text-xs text-white/90 line-clamp-1">{img.caption}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={handleKeyDown}
          role="dialog"
          tabIndex={0}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="size-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          <div
            className="relative max-h-[85vh] max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex]!.url ?? `/api/media/${images[lightboxIndex]!.assetId}`}
              alt={images[lightboxIndex]!.caption ?? ""}
              className="mx-auto max-h-[80vh] rounded-xl object-contain shadow-2xl"
            />
            {images[lightboxIndex]!.caption && (
              <p className="mt-3 text-center text-sm text-white/60">{images[lightboxIndex]!.caption}</p>
            )}
            <p className="mt-2 text-center text-xs text-white/30">{lightboxIndex + 1} / {images.length}</p>
          </div>
        </div>
      )}
    </>
  );
}
