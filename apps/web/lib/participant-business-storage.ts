import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"

const participantLogoDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "participant-logos"
)

type UploadPayload = {
  contentType: string
  dataUrl: string
  fileName: string
}

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
])

function inferFileExtension(contentType: string, fileName: string) {
  const fromName = path.extname(fileName).toLowerCase()

  if (fromName) {
    return fromName
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
    default:
      return ""
  }
}

export async function persistParticipantBusinessLogo(upload: UploadPayload) {
  if (!allowedContentTypes.has(upload.contentType)) {
    throw new Error("Tipe file logo tidak didukung.")
  }

  const matches = upload.dataUrl.match(/^data:(.+);base64,(.+)$/)

  if (!matches) {
    throw new Error("Payload logo tidak valid.")
  }

  const mimeType = matches[1]
  const base64Content = matches[2]

  if (!mimeType || !base64Content) {
    throw new Error("Payload logo tidak valid.")
  }

  if (mimeType !== upload.contentType) {
    throw new Error("Konten logo tidak konsisten.")
  }

  const buffer = Buffer.from(base64Content, "base64")
  const maxBytes = 5 * 1024 * 1024

  if (buffer.byteLength > maxBytes) {
    throw new Error("Ukuran logo melebihi batas 5MB.")
  }

  await mkdir(participantLogoDirectory, { recursive: true })

  const extension = inferFileExtension(upload.contentType, upload.fileName)
  const fileName = `${randomUUID()}${extension}`
  const absolutePath = path.join(participantLogoDirectory, fileName)

  await writeFile(absolutePath, buffer)

  return {
    fileName: upload.fileName,
    url: `/uploads/participant-logos/${fileName}`,
  }
}
