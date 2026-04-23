import { createHash, createHmac, randomUUID } from "node:crypto"
import path from "node:path"

import { db } from "@repo/db"
import { mediaAssets, mediaUsages } from "@repo/db/schema/public"

const DEFAULT_REGION = "us-east-1"
const DEFAULT_BUCKET = "participant-assets"

type SignedFetchOptions = {
  body?: BodyInit | null
  headers?: Record<string, string>
}

export type MediaAssetRecord = typeof mediaAssets.$inferSelect

export type CreateMediaAssetPayload = {
  dataUrl: string
  contentType: string
  fileName: string
  visibility: "public" | "private" | "event_admin"
  folder: string // e.g. "public/event-logos" | "private/participant-logos"
  ownerParticipantId?: string
  ownerBusinessId?: string
  ownerUserId?: string
  eventId?: string
  tenantSchema?: string
  title?: string
  altText?: string
}

export type AttachMediaUsagePayload = {
  assetId: string
  module: string
  entityType: string
  entityId: string
  fieldName: string
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback

  if (!value) {
    throw new Error(`${name} belum dikonfigurasi.`)
  }

  return value
}

function getMinioConfig() {
  const endpoint = requireEnv("MINIO_ENDPOINT")
  const port = requireEnv("MINIO_PORT", "9000")
  const useSsl = (process.env.MINIO_USE_SSL ?? "false") === "true"
  const accessKey = requireEnv("MINIO_ACCESS_KEY")
  const secretKey = requireEnv("MINIO_SECRET_KEY")
  const bucket = requireEnv("MINIO_BUCKET", DEFAULT_BUCKET)
  const region = requireEnv("MINIO_REGION", DEFAULT_REGION)
  const protocol = useSsl ? "https" : "http"
  const baseUrl = `${protocol}://${endpoint}${port ? `:${port}` : ""}`
  // Public URL override — use when MinIO is behind a reverse proxy
  const publicBaseUrl = process.env.MINIO_PUBLIC_URL ?? baseUrl

  return {
    accessKey,
    baseUrl,
    publicBaseUrl,
    bucket,
    region,
    secretKey,
  }
}

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex")
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest()
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, "/")
}

function canonicalizePath(pathname: string) {
  return pathname
    .split("/")
    .map((segment) => encodePathSegment(segment))
    .join("/")
}

async function signedFetch(url: URL, method: string, options: SignedFetchOptions = {}) {
  const { accessKey, region, secretKey } = getMinioConfig()
  const bodyBuffer =
    typeof options.body === "string"
      ? Buffer.from(options.body)
      : options.body instanceof Uint8Array
        ? Buffer.from(options.body)
        : Buffer.alloc(0)

  const payloadHash = sha256Hex(bodyBuffer)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.slice(0, 8)
  const host = url.host

  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n")
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date"
  const canonicalRequest = [
    method,
    canonicalizePath(url.pathname),
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n")

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n")

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"),
    "aws4_request"
  )
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex")
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ")

  return fetch(url, {
    method,
    body: bodyBuffer.byteLength > 0 ? bodyBuffer : null,
    headers: {
      ...(options.headers ?? {}),
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  })
}

async function ensureBucketExists() {
  const { baseUrl, bucket } = getMinioConfig()
  const bucketUrl = new URL(`/${bucket}`, baseUrl)
  const response = await signedFetch(bucketUrl, "PUT")

  if (response.ok || response.status === 409) {
    return
  }

  const message = await response.text()
  throw new Error(`Gagal menyiapkan bucket MinIO: ${message}`)
}

async function setBucketPublicReadPolicy() {
  const { baseUrl, bucket } = getMinioConfig()
  const policy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/public/*`],
      },
    ],
  })
  const policyUrl = new URL(`/${bucket}?policy`, baseUrl)
  const response = await signedFetch(policyUrl, "PUT", {
    body: policy,
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gagal set bucket policy: ${message}`)
  }
}

function parseDataUrl(dataUrl: string) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/)

  if (!matches) {
    throw new Error("Payload file tidak valid.")
  }

  const mimeType = matches[1]
  const base64Content = matches[2]

  if (!mimeType || !base64Content) {
    throw new Error("Payload file tidak valid.")
  }

  return {
    buffer: Buffer.from(base64Content, "base64"),
    mimeType,
  }
}

function inferFileExtension(contentType: string, fileName: string) {
  const fileExtension = path.extname(fileName).toLowerCase()

  if (fileExtension) {
    return fileExtension
  }

  switch (contentType) {
    case "image/jpeg":
      return ".jpg"
    case "image/png":
      return ".png"
    case "image/svg+xml":
      return ".svg"
    case "image/webp":
      return ".webp"
    case "application/pdf":
      return ".pdf"
    default:
      return ""
  }
}

function inferAssetType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (
    mimeType === "application/msword" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("presentationml")
  )
    return "document"
  return "other"
}

async function uploadToMinio(
  buffer: Buffer,
  objectKey: string,
  contentType: string
): Promise<string> {
  const { baseUrl, publicBaseUrl, bucket } = getMinioConfig()
  const objectUrl = new URL(`/${bucket}/${objectKey}`, baseUrl)
  const response = await signedFetch(objectUrl, "PUT", {
    body: buffer as unknown as BodyInit,
    headers: { "Content-Type": contentType },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gagal mengunggah file ke MinIO: ${message}`)
  }

  // Return public-facing URL (may differ from internal upload URL)
  return new URL(`/${bucket}/${objectKey}`, publicBaseUrl).toString()
}

// ── Presigned GET URL ─────────────────────────────────────────────────────────

export function generatePresignedGetUrl(objectKey: string, expiresInSeconds = 3600): string {
  const { accessKey, publicBaseUrl, bucket, region, secretKey } = getMinioConfig()
  const url = new URL(`/${bucket}/${objectKey}`, publicBaseUrl)
  const host = url.host

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.slice(0, 8)

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const credential = `${accessKey}/${credentialScope}`

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresInSeconds),
    "X-Amz-SignedHeaders": "host",
  }

  const sortedKeys = Object.keys(queryParams).sort()
  const canonicalQueryString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k]!)}`)
    .join("&")

  const canonicalRequest = [
    "GET",
    `/${bucket}/${objectKey}`,
    canonicalQueryString,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n")

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n")

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"),
    "aws4_request"
  )
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex")

  return `${url.toString()}?${canonicalQueryString}&X-Amz-Signature=${signature}`
}

// ── Core helper ───────────────────────────────────────────────────────────────

export async function createMediaAsset(
  payload: CreateMediaAssetPayload
): Promise<MediaAssetRecord> {
  const { buffer, mimeType } = parseDataUrl(payload.dataUrl)

  if (mimeType !== payload.contentType) {
    throw new Error("Konten file tidak konsisten.")
  }

  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error("Ukuran file melebihi batas 5MB.")
  }

  await ensureBucketExists()

  const { bucket } = getMinioConfig()
  const assetId = randomUUID()
  const extension = inferFileExtension(payload.contentType, payload.fileName)
  const safeName = path.basename(payload.fileName, path.extname(payload.fileName))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 60)
  const objectKey = `${payload.folder}/${assetId}${extension}`
  const publicUrl = payload.visibility === "public"
    ? await uploadToMinio(buffer, objectKey, payload.contentType)
    : null

  if (payload.visibility !== "public") {
    await uploadToMinio(buffer, objectKey, payload.contentType)
  }

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      id: assetId,
      tenantSchema: payload.tenantSchema ?? null,
      eventId: payload.eventId ?? null,
      ownerUserId: payload.ownerUserId ?? null,
      ownerParticipantId: payload.ownerParticipantId ?? null,
      ownerBusinessId: payload.ownerBusinessId ?? null,
      bucket,
      objectKey,
      publicUrl,
      fileName: `${safeName}${extension}`,
      originalName: payload.fileName,
      mimeType: payload.contentType,
      extension: extension || "",
      sizeBytes: buffer.byteLength,
      assetType: inferAssetType(payload.contentType),
      visibility: payload.visibility,
      title: payload.title ?? null,
      altText: payload.altText ?? null,
    })
    .returning()

  if (!asset) throw new Error("Gagal menyimpan metadata media asset.")

  return asset
}

export async function attachMediaUsage(payload: AttachMediaUsagePayload): Promise<void> {
  await db.insert(mediaUsages).values({
    assetId: payload.assetId,
    module: payload.module,
    entityType: payload.entityType,
    entityId: payload.entityId,
    fieldName: payload.fieldName,
  })
}

export async function initMediaBucketPolicy(): Promise<void> {
  await ensureBucketExists()
  await setBucketPublicReadPolicy()
}

// ── Legacy wrappers (backward compatible) ────────────────────────────────────

export async function uploadParticipantBusinessLogo(payload: {
  contentType: string
  dataUrl: string
  fileName: string
  ownerBusinessId?: string
  ownerParticipantId?: string
}) {
  const asset = await createMediaAsset({
    contentType: payload.contentType,
    dataUrl: payload.dataUrl,
    fileName: payload.fileName,
    folder: "private/participant-logos",
    visibility: "private",
    ownerBusinessId: payload.ownerBusinessId,
    ownerParticipantId: payload.ownerParticipantId,
  })

  const { baseUrl, bucket } = getMinioConfig()
  const objectUrl = new URL(`/${bucket}/${asset.objectKey}`, baseUrl)

  return {
    assetId: asset.id,
    objectKey: asset.objectKey,
    url: objectUrl.toString(),
  }
}

export async function uploadPaymentProof(payload: {
  contentType: string
  dataUrl: string
  fileName: string
  ownerParticipantId?: string
  tenantSchema?: string
}) {
  const asset = await createMediaAsset({
    contentType: payload.contentType,
    dataUrl: payload.dataUrl,
    fileName: payload.fileName,
    folder: "private/payment-proofs",
    visibility: "private",
    ownerParticipantId: payload.ownerParticipantId,
    tenantSchema: payload.tenantSchema,
  })

  const { baseUrl, bucket } = getMinioConfig()
  const objectUrl = new URL(`/${bucket}/${asset.objectKey}`, baseUrl)

  return {
    assetId: asset.id,
    objectKey: asset.objectKey,
    url: objectUrl.toString(),
  }
}

export async function deleteMinioObjectByUrl(objectUrl: string | null | undefined) {
  if (!objectUrl) {
    return
  }

  const { baseUrl, bucket } = getMinioConfig()
  const parsedBaseUrl = new URL(baseUrl)
  const parsedObjectUrl = new URL(objectUrl)

  if (
    parsedObjectUrl.origin !== parsedBaseUrl.origin ||
    !parsedObjectUrl.pathname.startsWith(`/${bucket}/`)
  ) {
    return
  }

  const response = await signedFetch(parsedObjectUrl, "DELETE")

  if (response.ok || response.status === 404) {
    return
  }

  const message = await response.text()
  throw new Error(`Gagal menghapus object MinIO: ${message}`)
}
