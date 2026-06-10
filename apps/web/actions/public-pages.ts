"use server";

import { createTenantDb, db } from "@repo/db";
import { eventPages, expoEvents, eventAgendas, eventNavMenus, mediaAssets, participantBusinesses } from "@repo/db/schema/public";
import { boothBookings, invoices } from "@repo/db/schema/tenant";
import { boothCategories, booths, zonePriceRules, zones } from "@repo/db/schema/tenant";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { PRICE_PHASE_LABELS, resolveCurrentPricePhase, type PricePhase } from "@/lib/price-phase";
import { generatePresignedGetUrl } from "@/lib/minio-storage";

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
      objectKey: mediaAssets.objectKey,
      altText: mediaAssets.altText,
    })
    .from(participantBusinesses)
    .leftJoin(mediaAssets, eq(mediaAssets.id, participantBusinesses.logoAssetId))
    .where(and(inArray(participantBusinesses.id, businessIds), isNotNull(participantBusinesses.logoAssetId)))
    .limit(limit);

  return rows.map((row) => ({
    id: row.logoAssetId!,
    label: row.brandName || row.companyName,
    url: row.publicUrl ?? (row.objectKey ? generatePresignedGetUrl(row.objectKey, 3600 * 6) : null) ?? `/api/media/${row.logoAssetId}`,
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

export async function getBoothStats() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  const rows = await tenantDb
    .select({ categorySlug: boothCategories.slug })
    .from(booths)
    .innerJoin(boothCategories, eq(booths.boothCategoryId, boothCategories.id))
    .where(eq(booths.isActive, true));

  const total = rows.length;
  const fnb = rows.filter((r) => r.categorySlug === "fnb_kitchen" || r.categorySlug === "fnb_dry_food").length;
  return { total, fnb };
}

export async function getCustomLogosFromBlock(eventSlug: string) {
  const event = await db.query.expoEvents.findFirst({
    where: eq(expoEvents.slug, eventSlug),
    columns: { id: true },
  });
  if (!event) return [];

  const page = await db.query.eventPages.findFirst({
    where: and(
      eq(eventPages.eventId, event.id),
      eq(eventPages.pageType, "landing"),
      eq(eventPages.status, "published"),
      isNull(eventPages.deletedAt)
    ),
    columns: { content: true },
  });
  if (!page?.content) return [];

  const content = page.content as any;
  const blocks: any[] = Array.isArray(content?.blocks) ? content.blocks : [];
  const sliderBlock = blocks.find((b) => b.type === "logo_slider");
  if (!sliderBlock) return [];

  const customLogos = Array.isArray(sliderBlock.payload?.customLogos)
    ? sliderBlock.payload.customLogos
    : [];

  return customLogos
    .filter((l: any) => l?.url || l?.id)
    .map((l: any) => ({
      id: String(l.id || l.url),
      url: String(l.url || `/api/media/${l.id}`),
      label: String(l.label || l.fileName || ""),
    }));
}

export async function getPaidTenantDirectory() {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);

  const paidRows = await tenantDb
    .selectDistinct({ businessId: invoices.businessId })
    .from(invoices)
    .where(and(inArray(invoices.status, ["paid", "dp_paid"]), isNotNull(invoices.businessId)));

  const businessIds = paidRows
    .map((r) => r.businessId)
    .filter((id): id is string => Boolean(id));

  if (businessIds.length === 0) return [];

  // Ambil booth codes per businessId (hanya bookingStatus = "booked")
  const bookingRows = await tenantDb
    .select({ businessId: boothBookings.businessId, code: booths.code })
    .from(boothBookings)
    .innerJoin(booths, eq(booths.id, boothBookings.boothId))
    .where(and(
      inArray(boothBookings.businessId, businessIds),
      eq(boothBookings.bookingStatus, "booked"),
    ));

  // Group booth codes per businessId dengan natural sort
  function naturalSort(a: string, b: string) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  }
  const boothCodeMap = new Map<string, string[]>();
  for (const row of bookingRows) {
    if (!row.businessId) continue;
    const codes = boothCodeMap.get(row.businessId) ?? [];
    codes.push(row.code);
    boothCodeMap.set(row.businessId, codes);
  }

  const rows = await db
    .select({
      id: participantBusinesses.id,
      companyName: participantBusinesses.companyName,
      brandName: participantBusinesses.brandName,
      boothName: participantBusinesses.boothName,
      companyDescription: participantBusinesses.companyDescription,
      companyAddress: participantBusinesses.companyAddress,
      companyRegencyName: participantBusinesses.companyRegencyName,
      companyProvinceName: participantBusinesses.companyProvinceName,
      companyPhone: participantBusinesses.companyPhone,
      companyWhatsapp: participantBusinesses.companyWhatsapp,
      productTags: participantBusinesses.productTags,
      partnershipConcepts: participantBusinesses.partnershipConcepts,
      legalEntity: participantBusinesses.legalEntity,
      businessCategory: participantBusinesses.businessCategory,
      businessSector: participantBusinesses.businessSector,
      requestedBoothCategoryName: participantBusinesses.requestedBoothCategoryName,
      teamMaleCount: participantBusinesses.teamMaleCount,
      teamFemaleCount: participantBusinesses.teamFemaleCount,
      logoAssetId: participantBusinesses.logoAssetId,
      logoPublicUrl: mediaAssets.publicUrl,
      logoObjectKey: mediaAssets.objectKey,
    })
    .from(participantBusinesses)
    .leftJoin(mediaAssets, eq(mediaAssets.id, participantBusinesses.logoAssetId))
    .where(inArray(participantBusinesses.id, businessIds));

  return rows.map((r) => ({
    id: r.id,
    companyName: r.companyName,
    brandName: r.brandName,
    boothName: r.boothName ?? null,
    companyDescription: r.companyDescription ?? null,
    companyAddress: r.companyAddress ?? null,
    companyRegencyName: r.companyRegencyName ?? null,
    companyProvinceName: r.companyProvinceName ?? null,
    companyPhone: r.companyPhone ?? null,
    companyWhatsapp: r.companyWhatsapp ?? null,
    productTags: r.productTags ?? null,
    partnershipConcepts: r.partnershipConcepts ?? null,
    legalEntity: r.legalEntity ?? null,
    businessCategory: r.businessCategory ?? null,
    businessSector: r.businessSector ?? null,
    requestedBoothCategoryName: r.requestedBoothCategoryName ?? null,
    teamMaleCount: r.teamMaleCount ?? null,
    teamFemaleCount: r.teamFemaleCount ?? null,
    logoUrl: r.logoPublicUrl
      ?? (r.logoObjectKey ? generatePresignedGetUrl(r.logoObjectKey, 3600 * 6) : null)
      ?? null,
    boothCodes: (boothCodeMap.get(r.id) ?? []).sort(naturalSort),
  }));
}
