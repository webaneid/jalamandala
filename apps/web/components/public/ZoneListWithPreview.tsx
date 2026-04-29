"use client";

import Link from "next/link";
import { ZonePreviewButton } from "@/components/public/ZonePreviewModal";

type ZoneSummary = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  colorCode: string | null;
  imageAssetId: string | null;
};

export function ZoneListWithPreview({
  zones,
  eventSlug,
  selectedBusinessId,
}: {
  zones: ZoneSummary[];
  eventSlug: string;
  selectedBusinessId: string;
}) {
  return (
    <div className="space-y-3">
      {zones.map((z) => {
        const href = `/${eventSlug}/booking?zone=${encodeURIComponent(z.slug)}&businessId=${selectedBusinessId}`;
        return (
          <div key={z.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/5 transition hover:bg-white/8">
            {/* Zone image / color banner — klik ke booking */}
            <Link href={href} className="block">
              {z.imageAssetId ? (
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={`/api/media/${z.imageAssetId}`}
                    alt={z.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="aspect-video w-full flex items-center justify-center"
                  style={{
                    background: z.colorCode
                      ? `linear-gradient(135deg, ${z.colorCode}30, ${z.colorCode}10)`
                      : "linear-gradient(135deg, rgba(19,67,151,0.30), rgba(0,173,238,0.10))",
                  }}
                >
                  <span className="text-2xl font-bold" style={{ color: z.colorCode ?? "#00adee" }}>
                    {z.name}
                  </span>
                </div>
              )}
            </Link>

            {/* Bottom row: info + preview + booking */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: z.colorCode ?? "#00adee" }}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{z.name}</p>
                {z.location && (
                  <p className="mt-0.5 text-xs text-white/40">{z.location}</p>
                )}
              </div>
              <ZonePreviewButton zoneSlug={z.slug} zoneName={z.name} />
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#134397] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a56c4] shrink-0"
              >
                Pilih
                <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" />
                </svg>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
