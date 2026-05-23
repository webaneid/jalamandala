"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Tenant = {
  partnershipConcepts: string[] | null;
  businessSector: string | null;
  requestedBoothCategoryName: string | null;
  businessCategory: string | null;
  legalEntity: string | null;
  companyProvinceName: string | null;
};

const PALETTE = [
  "#00adee", "#134397", "#22c55e", "#f59e0b", "#ef4444",
  "#a855f7", "#06b6d4", "#f97316", "#84cc16", "#ec4899",
  "#14b8a6", "#8b5cf6",
];

function countField(tenants: Tenant[], field: keyof Tenant): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const t of tenants) {
    const val = t[field];
    if (!val) continue;
    const key = String(val).trim();
    if (key) map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function countArrayField(tenants: Tenant[], field: "partnershipConcepts"): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const t of tenants) {
    const arr = t[field];
    if (!arr) continue;
    for (const item of arr) {
      const key = item.trim();
      if (key) map[key] = (map[key] ?? 0) + 1;
    }
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { percent: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  if (!d) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1530]/90 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-white/60">{d.value} tenant · {(d.payload.percent * 100).toFixed(1)}%</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  if (!first) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1530]/90 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm">
      <p className="font-semibold">{label}</p>
      <p className="text-white/60">{first.value} tenant</p>
    </div>
  );
};

function DonutChart({ data, title, total }: { data: { name: string; value: number }[]; title: string; total: number }) {
  if (data.length === 0) return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/35">{title}</p>
      <p className="text-sm text-white/30 italic">Belum ada data</p>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/35">{title}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto sm:mx-0 shrink-0" style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={66}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {data.slice(0, 7).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="flex-1 truncate text-xs text-white/70">{d.name}</span>
              <span className="text-xs font-semibold text-white/50">{((d.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
          {data.length > 7 && (
            <p className="text-[10px] text-white/30">+{data.length - 7} lainnya</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  if (data.length === 0) return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/35">{title}</p>
      <p className="text-sm text-white/30 italic">Belum ada data</p>
    </div>
  );

  const top = data.slice(0, 10);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/35">{title}</p>
      <ResponsiveContainer width="100%" height={top.length * 38 + 16}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          barSize={14}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {data.length > 10 && (
        <p className="mt-2 text-right text-[10px] text-white/30">+{data.length - 10} provinsi lainnya</p>
      )}
    </div>
  );
}

export function TenantStats({ tenants }: { tenants: Tenant[] }) {
  const total = tenants.length;
  if (total === 0) return null;

  const kemitraan = countArrayField(tenants, "partnershipConcepts");
  const bidangJasa = countField(tenants, "businessSector");
  const jenisProduk = countField(tenants, "requestedBoothCategoryName");
  const kategoriUsaha = countField(tenants, "businessCategory");
  const badanHukum = countField(tenants, "legalEntity");
  const provinsi = countField(tenants, "companyProvinceName");

  return (
    <section className="mt-12 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Statistik Tenant</p>
        <p className="text-sm text-white/40">Berdasarkan data yang diisi peserta</p>
      </div>

      {/* Baris 1: 2 pie + 1 bar */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DonutChart data={kemitraan} title="Konsep Kemitraan" total={total} />
        <DonutChart data={jenisProduk} title="Jenis Produk Pameran" total={total} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DonutChart data={kategoriUsaha} title="Kategori Usaha" total={total} />
        <DonutChart data={badanHukum} title="Badan Hukum" total={total} />
      </div>

      <HorizontalBarChart data={bidangJasa} title="Bidang Jasa / Usaha" />
      <HorizontalBarChart data={provinsi} title="Asal Provinsi" />
    </section>
  );
}
