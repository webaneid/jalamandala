export const dynamic = "force-dynamic";

import { Layers3, MapIcon, MoveRight } from "lucide-react";

import { createTenantDb, db } from "@repo/db";

import { ClickableBoothMap } from "@/components/admin/booth/ClickableBoothMap";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getBoothMapData() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const [zones, boothGroupOptions, boothCategoryOptions] = await Promise.all([
    tenantDb.query.zones.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      with: {
        priceRules: {
          orderBy: (table, { asc }) => [asc(table.priceGroup), asc(table.pricePhase)],
        },
        booths: {
          orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.code)],
          with: {
            boothCategory: true,
            boothGroup: true,
            bookings: true,
            facilities: {
              with: {
                facility: true,
              },
            },
          },
        },
      },
    }),
    tenantDb.query.boothGroups.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
    }),
    tenantDb.query.boothCategories.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
    }),
  ]);

  return {
    boothCategories: boothCategoryOptions.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    boothGroups: boothGroupOptions.map((group) => ({
      defaultPriceGroup: group.defaultPriceGroup,
      id: group.id,
      name: group.name,
      slug: group.slug,
    })),
    zones: zones.map((zone) => ({
      booths: zone.booths.map((booth) => ({
        boothCategory: {
          id: booth.boothCategory.id,
          name: booth.boothCategory.name,
          slug: booth.boothCategory.slug,
        },
        boothGroup: {
          defaultPriceGroup: booth.boothGroup.defaultPriceGroup,
          id: booth.boothGroup.id,
          name: booth.boothGroup.name,
          slug: booth.boothGroup.slug,
        },
        booking: booth.bookings[0]
          ? {
              businessId: booth.bookings[0].businessId,
              id: booth.bookings[0].id,
            }
          : null,
        code: booth.code,
        facilities: booth.facilities.map((item) =>
          item.value ? `${item.facility.name}: ${item.value}` : item.facility.name
        ),
        height: booth.height,
        id: booth.id,
        name: booth.name,
        notes: booth.notes,
        status: booth.status,
        width: booth.width,
        x: booth.x,
        y: booth.y,
      })),
      colorCode: zone.colorCode,
      description: zone.description,
      id: zone.id,
      imageAssetId: zone.imageAssetId,
      location: zone.location,
      name: zone.name,
      priceRules: zone.priceRules.map((rule) => ({
        currency: rule.currency,
        id: rule.id,
        isActive: rule.isActive,
        price: rule.price,
        priceGroup: rule.priceGroup,
        pricePhase: rule.pricePhase,
      })),
      slug: zone.slug,
    })),
  };
}

async function getCompanies() {
  const businesses = await db.query.participantBusinesses.findMany({
    orderBy: (table, { asc }) => [asc(table.companyName), asc(table.brandName)],
    with: {
      participant: true,
    },
  });

  return businesses.map((business) => ({
    brandName: business.brandName,
    companyName: business.companyName,
    id: business.id,
    participantName: business.participant.name,
    productTags: business.productTags ?? [],
    requestedBoothCategoryName: business.requestedBoothCategoryName,
  }));
}

function formatCurrency(value?: number | null) {
  if (!value) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function resolveStartingPrice(
  zone: Awaited<ReturnType<typeof getBoothMapData>>["zones"][number]
) {
  return (
    zone.priceRules.find(
      (rule) => rule.priceGroup === "forbis" && rule.pricePhase === "early_bird"
    )?.price ?? null
  );
}


export const metadata = {
  title: "Manajemen Booth",
};

export default async function BoothPage() {
  const [{ boothCategories, boothGroups, zones }, companies] = await Promise.all([
    getBoothMapData(),
    getCompanies(),
  ]);
  const allBooths = zones.flatMap((zone) => zone.booths);
  const bookedCount = allBooths.filter((booth) => booth.status === "booked").length;
  const openCount = allBooths.filter((booth) => booth.status === "open").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Booth Editor"
        title="Kelola peta area dan ketersediaan booth"
        description="Klik booth pada denah untuk memilih perusahaan peserta."
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard label="Schema Tenant" value={TENANT_SCHEMA} muted />
        <SummaryCard label="Total Booth" value={String(allBooths.length)} />
        <SummaryCard label="Booked" value={String(bookedCount)} tone="booked" />
        <SummaryCard label="Open" value={String(openCount)} tone="available" />
        <SummaryCard label="Perusahaan" value={String(companies.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ClickableBoothMap
          boothCategories={boothCategories}
          boothGroups={boothGroups}
          companies={companies}
          zones={zones}
        />

        <div className="space-y-4">
          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Distribusi Zona</CardTitle>
              <CardDescription>Ringkasan aktual dari data tenant schema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {zones.map((zone) => {
                const booked = zone.booths.filter((booth) => booth.status === "booked").length;
                const open = zone.booths.filter((booth) => booth.status === "open").length;
                const startingPrice = resolveStartingPrice(zone);

                return (
                  <div
                    key={zone.id}
                    className="rounded-2xl border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: zone.colorCode ?? "#134397" }}
                        />
                        <p className="font-medium text-primary-900">{zone.name}</p>
                      </div>
                      <Badge className="bg-white text-primary-700 ring-1 ring-primary-100">
                        {zone.booths.length} booth
                      </Badge>
                    </div>
                    {zone.location ? (
                      <p className="mt-2 text-xs text-muted-foreground">{zone.location}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                      <span>Open {open}</span>
                      <MoveRight className="size-4" />
                      <span>Terisi {booked}</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-muted-foreground ring-1 ring-border/60">
                      Mulai {formatCurrency(startingPrice)} anggota FORBIS
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center gap-2">
                <Layers3 className="size-5 text-primary-700" />
                <CardTitle>Legenda</CardTitle>
              </div>
              <CardDescription>Warna dasar untuk renderer awal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <LegendRow color="#22c55e" label="Booked Gontor" />
              <LegendRow color="#fbbf24" label="Booked Sponsor" />
              <LegendRow color="#fef08a" label="Booked FPAG" />
              <LegendRow color="#7c3aed" label="Booked FORMAQIN" />
              <LegendRow color="#60a5fa" label="Booked FORBIS / Umum" />
              <LegendRow color="#bfdbfe" label="Open highlight" />
              <LegendRow color="#ffffff" label="Open default" bordered />
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center gap-2">
                <MapIcon className="size-5 text-primary-700" />
                <CardTitle>Mode Festival</CardTitle>
              </div>
              <CardDescription>
                Zona festival memakai viewport tetap dengan area dalam yang bisa discroll.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 text-sm text-muted-foreground">
              Renderer ini sudah membatasi viewport zona memanjang, jadi `Festival West`
              dan `Festival North` tidak dipaksa muat dalam satu layar.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  muted,
  tone,
  value,
}: {
  label: string;
  muted?: boolean;
  tone?: "available" | "booked";
  value: string;
}) {
  const toneClassName =
    tone === "booked"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
      : tone === "available"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        : "bg-white text-primary-700 ring-1 ring-primary-100";

  return (
    <Card className="border-white/80 bg-white/90">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className={`text-2xl font-semibold tracking-[-0.03em] ${muted ? "text-base" : ""}`}>
            {value}
          </p>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClassName}`}>
            aktif
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendRow({
  bordered,
  color,
  label,
}: {
  bordered?: boolean;
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-foreground">
      <span
        className={`inline-flex h-6 w-10 rounded-sm ${bordered ? "ring-1 ring-slate-300" : ""}`}
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
