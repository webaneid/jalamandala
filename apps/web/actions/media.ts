"use server";

import { and, count, desc, eq, ilike, isNull, or, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@repo/db";
import { mediaAssets, mediaUsages } from "@repo/db/schema/public";
import {
  attachMediaUsage,
  createMediaAsset,
  deleteMinioObjectByUrl,
  initMediaBucketPolicy,
  type CreateMediaAssetPayload,
} from "@/lib/minio-storage";

export type MediaAssetRow = typeof mediaAssets.$inferSelect & {
  usageCount: number;
};

export async function listMediaAssets(params?: {
  q?: string;
  assetType?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}): Promise<MediaAssetRow[]> {
  const { q, assetType, visibility, limit = 60, offset = 0 } = params ?? {};

  const conditions = [isNull(mediaAssets.deletedAt)];

  if (q) {
    conditions.push(
      or(
        ilike(mediaAssets.originalName, `%${q}%`),
        ilike(mediaAssets.title ?? mediaAssets.originalName, `%${q}%`)
      )!
    );
  }

  if (assetType && assetType !== "all") {
    conditions.push(eq(mediaAssets.assetType, assetType));
  }

  if (visibility && visibility !== "all") {
    conditions.push(eq(mediaAssets.visibility, visibility));
  }

  const rows = await db.query.mediaAssets.findMany({
    where: and(...conditions),
    orderBy: [desc(mediaAssets.createdAt)],
    limit,
    offset,
    with: { usages: true },
  });

  return rows.map((row) => ({
    ...row,
    usageCount: row.usages.length,
  }));
}

export async function uploadMediaAssetAction(payload: {
  dataUrl: string;
  contentType: string;
  fileName: string;
  folder: string;
  visibility: "public" | "private" | "event_admin";
  title?: string;
  altText?: string;
}): Promise<{ success: true; asset: typeof mediaAssets.$inferSelect } | { success: false; error: string }> {
  try {
    const asset = await createMediaAsset({
      dataUrl: payload.dataUrl,
      contentType: payload.contentType,
      fileName: payload.fileName,
      folder: payload.folder,
      visibility: payload.visibility,
      title: payload.title,
      altText: payload.altText,
    });

    revalidatePath("/admin/media");
    return { success: true, asset };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal upload." };
  }
}

export async function updateMediaAssetMetadataAction(
  id: string,
  data: { title?: string | null; altText?: string | null; description?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(mediaAssets)
      .set({ title: data.title, altText: data.altText, description: data.description, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id));
    revalidatePath("/admin/media");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal update." };
  }
}

export type StorageStats = {
  totalFiles: number;
  totalBytes: number;
  byType: { assetType: string; fileCount: number; totalBytes: number }[];
  byVisibility: { visibility: string; fileCount: number }[];
  orphanCount: number;
};

export async function getStorageStats(): Promise<StorageStats> {
  const [totalRow] = await db
    .select({ fileCount: count(), totalBytes: sum(mediaAssets.sizeBytes) })
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.deletedAt), eq(mediaAssets.status, "active")));

  const byType = await db
    .select({ assetType: mediaAssets.assetType, fileCount: count(), totalBytes: sum(mediaAssets.sizeBytes) })
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.deletedAt), eq(mediaAssets.status, "active")))
    .groupBy(mediaAssets.assetType);

  const byVisibility = await db
    .select({ visibility: mediaAssets.visibility, fileCount: count() })
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.deletedAt), eq(mediaAssets.status, "active")))
    .groupBy(mediaAssets.visibility);

  const orphanRows = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(isNull(mediaAssets.deletedAt), eq(mediaAssets.status, "active"), eq(mediaAssets.isLocked, false)))
    .leftJoin(mediaUsages, eq(mediaUsages.assetId, mediaAssets.id))
    .groupBy(mediaAssets.id)
    .having(sql`count(${mediaUsages.id}) = 0`);

  return {
    totalFiles: Number(totalRow?.fileCount ?? 0),
    totalBytes: Number(totalRow?.totalBytes ?? 0),
    byType: byType.map((r) => ({ assetType: r.assetType, fileCount: Number(r.fileCount), totalBytes: Number(r.totalBytes ?? 0) })),
    byVisibility: byVisibility.map((r) => ({ visibility: r.visibility, fileCount: Number(r.fileCount) })),
    orphanCount: orphanRows.length,
  };
}

export async function deleteOrphanAssetsAction(): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    const orphanRows = await db
      .select({ id: mediaAssets.id, objectKey: mediaAssets.objectKey, publicUrl: mediaAssets.publicUrl })
      .from(mediaAssets)
      .where(and(isNull(mediaAssets.deletedAt), eq(mediaAssets.status, "active"), eq(mediaAssets.isLocked, false)))
      .leftJoin(mediaUsages, eq(mediaUsages.assetId, mediaAssets.id))
      .groupBy(mediaAssets.id, mediaAssets.objectKey, mediaAssets.publicUrl)
      .having(sql`count(${mediaUsages.id}) = 0`);

    let deleted = 0;
    for (const row of orphanRows) {
      try {
        await deleteMinioObjectByUrl(
          row.publicUrl ?? `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET ?? "participant-assets"}/${row.objectKey}`
        );
        await db.update(mediaAssets).set({ status: "deleted", deletedAt: new Date() }).where(eq(mediaAssets.id, row.id));
        deleted++;
      } catch {
        // skip individual failures
      }
    }

    revalidatePath("/admin/media");
    return { success: true, deleted };
  } catch (err) {
    return { success: false, deleted: 0, error: err instanceof Error ? err.message : "Gagal cleanup." };
  }
}

export async function applyBucketPolicyAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await initMediaBucketPolicy();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal apply policy." };
  }
}

export async function deleteMediaAssetAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const asset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, id),
      with: { usages: true },
    });

    if (!asset) return { success: false, error: "Asset tidak ditemukan." };
    if (asset.isLocked) return { success: false, error: "Asset terkunci dan tidak bisa dihapus." };
    if (asset.usages.length > 0)
      return { success: false, error: "Asset masih dipakai dan tidak bisa dihapus." };

    await deleteMinioObjectByUrl(asset.publicUrl ?? `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${process.env.MINIO_BUCKET ?? "participant-assets"}/${asset.objectKey}`);

    await db
      .update(mediaAssets)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(mediaAssets.id, id));

    revalidatePath("/admin/media");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal hapus." };
  }
}
