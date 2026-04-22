import { createTenantDb } from "@repo/db";
import { inArray } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AddonConfiguration } from "@/components/admin/addon/AddonConfiguration";
import { AddonMarginReport } from "@/components/admin/addon/AddonMarginReport";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getAddonConfiguration() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const [units, addons] = await Promise.all([
    tenantDb.query.addonUnits.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
    }),
    tenantDb.query.eventAddons.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      with: { addonUnit: true },
    }),
  ]);

  return {
    addons: addons.map((addon) => ({
      addonUnitId: addon.addonUnitId,
      id: addon.id,
      isActive: addon.isActive,
      price: addon.price,
      vendorPrice: addon.vendorPrice,
      title: addon.name,
      description: addon.description,
      unitName: addon.addonUnit?.name ?? null,
    })),
    units: units.map((unit) => ({
      description: unit.description,
      id: unit.id,
      isActive: unit.isActive,
      name: unit.name,
      slug: unit.slug,
    })),
  };
}

async function getMarginReport() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const addons = await tenantDb.query.eventAddons.findMany({
    orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
    with: { addonUnit: true },
  });

  if (addons.length === 0) return [];

  const addonIds = addons.map((a) => a.id);
  const { orderItems } = await import("@repo/db/schema/tenant");

  const items = await tenantDb
    .select({
      referenceId: orderItems.referenceId,
      quantity: orderItems.quantity,
      subtotal: orderItems.subtotal,
    })
    .from(orderItems)
    .where(inArray(orderItems.referenceId, addonIds));

  return addons
    .filter((a) => a.vendorPrice != null)
    .map((a) => {
      const sold = items.filter((i) => i.referenceId === a.id);
      const totalQty = sold.reduce((s, i) => s + (i.quantity ?? 0), 0);
      const totalRevenue = sold.reduce((s, i) => s + (i.subtotal ?? 0), 0);
      const totalCost = totalQty * (a.vendorPrice ?? 0);
      return {
        id: a.id,
        name: a.name,
        unitName: a.addonUnit?.name ?? null,
        price: a.price,
        vendorPrice: a.vendorPrice!,
        margin: a.price - (a.vendorPrice ?? 0),
        totalQty,
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
      };
    });
}

export default async function AddonPage() {
  const [{ addons, units }, marginReport] = await Promise.all([
    getAddonConfiguration(),
    getMarginReport(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Add-on Catalog"
        title="Konfigurasi add-on tenant"
        description="Kelola add-on tambahan tenant beserta satuan dinamis yang dipakai di event ini."
      />

      <AddonConfiguration addons={addons} units={units} />

      {marginReport.length > 0 && (
        <AddonMarginReport rows={marginReport} />
      )}
    </div>
  );
}
