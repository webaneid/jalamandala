export const dynamic = "force-dynamic";

import { createTenantDb, db } from "@repo/db";
import { expoEvents } from "@repo/db/schema/public";
import { zonePriceRules } from "@repo/db/schema/tenant";
import { asc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EventSettingConfiguration } from "@/components/admin/setting/EventSettingConfiguration";
import type { PricePhase } from "@/lib/price-phase";
import { getEventNavigationConfig, getFrontendRouteTargets, type FrontendRouteTarget } from "@/actions/front-end-menu";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function getPricePhaseSchedules() {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const rows = await tenantDb.query.zonePriceRules.findMany({
      where: eq(zonePriceRules.isActive, true),
      orderBy: (table) => [asc(table.pricePhase)],
    });
    const phases: PricePhase[] = ["early_bird", "pre_sale", "regular"];
    return phases.map((phase) => {
      const row = rows.find((r) => r.pricePhase === phase);
      return {
        phase,
        startsAt: row?.startsAt ? row.startsAt.toISOString() : null,
        endsAt: row?.endsAt ? row.endsAt.toISOString() : null,
      };
    });
  } catch {
    return [];
  }
}

async function getEventSettingData() {
  const configuredSchemaName = process.env.TENANT_SCHEMA?.trim();
  const targetEvent =
    (configuredSchemaName
      ? await db.query.expoEvents.findFirst({
          where: eq(expoEvents.schemaName, configuredSchemaName),
        })
      : null) ??
    (await db.query.expoEvents.findFirst({
      where: eq(expoEvents.isActive, true),
    })) ??
    (await db.query.expoEvents.findFirst({
      orderBy: (table) => [asc(table.createdAt)],
    }));

  if (!targetEvent) {
    return null;
  }

  const activeEvent = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.id, targetEvent.id),
    with: {
      messageTemplates: {
        orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.title)],
      },
      paymentChannels: {
        orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.label)],
      },
      qrisConfigs: true,
      whatsappConfigs: true,
    },
  });

  if (!activeEvent) {
    return null;
  }

  return {
    event: {
      endDate: activeEvent.endDate ? activeEvent.endDate.toISOString() : null,
      id: activeEvent.id,
      logoAssetId: activeEvent.logoAssetId,
      name: activeEvent.name,
      schemaName: activeEvent.schemaName,
      slug: activeEvent.slug,
      startDate: activeEvent.startDate ? activeEvent.startDate.toISOString() : null,
      targetBooths: activeEvent.targetBooths,
      targetVisitors: activeEvent.targetVisitors,
      venue: activeEvent.venue,
      financeWaNumbers: activeEvent.financeWaNumbers ?? [],
      leaderWaNumbers: activeEvent.leaderWaNumbers ?? [],
      eventTeamWaNumbers: activeEvent.eventTeamWaNumbers ?? [],
      registrationWaNumbers: (activeEvent as any).registrationWaNumbers ?? [],
      invoiceDueDays: activeEvent.invoiceDueDays ?? 1,
    },
    paymentChannels: activeEvent.paymentChannels
      .filter((channel) => channel.type === "bank_account")
      .map((channel) => ({
      accountName: channel.accountName,
      accountNumber: channel.accountNumber,
      bankName: channel.bankName,
      id: channel.id,
      isActive: channel.isActive,
      label: channel.label,
      type: channel.type,
    })),
    qrisConfig: activeEvent.qrisConfigs[0]
      ? {
          emvPayload: activeEvent.qrisConfigs[0].emvPayload,
          expiryMinutes: activeEvent.qrisConfigs[0].expiryMinutes,
          id: activeEvent.qrisConfigs[0].id,
          imageAssetId: activeEvent.qrisConfigs[0].imageAssetId,
          isEnabled: activeEvent.qrisConfigs[0].isEnabled,
          merchantCity: activeEvent.qrisConfigs[0].merchantCity,
          merchantName: activeEvent.qrisConfigs[0].merchantName,
        }
      : null,
    templates: activeEvent.messageTemplates.map((template) => ({
      bodyTemplate: template.bodyTemplate,
      id: template.id,
      isActive: template.isActive,
      key: template.key,
      title: template.title,
    })),
    whatsappConfig: activeEvent.whatsappConfigs[0]
      ? {
          apiBaseUrl: activeEvent.whatsappConfigs[0].apiBaseUrl,
          username: activeEvent.whatsappConfigs[0].username,
          password: activeEvent.whatsappConfigs[0].password,
          deviceId: activeEvent.whatsappConfigs[0].deviceId,
          senderNumber: activeEvent.whatsappConfigs[0].senderNumber,
          webhookSecret: activeEvent.whatsappConfigs[0].webhookSecret,
          sendDelayMs: activeEvent.whatsappConfigs[0].sendDelayMs,
          id: activeEvent.whatsappConfigs[0].id,
          isActive: activeEvent.whatsappConfigs[0].isActive,
        }
      : null,
  };
}


export const metadata = {
  title: "Pengaturan",
};

export default async function SettingPage() {
  const [data, pricePhaseSchedules] = await Promise.all([
    getEventSettingData(),
    getPricePhaseSchedules(),
  ]);

  let frontendConfig = null;
  let frontendTargets: FrontendRouteTarget[] = [];
  if (data?.event) {
    frontendConfig = await getEventNavigationConfig(data.event.id);
    frontendTargets = await getFrontendRouteTargets(data.event.id, data.event.slug);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Event Configuration"
        title="Kelola parameter FORBIS Expo"
        description="Atur profil event, channel pembayaran, WhatsApp gateway, template pesan, dan halaman publik."
      />

      <EventSettingConfiguration 
        data={data} 
        pricePhaseSchedules={pricePhaseSchedules} 
        frontendConfig={frontendConfig}
        frontendTargets={frontendTargets}
      />
    </div>
  );
}
