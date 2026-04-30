"use server";

import { db } from "@repo/db";
import { createTenantDb } from "@repo/db";
import { indonesiaRegions, participants, participantBusinesses } from "@repo/db/schema/public";
import { boothCategories, boothGroups } from "@repo/db/schema/tenant";
import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  deleteMinioObjectByUrl,
  uploadParticipantBusinessLogo,
} from "@/lib/minio-storage";
import { hashParticipantPassword } from "@/lib/participant-auth";

type ParticipantPayload = {
  forbisMemberId?: string;
  fullName: string;
  email?: string;
  isKmiAlumni: string;
  kmiYear?: string;
  organizationGroupId: string;
  phone: string;
  whatsapp: string;
}

type LogoUploadPayload = {
  contentType: string;
  dataUrl: string;
  fileName: string;
}

export type BusinessPayload = {
  brandName: string;
  boothName: string;
  businessCategory: string;
  businessSector: string;
  companyName: string;
  companyAddress: string;
  companyDescription: string;
  companyDistrictCode: string;
  companyPhone?: string;
  companyProvinceCode: string;
  companyRegencyCode: string;
  companyVillageCode: string;
  companyWhatsapp?: string;
  requestedBoothCategorySlug: string;
  legalEntity: string;
  logoUpload?: LogoUploadPayload | null;
  logoAssetId?: string | null;
  partnershipConcepts: string[];
  productTags: string[];
}

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026";

async function resolveBoothGroup(groupId: string) {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  return tenantDb.query.boothGroups.findFirst({
    where: eq(boothGroups.id, groupId),
  });
}

async function resolveBoothCategory(categorySlug: string) {
  const tenantDb = await createTenantDb(TENANT_SCHEMA);
  return tenantDb.query.boothCategories.findFirst({
    where: eq(boothCategories.slug, categorySlug),
  });
}

async function resolveRegion(code: string, level: string, parentCode?: string | null) {
  const region = await db.query.indonesiaRegions.findFirst({
    where: eq(indonesiaRegions.code, code),
  });

  if (!region || region.level !== level) {
    return null;
  }

  if ((parentCode ?? null) !== (region.parentCode ?? null)) {
    return null;
  }

  return region;
}

async function revalidateParticipantPaths(participantId: string) {
  revalidatePath("/admin/peserta");
  revalidatePath(`/admin/peserta/${participantId}`);
  revalidatePath(`/admin/peserta/${participantId}/edit`);
}

export async function getParticipants() {
  try {
    const data = await db.query.participants.findMany({
      with: {
        businesses: true,
      },
      orderBy: (participants, { desc }) => [desc(participants.createdAt)],
    });
    
    return data;
  } catch (error) {
    console.error("Error fetching participants:", error);
    return [];
  }
}

async function checkDuplicateContact(
  email: string | null,
  phone: string,
  whatsapp: string,
  excludeId?: string
) {
  const conditions = [eq(participants.phone, phone), eq(participants.whatsapp, whatsapp)];
  if (email) conditions.push(eq(participants.email, email));

  const baseWhere = excludeId
    ? and(or(...conditions)!, ne(participants.id, excludeId))
    : or(...conditions)!;

  const existing = await db
    .select({ name: participants.name, phone: participants.phone, whatsapp: participants.whatsapp, email: participants.email })
    .from(participants)
    .where(baseWhere)
    .limit(1);

  if (existing.length === 0) return null;

  const row = existing[0]!;
  if (email && row.email?.toLowerCase() === email.toLowerCase())
    return `Email sudah terdaftar atas nama ${row.name}.`;
  if (row.phone === phone)
    return `Nomor telepon sudah terdaftar atas nama ${row.name}.`;
  if (row.whatsapp === whatsapp)
    return `Nomor WhatsApp sudah terdaftar atas nama ${row.name}.`;
  return `Kontak sudah terdaftar atas nama ${row.name}.`;
}

export async function createParticipant(data: ParticipantPayload) {
  try {
    const organizationGroup = await resolveBoothGroup(data.organizationGroupId);

    if (!organizationGroup) {
      return { success: false, error: "Organisasi tidak ditemukan." };
    }

    const dupError = await checkDuplicateContact(
      data.email?.trim() || null,
      data.phone,
      data.whatsapp
    );
    if (dupError) return { success: false, error: dupError };

    const isForbisPriced =
      organizationGroup.defaultPriceGroup === "forbis" ||
      ["forbis", "fpag", "formaqin"].includes(organizationGroup.slug);
    const forbisMemberId =
      organizationGroup.slug === "forbis" ? data.forbisMemberId?.trim() || null : null;

    const [result] = await db.insert(participants).values({
      name: data.fullName,
      email: data.email?.trim() || null,
      phone: data.phone,
      whatsapp: data.whatsapp,
      isForbisMember: isForbisPriced,
      forbisMemberId,
      organizationGroupId: organizationGroup.id,
      organizationGroupSlug: organizationGroup.slug,
      organizationGroupName: organizationGroup.name,
      isKmiAlumni: data.isKmiAlumni === "Ya",
      kmiYear: data.isKmiAlumni === "Ya" ? data.kmiYear : null,
    }).returning();
    
    revalidatePath("/admin/peserta");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating participant:", error);
    return { success: false, error: "Gagal menyimpan data pribadi." };
  }
}

export async function updateParticipant(id: string, data: ParticipantPayload) {
  try {
    const organizationGroup = await resolveBoothGroup(data.organizationGroupId);

    if (!organizationGroup) {
      return { success: false, error: "Organisasi tidak ditemukan." };
    }

    const dupError = await checkDuplicateContact(
      data.email?.trim() || null,
      data.phone,
      data.whatsapp,
      id
    );
    if (dupError) return { success: false, error: dupError };

    const isForbisPriced =
      organizationGroup.defaultPriceGroup === "forbis" ||
      ["forbis", "fpag", "formaqin"].includes(organizationGroup.slug);
    const forbisMemberId =
      organizationGroup.slug === "forbis" ? data.forbisMemberId?.trim() || null : null;

    const [result] = await db.update(participants).set({
      name: data.fullName,
      email: data.email?.trim() || null,
      phone: data.phone,
      whatsapp: data.whatsapp,
      isForbisMember: isForbisPriced,
      forbisMemberId,
      organizationGroupId: organizationGroup.id,
      organizationGroupSlug: organizationGroup.slug,
      organizationGroupName: organizationGroup.name,
      isKmiAlumni: data.isKmiAlumni === "Ya",
      kmiYear: data.isKmiAlumni === "Ya" ? data.kmiYear : null,
      updatedAt: new Date(),
    }).where(eq(participants.id, id)).returning();
    
    revalidatePath("/admin/peserta");
    revalidatePath(`/admin/peserta/${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating participant:", error);
    return { success: false, error: "Gagal memperbarui data pribadi." };
  }
}

export async function resetParticipantPassword(participantId: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: "Password minimal 8 karakter." };
  }
  try {
    const passwordHash = await hashParticipantPassword(newPassword);
    const [result] = await db
      .update(participants)
      .set({ passwordHash, passwordUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(participants.id, participantId))
      .returning({ id: participants.id });
    if (!result) return { success: false, error: "Peserta tidak ditemukan." };
    revalidatePath(`/admin/peserta/${participantId}`);
    return { success: true };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: "Gagal mereset password." };
  }
}

export async function createBusiness(participantId: string, data: BusinessPayload) {
  try {
    const requestedCategory = await resolveBoothCategory(data.requestedBoothCategorySlug);

    if (!requestedCategory) {
      return { success: false, error: "Jenis produk pameran tidak ditemukan." };
    }

    const province = await resolveRegion(data.companyProvinceCode, "province");
    const regency = await resolveRegion(data.companyRegencyCode, "regency", province?.code);
    const district = await resolveRegion(data.companyDistrictCode, "district", regency?.code);
    const village = await resolveRegion(data.companyVillageCode, "village", district?.code);

    if (!province || !regency || !district || !village) {
      return { success: false, error: "Alamat wilayah perusahaan tidak valid." };
    }

    let logoAssetId: string | null = null;

    if (data.logoAssetId) {
      logoAssetId = data.logoAssetId;
    } else if (data.logoUpload) {
      const storedLogo = await uploadParticipantBusinessLogo(data.logoUpload);
      logoAssetId = storedLogo.assetId ?? null;
    }

    const [result] = await db.insert(participantBusinesses).values({
      participantId,
      companyName: data.companyName,
      boothName: data.boothName,
      requestedBoothCategoryId: requestedCategory.id,
      requestedBoothCategorySlug: requestedCategory.slug,
      requestedBoothCategoryName: requestedCategory.name,
      companyAddress: data.companyAddress,
      companyDescription: data.companyDescription,
      companyDistrictCode: district.code,
      companyDistrictName: district.name,
      companyPhone: data.companyPhone || null,
      companyProvinceCode: province.code,
      companyProvinceName: province.name,
      companyRegencyCode: regency.code,
      companyRegencyName: regency.name,
      companyVillageCode: village.code,
      companyVillageName: village.name,
      companyWhatsapp: data.companyWhatsapp || null,
      legalEntity: data.legalEntity,
      businessCategory: data.businessCategory,
      businessSector: data.businessSector,
      brandName: data.brandName,
      productTags: data.productTags || [],
      partnershipConcepts: data.partnershipConcepts || [],
      logoAssetId,
    }).returning();
    
    await revalidateParticipantPaths(participantId);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error creating business:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menyimpan data usaha.",
    };
  }
}

export async function updateBusiness(
  businessId: string,
  data: BusinessPayload
) {
  try {
    const requestedCategory = await resolveBoothCategory(data.requestedBoothCategorySlug);

    if (!requestedCategory) {
      return { success: false, error: "Jenis produk pameran tidak ditemukan." };
    }

    const province = await resolveRegion(data.companyProvinceCode, "province");
    const regency = await resolveRegion(data.companyRegencyCode, "regency", province?.code);
    const district = await resolveRegion(data.companyDistrictCode, "district", regency?.code);
    const village = await resolveRegion(data.companyVillageCode, "village", district?.code);

    if (!province || !regency || !district || !village) {
      return { success: false, error: "Alamat wilayah perusahaan tidak valid." };
    }

    const existingBusiness = await db.query.participantBusinesses.findFirst({
      where: eq(participantBusinesses.id, businessId),
    });

    if (!existingBusiness) {
      return { success: false, error: "Data usaha tidak ditemukan." };
    }

    let logoAssetId = existingBusiness.logoAssetId ?? null;

    if (data.logoAssetId) {
      logoAssetId = data.logoAssetId;
    } else if (data.logoUpload) {
      const uploadedLogo = await uploadParticipantBusinessLogo(data.logoUpload);
      logoAssetId = uploadedLogo.assetId ?? null;
    }

    const [result] = await db
      .update(participantBusinesses)
      .set({
        brandName: data.brandName,
        boothName: data.boothName,
        businessCategory: data.businessCategory,
        businessSector: data.businessSector,
        companyName: data.companyName,
        requestedBoothCategoryId: requestedCategory.id,
        requestedBoothCategorySlug: requestedCategory.slug,
        requestedBoothCategoryName: requestedCategory.name,
        companyAddress: data.companyAddress,
        companyDescription: data.companyDescription,
        companyDistrictCode: district.code,
        companyDistrictName: district.name,
        companyPhone: data.companyPhone || null,
        companyProvinceCode: province.code,
        companyProvinceName: province.name,
        companyRegencyCode: regency.code,
        companyRegencyName: regency.name,
        companyVillageCode: village.code,
        companyVillageName: village.name,
        companyWhatsapp: data.companyWhatsapp || null,
        legalEntity: data.legalEntity,
        logoAssetId,
        partnershipConcepts: data.partnershipConcepts || [],
        productTags: data.productTags || [],
        updatedAt: new Date(),
      })
      .where(eq(participantBusinesses.id, businessId))
      .returning();

    await revalidateParticipantPaths(existingBusiness.participantId);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error updating business:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal memperbarui data usaha.",
    };
  }
}

export async function deleteBusiness(businessId: string) {
  try {
    const existingBusiness = await db.query.participantBusinesses.findFirst({
      where: eq(participantBusinesses.id, businessId),
    });

    if (!existingBusiness) {
      return { success: false, error: "Data usaha tidak ditemukan." };
    }

    await db
      .delete(participantBusinesses)
      .where(eq(participantBusinesses.id, businessId));

    await revalidateParticipantPaths(existingBusiness.participantId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting business:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghapus data usaha.",
    };
  }
}

export async function deleteParticipant(id: string) {
  try {
    const existingParticipant = await db.query.participants.findFirst({
      where: eq(participants.id, id),
      with: {
        businesses: true,
      },
    });

    if (!existingParticipant) {
      return { success: false };
    }

    await db.delete(participants).where(eq(participants.id, id));
    revalidatePath("/admin/peserta");
    return { success: true };
  } catch (error) {
    console.error("Error deleting participant:", error);
    return { success: false };
  }
}
