"use server";

import { createTenantDb, db } from "@repo/db";
import {
  boothBookings,
  boothCategories,
  boothFacilities,
  boothFacilityCatalog,
  boothGroups,
  booths,
  zonePriceRules,
  zones,
} from "@repo/db/schema/tenant";
import { expoEvents, participantBusinesses } from "@repo/db/schema/public";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

type ParsedFacility = {
  name: string;
  value: string | null;
};

function parseFacility(rawValue: string): ParsedFacility | null {
  const normalized = rawValue.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  const [rawName, ...rest] = normalized.split(":");
  const name = rawName?.trim();
  const value = rest.join(":").trim();

  if (!name) {
    return null;
  }

  return {
    name,
    value: value || null,
  };
}

function normalizePrice(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Harga tidak valid.");
  }

  return Math.round(value);
}

export async function updateZoneFacilities(zoneId: string, rawFacilities: string[]) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const parsedFacilities = rawFacilities
      .map(parseFacility)
      .filter((facility): facility is ParsedFacility => !!facility);

    if (parsedFacilities.length === 0) {
      return { success: false, error: "Minimal satu fasilitas harus diisi." };
    }

    const zoneBooths = await tenantDb.query.booths.findMany({
      columns: {
        id: true,
      },
      where: eq(booths.zoneId, zoneId),
    });
    const boothIds = zoneBooths.map((booth) => booth.id);

    if (boothIds.length === 0) {
      return { success: false, error: "Booth untuk zona ini belum tersedia." };
    }

    await tenantDb
      .delete(boothFacilities)
      .where(inArray(boothFacilities.boothId, boothIds));

    for (const [index, facility] of parsedFacilities.entries()) {
      const [upsertedCatalogItem] = await tenantDb
        .insert(boothFacilityCatalog)
        .values({
          name: facility.name,
          sortOrder: index + 1,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: boothFacilityCatalog.name,
          set: {
            isActive: true,
            sortOrder: index + 1,
            updatedAt: new Date(),
          },
        })
        .returning();
      const catalogItem =
        upsertedCatalogItem ??
        (await tenantDb.query.boothFacilityCatalog.findFirst({
          where: eq(boothFacilityCatalog.name, facility.name),
        }));

      if (!catalogItem) {
        return {
          success: false,
          error: `Fasilitas ${facility.name} gagal disimpan.`,
        };
      }

      for (const boothId of boothIds) {
        await tenantDb.insert(boothFacilities).values({
          boothId,
          facilityId: catalogItem.id,
          value: facility.value,
        });
      }
    }

    revalidatePath("/admin/booth");
    return { success: true };
  } catch (error) {
    console.error("Error updating zone facilities:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui fasilitas.",
    };
  }
}

export async function updateZonePrices(
  zoneId: string,
  prices: Array<{
    price: number;
    priceGroup: string;
    pricePhase: string;
  }>
) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    if (prices.length === 0) {
      return { success: false, error: "Minimal satu harga harus diisi." };
    }

    for (const item of prices) {
      const priceGroup = item.priceGroup.trim();
      const pricePhase = item.pricePhase.trim();

      if (!priceGroup || !pricePhase) {
        return { success: false, error: "Group dan fase harga wajib diisi." };
      }

      await tenantDb
        .insert(zonePriceRules)
        .values({
          zoneId,
          priceGroup,
          pricePhase,
          price: normalizePrice(item.price),
          currency: "IDR",
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [
            zonePriceRules.zoneId,
            zonePriceRules.priceGroup,
            zonePriceRules.pricePhase,
          ],
          set: {
            price: normalizePrice(item.price),
            currency: "IDR",
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }

    revalidatePath("/admin/booth");
    return { success: true };
  } catch (error) {
    console.error("Error updating zone prices:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui harga.",
    };
  }
}

export async function updateZoneImage(zoneId: string, imageAssetId: string | null) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    await tenantDb
      .update(zones)
      .set({
        imageAssetId,
        updatedAt: new Date(),
      })
      .where(eq(zones.id, zoneId));

    revalidatePath("/admin/booth");
    const activeEvents = await db.query.expoEvents.findMany({
      columns: { slug: true },
      where: eq(expoEvents.isActive, true),
    });
    for (const event of activeEvents) {
      revalidatePath(`/${event.slug}`);
    }
    return { success: true };
  } catch (error) {
    console.error("Error updating zone image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memperbarui gambar zona.",
    };
  }
}

export async function updateBoothConfiguration(payload: {
  boothId: string;
  boothCategoryId: string;
  boothGroupId: string;
  businessId?: string | null;
  status: string;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const status = payload.status.trim().toLowerCase();

    if (!["open", "booked"].includes(status)) {
      return { success: false, error: "Status booth tidak valid." };
    }

    const booth = await tenantDb.query.booths.findFirst({
      where: eq(booths.id, payload.boothId),
      with: {
        boothGroup: true,
        zone: {
          with: {
            priceRules: true,
          },
        },
      },
    });

    if (!booth) {
      return { success: false, error: "Booth tidak ditemukan." };
    }

    const boothGroup = await tenantDb.query.boothGroups.findFirst({
      where: eq(boothGroups.id, payload.boothGroupId),
    });

    if (!boothGroup) {
      return { success: false, error: "Booth group tidak ditemukan." };
    }

    const boothCategory = await tenantDb.query.boothCategories.findFirst({
      where: eq(boothCategories.id, payload.boothCategoryId),
    });

    if (!boothCategory) {
      return { success: false, error: "Booth category tidak ditemukan." };
    }

    let bookingPayload:
      | {
          basePrice: number;
          businessId: string;
          finalPrice: number;
          participantId: string;
          priceCategory: string;
        }
      | undefined;

    if (status === "booked") {
      const businessId = payload.businessId?.trim();

      if (!businessId) {
        return { success: false, error: "Perusahaan wajib dipilih saat booth dibooking." };
      }

      const business = await db.query.participantBusinesses.findFirst({
        where: eq(participantBusinesses.id, businessId),
        with: {
          participant: true,
        },
      });

      if (!business) {
        return { success: false, error: "Perusahaan tidak ditemukan." };
      }

      const resolvedPriceGroup =
        boothGroup.slug === "general"
          ? business.participant.isForbisMember
            ? "forbis"
            : "public"
          : boothGroup.defaultPriceGroup ??
            (business.participant.isForbisMember ? "forbis" : "public");
      const resolvedPrice =
        booth.zone.priceRules.find(
          (rule) => rule.priceGroup === resolvedPriceGroup && rule.pricePhase === "early_bird"
        )?.price ?? 0;

      bookingPayload = {
        basePrice: resolvedPrice,
        businessId: business.id,
        finalPrice: resolvedPrice,
        participantId: business.participantId,
        priceCategory: resolvedPriceGroup,
      };
    }

    await tenantDb
      .update(booths)
      .set({
        boothCategoryId: boothCategory.id,
        boothGroupId: boothGroup.id,
        status,
        updatedAt: new Date(),
      })
      .where(eq(booths.id, booth.id));

    await tenantDb.delete(boothBookings).where(eq(boothBookings.boothId, booth.id));

    if (bookingPayload) {
      await tenantDb.insert(boothBookings).values({
        boothId: booth.id,
        bookingStatus: "booked",
        ...bookingPayload,
      });
    }

    revalidatePath("/admin/booth");
    return { success: true };
  } catch (error) {
    console.error("Error updating booth configuration:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui konfigurasi booth.",
    };
  }
}
