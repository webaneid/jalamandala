export const dynamic = "force-dynamic";

import { asc, eq } from "drizzle-orm";

import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { eventAddons, zones } from "@repo/db/schema/tenant";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VendorConfiguration } from "@/components/admin/vendor/VendorConfiguration";
import { getVendors } from "@/actions/vendors";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getActiveEventId() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();
  const event =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({ where: eq(expoEvents.schemaName, configuredSchemaName) })
      : null) ??
    (await db.query.expoEvents.findFirst({ where: eq(expoEvents.isActive, true) })) ??
    (await db.query.expoEvents.findFirst({ orderBy: (t) => [asc(t.createdAt)] }));
  return event?.id ?? null;
}

async function getZonesAndAddons() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const [zoneRows, addonRows] = await Promise.all([
    tenantDb.select({ id: zones.id, slug: zones.slug, name: zones.name }).from(zones).where(eq(zones.isActive, true)).orderBy(asc(zones.sortOrder)),
    tenantDb.select({ id: eventAddons.id, name: eventAddons.name }).from(eventAddons).where(eq(eventAddons.isActive, true)).orderBy(asc(eventAddons.sortOrder)),
  ]);
  return { zones: zoneRows, addons: addonRows };
}

export default async function VendorPage() {
  const eventId = await getActiveEventId();
  const { zones: zoneOptions, addons: addonOptions } = await getZonesAndAddons();
  const vendorList = eventId ? await getVendors(eventId) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Manajemen Vendor"
        title="Vendor & Penugasan"
        description="Kelola akun vendor booth dan vendor add-on beserta zona atau add-on yang ditugaskan."
      />
      <VendorConfiguration
        vendors={vendorList}
        eventId={eventId ?? ""}
        zoneOptions={zoneOptions}
        addonOptions={addonOptions}
      />
    </div>
  );
}
