"use server"

import { db, createTenantDb } from "@repo/db"
import { participantBusinesses } from "@repo/db/schema/public"
import { boothCategories } from "@repo/db/schema/tenant"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { uploadParticipantBusinessLogo } from "@/lib/minio-storage"
import { updateBusiness, type BusinessPayload } from "@/actions/participants"

const TENANT_SCHEMA = process.env.TENANT_SCHEMA ?? "expo_forbis2026"

type LogoUpload = {
  contentType: string
  dataUrl: string
  fileName: string
}

type QuickBusinessPayload = {
  boothName?: string
  companyName: string
  logoUpload?: LogoUpload | null
  requestedBoothCategorySlug: string
}

export async function createQuickBusiness(
  participantId: string,
  eventSlug: string,
  data: QuickBusinessPayload
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  try {
    const session = await import("@/lib/participant-session").then(m => m.getCurrentParticipantSession())
    if (!session || session.participantId !== participantId) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." }
    }

    const companyName = data.companyName.trim()
    if (!companyName) {
      return { success: false, error: "Nama perusahaan wajib diisi." }
    }
    if (!data.requestedBoothCategorySlug) {
      return { success: false, error: "Jenis produk untuk expo wajib dipilih." }
    }

    const tenantDb = await createTenantDb(TENANT_SCHEMA)
    const category = await tenantDb.query.boothCategories.findFirst({
      where: eq(boothCategories.slug, data.requestedBoothCategorySlug),
    })
    if (!category) {
      return { success: false, error: "Jenis produk tidak valid." }
    }

    let logoAssetId: string | null = null
    if (data.logoUpload) {
      const stored = await uploadParticipantBusinessLogo({
        ...data.logoUpload,
        ownerParticipantId: participantId,
      })
      logoAssetId = stored.assetId ?? null
    }

    const boothName = data.boothName?.trim() || companyName

    const [result] = await db
      .insert(participantBusinesses)
      .values({
        participantId,
        companyName,
        boothName,
        brandName: companyName,
        legalEntity: "",
        businessCategory: "",
        businessSector: "",
        requestedBoothCategoryId: category.id,
        requestedBoothCategorySlug: category.slug,
        requestedBoothCategoryName: category.name,
        logoAssetId,
      })
      .returning({ id: participantBusinesses.id })

    revalidatePath(`/${eventSlug}/usaha`)
    revalidatePath(`/${eventSlug}/dashboard`)

    if (!result) return { success: false, error: "Gagal menyimpan data usaha." }
    return { success: true, businessId: result.id }
  } catch (error) {
    console.error("[createQuickBusiness]", error)
    return { success: false, error: "Gagal menyimpan data usaha." }
  }
}

export async function updatePublicBusiness(
  businessId: string,
  eventSlug: string,
  data: BusinessPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await import("@/lib/participant-session").then(m => m.getCurrentParticipantSession())
    if (!session) {
      return { success: false, error: "Sesi tidak valid. Silakan login kembali." }
    }

    const business = await db.query.participantBusinesses.findFirst({
      where: eq(participantBusinesses.id, businessId),
      columns: { participantId: true },
    })
    if (!business || business.participantId !== session.participantId) {
      return { success: false, error: "Usaha tidak ditemukan atau bukan milik Anda." }
    }

    const result = await updateBusiness(businessId, data)
    if (!result.success) return { success: false, error: result.error }

    revalidatePath(`/${eventSlug}/usaha`)
    revalidatePath(`/${eventSlug}/dashboard`)
    return { success: true }
  } catch (err) {
    console.error("updatePublicBusiness error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan data usaha.",
    }
  }
}
