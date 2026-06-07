"use client";

import * as React from "react";
import { MapPin, Phone, X } from "lucide-react";
import { TenantStats } from "./TenantStats";
import { TenantTable } from "./TenantTable";

type Sponsor = {
  id: string;
  url: string;
  label: string;
};

type Tenant = {
  id: string;
  companyName: string;
  brandName: string;
  companyDescription: string | null;
  companyAddress: string | null;
  companyRegencyName: string | null;
  companyProvinceName: string | null;
  companyPhone: string | null;
  companyWhatsapp: string | null;
  productTags: string[] | null;
  partnershipConcepts: string[] | null;
  legalEntity: string | null;
  businessCategory: string | null;
  businessSector: string | null;
  requestedBoothCategoryName: string | null;
  teamMaleCount: number | null;
  teamFemaleCount: number | null;
  logoUrl: string | null;
  boothCodes: string[];
};

function formatWaNumber(raw: string) {
  return raw.replace(/[\s\-().+]/g, "").replace(/^0/, "62");
}

function TenantPopup({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const address = [tenant.companyAddress, tenant.companyRegencyName, tenant.companyProvinceName]
    .filter(Boolean)
    .join(", ");

  const showBrand = tenant.brandName && tenant.brandName !== tenant.companyName;
  const tags = tenant.productTags?.filter(Boolean) ?? [];
  const showPhone =
    tenant.companyPhone &&
    (!tenant.companyWhatsapp ||
      tenant.companyPhone.replace(/\D/g, "") !== tenant.companyWhatsapp.replace(/\D/g, ""));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1530] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-5 border-b border-white/8">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.brandName}
                className="max-h-12 max-w-12 object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-white/30">
                {(tenant.brandName || tenant.companyName).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white leading-snug">{tenant.companyName}</p>
            {showBrand && (
              <p className="text-sm text-[#00adee] mt-0.5">{tenant.brandName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex size-8 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:text-white/80 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Deskripsi */}
          {tenant.companyDescription && (
            <p className="text-sm text-white/70 leading-relaxed">{tenant.companyDescription}</p>
          )}

          {/* Alamat */}
          {address && (
            <div className="flex items-start gap-2.5 text-sm text-white/60">
              <MapPin className="size-4 shrink-0 mt-0.5 text-[#00adee]" />
              <span>{address}</span>
            </div>
          )}

          {/* Produk */}
          {tags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/35">Produk</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Kontak */}
          {(tenant.companyWhatsapp || showPhone) && (
            <div className="space-y-2 border-t border-white/8 pt-4">
              {tenant.companyWhatsapp && (
                <a
                  href={`https://wa.me/${formatWaNumber(tenant.companyWhatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition"
                >
                  {/* WhatsApp icon */}
                  <svg className="size-4 shrink-0 text-[#25d366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>{tenant.companyWhatsapp}</span>
                </a>
              )}
              {showPhone && tenant.companyPhone && (
                <a
                  href={`tel:${tenant.companyPhone}`}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition"
                >
                  <Phone className="size-4 shrink-0 text-[#00adee]" />
                  <span>{tenant.companyPhone}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TenantDirectoryClient({
  sponsors,
  tenants,
}: {
  sponsors: Sponsor[];
  tenants: Tenant[];
}) {
  const [selected, setSelected] = React.useState<Tenant | null>(null);

  return (
    <>
      {/* Section A — Didukung Oleh */}
      {sponsors.length > 0 && (
        <section className="mb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
            Didukung Oleh
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {sponsors.map((s) => (
              <div
                key={s.id}
                className="flex aspect-video items-center justify-center rounded-2xl border border-white/8 bg-white/80 p-3"
                title={s.label}
              >
                <img
                  src={s.url}
                  alt={s.label}
                  className="max-h-10 max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section B — Peserta Tenant */}
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
          Peserta Tenant
        </p>
        {tenants.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">Belum ada peserta terdaftar.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/5 p-3 text-center transition hover:border-white/20 hover:bg-white/10"
                type="button"
              >
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10">
                  {t.logoUrl ? (
                    <img
                      src={t.logoUrl}
                      alt={t.brandName}
                      className="max-h-10 max-w-10 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white/30">
                      {(t.brandName || t.companyName).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="w-full truncate text-[11px] font-medium text-white/70 leading-tight">
                  {t.brandName || t.companyName}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Popup */}
      {selected && (
        <TenantPopup tenant={selected} onClose={() => setSelected(null)} />
      )}

      {/* Stats */}
      <TenantStats tenants={tenants} />

      {/* Table */}
      <TenantTable tenants={tenants} />
    </>
  );
}
