export const dynamic = "force-dynamic";

import { asc, eq } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { participantBusinesses, participants } from "@repo/db/schema/public";
import { booths, eventAddons } from "@repo/db/schema/tenant";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ManualInvoiceBuilder } from "@/components/admin/finance/ManualInvoiceBuilder";
import { resolveCurrentPricePhase } from "@/lib/price-phase";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getManualInvoiceBuilderData() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const participantRows = await db.query.participants.findMany({
    with: {
      businesses: true,
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  const boothRows = await tenantDb.query.booths.findMany({
    where: eq(booths.isActive, true),
    with: {
      boothCategory: true,
      boothGroup: true,
      zone: {
        with: {
          priceRules: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.code)],
  });

  const addonRows = await tenantDb.query.eventAddons.findMany({
    where: eq(eventAddons.isActive, true),
    with: {
      addonUnit: true,
    },
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
  });

  // Resolve current price phase from the first zone's rules (all zones share same schedule)
  const allPriceRules = boothRows[0]?.zone.priceRules ?? [];
  const currentPricePhase = resolveCurrentPricePhase(
    allPriceRules.map((r) => ({
      pricePhase: r.pricePhase,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
    }))
  );

  return {
    addons: addonRows.map((addon) => ({
      description: addon.description,
      id: addon.id,
      name: addon.name,
      price: addon.price,
      unitName: addon.addonUnit?.name ?? null,
    })),
    booths: boothRows.map((booth) => ({
      boothCategorySlug: booth.boothCategory.slug,
      boothGroupDefaultPriceGroup: booth.boothGroup.defaultPriceGroup,
      boothGroupName: booth.boothGroup.name,
      boothGroupSlug: booth.boothGroup.slug,
      code: booth.code,
      id: booth.id,
      priceRules: booth.zone.priceRules.map((rule) => ({
        endsAt: rule.endsAt ? rule.endsAt.toISOString() : null,
        price: rule.price,
        priceGroup: rule.priceGroup,
        pricePhase: rule.pricePhase,
        startsAt: rule.startsAt ? rule.startsAt.toISOString() : null,
      })),
      status: booth.status,
      zoneName: booth.zone.name,
    })),
    currentPricePhase,
    participants: participantRows.map((participant) => ({
      businesses: participant.businesses.map((business) => ({
        companyName: business.companyName,
        id: business.id,
        requestedBoothCategorySlug: business.requestedBoothCategorySlug,
      })),
      id: participant.id,
      isForbisMember: participant.isForbisMember ?? false,
      name: participant.name,
      organizationGroupSlug: participant.organizationGroupSlug,
    })),
  };
}

export default async function TambahTagihanPage() {
  const data = await getManualInvoiceBuilderData();

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        eyebrow="Finance & Transactions"
        title="Tambah Transaksi"
        description="Pilih peserta, perusahaan, booth, add-on, lalu terbitkan tagihan dalam satu alur."
      />

      <ManualInvoiceBuilder data={data} />
    </div>
  );
}
