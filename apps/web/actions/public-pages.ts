"use server";

import { createTenantDb, db } from "@repo/db";
import { eventPages, expoEvents, eventAgendas, eventNavMenus, mediaAssets, participantBusinesses } from "@repo/db/schema/public";
import { invoices } from "@repo/db/schema/tenant";
import { booths, zonePriceRules, zones } from "@repo/db/schema/tenant";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { PRICE_PHASE_LABELS, resolveCurrentPricePhase, type PricePhase } from "@/lib/price-phase";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

export async function getEventContextBySlug(eventSlug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
    with: {
      pages: {
        where: and(
          eq(eventPages.status, "published"),
          isNull(eventPages.deletedAt)
        ),
      },
    },
  });
  return event;
}

export async function getPublishedEventMenus(eventSlug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
    columns: { id: true },
  });

  if (!event) return [];

  const menus = await db.query.eventNavMenus.findMany({
    where: and(
      eq(eventNavMenus.eventId, event.id),
      eq(eventNavMenus.isActive, true)
    ),
    orderBy: [asc(eventNavMenus.sortOrder)],
    with: {
      page: true,
    },
  });

  return menus;
}

export async function getPublishedEventHomepage(eventSlug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
    with: {
      homepage: {
        with: {
          event: true,
        }
      },
    },
  });

  if (!event) return null;

  // Jika homepage ter-set, pastikan published
  if (event.homepage && event.homepage.status === "published" && !event.homepage.deletedAt) {
    return event.homepage;
  }

  // Fallback: cari landing page yang published
  const landing = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.eventId, event.id),
      eq(eventPages.pageType, "landing"),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
    with: {
      event: true,
    },
  });

  return landing || null;
}

export async function getPublishedEventLanding(eventSlug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
  });

  if (!event) return null;

  const page = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.eventId, event.id),
      eq(eventPages.pageType, "landing"),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
    with: {
      featuredImage: true,
      event: true,
    },
  });

  return page;
}

export async function getPublishedLegalPage(eventSlug: string, type: "legal_tnc" | "legal_privacy") {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
  });

  if (!event) return null;

  const page = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.eventId, event.id),
      eq(eventPages.pageType, type),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
    with: {
      featuredImage: true,
      event: true,
    },
  });

  return page;
}

export async function getPublishedEventPageBySlug(eventSlug: string, slug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
  });

  if (!event) return null;

  const page = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.eventId, event.id),
      eq(eventPages.slug, slug),
      eq(eventPages.pageType, "default"),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
    with: {
      featuredImage: true,
      event: true,
    },
  });

  return page;
}

export async function getPublishedEventAgendas(eventId: string, limit?: number) {
  const query = db.query.eventAgendas.findMany({
    where: and(
      eq(eventAgendas.eventId, eventId),
      eq(eventAgendas.isPublic, true),
      eq(eventAgendas.status, "published")
    ),
    orderBy: [asc(eventAgendas.startAt), asc(eventAgendas.sortOrder)],
    limit: limit,
  });

  return await query;
}

export async function getPaidParticipantBusinessLogos(limit = 40) {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const paidInvoiceRows = await tenantDb
    .selectDistinct({ businessId: invoices.businessId })
    .from(invoices)
    .where(and(eq(invoices.status, "paid"), isNotNull(invoices.businessId)))
    .limit(limit);

  const businessIds = paidInvoiceRows
    .map((row) => row.businessId)
    .filter((id): id is string => Boolean(id));

  if (businessIds.length === 0) return [];

  const rows = await db
    .select({
      businessId: participantBusinesses.id,
      companyName: participantBusinesses.companyName,
      brandName: participantBusinesses.brandName,
      logoAssetId: participantBusinesses.logoAssetId,
      publicUrl: mediaAssets.publicUrl,
      altText: mediaAssets.altText,
    })
    .from(participantBusinesses)
    .leftJoin(mediaAssets, eq(mediaAssets.id, participantBusinesses.logoAssetId))
    .where(and(inArray(participantBusinesses.id, businessIds), isNotNull(participantBusinesses.logoAssetId)))
    .limit(limit);

  return rows.map((row) => ({
    id: row.logoAssetId!,
    label: row.brandName || row.companyName,
    url: row.publicUrl ?? `/api/media/${row.logoAssetId}`,
    alt: row.altText || row.brandName || row.companyName,
    source: "paid_participant_business" as const,
  }));
}

export async function getPublicTenantZones() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const zoneRows = await tenantDb.query.zones.findMany({
    where: eq(zones.isActive, true),
    orderBy: [asc(zones.sortOrder), asc(zones.name)],
    with: {
      booths: {
        where: eq(booths.isActive, true),
        with: {
          facilities: {
            with: {
              facility: true,
            },
          },
        },
      },
      priceRules: {
        where: eq(zonePriceRules.isActive, true),
      },
    },
  });

  return zoneRows.map((zone) => {
    const facilities = new Map<string, string>();
    for (const booth of zone.booths) {
      for (const item of booth.facilities) {
        const label = item.value ? `${item.facility.name}: ${item.value}` : item.facility.name;
        facilities.set(label, label);
      }
    }

    const activePhase = resolveCurrentPricePhase(zone.priceRules);
    const activePrices = zone.priceRules
      .filter((rule) => rule.pricePhase === activePhase)
      .map((rule) => rule.price)
      .filter((price) => Number.isFinite(price))
      .sort((a, b) => a - b);
    const fallbackPrices = zone.priceRules
      .map((rule) => rule.price)
      .filter((price) => Number.isFinite(price))
      .sort((a, b) => a - b);
    const priceSource = activePrices.length > 0 ? activePrices : fallbackPrices;

    return {
      activePricePhase: activePhase,
      activePricePhaseLabel: PRICE_PHASE_LABELS[activePhase as PricePhase] ?? activePhase,
      boothCount: zone.booths.length,
      colorCode: zone.colorCode,
      description: zone.description,
      facilities: Array.from(facilities.values()).slice(0, 4),
      id: zone.id,
      imageAssetId: (zone as any).imageAssetId ?? null,
      location: zone.location,
      name: zone.name,
      priceMax: priceSource.at(-1) ?? null,
      priceMin: priceSource[0] ?? null,
      slug: zone.slug,
    };
  });
}
