/**
 * Backfill migration: reads existing _url values, creates media_assets rows,
 * and populates _asset_id columns. Safe to run multiple times (idempotent).
 *
 * Usage:
 *   cd packages/db
 *   export $(grep -v '^#' ../../.env | xargs) && bun run src/migrate-media-assets.ts
 */
import * as dotenv from "dotenv";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import path from "node:path";

dotenv.config({ path: "../../.env" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const BUCKET = process.env.MINIO_BUCKET ?? "participant-assets";
const ENDPOINT = process.env.MINIO_ENDPOINT ?? "localhost";
const PORT = process.env.MINIO_PORT ?? "9000";
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? "minioadmin";
const SECRET_KEY = process.env.MINIO_SECRET_KEY ?? "minioadmin123";
const BASE_URL = `http://${ENDPOINT}:${PORT}`;

function objectKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const bucketIdx = parts.indexOf(BUCKET);
    if (bucketIdx === -1) return null;
    return parts.slice(bucketIdx + 1).join("/");
  } catch {
    return null;
  }
}

function mimeTypeFromKey(objectKey: string): { mime: string; ext: string; assetType: string } {
  const ext = path.extname(objectKey).toLowerCase().replace(".", "");
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  const mime = mimeMap[ext] ?? "application/octet-stream";
  const assetType = mime.startsWith("image/") ? "image" : mime === "application/pdf" ? "pdf" : "other";
  return { mime, ext, assetType };
}

async function headObject(objectKey: string): Promise<{ sizeBytes: number }> {
  try {
    const url = `${BASE_URL}/${BUCKET}/${objectKey}`;
    const res = await fetch(url, { method: "HEAD" });
    const cl = res.headers.get("content-length");
    return { sizeBytes: cl ? Number(cl) : 0 };
  } catch {
    return { sizeBytes: 0 };
  }
}

async function ensureAsset(params: {
  url: string;
  visibility: "public" | "private";
  ownerBusinessId?: string;
  ownerEventId?: string;
}): Promise<string | null> {
  const { url, visibility, ownerBusinessId, ownerEventId } = params;

  const objectKey = objectKeyFromUrl(url);
  if (!objectKey) {
    console.warn(`  Skipping invalid URL: ${url}`);
    return null;
  }

  // Check if already exists
  const existing = await sql`
    SELECT id FROM public.media_assets
    WHERE object_key = ${objectKey} AND status != 'deleted'
    LIMIT 1
  `;
  if (existing.length > 0) {
    console.log(`  Already exists: ${objectKey} → ${existing[0]!.id}`);
    return existing[0]!.id as string;
  }

  const { sizeBytes } = await headObject(objectKey);
  const fileName = path.basename(objectKey);
  const { mime, ext, assetType } = mimeTypeFromKey(objectKey);
  const publicUrl = visibility === "public" ? url : null;
  const id = randomUUID();

  await sql`
    INSERT INTO public.media_assets (
      id, bucket, object_key, public_url, file_name, original_name,
      mime_type, extension, size_bytes, asset_type, visibility,
      status, is_locked, owner_business_id, event_id,
      created_at, updated_at
    ) VALUES (
      ${id}, ${BUCKET}, ${objectKey}, ${publicUrl}, ${fileName}, ${fileName},
      ${mime}, ${ext}, ${sizeBytes}, ${assetType}, ${visibility},
      'active', false, ${ownerBusinessId ?? null}, ${ownerEventId ?? null},
      now(), now()
    )
  `;

  console.log(`  Created: ${objectKey} → ${id}`);
  return id;
}

async function run() {
  console.log("=== Media Assets Backfill Migration ===\n");

  // 1. participant_businesses.logo_url → logo_asset_id
  console.log("1. Backfilling participant_businesses.logo_asset_id...");
  const businesses = await sql`
    SELECT id, logo_url FROM public.participant_businesses
    WHERE logo_url IS NOT NULL AND logo_asset_id IS NULL
  `;
  console.log(`   Found ${businesses.length} businesses to backfill`);

  for (const biz of businesses) {
    process.stdout.write(`   Business ${biz.id}: ${biz.logo_url}`);
    const assetId = await ensureAsset({
      url: biz.logo_url as string,
      visibility: "private",
      ownerBusinessId: biz.id as string,
    });
    if (assetId) {
      await sql`
        UPDATE public.participant_businesses
        SET logo_asset_id = ${assetId}
        WHERE id = ${biz.id as string}
      `;
      console.log(` → OK`);
    } else {
      console.log(` → SKIPPED`);
    }
  }

  // 2. expo_events.logo_url → logo_asset_id
  console.log("\n2. Backfilling expo_events.logo_asset_id...");
  const events = await sql`
    SELECT id, logo_url FROM public.expo_events
    WHERE logo_url IS NOT NULL AND logo_asset_id IS NULL
  `;
  console.log(`   Found ${events.length} events to backfill`);

  for (const ev of events) {
    process.stdout.write(`   Event ${ev.id}: ${ev.logo_url}`);
    const assetId = await ensureAsset({
      url: ev.logo_url as string,
      visibility: "public",
      ownerEventId: ev.id as string,
    });
    if (assetId) {
      await sql`
        UPDATE public.expo_events
        SET logo_asset_id = ${assetId}
        WHERE id = ${ev.id as string}
      `;
      console.log(` → OK`);
    } else {
      console.log(` → SKIPPED`);
    }
  }

  // 3. qris_configs.image_url → image_asset_id
  console.log("\n3. Backfilling qris_configs.image_asset_id...");
  const qrisRows = await sql`
    SELECT id, image_url, event_id FROM public.qris_configs
    WHERE image_url IS NOT NULL AND image_asset_id IS NULL
  `;
  console.log(`   Found ${qrisRows.length} qris_configs to backfill`);

  for (const qr of qrisRows) {
    process.stdout.write(`   QrisConfig ${qr.id}: ${qr.image_url}`);
    const assetId = await ensureAsset({
      url: qr.image_url as string,
      visibility: "public",
      ownerEventId: qr.event_id as string,
    });
    if (assetId) {
      await sql`
        UPDATE public.qris_configs
        SET image_asset_id = ${assetId}
        WHERE id = ${qr.id as string}
      `;
      console.log(` → OK`);
    } else {
      console.log(` → SKIPPED`);
    }
  }

  // 4. invoice_payments.proof_url → proof_asset_id
  // This is in the tenant schema — skip here since tenant may vary
  // Run separately per tenant if needed

  console.log("\n=== Backfill complete ===");
  await sql.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
