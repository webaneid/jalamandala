"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Tenant = {
  id: string;
  companyName: string;
  brandName: string;
  productTags: string[] | null;
  legalEntity: string | null;
  businessCategory: string | null;
  businessSector: string | null;
  companyDescription: string | null;
  companyAddress: string | null;
  partnershipConcepts: string[] | null;
  teamMaleCount: number | null;
  teamFemaleCount: number | null;
};

function isComplete(t: Tenant) {
  return !!(
    t.legalEntity &&
    t.businessCategory &&
    t.businessSector &&
    t.brandName &&
    t.companyDescription &&
    t.companyAddress &&
    t.productTags?.length &&
    t.partnershipConcepts?.length
  );
}

export function TenantTable({ tenants }: { tenants: Tenant[] }) {
  if (tenants.length === 0) return null;

  return (
    <section className="mt-12 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Daftar Lengkap Tenant</p>
        <p className="text-sm text-white/40">{tenants.length} peserta terdaftar</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/5">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/35">Nama Usaha</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/35">Brand</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/35">Produk</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/35">Jumlah Tim</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/35">Status Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tenants.map((t) => {
              const tags = t.productTags?.filter(Boolean) ?? [];
              const done = isComplete(t);
              return (
                <tr key={t.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white/80">{t.companyName}</td>
                  <td className="px-4 py-3 text-white/60">
                    {t.brandName && t.brandName !== t.companyName ? t.brandName : <span className="text-white/25 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#00adee]/15 px-2 py-0.5 text-[10px] font-medium text-[#00adee]"
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/25 italic text-[11px]">Belum diisi</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-white/60 text-xs">
                    {(t.teamMaleCount != null || t.teamFemaleCount != null) ? (
                      <span>
                        {t.teamMaleCount ?? 0}L / {t.teamFemaleCount ?? 0}P
                      </span>
                    ) : (
                      <span className="text-white/25 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3" /> Lengkap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                        <AlertCircle className="size-3" /> Belum Lengkap
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
