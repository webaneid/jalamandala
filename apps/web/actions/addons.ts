"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { createTenantDb } from "@repo/db";
import {
  addonUnits,
  eventAddons,
  registrationAddons,
} from "@repo/db/schema/tenant";

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

function slugifyUnitName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizePrice(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Harga add-on tidak valid.");
  }

  return Math.round(value);
}

export async function upsertAddonUnit(payload: {
  description?: string;
  id?: string;
  isActive?: boolean;
  name: string;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const name = normalizeText(payload.name);
    const description = normalizeText(payload.description) || null;

    if (!name) {
      return { success: false, error: "Nama satuan wajib diisi." };
    }

    const slug = slugifyUnitName(name);

    if (!slug) {
      return { success: false, error: "Nama satuan tidak valid." };
    }

    const existingBySlug = await tenantDb.query.addonUnits.findFirst({
      where: eq(addonUnits.slug, slug),
    });

    if (existingBySlug && existingBySlug.id !== payload.id) {
      return { success: false, error: "Satuan dengan nama serupa sudah ada." };
    }

    if (payload.id) {
      await tenantDb
        .update(addonUnits)
        .set({
          description,
          isActive: payload.isActive ?? true,
          name,
          slug,
          updatedAt: new Date(),
        })
        .where(eq(addonUnits.id, payload.id));
    } else {
      const lastUnit = await tenantDb.query.addonUnits.findFirst({
        orderBy: (table) => [desc(table.sortOrder)],
      });

      await tenantDb.insert(addonUnits).values({
        description,
        isActive: payload.isActive ?? true,
        name,
        slug,
        sortOrder: (lastUnit?.sortOrder ?? 0) + 1,
      });
    }

    revalidatePath("/admin/addon");
    return { success: true };
  } catch (error) {
    console.error("Error upserting addon unit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan satuan add-on.",
    };
  }
}

export async function deleteAddonUnit(id: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const usedAddon = await tenantDb.query.eventAddons.findFirst({
      where: eq(eventAddons.addonUnitId, id),
    });

    if (usedAddon) {
      return {
        success: false,
        error: "Satuan masih dipakai add-on lain. Hapus atau ubah add-on-nya dulu.",
      };
    }

    await tenantDb.delete(addonUnits).where(eq(addonUnits.id, id));
    revalidatePath("/admin/addon");
    return { success: true };
  } catch (error) {
    console.error("Error deleting addon unit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus satuan add-on.",
    };
  }
}

export async function upsertEventAddon(payload: {
  addonUnitId: string;
  description?: string;
  id?: string;
  isActive?: boolean;
  price: number;
  vendorPrice?: number | null;
  title: string;
}) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);
    const name = normalizeText(payload.title);
    const description = normalizeText(payload.description) || null;
    const addonUnitId = normalizeText(payload.addonUnitId);

    if (!name) {
      return { success: false, error: "Judul add-on wajib diisi." };
    }

    if (!addonUnitId) {
      return { success: false, error: "Satuan add-on wajib dipilih." };
    }

    const addonUnit = await tenantDb.query.addonUnits.findFirst({
      where: and(eq(addonUnits.id, addonUnitId), eq(addonUnits.isActive, true)),
    });

    if (!addonUnit) {
      return { success: false, error: "Satuan add-on tidak ditemukan." };
    }

    const existingByName = await tenantDb.query.eventAddons.findFirst({
      where: eq(eventAddons.name, name),
    });

    if (existingByName && existingByName.id !== payload.id) {
      return { success: false, error: "Add-on dengan judul yang sama sudah ada." };
    }

    const vendorPrice =
      payload.vendorPrice != null && payload.vendorPrice > 0
        ? normalizePrice(payload.vendorPrice)
        : null;

    if (payload.id) {
      await tenantDb
        .update(eventAddons)
        .set({
          addonUnitId,
          description,
          isActive: payload.isActive ?? true,
          name,
          price: normalizePrice(payload.price),
          vendorPrice,
          updatedAt: new Date(),
        })
        .where(eq(eventAddons.id, payload.id));
    } else {
      const lastAddon = await tenantDb.query.eventAddons.findFirst({
        orderBy: (table) => [desc(table.sortOrder)],
      });

      await tenantDb.insert(eventAddons).values({
        addonUnitId,
        description,
        isActive: payload.isActive ?? true,
        name,
        price: normalizePrice(payload.price),
        vendorPrice,
        sortOrder: (lastAddon?.sortOrder ?? 0) + 1,
      });
    }

    revalidatePath("/admin/addon");
    return { success: true };
  } catch (error) {
    console.error("Error upserting event addon:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan add-on.",
    };
  }
}

export async function deleteEventAddon(id: string) {
  try {
    const tenantDb = await createTenantDb(TENANT_SCHEMA);

    const usedAddon = await tenantDb.query.registrationAddons.findFirst({
      where: eq(registrationAddons.addonId, id),
    });

    if (usedAddon) {
      return {
        success: false,
        error: "Add-on sudah dipakai di registrasi. Nonaktifkan saja, jangan dihapus.",
      };
    }

    await tenantDb.delete(eventAddons).where(eq(eventAddons.id, id));
    revalidatePath("/admin/addon");
    return { success: true };
  } catch (error) {
    console.error("Error deleting event addon:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menghapus add-on.",
    };
  }
}
